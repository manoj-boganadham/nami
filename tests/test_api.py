import pytest
from datetime import datetime, timedelta
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

def test_transactions_and_stats_apis(db_session):
    client = TestClient(app)

    # 1. Populate mock data
    now = datetime.utcnow()
    yesterday = now - timedelta(days=1)
    two_days_ago = now - timedelta(days=2)

    # Create raw messages
    msg1 = RawMessage(message="Spent ₹1500 at StoreA", received_at=now, processed=True)
    msg2 = RawMessage(message="Paid Rs. 500 to taxi", received_at=yesterday, processed=True)
    msg3 = RawMessage(message="Debited for INR 3000 at medical store", received_at=two_days_ago, processed=True)
    db_session.add_all([msg1, msg2, msg3])
    db_session.commit()

    # Create transactions
    tx1 = Transaction(raw_message_id=msg1.id, amount=1500.0, category="Shopping", description=msg1.message, timestamp=now)
    tx2 = Transaction(raw_message_id=msg2.id, amount=500.0, category="Transport", description=msg2.message, timestamp=yesterday)
    tx3 = Transaction(raw_message_id=msg3.id, amount=3000.0, category=None, description=msg3.message, timestamp=two_days_ago)
    db_session.add_all([tx1, tx2, tx3])
    db_session.commit()

    # 2. Test GET /api/transactions (unfiltered)
    response = client.get("/api/transactions")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    # Check sorting (descending timestamp order)
    assert data[0]["id"] == tx1.id
    assert data[1]["id"] == tx2.id
    assert data[2]["id"] == tx3.id

    # 3. Test GET /api/transactions with date filters
    today_str = now.strftime("%Y-%m-%d")
    response = client.get(f"/api/transactions?date={today_str}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == tx1.id

    # Test custom range
    yesterday_str = yesterday.strftime("%Y-%m-%d")
    response = client.get(f"/api/transactions?from={yesterday_str}&to={today_str}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2

    # Test invalid date parameter format
    response = client.get("/api/transactions?date=24-05-2026")
    assert response.status_code == 400

    # 4. Test PATCH /api/transactions/{id}
    # Update category
    response = client.patch(f"/api/transactions/{tx3.id}", json={"category": "Health", "description": "Pharmacy spend"})
    assert response.status_code == 200
    updated_data = response.json()
    assert updated_data["category"] == "Health"
    assert updated_data["description"] == "Pharmacy spend"

    # Update category with invalid value
    response = client.patch(f"/api/transactions/{tx3.id}", json={"category": "InvalidCategory"})
    assert response.status_code == 422 # Pydantic validation error

    # Non-existent ID
    response = client.patch("/api/transactions/99999", json={"category": "Food"})
    assert response.status_code == 404

    # 5. Test GET /api/stats
    response = client.get("/api/stats")
    assert response.status_code == 200
    stats = response.json()
    assert stats["total_spend"] == 5000.0 # 1500 + 500 + 3000
    assert stats["category_breakdown"]["Shopping"] == 1500.0
    assert stats["category_breakdown"]["Transport"] == 500.0
    assert stats["category_breakdown"]["Health"] == 3000.0
    assert stats["todays_haul"] == 1500.0
    # 3000 is above default 2000 threshold
    assert stats["flagged_count"] == 1 
    # Check trend
    assert len(stats["seven_day_trend"]) == 7
    assert stats["seven_day_trend"][-1]["amount"] == 1500.0
    assert stats["seven_day_trend"][-2]["amount"] == 500.0
    assert stats["seven_day_trend"][-3]["amount"] == 3000.0
