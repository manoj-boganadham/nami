import pytest
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
    # Perform manual column migrations in memory to replicate prod
    with engine.begin() as conn:
        from sqlalchemy import text
        # If columns already exist (which they do since we updated models.py before create_all),
        # metadata create_all will create them. If not, this is a safety check.
        pass
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

def test_v3_ingest_and_reprocess_propagation(db_session):
    client = TestClient(app)

    # 1. Ingest message with custom fields
    payload = {
        "message": "Spent Rs. 1200 on groceries",
        "category": "Shopping",
        "modeOfPayment": "Card"
    }
    response = client.post("/api/messages", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["category"] == "Shopping"
    assert data["mode_of_payment"] == "Card"

    msg_id = data["id"]

    # Verify stored in DB RawMessage
    raw_msg = db_session.query(RawMessage).filter(RawMessage.id == msg_id).first()
    assert raw_msg.category == "Shopping"
    assert raw_msg.mode_of_payment == "Card"

    # 2. Trigger reprocessing to verify propagation
    reprocess_resp = client.post(f"/api/raw_messages/{msg_id}/reprocess")
    assert reprocess_resp.status_code == 200
    
    # Verify transaction in DB has category and mode pre-filled
    tx = db_session.query(Transaction).filter(Transaction.raw_message_id == msg_id).first()
    assert tx is not None
    assert tx.amount == 1200.0
    assert tx.category == "Shopping"
    assert tx.mode_of_payment == "Card"


def test_v3_reprocess_invalid_category(db_session):
    client = TestClient(app)

    # Ingest message with invalid category
    payload = {
        "message": "Spent Rs. 450",
        "category": "InvalidCategoryName",
        "modeOfPayment": "UPI"
    }
    response = client.post("/api/messages", json=payload)
    data = response.json()
    msg_id = data["id"]

    # Trigger reprocessing
    client.post(f"/api/raw_messages/{msg_id}/reprocess")

    # Transaction category should be None (defaulted), but mode should copy over
    tx = db_session.query(Transaction).filter(Transaction.raw_message_id == msg_id).first()
    assert tx is not None
    assert tx.category is None
    assert tx.mode_of_payment == "UPI"


def test_v3_patch_transaction_mode_of_payment(db_session):
    client = TestClient(app)

    # Populate mock transaction
    raw = RawMessage(message="Paid Rs. 500", processed=True)
    db_session.add(raw)
    db_session.commit()

    tx = Transaction(
        raw_message_id=raw.id,
        amount=500.0,
        category="Transport",
        mode_of_payment="Cash",
        timestamp=raw.received_at
    )
    db_session.add(tx)
    db_session.commit()

    # 1. Update mode of payment
    patch_resp = client.patch(f"/api/transactions/{tx.id}", json={"mode_of_payment": "UPI"})
    assert patch_resp.status_code == 200
    data = patch_resp.json()
    assert data["mode_of_payment"] == "UPI"

    # 2. Update with invalid mode
    patch_invalid = client.patch(f"/api/transactions/{tx.id}", json={"mode_of_payment": "Bitcoin"})
    assert patch_invalid.status_code == 422 # Pydantic validation error

    # 3. Clear mode of payment
    patch_clear = client.patch(f"/api/transactions/{tx.id}", json={"mode_of_payment": ""})
    assert patch_clear.status_code == 200
    assert patch_clear.json()["mode_of_payment"] is None
