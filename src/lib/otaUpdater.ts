/**
 * Over-The-Air (OTA) Live Update & Self-Refresh Engine for Global College
 * Automatically detects new cloud deployments, clears stale web caches,
 * and refreshes the application smoothly without causing reload loops
 * or unregistering the installable PWA Service Worker.
 */

const LOCAL_BUILD_TIME_KEY = 'gc_ota_build_timestamp'
const RELOAD_ATTEMPT_KEY = 'gc_ota_reload_attempt'
let isCheckingUpdate = false
let isReloading = false

export function getCurrentRuntimeBuildTimestamp(): number {
  try {
    if (typeof __APP_BUILD_TIMESTAMP__ !== 'undefined') {
      const ts = Number(__APP_BUILD_TIMESTAMP__)
      if (!Number.isNaN(ts) && ts > 0) return ts
    }
  } catch {}
  return 0
}

export async function clearAllWebCaches(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    if ('caches' in window) {
      const cacheKeys = await caches.keys()
      await Promise.all(cacheKeys.map((k) => caches.delete(k)))
    }
    // Update service worker registration without unregistering it (preserves PWA installability)
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((r) => r.update().catch(() => {})))
    }
  } catch (e) {
    console.debug('[OTA] Cache refresh notice:', e)
  }
}

export async function checkForOTAUpdates(force: boolean = false): Promise<boolean> {
  if (isCheckingUpdate || typeof window === 'undefined' || !navigator.onLine || isReloading) {
    return false
  }

  // Clean up any existing ?_ota=... query param from the URL bar without reloading
  try {
    if (window.location.search.includes('_ota=')) {
      const cleanUrl = new URL(window.location.href)
      cleanUrl.searchParams.delete('_ota')
      window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash)
    }
  } catch {}

  // Disable automatic page reloads on local Vite dev server (HMR handles live updates)
  if (import.meta.env.DEV) {
    return false
  }

  isCheckingUpdate = true
  try {
    const versionUrl = '/version.json?_nocache=' + Date.now()
    const response = await fetch(versionUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      cache: 'no-store',
    })

    if (!response.ok) return false

    const remoteManifest = await response.json()
    const remoteBuildTime = Number(remoteManifest?.buildTime) || 0
    if (!remoteBuildTime) return false

    const runtimeBuildTime = getCurrentRuntimeBuildTimestamp()
    const storedBuildTime = Number(localStorage.getItem(LOCAL_BUILD_TIME_KEY)) || 0
    const baselineTime = runtimeBuildTime > 0 ? runtimeBuildTime : storedBuildTime

    // First time seeing build timestamp: record baseline
    if (!baselineTime) {
      localStorage.setItem(LOCAL_BUILD_TIME_KEY, remoteBuildTime.toString())
      return false
    }

    // Check if the cloud build is strictly newer than our current running build
    const isNewer = remoteBuildTime > baselineTime
    if (isNewer || (force && remoteBuildTime !== baselineTime)) {
      // Loop protection: avoid re-triggering reload if this exact build was already reloaded in this session
      const lastAttemptedBuild = sessionStorage.getItem(RELOAD_ATTEMPT_KEY)
      if (lastAttemptedBuild === remoteBuildTime.toString()) {
        return false
      }

      isReloading = true
      sessionStorage.setItem(RELOAD_ATTEMPT_KEY, remoteBuildTime.toString())
      localStorage.setItem(LOCAL_BUILD_TIME_KEY, remoteBuildTime.toString())

      // Notify Service Worker to skipWaiting immediately
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
      }

      await clearAllWebCaches()

      console.info(`[OTA Update] Newer build detected (${remoteBuildTime} > ${baselineTime}). Refreshing system...`)

      window.dispatchEvent(new CustomEvent('gc-app-updating', { detail: { buildTime: remoteBuildTime } }))

      // Execute smooth self-refresh
      setTimeout(() => {
        window.location.reload()
      }, 300)
      return true
    }
  } catch (err) {
    console.debug('[OTA Update] Check completed:', err)
  } finally {
    isCheckingUpdate = false
  }
  return false
}

export function initOTAUpdater(): () => void {
  if (typeof window === 'undefined') return () => {}

  // Clean up any ?_ota= query parameter immediately on mount
  try {
    if (window.location.search.includes('_ota=')) {
      const cleanUrl = new URL(window.location.href)
      cleanUrl.searchParams.delete('_ota')
      window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash)
    }
  } catch {}

  // In development mode, Vite HMR handles updates — never run OTA polling
  if (import.meta.env.DEV) {
    return () => {}
  }

  // 1. Initial check after 3 seconds (smooth startup)
  const initialTimer = setTimeout(() => {
    checkForOTAUpdates().catch(() => {})
  }, 3000)

  // 2. Periodic background check every 45 seconds
  const intervalTimer = setInterval(() => {
    checkForOTAUpdates().catch(() => {})
  }, 45000)

  // 3. Auto-refresh check when user returns to tab / unlocks device
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      checkForOTAUpdates().catch(() => {})
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // 4. Auto-refresh check when network reconnects
  const handleOnline = () => {
    checkForOTAUpdates().catch(() => {})
  }
  window.addEventListener('online', handleOnline)

  // 5. Service Worker controller change (when a newly installed SW claims clients)
  let hadPreviousController = Boolean(navigator.serviceWorker?.controller)
  let swRefreshing = false
  const handleControllerChange = () => {
    if (hadPreviousController && !swRefreshing && !isReloading) {
      swRefreshing = true
      window.location.reload()
    }
    hadPreviousController = true
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
  }

  return () => {
    clearTimeout(initialTimer)
    clearInterval(intervalTimer)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('online', handleOnline)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }
}
