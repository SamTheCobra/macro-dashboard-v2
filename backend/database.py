import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./macro_dashboard_v2.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from . import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _migrate_add_columns()


def _migrate_add_columns():
    """Add new columns to existing tables if they don't exist (SQLite migration)."""
    from sqlalchemy import text, inspect
    insp = inspect(engine)
    if "theses" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("theses")}
        with engine.begin() as conn:
            if "evidence_score" not in cols:
                conn.execute(text("ALTER TABLE theses ADD COLUMN evidence_score FLOAT DEFAULT 5.0"))
            if "last_evidence_refresh" not in cols:
                conn.execute(text("ALTER TABLE theses ADD COLUMN last_evidence_refresh DATETIME"))
    if "tree_nodes" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("tree_nodes")}
        with engine.begin() as conn:
            if "user_conviction" not in cols:
                conn.execute(text("ALTER TABLE tree_nodes ADD COLUMN user_conviction INTEGER"))
