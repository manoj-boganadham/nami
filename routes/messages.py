import os
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status, Query
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import RawMessage

router = APIRouter()

def verify_api_key(x_api_key: str = Header(None, alias="X-API-Key")):
    # Authorization check bypassed as requested by user
    return x_api_key


@router.post("/api/messages", status_code=status.HTTP_201_CREATED)
@router.post("/messages", status_code=status.HTTP_201_CREATED)
async def ingest_message(
    request: Request,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    content_type = request.headers.get("content-type", "")
    message_text = ""

    if "application/json" in content_type:
        try:
            body = await request.json()
            if isinstance(body, dict):
                message_text = body.get("message", "")
            else:
                message_text = str(body)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON body")
    else:
        # Fallback to reading plain text
        raw_body = await request.body()
        try:
            message_text = raw_body.decode("utf-8").strip()
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid text encoding")

    if not message_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message body cannot be empty")

    new_msg = RawMessage(message=message_text)
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)

    return {
        "id": new_msg.id,
        "message": new_msg.message,
        "received_at": new_msg.received_at,
        "processed": new_msg.processed,
        "parse_failed": new_msg.parse_failed
    }

@router.get("/api/raw_messages")
@router.get("/raw_messages")
def get_raw_messages(
    status_filter: str = Query("all", alias="status"),
    search: str = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(RawMessage)

    if status_filter == "pending":
        query = query.filter(RawMessage.processed == False)
    elif status_filter == "processed":
        query = query.filter(RawMessage.processed == True, RawMessage.parse_failed == False)
    elif status_filter == "failed":
        query = query.filter(RawMessage.processed == True, RawMessage.parse_failed == True)

    if search:
        query = query.filter(RawMessage.message.ilike(f"%{search}%"))

    raw_msgs = query.order_by(RawMessage.received_at.desc()).all()
    return [
        {
            "id": msg.id,
            "message": msg.message,
            "received_at": msg.received_at,
            "processed": msg.processed,
            "parse_failed": msg.parse_failed
        } for msg in raw_msgs
    ]

@router.post("/api/raw_messages/{id}/reprocess")
@router.post("/raw_messages/{id}/reprocess")
def reprocess_message(
    id: int,
    db: Session = Depends(get_db)
):
    from db.models import Transaction
    from services.transaction_generator import extract_amount

    raw_msg = db.query(RawMessage).filter(RawMessage.id == id).first()
    if not raw_msg:
        raise HTTPException(status_code=404, detail="Raw message not found")

    amount = extract_amount(raw_msg.message)
    tx_created_or_updated = False

    existing_tx = db.query(Transaction).filter(Transaction.raw_message_id == id).first()

    if amount is not None:
        if existing_tx:
            existing_tx.amount = amount
            existing_tx.timestamp = raw_msg.received_at
        else:
            new_tx = Transaction(
                raw_message_id=raw_msg.id,
                amount=amount,
                category=None,
                description=raw_msg.message,
                timestamp=raw_msg.received_at
            )
            db.add(new_tx)
        raw_msg.parse_failed = False
        tx_created_or_updated = True
    else:
        if existing_tx:
            db.delete(existing_tx)
        raw_msg.parse_failed = True

    raw_msg.processed = True
    db.commit()

    return {
        "status": "success",
        "message": "Message reprocessed successfully",
        "raw_message": {
            "id": raw_msg.id,
            "processed": raw_msg.processed,
            "parse_failed": raw_msg.parse_failed
        },
        "transaction_created_or_updated": tx_created_or_updated
    }

