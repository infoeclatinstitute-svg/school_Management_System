/**
 * Platform Detection Utilities
 * Differentiates between the public web marketing portal and the official native secured applications.
 */

export function isElectronApp(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as any
  const search = typeof window.location !== 'undefined' ? window.location.search : ''
  if (search.includes('platform=desktop')) {
    try {
      sessionStorage.setItem('gc_platform', 'desktop')
      localStorage.setItem('gc_platform', 'desktop')
    } catch {}
    return true
  }
  return Boolean(
    w.desktopAPI?.isDesktop ||
    w.electronAPI ||
    /Electron|GlobalCollegeDesktopWorkstation|GlobalCollegeDesktop/i.test(navigator.userAgent) ||
    w.process?.versions?.electron ||
    (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gc_platform') === 'desktop') ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('gc_platform') === 'desktop')
  )
}

export function isCapacitorApp(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as any
  return Boolean(
    w.Capacitor?.isNativePlatform?.() ||
    w.Capacitor?.getPlatform?.() === 'android' ||
    w.Capacitor?.getPlatform?.() === 'ios' ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'ionic:' ||
    /Capacitor/i.test(navigator.userAgent) ||
    Boolean(w.AndroidSecurity) ||
    (typeof document !== 'undefined' && typeof document.referrer === 'string' && document.referrer.includes('android-app://')) ||
    (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gc_platform') === 'mobile')
  )
}

export function isNativeApp(): boolean {
  return isElectronApp() || isCapacitorApp()
}

export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false
  return /android/i.test(navigator.userAgent)
}

export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export const OFFICIAL_APK_URL = 'https://github.com/Smart-009/brent1_college/releases/latest/download/global-college.apk'
export const OFFICIAL_APKPURE_URL = 'https://apkpure.com/p/com.globalcollege.lms'
export const LOCAL_APK_URL = '/downloads/global-college.apk'
export const OFFICIAL_DESKTOP_URL = '/downloads/global-college-setup.exe'
export const LOCAL_DESKTOP_URL = '/global-college-setup.exe'

export function getFriendlyDeviceName(): string {
  if (typeof window === 'undefined') return 'Authorized Device'
  const ua = navigator.userAgent
  let platform = 'Web Browser'
  if (isCapacitorApp() || /Capacitor/i.test(ua)) {
    platform = 'Official Android Mobile App'
  } else if (isElectronApp() || /Electron/i.test(ua)) {
    platform = 'Official Desktop Workstation App'
  } else if (/Android/i.test(ua)) {
    platform = 'Android Mobile Phone'
  } else if (/iPhone/i.test(ua)) {
    platform = 'Apple iPhone'
  } else if (/iPad/i.test(ua)) {
    platform = 'Apple iPad'
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    platform = 'macOS Computer'
  } else if (/Windows NT/i.test(ua)) {
    platform = 'Windows PC'
  } else if (/Linux/i.test(ua)) {
    platform = 'Linux Computer'
  }

  let browser = ''
  if (!isNativeApp()) {
    if (/Edg/i.test(ua)) browser = ' • Edge'
    else if (/Chrome/i.test(ua)) browser = ' • Chrome'
    else if (/Safari/i.test(ua)) browser = ' • Safari'
    else if (/Firefox/i.test(ua)) browser = ' • Firefox'
    else if (/Opera|OPR/i.test(ua)) browser = ' • Opera'
  }

  return `${platform}${browser}`
}


