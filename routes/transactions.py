import logging
from datetime import datetime, time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
from db.database import get_db
from db.models import Transaction, RawMessage

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_CATEGORIES = {"Food", "Transport", "Shopping", "Health", "Utilities", "Entertainment", "Other"}

ALLOWED_MODES = {"UPI", "Card"}

class TransactionUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    mode_of_payment: Optional[str] = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != "" and v not in ALLOWED_CATEGORIES:
            raise ValueError(f"Category must be one of: {', '.join(ALLOWED_CATEGORIES)}")
        return v or None

    @field_validator("mode_of_payment")
    @classmethod
    def validate_mode_of_payment(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != "" and v not in ALLOWED_MODES:
            raise ValueError(f"Mode of payment must be one of: {', '.join(ALLOWED_MODES)}")
        return v or None

def format_transaction(tx: Transaction):
    return {
        "id": tx.id,
        "raw_message_id": tx.raw_message_id,
        "amount": tx.amount,
        "category": tx.category,
        "mode_of_payment": tx.mode_of_payment,
        "description": tx.description or (tx.raw_message.message if tx.raw_message else ""),
        "timestamp": tx.timestamp,
        "created_at": tx.created_at,
        "raw_message": {
            "id": tx.raw_message.id,
            "message": tx.raw_message.message,
            "received_at": tx.raw_message.received_at
        } if tx.raw_message else None
    }

@router.get("/api/transactions")
@router.get("/transactions")
def get_transactions(
    date: Optional[str] = Query(None, description="Filter by date YYYY-MM-DD"),
    from_date: Optional[str] = Query(None, alias="from", description="Filter from date YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, alias="to", description="Filter to date YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    query = db.query(Transaction).join(RawMessage)

    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
            start_dt = datetime.combine(target_date, time.min)
            end_dt = datetime.combine(target_date, time.max)
            query = query.filter(Transaction.timestamp >= start_dt, Transaction.timestamp <= end_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    elif from_date or to_date:
        try:
            if from_date:
                start_day = datetime.strptime(from_date, "%Y-%m-%d").date()
                start_dt = datetime.combine(start_day, time.min)
                query = query.filter(Transaction.timestamp >= start_dt)
            if to_date:
                end_day = datetime.strptime(to_date, "%Y-%m-%d").date()
                end_dt = datetime.combine(end_day, time.max)
                query = query.filter(Transaction.timestamp <= end_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid from/to date format. Use YYYY-MM-DD.")

    # Order by timestamp descending
    transactions = query.order_by(Transaction.timestamp.desc()).all()
    return [format_transaction(tx) for tx in transactions]

@router.patch("/api/transactions/{id}")
@router.patch("/transactions/{id}")
def update_transaction(
    id: int,
    payload: TransactionUpdate,
    db: Session = Depends(get_db)
):
    tx = db.query(Transaction).filter(Transaction.id == id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Extract only fields that were explicitly set in the request body
    update_data = payload.dict(exclude_unset=True)

    if "category" in update_data:
        tx.category = payload.category

    if "description" in update_data:
        tx.description = payload.description

    if "mode_of_payment" in update_data:
        tx.mode_of_payment = payload.mode_of_payment

    db.commit()
    db.refresh(tx)
    return format_transaction(tx)
