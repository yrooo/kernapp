/**
 * Campaign Cache Utility
 *
 * Caches campaign data in sessionStorage to reduce API calls.
 * Cache is invalidated when user joins a new campaign.
 */

const CACHE_KEY = "kern_campaigns_cache"
const JOINED_CAMPAIGNS_CACHE_KEY = "kern_joined_campaigns_cache"
const CACHE_TIMESTAMP_KEY = "kern_campaigns_cache_timestamp"

interface CacheData {
  campaigns: any[]
  timestamp: number
}

interface JoinedCampaignsCacheData {
  campaigns: any[]
  timestamp: number
  userId: string
}

/**
 * Get all active campaigns from cache or fetch if not cached
 */
export async function getCampaignsWithCache(
  fetchFn: () => Promise<any[]>
): Promise<any[]> {
  const cached = getFromCache(CACHE_KEY)

  if (cached) {
    console.log("[Cache] Using cached campaigns")
    return cached
  }

  console.log("[Cache] Fetching campaigns from API")
  const campaigns = await fetchFn()
  setCache(CACHE_KEY, campaigns)
  return campaigns
}

/**
 * Get user's joined campaigns from cache or fetch if not cached
 */
export async function getJoinedCampaignsWithCache(
  userId: string,
  fetchFn: () => Promise<any[]>
): Promise<any[]> {
  const cached = getJoinedCampaignsFromCache(userId)

  if (cached) {
    console.log("[Cache] Using cached joined campaigns")
    return cached
  }

  console.log("[Cache] Fetching joined campaigns from API")
  const campaigns = await fetchFn()
  setJoinedCampaignsCache(userId, campaigns)
  return campaigns
}

/**
 * Invalidate all campaign caches
 * Call this when user joins a new campaign
 */
export function invalidateCampaignCaches(): void {
  console.log("[Cache] Invalidating all campaign caches")
  try {
    sessionStorage.removeItem(CACHE_KEY)
    sessionStorage.removeItem(CACHE_TIMESTAMP_KEY)
    // Remove all joined campaigns caches (we don't know all user IDs)
    const keys = Object.keys(sessionStorage)
    keys.forEach((key) => {
      if (key.startsWith(JOINED_CAMPAIGNS_CACHE_KEY)) {
        sessionStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.error("[Cache] Error invalidating cache:", error)
  }
}

/**
 * Invalidate only joined campaigns cache for a specific user
 */
export function invalidateJoinedCampaignsCache(userId: string): void {
  console.log(`[Cache] Invalidating joined campaigns cache for user ${userId}`)
  try {
    sessionStorage.removeItem(`${JOINED_CAMPAIGNS_CACHE_KEY}_${userId}`)
  } catch (error) {
    console.error("[Cache] Error invalidating joined campaigns cache:", error)
  }
}

// Private helper functions

function getFromCache(key: string): any[] | null {
  try {
    const data = sessionStorage.getItem(key)
    if (!data) return null

    const parsed: CacheData = JSON.parse(data)
    return parsed.campaigns
  } catch (error) {
    console.error("[Cache] Error reading cache:", error)
    return null
  }
}

function setCache(key: string, campaigns: any[]): void {
  try {
    const data: CacheData = {
      campaigns,
      timestamp: Date.now(),
    }
    sessionStorage.setItem(key, JSON.stringify(data))
    console.log(`[Cache] Cached ${campaigns.length} campaigns`)
  } catch (error) {
    console.error("[Cache] Error setting cache:", error)
  }
}

function getJoinedCampaignsFromCache(userId: string): any[] | null {
  try {
    const key = `${JOINED_CAMPAIGNS_CACHE_KEY}_${userId}`
    const data = sessionStorage.getItem(key)
    if (!data) return null

    const parsed: JoinedCampaignsCacheData = JSON.parse(data)
    return parsed.campaigns
  } catch (error) {
    console.error("[Cache] Error reading joined campaigns cache:", error)
    return null
  }
}

function setJoinedCampaignsCache(
  userId: string,
  campaigns: any[]
): void {
  try {
    const key = `${JOINED_CAMPAIGNS_CACHE_KEY}_${userId}`
    const data: JoinedCampaignsCacheData = {
      campaigns,
      timestamp: Date.now(),
      userId,
    }
    sessionStorage.setItem(key, JSON.stringify(data))
    console.log(
      `[Cache] Cached ${campaigns.length} joined campaigns for user ${userId}`
    )
  } catch (error) {
    console.error("[Cache] Error setting joined campaigns cache:", error)
  }
}
