/**
 * Over-The-Air (OTA) Live Update & Self-Refresh Engine for Global College
 * Automatically detects new cloud deployments, clears stale web caches,
 * and refreshes the application smoothly without causing reload loops
 * or unregistering the installable PWA Service Worker.
 */

const LOCAL_BUILD_TIME_KEY = 'gc_ota_build_timestamp'
let isCheckingUpdate = false
let isReloading = false
let pendingSilentUpdate = false
let idleTimer: any = null

function scheduleSilentActivation() {
  if (typeof window === 'undefined' || !pendingSilentUpdate) return

  // 1. Silent swap when tab/app goes into the background
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden' && pendingSilentUpdate && !isReloading) {
      isReloading = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.location.reload()
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange, { once: true })

  // 2. Silent swap on browser history navigation
  const onPopState = () => {
    if (pendingSilentUpdate && !isReloading) {
      isReloading = true
      window.removeEventListener('popstate', onPopState)
      window.location.reload()
    }
  }
  window.addEventListener('popstate', onPopState, { once: true })

  // 3. Silent swap when user is idle for 45s without typing
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    const activeEl = document.activeElement
    const isTyping =
      activeEl &&
      (activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable)
    if (!isTyping && pendingSilentUpdate && !isReloading) {
      isReloading = true
      window.location.reload()
    }
  }, 45000)
}

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
    const isLocalOrigin = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol === 'file:'
    )
    const versionUrl = (isLocalOrigin ? 'https://cloud.eclat.institute/version.json?_nocache=' : '/version.json?_nocache=') + Date.now()
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

    const isCapacitorLocal = typeof window !== 'undefined' &&
      (Boolean((window as any).Capacitor?.isNativePlatform?.()) || window.location.protocol === 'capacitor:' || /Capacitor/i.test(navigator.userAgent)) &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

    if (isNewer || force) {
      localStorage.setItem(LOCAL_BUILD_TIME_KEY, remoteBuildTime.toString())

      // 1. Silently update web caches in the background
      await clearAllWebCaches()

      // 2. Notify Service Worker to skipWaiting in the background
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
      }

      pendingSilentUpdate = true

      // 3. If running inside mobile Capacitor on local asset bundle, switch to live cloud deployment
      if (isCapacitorLocal && navigator.onLine) {
        isReloading = true
        const cloudUrl = 'https://cloud.eclat.institute' + window.location.pathname + window.location.search + window.location.hash
        window.location.href = cloudUrl
        return true
      }

      // 4. If tab is already in background / hidden, reload silently now
      if (document.visibilityState === 'hidden' && !isReloading) {
        isReloading = true
        window.location.reload()
        return true
      }

      // 5. If forced, reload now
      if (force && !isReloading) {
        isReloading = true
        setTimeout(() => {
          window.location.reload()
        }, 300)
        return true
      }

      // 6. Schedule silent activation without popping up any banner
      scheduleSilentActivation()
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

  // 3. Silent refresh when user switches tab or unlocks device
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden' && pendingSilentUpdate && !isReloading) {
      isReloading = true
      window.location.reload()
      return
    }
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

  return () => {
    clearTimeout(initialTimer)
    clearInterval(intervalTimer)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('online', handleOnline)
  }
}
