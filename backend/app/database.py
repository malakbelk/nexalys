"""
Database engine + session management.

SessionLocal is what every request uses to talk to Postgres.
get_db() is a FastAPI dependency: it opens a session, hands it to
the endpoint, then closes it when the request is done -- even if
the endpoint raises an error.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
