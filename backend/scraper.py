import random
import time

def detect_platform(url: str) -> str:
    lowered = url.lower()
    if "tiktok" in lowered:
        return "tiktok"
    if "instagram" in lowered or "reels" in lowered:
        return "reels"
    if "youtube" in lowered or "youtu.be" in lowered or "shorts" in lowered:
        return "shorts"
    return "tiktok"

def scrape_video_metadata(url: str):
    """
    Mock scraper. In a real scenario, this would use a platform-specific
    API or automation to extract video metrics.
    """
    print(f"[Scraper] Fetching metadata for {url}...")
    time.sleep(1)  # Simulate network delay

    views = random.randint(5000, 150000)
    platform = detect_platform(url)

    return {
        "url": url,
        "platform": platform,
        "views": views,
        "author": "@mock_creator",
        "video_duration_sec": 15,
    }

def scrape_tiktok_metadata(url: str):
    return scrape_video_metadata(url)
