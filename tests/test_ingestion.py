import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.database import Base, get_db
from db.models import RawMessage
from main import app

# Setup in-memory sqlite engine for testing
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

@pytest.fixture(scope="function", autouse=True)
def mock_env(monkeypatch):
    monkeypatch.setenv("API_KEY", "test_secret_key")

def test_ingest_message_success_json():
    client = TestClient(app)
    headers = {"X-API-Key": "test_secret_key", "Content-Type": "application/json"}
    payload = {"message": "Spent Rs. 150 at bookstore"}
    response = client.post("/api/messages", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["message"] == "Spent Rs. 150 at bookstore"
    assert data["processed"] is False
    assert data["parse_failed"] is False
    assert "id" in data

def test_ingest_message_success_text():
    client = TestClient(app)
    headers = {"X-API-Key": "test_secret_key", "Content-Type": "text/plain"}
    payload = "Paid ₹500 to milkman"
    response = client.post("/api/messages", content=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["message"] == "Paid ₹500 to milkman"
    assert data["processed"] is False
    assert data["parse_failed"] is False

def test_ingest_message_no_auth():
    client = TestClient(app)
    payload = {"message": "Spent Rs. 150"}
    # No header - should succeed now since it is open
    response = client.post("/api/messages", json=payload)
    assert response.status_code == 201
    
    # Wrong header - should also succeed now
    headers = {"X-API-Key": "wrong_key"}
    response = client.post("/api/messages", json=payload, headers=headers)
    assert response.status_code == 201


def test_ingest_message_empty_body():
    client = TestClient(app)
    headers = {"X-API-Key": "test_secret_key"}
    response = client.post("/api/messages", content="", headers=headers)
    assert response.status_code == 400
    
    response = client.post("/api/messages", json={"message": ""}, headers=headers)
    assert response.status_code == 400
