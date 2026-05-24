from sqlalchemy import inspect, text
from db.database import engine, Base
from db.models import RawMessage, Transaction

def init_db():
    print("Initializing database tables...")
    # Create tables if not exists
    Base.metadata.create_all(bind=engine)

    # Perform table migrations (checking and adding columns)
    with engine.begin() as conn:
        inspector = inspect(engine)

        # 1. Migrate raw_messages
        raw_msg_columns = [c["name"] for c in inspector.get_columns("raw_messages")]
        if "category" not in raw_msg_columns:
            print("Migration: Adding column 'category' to table 'raw_messages'...")
            conn.execute(text("ALTER TABLE raw_messages ADD COLUMN category TEXT"))
        if "mode_of_payment" not in raw_msg_columns:
            print("Migration: Adding column 'mode_of_payment' to table 'raw_messages'...")
            conn.execute(text("ALTER TABLE raw_messages ADD COLUMN mode_of_payment TEXT"))

        # 2. Migrate transactions
        tx_columns = [c["name"] for c in inspector.get_columns("transactions")]
        if "mode_of_payment" not in tx_columns:
            print("Migration: Adding column 'mode_of_payment' to table 'transactions'...")
            conn.execute(text("ALTER TABLE transactions ADD COLUMN mode_of_payment TEXT"))

    print("Database tables initialized and migrated successfully.")

if __name__ == "__main__":
    init_db()
