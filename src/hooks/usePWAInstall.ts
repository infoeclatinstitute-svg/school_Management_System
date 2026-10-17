import { useState, useEffect } from 'react'
import { isNativeApp, isElectronApp, isCapacitorApp } from '../utils/platform'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function checkIsInstalledSync(): boolean {
  if (typeof window === 'undefined') return false
  if (isNativeApp()) return true
  try {
    if (
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.matchMedia?.('(display-mode: window-controls-overlay)')?.matches ||
      (window.navigator as unknown as { standalone?: boolean })?.standalone === true ||
      (typeof document !== 'undefined' && typeof document.referrer === 'string' && document.referrer.includes('android-app://'))
    ) {
      return true
    }
  } catch {}
  return false
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && (window as any).__deferredPWAInstallPrompt) {
      return (window as any).__deferredPWAInstallPrompt as BeforeInstallPromptEvent
    }
    return null
  })
  const [isInstallable, setIsInstallable] = useState<boolean>(() => {
    if (checkIsInstalledSync()) return false
    return typeof window !== 'undefined' && Boolean((window as any).__deferredPWAInstallPrompt)
  })
  const [isInstalled, setIsInstalled] = useState<boolean>(() => checkIsInstalledSync())
  const [isIOS, setIsIOS] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showInstallGuide, setShowInstallGuide] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // If running inside desktop Electron app or native mobile app, mark as permanently installed
    if (isNativeApp() || isElectronApp() || isCapacitorApp()) {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      setShowInstallGuide(false)
      return
    }

    // Check if already installed / running in native app or standalone window
    const isStandalone = checkIsInstalledSync()

    setIsInstalled(isStandalone)

    // Detect device form factor
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    const isMobileDevice = /android|iphone|ipad|ipod|mobile/.test(userAgent)
    setIsIOS(isIosDevice)
    setIsMobile(isMobileDevice)

    // Check if global script already captured beforeinstallprompt
    if ((window as any).__deferredPWAInstallPrompt) {
      setDeferredPrompt((window as any).__deferredPWAInstallPrompt)
      setIsInstallable(true)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      ;(window as any).__deferredPWAInstallPrompt = e
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    const handleCustomInstallAvailable = (e: Event) => {
      const customEvt = e as CustomEvent<BeforeInstallPromptEvent>
      if (customEvt.detail) {
        setDeferredPrompt(customEvt.detail)
        setIsInstallable(true)
      }
    }

    const handleAppInstalled = () => {
      ;(window as any).__deferredPWAInstallPrompt = null
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      setShowInstallGuide(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('pwa-install-available', handleCustomInstallAvailable)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('pwa-install-available', handleCustomInstallAvailable)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptNativeInstall = async (): Promise<boolean> => {
    const activePrompt = deferredPrompt || (typeof window !== 'undefined' ? (window as any).__deferredPWAInstallPrompt : null)
    if (activePrompt) {
      try {
        await activePrompt.prompt()
        const { outcome } = await activePrompt.userChoice
        if (outcome === 'accepted') {
          ;(window as any).__deferredPWAInstallPrompt = null
          setIsInstalled(true)
          setIsInstallable(false)
          setDeferredPrompt(null)
          setShowInstallGuide(false)
          return true
        }
      } catch (err) {
        console.warn('Native install prompt error:', err)
      }
    }
    return false
  }

  const promptInstall = async (): Promise<boolean> => {
    if (isInstalled || isNativeApp() || isElectronApp()) {
      return false
    }
    // Open comprehensive installation & app download hub for Phone (Android APK / iOS) & Desktop (Windows .exe / macOS)
    setShowInstallGuide(true)
    return true
  }

  return {
    isInstallable,
    isInstalled,
    isIOS,
    isMobile,
    showInstallGuide,
    setShowInstallGuide,
    promptInstall,
    promptNativeInstall,
    hasNativePrompt: Boolean(deferredPrompt || (typeof window !== 'undefined' && (window as any).__deferredPWAInstallPrompt)),
  }
}
