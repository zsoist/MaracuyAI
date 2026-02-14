import uuid
from dataclasses import dataclass

from app.models.analysis_result import AnalysisResult, MoodType, VocalizationType
from app.models.parakeet import Parakeet


@dataclass(frozen=True)
class WellnessMetrics:
    total_analyses: int
    average_confidence: float
    average_energy: float
    dominant_mood: str
    mood_distribution: dict[str, int]
    recent_trend: str


@dataclass(frozen=True)
class AlertPayload:
    priority: str
    parakeet_id: str | None
    parakeet_name: str | None
    message: str
    mood: str
    created_at: str


def calculate_wellness_metrics(analyses: list[AnalysisResult]) -> WellnessMetrics:
    if not analyses:
        return WellnessMetrics(
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

    for analysis in analyses:
        mood = analysis.mood.value
        mood_counts[mood] = mood_counts.get(mood, 0) + 1
        total_confidence += analysis.confidence
        total_energy += analysis.energy_level

    total = len(analyses)
    dominant_mood = max(mood_counts.items(), key=lambda item: item[1])[0]

    return WellnessMetrics(
        total_analyses=total,
        average_confidence=round(total_confidence / total, 3),
        average_energy=round(total_energy / total, 3),
        dominant_mood=dominant_mood,
        mood_distribution=mood_counts,
        recent_trend=_calculate_trend(analyses),
    )


def build_alerts(
    analyses: list[AnalysisResult],
    parakeets_by_id: dict[uuid.UUID, Parakeet],
    max_alerts: int = 20,
) -> list[AlertPayload]:
    alerts: list[AlertPayload] = []

    for analysis in analyses:
        context = _get_parakeet_context(analysis, parakeets_by_id)
        payload = _build_alert_payload(analysis, context["id"], context["name"])
        if not payload:
            continue
        alerts.append(payload)
        if len(alerts) >= max_alerts:
            break

    return alerts


def _calculate_trend(analyses: list[AnalysisResult]) -> str:
    recent = analyses[:5]
    older = analyses[5:15]
    if not recent or not older:
        return "stable"

    recent_energy = sum(analysis.energy_level for analysis in recent) / len(recent)
    older_energy = sum(analysis.energy_level for analysis in older) / len(older)
    diff = recent_energy - older_energy
    if diff > 0.1:
        return "improving"
    if diff < -0.1:
        return "declining"
    return "stable"


def _get_parakeet_context(
    analysis: AnalysisResult, parakeets_by_id: dict[uuid.UUID, Parakeet]
) -> dict[str, str | None]:
    if not analysis.parakeet_id:
        return {"id": None, "name": None}
    parakeet = parakeets_by_id.get(analysis.parakeet_id)
    return {
        "id": str(analysis.parakeet_id),
        "name": parakeet.name if parakeet else None,
    }


def _build_alert_payload(
    analysis: AnalysisResult, parakeet_id: str | None, parakeet_name: str | None
) -> AlertPayload | None:
    location_suffix = f" en {parakeet_name}" if parakeet_name else ""
    source_suffix = f" de {parakeet_name}" if parakeet_name else ""

    if analysis.mood == MoodType.SICK:
        return AlertPayload(
            priority="high",
            parakeet_id=parakeet_id,
            parakeet_name=parakeet_name,
            message=(
                "Se detectaron vocalizaciones inusuales que pueden indicar enfermedad"
                f"{location_suffix}. Monitorea otros sintomas y considera visitar un "
                "veterinario aviar."
            ),
            mood=analysis.mood.value,
            created_at=analysis.created_at.isoformat(),
        )

    if analysis.mood == MoodType.SCARED and analysis.vocalization_type == VocalizationType.ALARM:
        return AlertPayload(
            priority="high",
            parakeet_id=parakeet_id,
            parakeet_name=parakeet_name,
            message=(
                f"Llamadas de alarma detectadas{source_suffix}. "
                "Verifica que no haya depredadores o amenazas cerca."
            ),
            mood=analysis.mood.value,
            created_at=analysis.created_at.isoformat(),
        )

    if analysis.mood == MoodType.STRESSED:
        return AlertPayload(
            priority="medium",
            parakeet_id=parakeet_id,
            parakeet_name=parakeet_name,
            message=(
                f"Signos de estres detectados{location_suffix}. "
                "Revisa el ambiente, ruidos fuertes o cambios recientes."
            ),
            mood=analysis.mood.value,
            created_at=analysis.created_at.isoformat(),
        )

    if analysis.vocalization_type == VocalizationType.SILENCE and analysis.energy_level < 0.1:
        return AlertPayload(
            priority="medium",
            parakeet_id=parakeet_id,
            parakeet_name=parakeet_name,
            message=(
                f"Silencio prolongado detectado{source_suffix}. "
                "Verifica que este comiendo y bebiendo normalmente."
            ),
            mood=analysis.mood.value,
            created_at=analysis.created_at.isoformat(),
        )

    return None
