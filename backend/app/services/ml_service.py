import numpy as np

from app.services.audio_processor import AudioProcessor

RECOMMENDATIONS = {
    "happy": "Your parakeet sounds happy and active! Keep up the good environment with toys and social interaction.",
    "relaxed": "Your parakeet seems calm and content. This is a sign of a comfortable, safe environment.",
    "stressed": "Signs of stress detected. Check for loud noises, other pets nearby, or sudden changes in the environment. Ensure the cage is in a calm area.",
    "scared": "Your parakeet seems frightened. Look for potential threats: sudden movements, unfamiliar objects, or predator-like shadows. Speak softly and avoid sudden changes.",
    "sick": "Unusual vocalizations detected that may indicate illness. Monitor for other symptoms (fluffed feathers, loss of appetite, lethargy). Consider consulting an avian veterinarian.",
    "neutral": "Normal activity detected. Keep monitoring regularly to build a baseline profile for your parakeet.",
}


class MLService:
    """ML service for parakeet vocalization analysis.

    Currently uses a rule-based heuristic system as the initial classifier.
    This will be replaced with a trained CNN model in Sprint 2.
    The heuristic approach uses audio features (pitch, energy, spectral
    characteristics) to approximate mood classification based on known
    budgerigar vocalization patterns from avian behavior research.
    """

    def __init__(self):
        self.processor = AudioProcessor()

    async def analyze_audio(self, file_path: str) -> dict:
        y = self.processor.load_and_preprocess(file_path)
        segments = self.processor.segment_audio(y)

        if not segments:
            return self._silent_result()

        segment_results = []
        for segment in segments:
            features = self.processor.extract_features(segment)
            result = self._classify_segment(features)
            segment_results.append(result)

        aggregated = self._aggregate_results(segment_results)

        full_features = self.processor.extract_features(y)
        aggregated["details"] = self.processor.get_feature_summary(full_features)

        return aggregated

    def _classify_segment(self, features) -> dict:
        """Rule-based classifier using audio features.

        Budgerigar vocalization patterns:
        - Happy/singing: high pitch variability, moderate-high energy, rich spectral content
        - Chattering: moderate pitch, rhythmic energy patterns, moderate spectral centroid
        - Alarm calls: very high pitch, high energy spikes, high spectral centroid
        - Distress: irregular pitch, high energy, high zero-crossing rate
        - Silence/sick: very low energy, minimal pitch activity
        - Contact calls: brief, moderate pitch, consistent energy
        """
        rms_mean = float(np.mean(features.rms_energy))
        zcr_mean = float(np.mean(features.zero_crossing_rate))
        centroid_mean = float(np.mean(features.spectral_centroid))
        pitch_mean = features.pitch_mean
        pitch_std = features.pitch_std

        if rms_mean < 0.01:
            return {
                "mood": "neutral",
                "vocalization_type": "silence",
                "confidence": 0.7,
                "energy_level": rms_mean * 10,
            }

        if rms_mean < 0.03 and pitch_mean < 500:
            return {
                "mood": "sick",
                "vocalization_type": "silence",
                "confidence": 0.4,
                "energy_level": rms_mean * 10,
            }

        if centroid_mean > 4000 and rms_mean > 0.15:
            return {
                "mood": "scared",
                "vocalization_type": "alarm",
                "confidence": 0.65,
                "energy_level": min(rms_mean * 5, 1.0),
            }

        if zcr_mean > 0.15 and rms_mean > 0.1 and pitch_std > 500:
            return {
                "mood": "stressed",
                "vocalization_type": "distress",
                "confidence": 0.55,
                "energy_level": min(rms_mean * 5, 1.0),
            }

        if pitch_std > 300 and rms_mean > 0.05 and centroid_mean > 2000:
            return {
                "mood": "happy",
                "vocalization_type": "singing",
                "confidence": 0.6,
                "energy_level": min(rms_mean * 5, 1.0),
            }

        if 0.03 < rms_mean < 0.1 and pitch_mean > 1000:
            return {
                "mood": "relaxed",
                "vocalization_type": "chattering",
                "confidence": 0.5,
                "energy_level": min(rms_mean * 5, 1.0),
            }

        return {
            "mood": "neutral",
            "vocalization_type": "contact_call",
            "confidence": 0.4,
            "energy_level": min(rms_mean * 5, 1.0),
        }

    def _aggregate_results(self, segment_results: list[dict]) -> dict:
        mood_votes: dict[str, float] = {}
        total_confidence = 0.0
        total_energy = 0.0

        for r in segment_results:
            mood = r["mood"]
            conf = r["confidence"]
            mood_votes[mood] = mood_votes.get(mood, 0) + conf
            total_confidence += conf
            total_energy += r["energy_level"]

        n = len(segment_results)
        dominant_mood = max(mood_votes, key=mood_votes.get)  # type: ignore[arg-type]

        dominant_results = [r for r in segment_results if r["mood"] == dominant_mood]
        dominant_voc = max(
            set(r["vocalization_type"] for r in dominant_results),
            key=lambda v: sum(1 for r in dominant_results if r["vocalization_type"] == v),
        )

        return {
            "mood": dominant_mood,
            "vocalization_type": dominant_voc,
            "confidence": round(total_confidence / n, 3),
            "energy_level": round(total_energy / n, 3),
            "recommendations": RECOMMENDATIONS.get(dominant_mood, ""),
        }

    def _silent_result(self) -> dict:
        return {
            "mood": "neutral",
            "vocalization_type": "silence",
            "confidence": 0.5,
            "energy_level": 0.0,
            "recommendations": RECOMMENDATIONS["neutral"],
            "details": {},
        }
