import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from db.database import Base

class RawMessage(Base):
    __tablename__ = "raw_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    message = Column(String, nullable=False)
    received_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    processed = Column(Boolean, default=False, nullable=False)
    parse_failed = Column(Boolean, default=False, nullable=False)

    # Establish relationship to Transaction
    transactions = relationship("Transaction", back_populates="raw_message", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    raw_message_id = Column(Integer, ForeignKey("raw_messages.id"), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=True)  # Food, Transport, Shopping, Health, Utilities, Entertainment, Other
    description = Column(String, nullable=True)  # User-editable description, defaults to raw message
    timestamp = Column(DateTime, nullable=False)  # Copied from RawMessage.received_at
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Establish relationship to RawMessage
    raw_message = relationship("RawMessage", back_populates="transactions")
