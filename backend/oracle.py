import random
import time

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

    face_match = random.random() > 0.1
    audio_match = random.random() > 0.1
    score = round((0.55 * (1 if face_match else 0) + 0.45 * (1 if audio_match else 0)), 3)
    status = "verified" if score >= 0.85 else "rejected"

    return {
        "ai_score": score,
        "ai_status": status,
        "ai_metadata": {
            "face_match": face_match,
            "audio_match": audio_match,
            "source_vod_url": source_vod_url,
        },
        "reason": "Match passed" if status == "verified" else "Low confidence match",
    }
