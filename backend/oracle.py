import hashlib
import random
import time


def _stable_float(seed_text: str) -> float:
    digest = hashlib.sha256(seed_text.encode("utf-8")).digest()
    integer = int.from_bytes(digest[:8], "big")
    return integer / float(2**64 - 1)

def verify_clip_originality(video_url: str, source_vod_url: str | None):
    """
    Mock AI Verification.
    In production, this would:
    1. Download the video file.
    2. Run InsightFace against the creator's registered profile image.
    3. Run Whisper to verify audio transcript matches original content.
    """
    source_hint = source_vod_url or "unknown source"
    print(
        f"[AI Oracle] Running facial recognition and audio analysis on {video_url} vs {source_hint}..."
    )
    time.sleep(2)  # Simulate heavy AI processing

    face_score = round(0.7 + (_stable_float(f"face:{video_url}:{source_hint}") * 0.3), 3)
    audio_score = round(0.65 + (_stable_float(f"audio:{source_hint}:{video_url}") * 0.35), 3)
    face_match = face_score >= 0.8
    audio_match = audio_score >= 0.75
    score = round((face_score * 0.55) + (audio_score * 0.45), 3)
    status = "verified" if score >= 0.85 else "rejected"

    return {
        "ai_score": score,
        "ai_status": status,
        "ai_metadata": {
            "face_match": face_match,
            "audio_match": audio_match,
            "face_score": face_score,
            "audio_score": audio_score,
            "source_vod_url": source_vod_url,
            "match_proof": {
                "video_url": video_url,
                "source_hint": source_hint,
            },
        },
        "reason": "Match passed" if status == "verified" else "Low confidence match",
    }
