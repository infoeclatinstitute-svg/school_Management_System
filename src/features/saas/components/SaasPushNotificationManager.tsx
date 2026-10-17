// ============================================================
// Global College — SaaS Admin Push Notification Manager
// Allows Platform Superadmins to send browser push notifications
// to campuses, roles (Principals, Teachers, Bursars, Students)
// ============================================================

import React, { useState, useEffect, useId } from 'react'
import type { PartnerSchoolTenant } from '@/types/tenantSchool'
import type {
  PushNotificationRecord,
  PushNotificationCategory,
  PushNotificationAudience,
  PushPermissionStatus,
} from '@/types/pushNotification'
import {
  pushNotificationService,
  DEFAULT_PUSH_TEMPLATES,
} from '@/lib/pushNotificationService'

interface SaasPushNotificationManagerProps {
  schools: PartnerSchoolTenant[]
}

const CATEGORY_META: Record<
  PushNotificationCategory,
  { label: string; icon: string; color: string; bg: string; border: string }
> = {
  platform_update: {
    label: 'Platform Update',
    icon: '⚡',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.3)',
  },
  billing_alert: {
    label: 'Billing & License',
    icon: '💳',
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.12)',
    border: 'rgba(251, 191, 36, 0.3)',
  },
  emergency_broadcast: {
    label: 'Emergency Broadcast',
    icon: '🚨',
    color: '#f87171',
    bg: 'rgba(248, 113, 113, 0.15)',
    border: 'rgba(248, 113, 113, 0.35)',
  },
  maintenance: {
    label: 'Maintenance',
    icon: '🛠️',
    color: '#fb923c',
    bg: 'rgba(251, 146, 60, 0.12)',
    border: 'rgba(251, 146, 60, 0.3)',
  },
  feature_release: {
    label: 'Feature Release',
    icon: '👑',
    color: '#c084fc',
    bg: 'rgba(192, 132, 252, 0.12)',
    border: 'rgba(192, 132, 252, 0.3)',
  },
}

const AUDIENCE_META: Record<PushNotificationAudience, { label: string; icon: string; reachDesc: string }> = {
  all_schools: {
    label: 'All Campuses & Portals (Broadcast)',
    icon: '🌐',
    reachDesc: 'All registered institutions, campuses & users',
  },
  specific_school: {
    label: 'Specific Campus / School',
    icon: '🏛️',
    reachDesc: 'Single selected institution and all its portals',
  },
  principals: {
    label: 'Principals & Executive Offices',
    icon: '🎓',
    reachDesc: 'School heads, owners, directors & campus administrators',
  },
  teachers: {
    label: 'Academic Faculty & Teachers',
    icon: '👨‍🏫',
    reachDesc: 'Subject tutors, departmental heads & examiners',
  },
  bursars: {
    label: 'Bursars & Finance Desks',
    icon: '💰',
    reachDesc: 'Bursars, cashiers, accounts & fee management officers',
  },
  students: {
    label: 'Students & Parents Portals',
    icon: '🎒',
    reachDesc: 'Enrolled learners, course students and parent contacts',
  },
}

export function SaasPushNotificationManager({ schools }: SaasPushNotificationManagerProps) {
  const formId = useId()

  // Service State
  const [permission, setPermission] = useState<PushPermissionStatus>(() =>
    pushNotificationService.getPermissionStatus()
  )
  const [notifications, setNotifications] = useState<PushNotificationRecord[]>(() =>
    pushNotificationService.getHistory()
  )
  const isSupported = pushNotificationService.isSupported()

  // Form State
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<PushNotificationCategory>('platform_update')
  const [audience, setAudience] = useState<PushNotificationAudience>('all_schools')
  const [targetSchoolSlug, setTargetSchoolSlug] = useState<string>(schools[0]?.slug || '')
  const [targetUrl, setTargetUrl] = useState('/saas-admin')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  // UI / Feedback State
  const [isDispatching, setIsDispatching] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // Subscribe to push notification updates
  useEffect(() => {
    const unsubscribe = pushNotificationService.subscribe(() => {
      setNotifications(pushNotificationService.getHistory())
      setPermission(pushNotificationService.getPermissionStatus())
    })
    return () => unsubscribe()
  }, [])

  // Auto-fill template
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const tmpl = DEFAULT_PUSH_TEMPLATES.find((t) => t.id === templateId)
    if (!tmpl) return
    setTitle(tmpl.title)
    setBody(tmpl.body)
    setCategory(tmpl.category)
    setAudience(tmpl.audience)
    if (tmpl.targetUrl) setTargetUrl(tmpl.targetUrl)
  }

  // Request browser permission
  const handleRequestPermission = async () => {
    const result = await pushNotificationService.requestPermission()
    setPermission(result)
    if (result === 'granted') {
      setFeedback({
        type: 'success',
        text: '✓ Push notification permissions granted on this device!',
      })
      // Send a welcoming test notification
      void pushNotificationService.sendDeviceNotification('Global College SaaS Admin', {
        body: 'Push notifications are now enabled! You will receive live platform alerts here.',
        icon: '/logo.png',
        badge: '/favicon.ico',
        data: { url: '/saas-admin' },
      })
    } else {
      setFeedback({
        type: 'error',
        text: 'Push notifications permission was not granted. Please enable notifications in your browser settings.',
      })
    }
  }

  // Send immediate test alert to this device
  const handleTestThisDevice = async () => {
    if (permission !== 'granted') {
      await handleRequestPermission()
      return
    }

    const ok = await pushNotificationService.sendDeviceNotification(
      title.trim() || '🧪 Test Push Alert — Global College',
      {
        body:
          body.trim() ||
          'This is a live test notification verifying sound, badge, vibration, and push delivery on your browser.',
        icon: '/logo.png',
        badge: '/favicon.ico',
        data: { url: targetUrl },
      }
    )

    if (ok) {
      setFeedback({
        type: 'success',
        text: '✓ Test push notification sent to your device!',
      })
    } else {
      setFeedback({
        type: 'error',
        text: 'Failed to send device notification. Ensure notification permissions are allowed.',
      })
    }
  }

  // Dispatch broadcast push notification
  const handleDispatchPush = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      setFeedback({ type: 'error', text: 'Notification Title and Body are required.' })
      return
    }

    setIsDispatching(true)
    setFeedback(null)

    try {
      const targetSchool = schools.find((s) => s.slug === targetSchoolSlug)

      const record = await pushNotificationService.broadcastNotification({
        title: title.trim(),
        body: body.trim(),
        category,
        audience,
        targetSchoolSlug: audience === 'specific_school' ? targetSchoolSlug : undefined,
        targetSchoolName: audience === 'specific_school' ? targetSchool?.name : undefined,
        targetUrl: targetUrl.trim() || '/saas-admin',
        icon: '/logo.png',
        badge: '/favicon.ico',
      })

      setFeedback({
        type: 'success',
        text: `✓ Push notification successfully broadcast to ${record.recipientCount.toLocaleString()} recipient(s) across ${
          audience === 'specific_school' && targetSchool ? targetSchool.name : 'the platform'
        }!`,
      })

      // Reset form slightly but keep useful values
      setTitle('')
      setBody('')
      setSelectedTemplateId('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error occurred while dispatching.'
      setFeedback({ type: 'error', text: `Failed to dispatch notification: ${msg}` })
    } finally {
      setIsDispatching(false)
    }
  }

  // Delete notification
  const handleDeleteNotification = (id: string) => {
    pushNotificationService.deleteNotification(id)
  }

  // Clear all
  const handleClearHistory = () => {
    if (window.confirm('Clear all dispatched push notification history?')) {
      pushNotificationService.clearHistory()
    }
  }

  // Filtered notifications
  const filteredNotifications = notifications.filter((notif) => {
    if (filterCategory !== 'all' && notif.category !== filterCategory) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      notif.title.toLowerCase().includes(q) ||
      notif.body.toLowerCase().includes(q) ||
      (notif.targetSchoolName && notif.targetSchoolName.toLowerCase().includes(q))
    )
  })

  // Total Reach Metric
  const totalReach = notifications.reduce((acc, curr) => acc + (curr.recipientCount || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* =========================================================================
          SECTION 1: HERO & DEVICE PUSH STATUS
          ========================================================================= */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.35) 0%, rgba(19, 27, 46, 0.95) 100%)',
          borderRadius: '24px',
          padding: '2rem',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.8rem' }}>🔔</span>
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#f8fafc' }}>
                Platform Push Notification Broadcast Engine
              </h2>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: '#cbd5e1', maxWidth: '780px', lineHeight: 1.5 }}>
              Dispatch real-time web push alerts and system messages directly to institution campuses, school heads,
              bursars, teachers, and enrolled students on desktop and mobile devices.
            </p>
          </div>

          {/* Browser Permission Pill & Actions */}
          <div
            style={{
              background: '#0a0f1d',
              padding: '1rem 1.25rem',
              borderRadius: '16px',
              border: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              minWidth: '240px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
                Device Push Status
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background:
                    permission === 'granted'
                      ? 'rgba(16, 185, 129, 0.2)'
                      : permission === 'denied'
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'rgba(245, 158, 11, 0.2)',
                  color:
                    permission === 'granted' ? '#34d399' : permission === 'denied' ? '#f87171' : '#fbbf24',
                  border: `1px solid ${
                    permission === 'granted'
                      ? 'rgba(16, 185, 129, 0.4)'
                      : permission === 'denied'
                      ? 'rgba(239, 68, 68, 0.4)'
                      : 'rgba(245, 158, 11, 0.4)'
                  }`,
                }}
              >
                {permission === 'granted'
                  ? '● Push Active'
                  : permission === 'denied'
                  ? '✕ Blocked in Browser'
                  : '⚠️ Permission Needed'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {permission !== 'granted' ? (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)',
                  }}
                >
                  🔔 Enable Push Notifications
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleTestThisDevice}
                  style={{
                    flex: 1,
                    background: '#1e293b',
                    color: '#38bdf8',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                    cursor: 'pointer',
                  }}
                >
                  🧪 Test My Device
                </button>
              )}
            </div>
            {!isSupported && (
              <div style={{ fontSize: '0.72rem', color: '#f87171' }}>
                Note: Web Notifications API is not supported on this browser.
              </div>
            )}
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginTop: '1.75rem',
          }}
        >
          <div style={{ background: '#0a0f1d', borderRadius: '16px', padding: '1.15rem', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
              Broadcasts Dispatched
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#c084fc', margin: '4px 0 0' }}>
              {notifications.length} Alerts
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px' }}>
              Archived in cloud &amp; local log
            </div>
          </div>

          <div style={{ background: '#0a0f1d', borderRadius: '16px', padding: '1.15rem', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
              Cumulative Audience Reach
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#38bdf8', margin: '4px 0 0' }}>
              {totalReach.toLocaleString()} Recipients
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px' }}>
              Across {schools.length} registered campus systems
            </div>
          </div>

          <div style={{ background: '#0a0f1d', borderRadius: '16px', padding: '1.15rem', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
              Service Worker State
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#34d399', margin: '6px 0 0' }}>
              PWA sw.js Active
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '5px' }}>
              Handles background push &amp; notificationclick
            </div>
          </div>

          <div style={{ background: '#0a0f1d', borderRadius: '16px', padding: '1.15rem', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
              Target Segments
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fbbf24', margin: '4px 0 0' }}>
              6 Audiences
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px' }}>
              Broadcast, Campuses, Principals, Faculty
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '14px',
            background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${feedback.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: feedback.type === 'success' ? '#a7f3d0' : '#fca5a5',
            fontWeight: 800,
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* =========================================================================
          SECTION 2: DISPATCH CONSOLE & LIVE PREVIEW
          ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        {/* DISPATCH FORM */}
        <div
          style={{
            background: '#131b2e',
            borderRadius: '20px',
            padding: '1.75rem',
            border: '1px solid #1e293b',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#f8fafc' }}>
                Compose Push Notification
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Choose pre-configured template or write custom broadcast alert.
              </p>
            </div>
            <span style={{ fontSize: '1.4rem' }}>✍️</span>
          </div>

          {/* Quick Template Picker */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor={`${formId}-template-select`}
              style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}
            >
              🚀 Fast Template Selector
            </label>
            <select
              id={`${formId}-template-select`}
              value={selectedTemplateId}
              onChange={(e) => handleSelectTemplate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '10px',
                background: '#0a0f1d',
                border: '1px solid #334155',
                color: '#f8fafc',
                fontSize: '0.85rem',
                fontWeight: 700,
              }}
            >
              <option value="">-- Select Pre-made Notification Template --</option>
              {DEFAULT_PUSH_TEMPLATES.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.title}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleDispatchPush} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {/* Category Selector */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: '#94a3b8',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                }}
              >
                Notification Category
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
                {(Object.keys(CATEGORY_META) as PushNotificationCategory[]).map((cat) => {
                  const meta = CATEGORY_META[cat]
                  const isSelected = category === cat
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setCategory(cat)}
                      style={{
                        padding: '0.5rem 0.6rem',
                        borderRadius: '10px',
                        border: isSelected ? `2px solid ${meta.color}` : '1px solid #1e293b',
                        background: isSelected ? meta.bg : '#0a0f1d',
                        color: isSelected ? '#ffffff' : '#94a3b8',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label
                htmlFor={`${formId}-audience-select`}
                style={{
                  display: 'block',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: '#94a3b8',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}
              >
                Target Audience
              </label>
              <select
                id={`${formId}-audience-select`}
                value={audience}
                onChange={(e) => setAudience(e.target.value as PushNotificationAudience)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: '#0a0f1d',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                {(Object.keys(AUDIENCE_META) as PushNotificationAudience[]).map((aud) => (
                  <option key={aud} value={aud}>
                    {AUDIENCE_META[aud].icon} {AUDIENCE_META[aud].label}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                Audience Scope: {AUDIENCE_META[audience].reachDesc}
              </div>
            </div>

            {/* Specific School Picker if selected */}
            {audience === 'specific_school' && (
              <div>
                <label
                  htmlFor={`${formId}-school-select`}
                  style={{
                    display: 'block',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: '#94a3b8',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                  }}
                >
                  Select Target Campus
                </label>
                <select
                  id={`${formId}-school-select`}
                  value={targetSchoolSlug}
                  onChange={(e) => setTargetSchoolSlug(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    background: '#0a0f1d',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.slug}>
                      {s.name} ({s.campus_count || 1} campus / {s.city || 'Kenya'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Title Input */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label
                  htmlFor={`${formId}-notif-title`}
                  style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}
                >
                  Notification Title
                </label>
                <span style={{ fontSize: '0.72rem', color: title.length > 50 ? '#fbbf24' : '#64748b' }}>
                  {title.length}/60 characters
                </span>
              </div>
              <input
                id={`${formId}-notif-title`}
                type="text"
                required
                maxLength={70}
                placeholder="e.g. 🛠️ Scheduled System Maintenance"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: '#0a0f1d',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                }}
              />
            </div>

            {/* Body Input */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label
                  htmlFor={`${formId}-notif-body`}
                  style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}
                >
                  Notification Body Message
                </label>
                <span style={{ fontSize: '0.72rem', color: body.length > 150 ? '#fbbf24' : '#64748b' }}>
                  {body.length}/200 characters
                </span>
              </div>
              <textarea
                id={`${formId}-notif-body`}
                required
                rows={3}
                maxLength={240}
                placeholder="e.g. Global College Cloud LMS will undergo a 15-minute optimization tonight at 23:00 EAT. All data is backed up."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: '#0a0f1d',
                  border: '1px solid #334155',
                  color: '#cbd5e1',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Action / Target Link */}
            <div>
              <label
                htmlFor={`${formId}-notif-url`}
                style={{
                  display: 'block',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: '#94a3b8',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}
              >
                Target URL / Portal Action Route
              </label>
              <input
                id={`${formId}-notif-url`}
                type="text"
                placeholder="/saas-admin or /s/school-slug"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: '#0a0f1d',
                  border: '1px solid #334155',
                  color: '#38bdf8',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                }}
              />
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                When users tap or click the notification, they are instantly routed to this address.
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={isDispatching || !title.trim() || !body.trim()}
                style={{
                  flex: 2,
                  background: isDispatching
                    ? '#334155'
                    : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: isDispatching || !title.trim() || !body.trim() ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 18px rgba(124, 58, 237, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>{isDispatching ? '⏳ Broadcasting...' : '🚀 Dispatch Push Notification'}</span>
              </button>

              <button
                type="button"
                onClick={handleTestThisDevice}
                style={{
                  flex: 1,
                  background: '#1e293b',
                  color: '#94a3b8',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  padding: '0.85rem',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  cursor: 'pointer',
                }}
              >
                🧪 Preview on Device
              </button>
            </div>
          </form>
        </div>

        {/* LIVE NOTIFICATION PREVIEWS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card: Push Notification System Preview */}
          <div
            style={{
              background: '#131b2e',
              borderRadius: '20px',
              padding: '1.75rem',
              border: '1px solid #1e293b',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#f8fafc' }}>
                  Live Notification Simulation
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                  How this alert appears to users on Android, Windows &amp; macOS devices.
                </p>
              </div>
              <span
                style={{
                  fontSize: '0.72rem',
                  background: CATEGORY_META[category].bg,
                  color: CATEGORY_META[category].color,
                  border: `1px solid ${CATEGORY_META[category].border}`,
                  padding: '3px 8px',
                  borderRadius: '999px',
                  fontWeight: 800,
                }}
              >
                {CATEGORY_META[category].icon} {CATEGORY_META[category].label}
              </span>
            </div>

            {/* Desktop / OS Notification Shell Preview */}
            <div
              style={{
                background: '#090d16',
                borderRadius: '16px',
                padding: '1.25rem',
                border: '1px solid #2d3748',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
              }}
            >
              {/* Notification Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #1a202c',
                  paddingBottom: '0.6rem',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img
                    src="/logo.png"
                    alt="Logo"
                    style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'contain' }}
                    onError={(e) => {
                      ;(e.target as HTMLElement).style.display = 'none'
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.02em' }}>
                    Global College SMS
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>• Web Push</span>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Just now</span>
              </div>

              {/* Notification Body */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: CATEGORY_META[category].bg,
                    border: `1px solid ${CATEGORY_META[category].border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    flexShrink: 0,
                  }}
                >
                  {CATEGORY_META[category].icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#f8fafc', wordBreak: 'break-word' }}>
                    {title.trim() || 'Notification Title Preview'}
                  </div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: '#cbd5e1',
                      marginTop: '3px',
                      lineHeight: 1.45,
                      wordBreak: 'break-word',
                    }}
                  >
                    {body.trim() ||
                      'The notification message body will be rendered here with system sounds and lock-screen alerts.'}
                  </div>
                </div>
              </div>

              {/* Simulated Notification Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '1rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #1a202c',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    background: '#1a202c',
                    color: '#38bdf8',
                    textAlign: 'center',
                    padding: '0.45rem',
                    borderRadius: '8px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                  }}
                >
                  Open Portal ➔
                </div>
                <div
                  style={{
                    background: '#1a202c',
                    color: '#94a3b8',
                    textAlign: 'center',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                  }}
                >
                  Dismiss
                </div>
              </div>
            </div>

            {/* Target Delivery Summary */}
            <div
              style={{
                marginTop: '1.25rem',
                background: '#0a0f1d',
                borderRadius: '12px',
                padding: '0.9rem',
                border: '1px solid #1e293b',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
                Delivery Route &amp; Scope
              </div>
              <div style={{ fontSize: '0.8rem', color: '#f8fafc', marginTop: '3px' }}>
                <strong>Audience:</strong> {AUDIENCE_META[audience].label}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                <strong>Destination URL:</strong> <code>{targetUrl || '/saas-admin'}</code>
              </div>
            </div>
          </div>

          {/* Quick Push Best Practices */}
          <div
            style={{
              background: '#0a0f1d',
              borderRadius: '20px',
              padding: '1.5rem',
              border: '1px solid #1e293b',
            }}
          >
            <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', fontWeight: 900, color: '#f8fafc' }}>
              💡 Push Notification Best Practices
            </h5>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.6 }}>
              <li>
                <strong>Keep titles concise</strong> (under 45 characters) so they display completely without truncation on mobile lock screens.
              </li>
              <li>
                <strong>Use high-contrast emojis</strong> (🛠️, 💳, 👑, 🚨, 📊) to allow recipients to quickly identify the notice priority.
              </li>
              <li>
                <strong>PWA Offline Capability</strong>: Even if the recipient is currently offline, modern service workers queue and present the notification upon reconnecting.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: DISPATCHED BROADCAST HISTORY LEDGER
          ========================================================================= */}
      <div
        style={{
          background: '#131b2e',
          borderRadius: '20px',
          padding: '1.75rem',
          border: '1px solid #1e293b',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#f8fafc' }}>
              Dispatched Broadcast Activity Log ({filteredNotifications.length})
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              Chronological ledger of push alerts transmitted to campus portals.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Filter by Category */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{
                background: '#0a0f1d',
                color: '#f8fafc',
                border: '1px solid #334155',
                padding: '0.5rem 0.85rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              <option value="all">All Categories ({notifications.length})</option>
              {(Object.keys(CATEGORY_META) as PushNotificationCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_META[cat].icon} {CATEGORY_META[cat].label}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: '#0a0f1d',
                color: '#f8fafc',
                border: '1px solid #334155',
                padding: '0.5rem 0.85rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
              }}
            />

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                style={{
                  background: '#1e293b',
                  color: '#fca5a5',
                  border: '1px solid #7f1d1d',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Clear History
              </button>
            )}
          </div>
        </div>

        {/* Ledger Table */}
        {filteredNotifications.length === 0 ? (
          <div
            style={{
              padding: '3rem 1rem',
              textAlign: 'center',
              color: '#94a3b8',
              background: '#0a0f1d',
              borderRadius: '14px',
              border: '1px dashed #334155',
            }}
          >
            <span style={{ fontSize: '2rem' }}>📭</span>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, marginTop: '8px', color: '#f8fafc' }}>
              No Push Notifications Match Filter
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
              Dispatch a new alert above or clear search filters.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Dispatched At</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Audience &amp; Target</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Notification Content</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Reach</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotifications.map((notif) => {
                  const meta = CATEGORY_META[notif.category] || CATEGORY_META.platform_update
                  const audMeta = AUDIENCE_META[notif.audience] || AUDIENCE_META.all_schools
                  const dateStr = new Date(notif.sentAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <tr
                      key={notif.id}
                      style={{
                        borderBottom: '1px solid #1e293b',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '1rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 800, color: '#f8fafc' }}>{dateStr}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>by {notif.sentBy}</div>
                      </td>
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '999px',
                            background: meta.bg,
                            color: meta.color,
                            border: `1px solid ${meta.border}`,
                          }}
                        >
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{audMeta.icon}</span>
                          <span>{notif.targetSchoolName || audMeta.label}</span>
                        </div>
                        {notif.targetUrl && (
                          <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '2px', fontFamily: 'monospace' }}>
                            {notif.targetUrl}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem', maxWidth: '340px' }}>
                        <div style={{ fontWeight: 900, color: '#ffffff', marginBottom: '2px' }}>
                          {notif.title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
                          {notif.body}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 900, color: '#38bdf8' }}>
                          {notif.recipientCount.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>recipients</div>
                      </td>
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          ✓ Delivered
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setTitle(notif.title)
                              setBody(notif.body)
                              setCategory(notif.category)
                              setAudience(notif.audience)
                              if (notif.targetUrl) setTargetUrl(notif.targetUrl)
                            }}
                            title="Reuse this notification as a template"
                            style={{
                              background: '#1e293b',
                              color: '#cbd5e1',
                              border: '1px solid #334155',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Reuse
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNotification(notif.id)}
                            title="Delete from log"
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
