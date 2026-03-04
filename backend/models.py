import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, Boolean, JSON, ForeignKey
)
from sqlalchemy.orm import relationship
from .database import Base


class Thesis(Base):
    __tablename__ = "theses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="active")
    activation_date = Column(DateTime, default=datetime.datetime.utcnow)
    keywords = Column(JSON, default=list)
    evidence_score = Column(Float, default=5.0)
    last_evidence_refresh = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    tree_nodes = relationship("TreeNode", back_populates="thesis", cascade="all, delete-orphan")
    conviction_entries = relationship("ConvictionEntry", back_populates="thesis", cascade="all, delete-orphan", order_by="ConvictionEntry.date")
    news_articles = relationship("NewsArticle", back_populates="thesis", cascade="all, delete-orphan")
    bets = relationship("Bet", back_populates="thesis", cascade="all, delete-orphan")


class TreeNode(Base):
    __tablename__ = "tree_nodes"

    id = Column(Integer, primary_key=True, index=True)
    thesis_id = Column(Integer, ForeignKey("theses.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(Integer, ForeignKey("tree_nodes.id", ondelete="CASCADE"), nullable=True)
    node_type = Column(String(50), nullable=False)  # thesis, second_order, third_order
    label = Column(String(500), nullable=False)
    description = Column(Text)
    sort_order = Column(Integer, default=0)

    thesis = relationship("Thesis", back_populates="tree_nodes")
    parent = relationship("TreeNode", remote_side=[id], backref="children")
    tickers = relationship("NodeTicker", back_populates="node", cascade="all, delete-orphan")
    startup_ideas = relationship("StartupIdea", back_populates="node", cascade="all, delete-orphan")


class NodeTicker(Base):
    __tablename__ = "node_tickers"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, ForeignKey("tree_nodes.id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String(20), nullable=False)
    rationale = Column(Text)
    direction = Column(String(10), default="long")  # long or short

    node = relationship("TreeNode", back_populates="tickers")


class StartupIdea(Base):
    __tablename__ = "startup_ideas"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, ForeignKey("tree_nodes.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)

    node = relationship("TreeNode", back_populates="startup_ideas")


class ConvictionEntry(Base):
    __tablename__ = "conviction_entries"

    id = Column(Integer, primary_key=True, index=True)
    thesis_id = Column(Integer, ForeignKey("theses.id", ondelete="CASCADE"), nullable=False)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    score = Column(Integer, nullable=False)  # 0-10
    note = Column(Text)

    thesis = relationship("Thesis", back_populates="conviction_entries")


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True, index=True)
    thesis_id = Column(Integer, ForeignKey("theses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    url = Column(String(1000))
    source = Column(String(255))
    published_at = Column(DateTime)
    classification = Column(String(20))  # confirming, neutral, contradicting
    summary = Column(Text)
    fetched_at = Column(DateTime, default=datetime.datetime.utcnow)

    thesis = relationship("Thesis", back_populates="news_articles")


class Bet(Base):
    __tablename__ = "bets"

    id = Column(Integer, primary_key=True, index=True)
    thesis_id = Column(Integer, ForeignKey("theses.id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(20), nullable=False)
    direction = Column(String(10), default="long")  # long or short
    entry_price = Column(Float)
    current_price = Column(Float)
    target_price = Column(Float)
    stop_loss = Column(Float)
    position_size_pct = Column(Float)
    status = Column(String(20), default="watching")  # watching, active, closed
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    thesis = relationship("Thesis", back_populates="bets")


class MarketDataCache(Base):
    __tablename__ = "market_data_cache"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(20), nullable=False)  # yfinance or fred
    identifier = Column(String(50), nullable=False)
    data_json = Column(JSON)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)


class NewsFetchLog(Base):
    __tablename__ = "news_fetch_log"

    id = Column(Integer, primary_key=True, index=True)
    thesis_id = Column(Integer, ForeignKey("theses.id", ondelete="CASCADE"), nullable=False)
    fetched_at = Column(DateTime, default=datetime.datetime.utcnow)
