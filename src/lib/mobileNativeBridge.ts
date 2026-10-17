import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { App as CapApp } from '@capacitor/app'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

/**
 * Mobile and Desktop Native Bridge
 * Provides cross-platform hardware features (Camera, Status Bar, App Lifecycle)
 * with automatic graceful fallbacks when running in a standard web browser.
 */

export interface NativePlatformInfo {
  isNative: boolean
  isAndroid: boolean
  isIOS: boolean
  isElectron: boolean
  isWeb: boolean
  platform: 'android' | 'ios' | 'electron' | 'web'
}

export function getPlatformInfo(): NativePlatformInfo {
  const isElectron = typeof window !== 'undefined' && 
    (window.navigator.userAgent.toLowerCase().includes('electron') || !!(window as unknown as { electron?: unknown }).electron)
  const isNative = Capacitor.isNativePlatform()
  const platformName = Capacitor.getPlatform()

  let platform: 'android' | 'ios' | 'electron' | 'web' = 'web'
  if (isNative) {
    platform = platformName === 'ios' ? 'ios' : 'android'
  } else if (isElectron) {
    platform = 'electron'
  }

  return {
    isNative,
    isAndroid: platform === 'android',
    isIOS: platform === 'ios',
    isElectron,
    isWeb: platform === 'web',
    platform,
  }
}

/**
 * Initialize native device capabilities on app mount
 */
export async function initNativeBridge(): Promise<() => void> {
  const info = getPlatformInfo()

  if (!info.isNative) {
    // Non-native (Browser or Electron desktop)
    return () => {}
  }

  // 1. Configure Native Mobile Status Bar
  try {
    await StatusBar.setStyle({ style: Style.Dark })
    if (info.isAndroid) {
      await StatusBar.setBackgroundColor({ color: '#0f172a' })
    }
  } catch (err) {
    console.debug('[NativeBridge] StatusBar config warning:', err)
  }

  // 2. Hardware Back Button Handling for Android
  let backListenerRemove: (() => void) | undefined
  try {
    const handle = await CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack && window.location.pathname !== '/' && window.location.pathname !== '/login') {
        window.history.back()
      } else {
        // At root screen - minimize or exit app gracefully
        CapApp.exitApp()
      }
    })
    backListenerRemove = () => handle.remove()
  } catch (err) {
    console.debug('[NativeBridge] BackButton listener warning:', err)
  }

  return () => {
    if (backListenerRemove) {
      backListenerRemove()
    }
  }
}

/**
 * Native Camera & Image Capture (e.g. for student ID scanning, photo receipts, or profile pictures)
 */
export async function capturePhotoOrScan(options?: {
  allowEditing?: boolean
  source?: 'camera' | 'photos'
}): Promise<string | null> {
  try {
    const image = await Camera.getPhoto({
      quality: 85,
      allowEditing: options?.allowEditing ?? false,
      resultType: CameraResultType.DataUrl,
      source: options?.source === 'photos' ? CameraSource.Photos : CameraSource.Camera,
    })
    return image.dataUrl || null
  } catch (err) {
    console.warn('[NativeBridge] Camera capture canceled or failed:', err)
    return null
  }
}
