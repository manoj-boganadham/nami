from db.database import engine, Base
# Import models to ensure they are registered with Base metadata
from db.models import RawMessage, Transaction

def init_db():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully.")

if __name__ == "__main__":
    init_db()
