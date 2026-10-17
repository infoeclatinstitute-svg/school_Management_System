// ============================================================
// Global College — SaaS Admin Push Notification Service
// ============================================================

import type {
  PushNotificationRecord,
  SendPushNotificationInput,
  PushPermissionStatus,
  PushTemplate,
} from '@/types/pushNotification'

const STORAGE_KEY = 'gc_saas_push_notifications'

export const DEFAULT_PUSH_TEMPLATES: PushTemplate[] = [
  {
    id: 'maintenance-notice',
    title: '🛠️ Scheduled System Maintenance',
    body: 'Global College Cloud LMS will undergo a 15-minute optimization maintenance tonight at 23:00 EAT. All data is backed up.',
    category: 'maintenance',
    audience: 'all_schools',
    targetUrl: '/saas-admin',
  },
  {
    id: 'license-expiry-notice',
    title: '⚠️ Institutional Campus License Expiring Soon',
    body: 'Your school subscription product key is nearing its renewal date. Issue or renew via your M-Pesa billing desk.',
    category: 'billing_alert',
    audience: 'principals',
    targetUrl: '/s/all',
  },
  {
    id: 'gold-tier-unlocked',
    title: '👑 Gold Tier Public Showcase Now Available',
    body: 'Unlock your campus dedicated public page, academic programs catalog, and facilities showcase for KES 3,000/mo.',
    category: 'feature_release',
    audience: 'all_schools',
    targetUrl: '/saas-admin',
  },
  {
    id: 'gradebook-reminder',
    title: '📊 Term CAT & Final Exam Grade Submission',
    body: 'Reminder to all academic faculty: End of term Continuous Assessment Tests and examination scores must be posted before Friday.',
    category: 'platform_update',
    audience: 'teachers',
    targetUrl: '/',
  },
  {
    id: 'emergency-advisory',
    title: '🚨 Urgent Institutional Campus Advisory',
    body: 'All physical campus classes will switch to virtual LMS delivery today due to inclement weather. Check your student portal.',
    category: 'emergency_broadcast',
    audience: 'all_schools',
    targetUrl: '/',
  },
]

class PushNotificationService {
  private listeners: Array<() => void> = []

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window
  }

  public getPermissionStatus(): PushPermissionStatus {
    if (!this.isSupported()) return 'unsupported'
    return Notification.permission as PushPermissionStatus
  }

  public async requestPermission(): Promise<PushPermissionStatus> {
    if (!this.isSupported()) return 'unsupported'
    try {
      const result = await Notification.requestPermission()
      this.notifyListeners()
      return result as PushPermissionStatus
    } catch {
      return this.getPermissionStatus()
    }
  }

  public getHistory(): PushNotificationRecord[] {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        return JSON.parse(raw) as PushNotificationRecord[]
      }
    } catch {
      // Fallback
    }

    // Default seed records if empty
    const seed: PushNotificationRecord[] = [
      {
        id: 'notif-seed-1',
        title: '👑 Gold Tier Key Generator Launched',
        body: 'SaaS Admin key generator now generates dedicated public showcase keys at KES 3,000 / month.',
        category: 'feature_release',
        audience: 'all_schools',
        targetUrl: '/saas-admin',
        sentAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        sentBy: 'System Administrator (SaaS HQ)',
        recipientCount: 42,
        status: 'delivered',
      },
      {
        id: 'notif-seed-2',
        title: '🔔 Scheduled Database Indexing Completed',
        body: 'PostgreSQL read replicas and offline IndexedDB caches synchronized across all campus tenants.',
        category: 'platform_update',
        audience: 'all_schools',
        targetUrl: '/saas-admin',
        sentAt: new Date(Date.now() - 86400000).toISOString(),
        sentBy: 'System Administrator (SaaS HQ)',
        recipientCount: 156,
        status: 'delivered',
      },
    ]

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
    } catch {
      // Ignore
    }

    return seed
  }

  public async sendDeviceNotification(
    title: string,
    options: {
      body: string
      icon?: string
      badge?: string
      data?: { url?: string }
    }
  ): Promise<boolean> {
    if (!this.isSupported()) return false

    if (Notification.permission !== 'granted') {
      const perm = await this.requestPermission()
      if (perm !== 'granted') return false
    }

    try {
      // Attempt via Service Worker registration first (standard for PWAs)
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration()
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(title, {
            body: options.body,
            icon: options.icon || '/logo.png',
            badge: options.badge || '/favicon.ico',
            data: options.data,
            vibrate: [200, 100, 200],
          } as NotificationOptions)
          return true
        }
      }

      // Fallback to standard Window Notification constructor
      new Notification(title, {
        body: options.body,
        icon: options.icon || '/logo.png',
        badge: options.badge || '/favicon.ico',
        data: options.data,
      } as NotificationOptions)
      return true
    } catch {
      return false
    }
  }

  public async broadcastNotification(input: SendPushNotificationInput): Promise<PushNotificationRecord> {
    // 1. Calculate estimated recipient count based on audience
    let recipientCount = 10
    if (input.audience === 'all_schools') recipientCount = 1250
    else if (input.audience === 'students') recipientCount = 980
    else if (input.audience === 'teachers') recipientCount = 145
    else if (input.audience === 'principals') recipientCount = 48
    else if (input.audience === 'bursars') recipientCount = 35
    else if (input.audience === 'specific_school') recipientCount = 85

    // 2. Create history record
    const record: PushNotificationRecord = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: input.title.trim(),
      body: input.body.trim(),
      category: input.category,
      audience: input.audience,
      targetSchoolSlug: input.targetSchoolSlug,
      targetSchoolName: input.targetSchoolName,
      targetUrl: input.targetUrl || '/saas-admin',
      icon: input.icon || '/logo.png',
      badge: input.badge || '/favicon.ico',
      sentAt: new Date().toISOString(),
      sentBy: 'SaaS Platform Superadmin',
      recipientCount,
      status: 'delivered',
    }

    // 3. Persist to storage
    const current = this.getHistory()
    const updated = [record, ...current]
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {
      // Storage quota safety
    }

    // 4. Send native device notification so the administrator experiences the immediate push
    if (this.isSupported() && Notification.permission === 'granted') {
      void this.sendDeviceNotification(record.title, {
        body: record.body,
        icon: record.icon,
        badge: record.badge,
        data: { url: record.targetUrl },
      })
    }

    this.notifyListeners()
    return record
  }

  public deleteNotification(id: string): void {
    const current = this.getHistory()
    const updated = current.filter((n) => n.id !== id)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {
      // Storage safety
    }
    this.notifyListeners()
  }

  public clearHistory(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
    } catch {
      // Storage safety
    }
    this.notifyListeners()
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener()
      } catch {
        // Safe callback execution
      }
    })
  }
}

export const pushNotificationService = new PushNotificationService()
