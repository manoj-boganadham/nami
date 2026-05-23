import os
import logging
from datetime import datetime, time, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import Transaction, RawMessage

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_CATEGORIES = ["Food", "Transport", "Shopping", "Health", "Utilities", "Entertainment", "Other"]

@router.get("/api/stats")
@router.get("/stats")
def get_stats(
    from_date: Optional[str] = Query(None, alias="from", description="Filter from date YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, alias="to", description="Filter to date YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    # Load config threshold
    try:
        large_spend_threshold = float(os.getenv("LARGE_SPEND_THRESHOLD", "2000"))
    except ValueError:
        large_spend_threshold = 2000.0

    # Determine date range limits
    now = datetime.utcnow()
    
    # 1. Parse date parameters or default to overall
    start_dt = None
    end_dt = None

    if from_date:
        try:
            start_day = datetime.strptime(from_date, "%Y-%m-%d").date()
            start_dt = datetime.combine(start_day, time.min)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid from date format. Use YYYY-MM-DD.")
    
    if to_date:
        try:
            end_day = datetime.strptime(to_date, "%Y-%m-%d").date()
            end_dt = datetime.combine(end_day, time.max)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid to date format. Use YYYY-MM-DD.")

    # Base query for the stats range
    query = db.query(Transaction)
    if start_dt:
        query = query.filter(Transaction.timestamp >= start_dt)
    if end_dt:
        query = query.filter(Transaction.timestamp <= end_dt)

    transactions = query.all()

    # Calculate total spend
    total_spend = sum(t.amount for t in transactions)

    # Calculate category breakdown
    category_breakdown = {cat: 0.0 for cat in ALLOWED_CATEGORIES}
    category_breakdown["Uncategorized"] = 0.0

    for t in transactions:
        cat = t.category if t.category in ALLOWED_CATEGORIES else "Uncategorized"
        category_breakdown[cat] += t.amount

    # Calculate Today's Haul
    today_date = now.date()
    today_start = datetime.combine(today_date, time.min)
    today_end = datetime.combine(today_date, time.max)
    
    todays_haul = db.query(func.sum(Transaction.amount))\
        .filter(Transaction.timestamp >= today_start, Transaction.timestamp <= today_end)\
        .scalar() or 0.0

    # Calculate Flagged Count for the queried range
    flagged_count = sum(1 for t in transactions if t.amount >= large_spend_threshold)

    # Calculate 7-day trend (ending at 'to_date' if specified, otherwise 'now')
    trend_end_date = datetime.strptime(to_date, "%Y-%m-%d").date() if to_date else now.date()
    trend_days = [trend_end_date - timedelta(days=i) for i in range(6, -1, -1)] # last 7 days

    seven_day_trend = []
    for day in trend_days:
        day_start = datetime.combine(day, time.min)
        day_end = datetime.combine(day, time.max)
        day_sum = db.query(func.sum(Transaction.amount))\
            .filter(Transaction.timestamp >= day_start, Transaction.timestamp <= day_end)\
            .scalar() or 0.0
        
        seven_day_trend.append({
            "date": day.strftime("%Y-%m-%d"),
            "amount": float(day_sum)
        })

    return {
        "total_spend": float(total_spend),
        "category_breakdown": category_breakdown,
        "seven_day_trend": seven_day_trend,
        "todays_haul": float(todays_haul),
        "flagged_count": flagged_count
    }
