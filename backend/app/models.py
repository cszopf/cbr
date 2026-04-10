from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class License(Base):
    __tablename__ = "licenses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    contact_id: Mapped[str | None] = mapped_column(String, nullable=True)
    license_number: Mapped[str] = mapped_column(String, unique=True, index=True)
    license_type: Mapped[str] = mapped_column(String)  # SAL, BRK, BRKA, PBRK, MBRK
    credential_type: Mapped[str] = mapped_column(String)  # Full name: Real Estate Salesperson, etc.
    first_name: Mapped[str] = mapped_column(String, index=True)
    middle_name: Mapped[str | None] = mapped_column(String, nullable=True)
    last_name: Mapped[str] = mapped_column(String, index=True)
    suffix: Mapped[str | None] = mapped_column(String, nullable=True)
    company_name: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, index=True)
    address1: Mapped[str | None] = mapped_column(String, nullable=True)
    address2: Mapped[str | None] = mapped_column(String, nullable=True)
    city: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    state: Mapped[str | None] = mapped_column(String, nullable=True)
    zip_code: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    first_issuance_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expiration_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    ce_due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    license_issued_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    date_last_activity: Mapped[str | None] = mapped_column(String, nullable=True)
    employer_credential: Mapped[str | None] = mapped_column(String, nullable=True)
    employer_name: Mapped[str | None] = mapped_column(String, nullable=True)
    employer_address: Mapped[str | None] = mapped_column(String, nullable=True)
    employer_dba: Mapped[str | None] = mapped_column(String, nullable=True)
    employer_status: Mapped[str | None] = mapped_column(String, nullable=True)
    last_synced: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    ce_records: Mapped[list["CERecord"]] = relationship(back_populates="license", cascade="all, delete-orphan")
    alert_preference: Mapped["AlertPreference | None"] = relationship(back_populates="license", uselist=False, cascade="all, delete-orphan")


class CERecord(Base):
    __tablename__ = "ce_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    license_id: Mapped[int] = mapped_column(Integer, ForeignKey("licenses.id"))
    course_name: Mapped[str] = mapped_column(String)
    provider: Mapped[str | None] = mapped_column(String, nullable=True)
    category: Mapped[str] = mapped_column(String)  # CORE_LAW, ETHICS, CIVIL_RIGHTS, ELECTIVE, BROKER_MGMT
    hours: Mapped[float] = mapped_column(Float)
    completion_date: Mapped[date] = mapped_column(Date)
    reporting_period_start: Mapped[date] = mapped_column(Date)
    reporting_period_end: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    license: Mapped["License"] = relationship(back_populates="ce_records")


class AlertPreference(Base):
    __tablename__ = "alert_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    license_id: Mapped[int] = mapped_column(Integer, ForeignKey("licenses.id"), unique=True)
    alert_days_before: Mapped[int] = mapped_column(Integer, default=90)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    license: Mapped["License"] = relationship(back_populates="alert_preference")


class BrokerGroup(Base):
    __tablename__ = "broker_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    broker_license_id: Mapped[int] = mapped_column(Integer, ForeignKey("licenses.id"))
    agent_license_id: Mapped[int] = mapped_column(Integer, ForeignKey("licenses.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
