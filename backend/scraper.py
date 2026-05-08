import random
import time

def scrape_tiktok_metadata(url: str):
    """
    Mock TikTok scraper. In a real scenario, this would use a library 
    like TikTokApi or playwright to extract video metrics.
    """
    print(f"[Scraper] Fetching metadata for {url}...")
    time.sleep(2) # Simulate network delay
    
    # Mocking a viral video view count
    views = random.randint(5000, 150000)
    
    return {
        "url": url,
        "views": views,
        "author": "@mock_creator",
        "video_duration_sec": 15
    }
