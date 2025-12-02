"""Database setup using SQLAlchemy ORM."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from config import Config


class Base(DeclarativeBase):
    """Base class for all ORM models."""


# Synchronous SQLAlchemy engine for Postgres (or other SQL databases)
engine = create_engine(Config.DATABASE_URL, echo=False, future=True)

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


