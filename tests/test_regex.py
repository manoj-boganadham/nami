import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.database import Base
from db.models import RawMessage, Transaction
from services.transaction_generator import extract_amount, process_unprocessed_messages

def test_extract_amount_various_formats():
    # 1. Simple currency symbol followed by amount
    assert extract_amount("₹500") == 500.0
    assert extract_amount("₹ 500") == 500.0
    assert extract_amount("₹1,200.50") == 1200.50
    assert extract_amount("Rs 500") == 500.0
    assert extract_amount("Rs. 1,200") == 1200.0
    assert extract_amount("INR 500") == 500.0

    # 2. Amount followed by currency
    assert extract_amount("500 rupees") == 500.0
    assert extract_amount("1,200.50 rupees") == 1200.50
    assert extract_amount("500 Rs") == 500.0

    # 3. Action keywords
    assert extract_amount("paid 300") == 300.0
    assert extract_amount("spent 450") == 450.0
    assert extract_amount("debited by ₹1000") == 1000.0
    assert extract_amount("charged Rs 150") == 150.0

    # 4. Multi-amount precedence (Spend vs Balance)
    assert extract_amount("Your a/c XXX debited for Rs 1500. Avl Bal Rs 54210.00") == 1500.0
    assert extract_amount("Spent Rs. 100. Balance: Rs 5000") == 100.0
    
    # 5. Invalid / No Match
    assert extract_amount("Hello, this is standard SMS text.") is None
    assert extract_amount("Balance check: Rs. 10000") == 10000.0 # Falls back to Priority 2 general amount


def test_process_unprocessed_messages():
    # Setup test DB
    engine = create_engine("sqlite:///:memory:")
    TestingSession = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSession()

    try:
        # Add test messages
        msg1 = RawMessage(message="Paid Rs. 500 at restaurant")
        msg2 = RawMessage(message="Just a conversational message")
        msg3 = RawMessage(message="Spent ₹2500 on airline ticket")
        db.add_all([msg1, msg2, msg3])
        db.commit()

        # Run process
        results = process_unprocessed_messages(db)

        # Check results summary
        assert results["messages_checked"] == 3
        assert results["transactions_created"] == 2
        assert results["parse_failed"] == 1

        # Query database directly to verify state changes
        db_msgs = db.query(RawMessage).order_by(RawMessage.id).all()
        assert db_msgs[0].processed is True
        assert db_msgs[0].parse_failed is False
        
        assert db_msgs[1].processed is True
        assert db_msgs[1].parse_failed is True

        assert db_msgs[2].processed is True
        assert db_msgs[2].parse_failed is False

        # Verify transaction table
        txs = db.query(Transaction).order_by(Transaction.id).all()
        assert len(txs) == 2
        assert txs[0].amount == 500.0
        assert txs[0].raw_message_id == db_msgs[0].id
        assert txs[1].amount == 2500.0
        assert txs[1].raw_message_id == db_msgs[2].id
        
        # Verify timestamp copy
        assert txs[0].timestamp == db_msgs[0].received_at
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
