/**
 * Over-The-Air (OTA) Live Update Engine for Global College
 * Safely checks for newer cloud builds without causing reload loops
 * or unregistering the installable PWA Service Worker.
 */

const LOCAL_BUILD_TIME_KEY = 'gc_ota_build_timestamp'
let isCheckingUpdate = false

export function getCurrentRuntimeBuildTimestamp(): number {
  try {
    if (typeof __APP_BUILD_TIMESTAMP__ !== 'undefined' && typeof __APP_BUILD_TIMESTAMP__ === 'number') {
      return __APP_BUILD_TIMESTAMP__
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

export async function checkForOTAUpdates(_force: boolean = false): Promise<boolean> {
  if (isCheckingUpdate || typeof window === 'undefined' || !navigator.onLine) {
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

    const storedBuildTime = Number(localStorage.getItem(LOCAL_BUILD_TIME_KEY)) || 0

    // First time seeing build timestamp: record it without reloading
    if (!storedBuildTime) {
      localStorage.setItem(LOCAL_BUILD_TIME_KEY, remoteBuildTime.toString())
      return false
    }

    // Only reload ONCE if remoteBuildTime is strictly newer than storedBuildTime
    if (remoteBuildTime > storedBuildTime) {
      localStorage.setItem(LOCAL_BUILD_TIME_KEY, remoteBuildTime.toString())
      await clearAllWebCaches()
      return true
    }
  } catch (err) {
    console.debug('[OTA Update] Silent check completed:', err)
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

  checkForOTAUpdates().catch(() => {})

  const intervalTimer = setInterval(() => {
    checkForOTAUpdates().catch(() => {})
  }, 60000)

  return () => {
    clearInterval(intervalTimer)
  }
}
