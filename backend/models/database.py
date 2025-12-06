"""Database setup using SQLAlchemy ORM."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os
from dotenv import load_dotenv

# Load environment variables first to avoid circular import issues
load_dotenv()

# Use environment variable, fallback to local default with current user
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    import getpass
    current_user = getpass.getuser()
    DATABASE_URL = f"postgresql://{current_user}@localhost:5432/outfit_suggestor"


class Base(DeclarativeBase):
    """Base class for all ORM models."""


# Synchronous SQLAlchemy engine for Postgres (or other SQL databases)
engine = create_engine(DATABASE_URL, echo=False, future=True)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """
    FastAPI dependency that provides a database session.

    Yields:
        SQLAlchemy Session bound to the configured engine.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()




