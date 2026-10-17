// ============================================================
// Global College — SaaS Admin Push Notification Types
// ============================================================

export type PushNotificationCategory =
  | 'platform_update'
  | 'billing_alert'
  | 'emergency_broadcast'
  | 'maintenance'
  | 'feature_release'

export type PushNotificationAudience =
  | 'all_schools'
  | 'specific_school'
  | 'principals'
  | 'teachers'
  | 'bursars'
  | 'students'

export type PushPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported'

export interface PushNotificationRecord {
  id: string
  title: string
  body: string
  category: PushNotificationCategory
  audience: PushNotificationAudience
  targetSchoolSlug?: string
  targetSchoolName?: string
  targetUrl?: string
  icon?: string
  badge?: string
  sentAt: string
  sentBy: string
  recipientCount: number
  status: 'delivered' | 'sent' | 'queued'
}

export interface SendPushNotificationInput {
  title: string
  body: string
  category: PushNotificationCategory
  audience: PushNotificationAudience
  targetSchoolSlug?: string
  targetSchoolName?: string
  targetUrl?: string
  icon?: string
  badge?: string
}

export interface PushTemplate {
  id: string
  title: string
  body: string
  category: PushNotificationCategory
  audience: PushNotificationAudience
  targetUrl?: string
}
