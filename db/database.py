import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()
load_dotenv("nami_config.env")


# Get DB path from environment, defaulting to local SQLite database
DATABASE_PATH = os.getenv("DATABASE_PATH", "./finance.db")

# Construct SQLAlchemy database URL
if DATABASE_PATH.startswith("sqlite:///"):
    DATABASE_URL = DATABASE_PATH
else:
    DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# Connect args needed for SQLite threads
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
