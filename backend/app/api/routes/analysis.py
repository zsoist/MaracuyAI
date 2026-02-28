import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_auth_context
from app.core.database import get_db
from app.models.analysis_result import AnalysisResult, MoodType, VocalizationType
from app.models.parakeet import Parakeet
from app.models.recording import Recording
from app.services.analysis_service import build_alerts, calculate_wellness_metrics
from app.services.ml_service import MLService
from app.services.parakeet_service import validate_user_parakeet_ids
from app.services.recording_service import get_user_recording

router = APIRouter(prefix="/analysis", tags=["analysis"])

ml_service = MLService()


class AnalyzeRequest(BaseModel):
    recording_id: uuid.UUID
    parakeet_ids: list[uuid.UUID] | None = Field(default=None, max_length=10)


class AnalysisResponse(BaseModel):
    id: str
    recording_id: str
    parakeet_id: str | None
    mood: str
    confidence: float
    energy_level: float
    vocalization_type: str
    recommendations: str | None
    details: dict | None
    created_at: str

    model_config = {"from_attributes": True}


class WellnessSummary(BaseModel):
    parakeet_id: str
    parakeet_name: str
    total_analyses: int
    average_confidence: float
    average_energy: float
    dominant_mood: str
    mood_distribution: dict[str, int]
    recent_trend: str  # "improving", "stable", "declining"


@router.post("/analyze", response_model=list[AnalysisResponse])
async def analyze_recording(
    body: AnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_auth_context),
):
    recording = await get_user_recording(db, body.recording_id, auth_context.owner_id)
    requested_parakeets = await validate_user_parakeet_ids(
        db, auth_context.owner_id, body.parakeet_ids
    )

    try:
        analysis_output = await ml_service.analyze_audio(recording.file_url)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Audio analysis failed unexpectedly.",
        ) from exc

    results = []
    parakeet_ids = requested_parakeets or [None]

    for pid in parakeet_ids:
        analysis = AnalysisResult(
            recording_id=recording.id,
            parakeet_id=pid,
            mood=MoodType(analysis_output["mood"]),
            confidence=analysis_output["confidence"],
            energy_level=analysis_output["energy_level"],
            vocalization_type=VocalizationType(analysis_output["vocalization_type"]),
            details=analysis_output.get("details"),
            recommendations=analysis_output.get("recommendations"),
        )
        db.add(analysis)
        await db.flush()
        results.append(_to_response(analysis))

    return results


@router.get("/history/{parakeet_id}", response_model=list[AnalysisResponse])
async def get_analysis_history(
    parakeet_id: uuid.UUID,
    limit: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_auth_context),
):
    result = await db.execute(
        select(AnalysisResult)
        .join(Recording)
        .where(
            AnalysisResult.parakeet_id == parakeet_id,
            Recording.user_id == auth_context.owner_id,
        )
        .order_by(AnalysisResult.created_at.desc())
        .limit(limit)
    )
    return [_to_response(a) for a in result.scalars().all()]


@router.get("/summary/{parakeet_id}", response_model=WellnessSummary)
async def get_wellness_summary(
    parakeet_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_auth_context),
):
    parakeet_result = await db.execute(
        select(Parakeet).where(
            Parakeet.id == parakeet_id,
            Parakeet.user_id == auth_context.owner_id,
        )
    )
    parakeet = parakeet_result.scalar_one_or_none()
    if not parakeet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parakeet not found")

    result = await db.execute(
        select(AnalysisResult)
        .join(Recording)
        .where(
            AnalysisResult.parakeet_id == parakeet_id,
            Recording.user_id == auth_context.owner_id,
        )
        .order_by(AnalysisResult.created_at.desc())
        .limit(100)
    )
    analyses = result.scalars().all()
    metrics = calculate_wellness_metrics(analyses)

    return WellnessSummary(
        parakeet_id=str(parakeet_id),
        parakeet_name=parakeet.name,
        total_analyses=metrics.total_analyses,
        average_confidence=metrics.average_confidence,
        average_energy=metrics.average_energy,
        dominant_mood=metrics.dominant_mood,
        mood_distribution=metrics.mood_distribution,
        recent_trend=metrics.recent_trend,
    )


class AlertResponse(BaseModel):
    priority: str  # "high", "medium", "low"
    parakeet_id: str | None
    parakeet_name: str | None
    message: str
    mood: str
    created_at: str


@router.get("/alerts", response_model=list[AlertResponse])
async def get_alerts(
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_auth_context),
):
    parakeets_result = await db.execute(
        select(Parakeet).where(Parakeet.user_id == auth_context.owner_id)
    )
    parakeets = {p.id: p for p in parakeets_result.scalars().all()}

    result = await db.execute(
        select(AnalysisResult)
        .join(Recording)
        .where(Recording.user_id == auth_context.owner_id)
        .order_by(AnalysisResult.created_at.desc())
        .limit(50)
    )
    analyses = result.scalars().all()
    alert_payloads = build_alerts(analyses, parakeets, max_alerts=20)
    return [
        AlertResponse(
            priority=alert.priority,
            parakeet_id=alert.parakeet_id,
            parakeet_name=alert.parakeet_name,
            message=alert.message,
            mood=alert.mood,
            created_at=alert.created_at,
        )
        for alert in alert_payloads
    ]


def _to_response(analysis: AnalysisResult) -> AnalysisResponse:
    return AnalysisResponse(
        id=str(analysis.id),
        recording_id=str(analysis.recording_id),
        parakeet_id=str(analysis.parakeet_id) if analysis.parakeet_id else None,
        mood=analysis.mood.value,
        confidence=analysis.confidence,
        energy_level=analysis.energy_level,
        vocalization_type=analysis.vocalization_type.value,
        recommendations=analysis.recommendations,
        details=analysis.details,
        created_at=analysis.created_at.isoformat(),
    )
