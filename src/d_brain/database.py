import datetime
import enum
from pathlib import Path
from typing import Any

from sqlalchemy import DateTime, Enum, String, Text, create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class MemoryTier(enum.Enum):
    CORE = "core"
    ACTIVE = "active"
    WARM = "warm"
    COLD = "cold"
    ARCHIVE = "archive"

class Base(DeclarativeBase):
    pass

class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True)

class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=lambda: datetime.datetime.now(datetime.UTC)
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.datetime.now(datetime.UTC),
        onupdate=lambda: datetime.datetime.now(datetime.UTC),
    )
    memory_tier: Mapped[MemoryTier] = mapped_column(
        Enum(MemoryTier), default=MemoryTier.ACTIVE
    )
    last_accessed_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=lambda: datetime.datetime.now(datetime.UTC)
    )

class Settings(Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    value: Mapped[str] = mapped_column(Text)

def get_db_path() -> Path:
    from src.d_brain.config import get_settings

    settings = get_settings()
    db_path = settings.vault_path / "brain.db"
    return db_path

def init_db(db_path: Path) -> Any:
    engine = create_engine(f"sqlite:///{db_path}")
    Base.metadata.create_all(engine)
    return engine

def get_async_session_maker(db_path: Path) -> async_sessionmaker[AsyncSession]:
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")
    return async_sessionmaker(engine, expire_on_commit=False)
