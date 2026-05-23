import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.database import Base, get_db
from db.models import RawMessage, Transaction
from main import app

# Setup test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function", autouse=True)
def override_db(db_session):
    def _get_db_override():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = _get_db_override
    yield
    app.dependency_overrides.pop(get_db, None)

def test_raw_messages_query_filters(db_session):
    client = TestClient(app)

    # Populate mock data
    msg1 = RawMessage(message="Spent ₹1500 at StoreA", processed=True, parse_failed=False)
    msg2 = RawMessage(message="Verification OTP: 54321", processed=True, parse_failed=True)
    msg3 = RawMessage(message="Pending message Rs 650", processed=False, parse_failed=False)
    db_session.add_all([msg1, msg2, msg3])
    db_session.commit()

    # 1. Test GET /api/raw_messages (all)
    response = client.get("/api/raw_messages?status=all")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3

    # 2. Test status filters
    # Pending
    response = client.get("/api/raw_messages?status=pending")
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == msg3.id

    # Processed (successful)
    response = client.get("/api/raw_messages?status=processed")
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == msg1.id

    # Failed
    response = client.get("/api/raw_messages?status=failed")
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == msg2.id

    # 3. Test text search
    response = client.get("/api/raw_messages?search=otp")
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == msg2.id

    response = client.get("/api/raw_messages?search=Rs")
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == msg3.id


def test_reprocess_endpoint_success_and_failure(db_session):
    client = TestClient(app)

    # 1. Test Case: Success (amount found)
    msg_success = RawMessage(message="Spent ₹350 at cafe", processed=False, parse_failed=False)
    db_session.add(msg_success)
    db_session.commit()

    # Reprocess
    response = client.post(f"/api/raw_messages/{msg_success.id}/reprocess")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["raw_message"]["processed"] is True
    assert data["raw_message"]["parse_failed"] is False
    assert data["transaction_created_or_updated"] is True

    # Verify transaction in DB
    tx = db_session.query(Transaction).filter(Transaction.raw_message_id == msg_success.id).first()
    assert tx is not None
    assert tx.amount == 350.0

    # 2. Test Case: Existing transaction gets updated
    # Change message amount on the fly
    msg_success.message = "Spent ₹550 at cafe"
    db_session.commit()
    
    response = client.post(f"/api/raw_messages/{msg_success.id}/reprocess")
    assert response.status_code == 200
    db_session.refresh(tx)
    assert tx.amount == 550.0

    # 3. Test Case: Failure (no amount found)
    msg_fail = RawMessage(message="Account notification only", processed=False, parse_failed=False)
    db_session.add(msg_fail)
    db_session.commit()

    response = client.post(f"/api/raw_messages/{msg_fail.id}/reprocess")
    assert response.status_code == 200
    data = response.json()
    assert data["raw_message"]["processed"] is True
    assert data["raw_message"]["parse_failed"] is True
    assert data["transaction_created_or_updated"] is False

    # Verify no transaction is in DB
    tx_fail = db_session.query(Transaction).filter(Transaction.raw_message_id == msg_fail.id).first()
    assert tx_fail is None

    # 4. Test Case: Changing successful message to failed cleans up transaction
    # Reprocess success message with fail content
    msg_success.message = "This spend is cancelled completely"
    db_session.commit()

    response = client.post(f"/api/raw_messages/{msg_success.id}/reprocess")
    assert response.status_code == 200
    
    # Verify transaction is deleted
    tx_deleted = db_session.query(Transaction).filter(Transaction.raw_message_id == msg_success.id).first()
    assert tx_deleted is None
