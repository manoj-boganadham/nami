import re
import logging
from typing import Optional
from sqlalchemy.orm import Session
from db.models import RawMessage, Transaction

logger = logging.getLogger(__name__)

def extract_amount(message: str) -> Optional[float]:
    message_clean = message.lower()

    # Priority 1: Action keywords associated with a spend/debit (to avoid balance amounts)
    keyword_patterns = [
        r'(?:debited|spent|paid|transferred|sent|withdrawn|charged)\s+(?:for|by|to|of)?\s*(?:rs\.?|₹|inr)?\s*([0-9,]+(?:\.[0-9]+)?)',
        r'(?:rs\.?|₹|inr)?\s*([0-9,]+(?:\.[0-9]+)?)\s+(?:debited|spent|paid|transferred|sent|withdrawn|charged)'
    ]

    for pattern in keyword_patterns:
        match = re.search(pattern, message_clean)
        if match:
            amount_str = match.group(1).replace(',', '')
            try:
                val = float(amount_str)
                logger.info(f"Matched Priority 1: {pattern} -> {val} from '{message}'")
                return val
            except ValueError:
                continue

    # Priority 2: General currency amounts
    general_patterns = [
        r'(?:₹|rs\.?|inr)\s*([0-9,]+(?:\.[0-9]+)?)',
        r'([0-9,]+(?:\.[0-9]+)?)\s*(?:rupees|rs\.?|inr)'
    ]

    for pattern in general_patterns:
        match = re.search(pattern, message_clean)
        if match:
            amount_str = match.group(1).replace(',', '')
            try:
                val = float(amount_str)
                logger.info(f"Matched Priority 2: {pattern} -> {val} from '{message}'")
                return val
            except ValueError:
                continue

    logger.warning(f"No amount matched for message: '{message}'")
    return None

def process_unprocessed_messages(db: Session) -> dict:
    unprocessed = db.query(RawMessage).filter(RawMessage.processed == False).all()

    processed_count = 0
    created_transactions = 0
    failed_count = 0

    for raw_msg in unprocessed:
        amount = extract_amount(raw_msg.message)

        if amount is not None:
            category_val = None
            ALLOWED_CATEGORIES = {"Food", "Transport", "Shopping", "Health", "Utilities", "Entertainment", "Other"}
            if raw_msg.category in ALLOWED_CATEGORIES:
                category_val = raw_msg.category

            tx = Transaction(
                raw_message_id=raw_msg.id,
                amount=amount,
                category=category_val,
                description=raw_msg.message,
                mode_of_payment=raw_msg.mode_of_payment,
                timestamp=raw_msg.received_at
            )
            db.add(tx)
            created_transactions += 1
            raw_msg.parse_failed = False
        else:
            raw_msg.parse_failed = True
            failed_count += 1

        raw_msg.processed = True
        processed_count += 1

    if processed_count > 0:
        db.commit()

    return {
        "messages_checked": processed_count,
        "transactions_created": created_transactions,
        "parse_failed": failed_count
    }
