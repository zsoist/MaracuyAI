import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.analysis_result import AnalysisResult, MoodType, VocalizationType
from app.models.recording import Recording
from app.models.user import User
from app.services.ml_service import MLService

router = APIRouter(prefix="/analysis", tags=["analysis"])

ml_service = MLService()


class AnalyzeRequest(BaseModel):
    recording_id: str
    parakeet_ids: list[str] | None = None


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
    current_user: User = Depends(get_current_user),
):
    recording_uuid = uuid.UUID(body.recording_id)
    result = await db.execute(
        select(Recording).where(
            Recording.id == recording_uuid,
            Recording.user_id == current_user.id,
        )
    )
    recording = result.scalar_one_or_none()
    if not recording:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found"
        )

    analysis_output = await ml_service.analyze_audio(recording.file_url)

    results = []
    parakeet_ids = body.parakeet_ids or [None]

    for pid in parakeet_ids:
        analysis = AnalysisResult(
            recording_id=recording.id,
            parakeet_id=uuid.UUID(pid) if pid else None,
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
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(AnalysisResult)
        .join(Recording)
        .where(
            AnalysisResult.parakeet_id == parakeet_id,
            Recording.user_id == current_user.id,
        )
        .order_by(AnalysisResult.created_at.desc())
        .limit(limit)
    )
    return [_to_response(a) for a in result.scalars().all()]


@router.get("/summary/{parakeet_id}", response_model=WellnessSummary)
async def get_wellness_summary(
    parakeet_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.parakeet import Parakeet

    parakeet_result = await db.execute(
        select(Parakeet).where(
            Parakeet.id == parakeet_id,
            Parakeet.user_id == current_user.id,
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
            Recording.user_id == current_user.id,
        )
        .order_by(AnalysisResult.created_at.desc())
        .limit(100)
    )
    analyses = result.scalars().all()

    if not analyses:
        return WellnessSummary(
            parakeet_id=str(parakeet_id),
            parakeet_name=parakeet.name,
            total_analyses=0,
            average_confidence=0.0,
            average_energy=0.0,
            dominant_mood="neutral",
            mood_distribution={},
            recent_trend="stable",
        )

    mood_counts: dict[str, int] = {}
    total_confidence = 0.0
    total_energy = 0.0

    for a in analyses:
        mood_counts[a.mood.value] = mood_counts.get(a.mood.value, 0) + 1
        total_confidence += a.confidence
        total_energy += a.energy_level

    n = len(analyses)
    dominant_mood = max(mood_counts, key=mood_counts.get)  # type: ignore[arg-type]

    recent = analyses[:5]
    older = analyses[5:15]
    if recent and older:
        recent_energy = sum(a.energy_level for a in recent) / len(recent)
        older_energy = sum(a.energy_level for a in older) / len(older)
        diff = recent_energy - older_energy
        trend = "improving" if diff > 0.1 else ("declining" if diff < -0.1 else "stable")
    else:
        trend = "stable"

    return WellnessSummary(
        parakeet_id=str(parakeet_id),
        parakeet_name=parakeet.name,
        total_analyses=n,
        average_confidence=round(total_confidence / n, 3),
        average_energy=round(total_energy / n, 3),
        dominant_mood=dominant_mood,
        mood_distribution=mood_counts,
        recent_trend=trend,
    )


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
