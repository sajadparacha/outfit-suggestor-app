"""Access log model for tracking application usage."""
from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, String, DateTime, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class AccessLog(Base):
    """
    Access log model for tracking application usage analytics.
    Records IP addresses, geolocation, timestamps, and user demographics.
    """
    
    __tablename__ = "access_logs"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # Request information
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False, index=True)  # IPv6 max length
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    endpoint: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    method: Mapped[str] = mapped_column(String(10), nullable=False)
    
    # Operation type for usage tracking
    operation_type: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)  # e.g., "ai_outfit_suggestion", "ai_wardrobe_analysis", "wardrobe_add", "wardrobe_update", "outfit_history_view"
    
    # Geolocation information
    country: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    country_code: Mapped[str | None] = mapped_column(String(2), nullable=True, index=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    latitude: Mapped[float | None] = mapped_column(String(20), nullable=True)
    longitude: Mapped[float | None] = mapped_column(String(20), nullable=True)
    
    # User information
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    age_group: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)  # e.g., "18-24", "25-34", "35-44", "45-54", "55+"
    
    # Request details
    status_code: Mapped[int] = mapped_column(Integer, nullable=False, default=200)
    response_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Response time in milliseconds
    
    # Timestamp
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )
    
    # Additional metadata
    referer: Mapped[str | None] = mapped_column(Text, nullable=True)
    request_size: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Request size in bytes
    response_size: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Response size in bytes
    
    # Create composite index for common queries
    __table_args__ = (
        Index('idx_country_timestamp', 'country', 'timestamp'),
        Index('idx_city_timestamp', 'city', 'timestamp'),
        Index('idx_age_timestamp', 'age_group', 'timestamp'),
        Index('idx_user_timestamp', 'user_id', 'timestamp'),
        Index('idx_operation_timestamp', 'operation_type', 'timestamp'),
        Index('idx_operation_user', 'operation_type', 'user_id'),
    )
