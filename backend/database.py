import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DEFAULT_DB = f"sqlite:///{os.path.join(_PROJECT_ROOT, 'macro_dashboard_v2.db')}"
DATABASE_URL = os.getenv("DATABASE_URL", _DEFAULT_DB)

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

    # Use a fresh connection so inspect sees the real on-disk schema
    with engine.connect() as conn:
        insp = inspect(conn)
        table_names = insp.get_table_names()

        if "theses" in table_names:
            cols = {c["name"] for c in insp.get_columns("theses")}
            if "evidence_score" not in cols:
                conn.execute(text("ALTER TABLE theses ADD COLUMN evidence_score FLOAT DEFAULT 5.0"))
                print("[migrate] Added theses.evidence_score")
            if "last_evidence_refresh" not in cols:
                conn.execute(text("ALTER TABLE theses ADD COLUMN last_evidence_refresh DATETIME"))
                print("[migrate] Added theses.last_evidence_refresh")
            if "evidence_breakdown" not in cols:
                conn.execute(text("ALTER TABLE theses ADD COLUMN evidence_breakdown JSON"))
                print("[migrate] Added theses.evidence_breakdown")

        if "tree_nodes" in table_names:
            cols = {c["name"] for c in insp.get_columns("tree_nodes")}
            if "user_conviction" not in cols:
                conn.execute(text("ALTER TABLE tree_nodes ADD COLUMN user_conviction INTEGER"))
                print("[migrate] Added tree_nodes.user_conviction")

        conn.commit()
