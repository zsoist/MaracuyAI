"""Baseline schema

Revision ID: 20260214_0001
Revises:
Create Date: 2026-02-14 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "20260214_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


mood_enum = sa.Enum(
    "HAPPY",
    "RELAXED",
    "STRESSED",
    "SCARED",
    "SICK",
    "NEUTRAL",
    name="moodtype",
)

vocalization_enum = sa.Enum(
    "SINGING",
    "CHATTERING",
    "ALARM",
    "SILENCE",
    "DISTRESS",
    "CONTACT_CALL",
    "BEAK_GRINDING",
    name="vocalizationtype",
)


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "parakeets",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("color_description", sa.String(length=255), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("photo_url", sa.String(length=500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_parakeets_user_id", "parakeets", ["user_id"], unique=False)

    op.create_table(
        "recordings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("file_url", sa.String(length=500), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("duration_seconds", sa.Float(), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("sample_rate", sa.Integer(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("metadata_json", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_recordings_user_id", "recordings", ["user_id"], unique=False)

    op.create_table(
        "habitat_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("location_name", sa.String(length=160), nullable=True),
        sa.Column("timezone_name", sa.String(length=64), nullable=False),
        sa.Column("habitat_type", sa.String(length=50), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_habitat_profiles_owner_id", "habitat_profiles", ["owner_id"], unique=True)

    op.create_table(
        "environment_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("habitat_profile_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("location_name", sa.String(length=160), nullable=True),
        sa.Column("timezone_name", sa.String(length=64), nullable=False),
        sa.Column("temperature_c", sa.Float(), nullable=True),
        sa.Column("relative_humidity_pct", sa.Float(), nullable=True),
        sa.Column("wind_speed_kph", sa.Float(), nullable=True),
        sa.Column("weather_code", sa.String(length=40), nullable=True),
        sa.Column("aqi_us", sa.Integer(), nullable=True),
        sa.Column("pm25_ugm3", sa.Float(), nullable=True),
        sa.Column("daylight_state", sa.String(length=20), nullable=True),
        sa.Column("sunrise_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sunset_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_weather", sa.String(length=40), nullable=True),
        sa.Column("source_aqi", sa.String(length=40), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("summary_json", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["habitat_profile_id"], ["habitat_profiles.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_environment_snapshots_owner_id", "environment_snapshots", ["owner_id"], unique=False
    )
    op.create_index(
        "ix_environment_snapshots_habitat_profile_id",
        "environment_snapshots",
        ["habitat_profile_id"],
        unique=False,
    )
    op.create_index(
        "ix_environment_snapshots_captured_at",
        "environment_snapshots",
        ["captured_at"],
        unique=False,
    )

    op.create_table(
        "analysis_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("recording_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("parakeet_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("mood", mood_enum, nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("energy_level", sa.Float(), nullable=False),
        sa.Column("vocalization_type", vocalization_enum, nullable=False),
        sa.Column("details", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("recommendations", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["recording_id"], ["recordings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parakeet_id"], ["parakeets.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_analysis_results_recording_id", "analysis_results", ["recording_id"], unique=False
    )
    op.create_index(
        "ix_analysis_results_parakeet_id", "analysis_results", ["parakeet_id"], unique=False
    )

    op.create_table(
        "risk_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("snapshot_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("severity", sa.String(length=16), nullable=False),
        sa.Column("category", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["snapshot_id"],
            ["environment_snapshots.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_risk_events_owner_id", "risk_events", ["owner_id"], unique=False)
    op.create_index("ix_risk_events_snapshot_id", "risk_events", ["snapshot_id"], unique=False)
    op.create_index("ix_risk_events_created_at", "risk_events", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_risk_events_created_at", table_name="risk_events")
    op.drop_index("ix_risk_events_snapshot_id", table_name="risk_events")
    op.drop_index("ix_risk_events_owner_id", table_name="risk_events")
    op.drop_table("risk_events")

    op.drop_index("ix_analysis_results_parakeet_id", table_name="analysis_results")
    op.drop_index("ix_analysis_results_recording_id", table_name="analysis_results")
    op.drop_table("analysis_results")

    op.drop_index("ix_environment_snapshots_captured_at", table_name="environment_snapshots")
    op.drop_index(
        "ix_environment_snapshots_habitat_profile_id", table_name="environment_snapshots"
    )
    op.drop_index("ix_environment_snapshots_owner_id", table_name="environment_snapshots")
    op.drop_table("environment_snapshots")

    op.drop_index("ix_habitat_profiles_owner_id", table_name="habitat_profiles")
    op.drop_table("habitat_profiles")

    op.drop_index("ix_recordings_user_id", table_name="recordings")
    op.drop_table("recordings")

    op.drop_index("ix_parakeets_user_id", table_name="parakeets")
    op.drop_table("parakeets")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
