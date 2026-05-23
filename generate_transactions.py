#!/usr/bin/env python3
import sys
import logging
from db.database import SessionLocal
from services.transaction_generator import process_unprocessed_messages

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("generate_transactions")

def main():
    logger.info("Starting transaction generation task...")
    db = SessionLocal()
    try:
        results = process_unprocessed_messages(db)
        logger.info(
            f"Completed processing. Messages checked: {results['messages_checked']}, "
            f"Transactions created: {results['transactions_created']}, "
            f"Failed: {results['parse_failed']}"
        )
    except Exception as e:
        logger.error(f"Error during transaction generation: {e}", exc_info=True)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
