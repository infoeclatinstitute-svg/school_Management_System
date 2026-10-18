// ============================================================
// Global College — SaaS Admin Push Notification Manager (Studio Edition)
// High-Fidelity Command Center for Platform Superadmins
// ============================================================

import React, { useState, useEffect, useId, useMemo } from 'react'
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
import { isCapacitorApp, isAndroidDevice } from '@/utils/platform'

interface SaasPushNotificationManagerProps {
  schools: PartnerSchoolTenant[]
}

const CATEGORY_META: Record<
  PushNotificationCategory,
  { label: string; icon: string; color: string; bg: string; border: string; glow: string }
> = {
  platform_update: {
    label: 'Platform Update',
    icon: '⚡',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.4)',
    glow: 'rgba(56, 189, 248, 0.25)',
  },
  billing_alert: {
    label: 'Billing & License',
    icon: '💳',
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.12)',
    border: 'rgba(251, 191, 36, 0.4)',
    glow: 'rgba(251, 191, 36, 0.25)',
  },
  emergency_broadcast: {
    label: 'Emergency Alert',
    icon: '🚨',
    color: '#f87171',
    bg: 'rgba(248, 113, 113, 0.15)',
    border: 'rgba(248, 113, 113, 0.45)',
    glow: 'rgba(248, 113, 113, 0.3)',
  },
  maintenance: {
    label: 'Maintenance',
    icon: '🛠️',
    color: '#fb923c',
    bg: 'rgba(251, 146, 60, 0.12)',
    border: 'rgba(251, 146, 60, 0.4)',
    glow: 'rgba(251, 146, 60, 0.25)',
  },
  feature_release: {
    label: 'Feature Release',
    icon: '👑',
    color: '#c084fc',
    bg: 'rgba(192, 132, 252, 0.14)',
    border: 'rgba(192, 132, 252, 0.45)',
    glow: 'rgba(192, 132, 252, 0.3)',
  },
}

const AUDIENCE_META: Record<
  PushNotificationAudience,
  { label: string; icon: string; reachDesc: string; estimatedCount: string }
> = {
  all_schools: {
    label: 'All Campuses (Global Broadcast)',
    icon: '🌐',
    reachDesc: 'All registered institutions, campuses, faculty, staff and students',
    estimatedCount: '10,000+ Users',
  },
  specific_school: {
    label: 'Specific Campus / School',
    icon: '🏛️',
    reachDesc: 'Single selected institution and all its associated roles',
    estimatedCount: 'Targeted Campus',
  },
  principals: {
    label: 'Principals & Executive Offices',
    icon: '🎓',
    reachDesc: 'Campus directors, provosts, owners, and root administrators',
    estimatedCount: '~120 Heads',
  },
  teachers: {
    label: 'Academic Faculty & Teachers',
    icon: '👨‍🏫',
    reachDesc: 'Subject tutors, departmental chairs, lecturers, and examiners',
    estimatedCount: '~850 Lecturers',
  },
  bursars: {
    label: 'Bursars & Finance Desks',
    icon: '💰',
    reachDesc: 'Bursars, cashiers, accountants, and fee reconciliation teams',
    estimatedCount: '~240 Bursars',
  },
  students: {
    label: 'Students & Parents Portals',
    icon: '🎒',
    reachDesc: 'Enrolled students, alumni contacts, and parent guardians',
    estimatedCount: '~8,900 Learners',
  },
}

const EMOJI_PRESETS = ['⚡', '📢', '🚨', '💳', '🛠️', '👑', '📊', '🎓', '✅', '🔥', '🔒', '💡']

const URL_PRESETS = [
  { label: 'SaaS Admin', url: '/saas-admin' },
  { label: 'Campus Hub', url: '/s/all' },
  { label: 'Student Fees', url: '/fees' },
  { label: 'Exam Permits', url: '/exams' },
  { label: 'Timetable', url: '/timetable' },
  { label: 'Noticeboard', url: '/noticeboard' },
]

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
  const isNative = useMemo(() => isCapacitorApp() || isAndroidDevice(), [])

  // Form State
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<PushNotificationCategory>('platform_update')
  const [audience, setAudience] = useState<PushNotificationAudience>('all_schools')
  const [targetSchoolSlug, setTargetSchoolSlug] = useState<string>(schools[0]?.slug || '')
  const [targetUrl, setTargetUrl] = useState('/saas-admin')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  // UI Interactive States
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile')
  const [isDispatching, setIsDispatching] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // Live time for mobile preview
  const [currentTimeStr, setCurrentTimeStr] = useState('')
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 30000)
    return () => clearInterval(timer)
  }, [])

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
      void pushNotificationService.sendDeviceNotification('Global College SaaS Admin', {
        body: 'Push notifications are now active! You will receive live platform broadcast alerts here.',
        icon: '/logo.png',
        badge: '/favicon.ico',
        data: { url: '/saas-admin' },
      })
    } else {
      setFeedback({
        type: 'error',
        text: 'Push notifications permission was not granted. Please enable notifications in your browser or device settings.',
      })
    }
  }

  // Send immediate test alert to this device
  const handleTestThisDevice = async () => {
    if (isSupported && permission !== 'granted' && !isNative) {
      await handleRequestPermission()
      return
    }

    const alertTitle = title.trim() || '🧪 Test Push Alert — Global College'
    const alertBody =
      body.trim() ||
      'This is a live test notification verifying sound, badge, vibration, and push delivery across platform devices.'

    setFeedback({
      type: 'success',
      text: `✓ Test alert broadcast dispatched: "${alertTitle}"`,
    })

    if (isSupported && permission === 'granted') {
      await pushNotificationService.sendDeviceNotification(alertTitle, {
        body: alertBody,
        icon: '/logo.png',
        badge: '/favicon.ico',
        data: { url: targetUrl },
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
        text: `✓ Broadcast successfully transmitted to ${record.recipientCount.toLocaleString()} recipient(s) across ${
          audience === 'specific_school' && targetSchool ? targetSchool.name : 'the entire network'
        }!`,
      })

      // Reset form slightly
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

  const handleDeleteNotification = (id: string) => {
    pushNotificationService.deleteNotification(id)
  }

  const handleClearHistory = () => {
    if (window.confirm('Clear all dispatched push notification history?')) {
      pushNotificationService.clearHistory()
    }
  }

  const appendEmoji = (emoji: string) => {
    setTitle((prev) => (prev ? `${emoji} ${prev}` : `${emoji} `))
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

  const totalReach = notifications.reduce((acc, curr) => acc + (curr.recipientCount || 0), 0)
  const catMeta = CATEGORY_META[category] || CATEGORY_META.platform_update
  const audMeta = AUDIENCE_META[audience] || AUDIENCE_META.all_schools

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* =========================================================================
          TOP COMMAND BAR & SYSTEM STATUS
          ========================================================================= */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.75) 0%, rgba(15, 23, 42, 0.95) 100%)',
          borderRadius: '24px',
          padding: 'clamp(1rem, 2.5vw, 1.75rem) clamp(1rem, 3vw, 2rem)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem',
          }}
        >
          <div style={{ flex: '1 1 280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.35rem',
                  boxShadow: '0 8px 20px rgba(124, 58, 237, 0.4)',
                  flexShrink: 0,
                }}
              >
                🔔
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: 'clamp(1.15rem, 3vw, 1.45rem)', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                    Push Notification Command Studio
                  </h2>
                  <span
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Enterprise Web Push
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.45 }}>
                  Broadcast instant lock-screen alerts to Principals, Faculty, Bursars, and Students across all campus devices.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Device Status Pill */}
          <div
            style={{
              background: '#090e1a',
              borderRadius: '16px',
              padding: '0.75rem 1.15rem',
              border: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
              flexWrap: 'wrap',
              maxWidth: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: isNative ? '#10b981' : !isSupported ? '#38bdf8' : permission === 'granted' ? '#10b981' : permission === 'denied' ? '#ef4444' : '#f59e0b',
                  boxShadow: (isNative || (isSupported && permission === 'granted')) ? '0 0 10px #10b981' : 'none',
                  flexShrink: 0,
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                  {isNative ? 'Android App Engine' : 'Push Broadcast Engine'}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: isNative ? '#34d399' : !isSupported ? '#38bdf8' : permission === 'granted' ? '#34d399' : '#f87171' }}>
                  {isNative ? 'Active & Ready' : !isSupported ? 'In-App Broadcasts' : permission === 'granted' ? 'Active & Ready' : permission === 'denied' ? 'Permission Denied' : 'Permission Needed'}
                </span>
              </div>
            </div>

            {isNative || (isSupported && permission === 'granted') ? (
              <button
                type="button"
                onClick={handleTestThisDevice}
                style={{
                  background: '#1e293b',
                  color: '#38bdf8',
                  border: '1px solid #334155',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ⚡ Test Alert
              </button>
            ) : !isSupported ? (
              <button
                type="button"
                onClick={handleTestThisDevice}
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ⚡ Test Alert
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRequestPermission}
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)',
                }}
              >
                Enable Push
              </button>
            )}
          </div>
        </div>

        {/* 4 Sleek Micro-Metrics Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.85rem',
            marginTop: '1.25rem',
          }}
        >
          <div
            style={{
              background: '#090e1a',
              borderRadius: '16px',
              padding: '1rem 1.25rem',
              border: '1px solid #1e293b',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
              Broadcasts Dispatched
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#c084fc', marginTop: '2px' }}>
              {notifications.length} Alerts
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
              Archived in cloud &amp; PWA storage
            </div>
          </div>

          <div
            style={{
              background: '#090e1a',
              borderRadius: '16px',
              padding: '1rem 1.25rem',
              border: '1px solid #1e293b',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
              Cumulative Network Reach
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#38bdf8', marginTop: '2px' }}>
              {totalReach.toLocaleString()} Recipients
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
              Across {schools.length} registered campus systems
            </div>
          </div>

          <div
            style={{
              background: '#090e1a',
              borderRadius: '16px',
              padding: '1rem 1.25rem',
              border: '1px solid #1e293b',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
              Target Segments
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#fbbf24', marginTop: '2px' }}>
              6 Audiences
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
              Campus, Principals, Faculty, Students
            </div>
          </div>

          <div
            style={{
              background: '#090e1a',
              borderRadius: '16px',
              padding: '1rem 1.25rem',
              border: '1px solid #1e293b',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
              PWA Service Worker
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34d399', marginTop: '6px' }}>
              ✓ sw.js Daemon Active
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
              Background sync &amp; click routing
            </div>
          </div>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '16px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{feedback.type === 'success' ? '🚀' : '⚠️'}</span>
            <span>{feedback.text}</span>
          </div>
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
          STUDIO TWO-COLUMN LAYOUT: COMPOSER & INTERACTIVE DEVICE PREVIEWS
          ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.35fr) minmax(320px, 1fr)',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: BROADCAST COMPOSER */}
        <div
          style={{
            background: '#111827',
            borderRadius: '24px',
            padding: '2rem',
            border: '1px solid #1f2937',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
          }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#f8fafc' }}>
                Compose Broadcast Alert
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Real-time Delivery</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              Select a ready-made institutional template or author custom notification copy.
            </p>
          </div>

          {/* Quick Preset Template Chips */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
              ⚡ Fast Template Presets
            </div>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
              {DEFAULT_PUSH_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl.id)}
                    style={{
                      background: isSelected ? '#3b82f6' : '#1f2937',
                      color: isSelected ? '#ffffff' : '#cbd5e1',
                      border: isSelected ? '1px solid #60a5fa' : '1px solid #374151',
                      borderRadius: '999px',
                      padding: '5px 12px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tmpl.title.split(' ')[0]} {tmpl.title.split(' ').slice(1, 3).join(' ')}
                  </button>
                )
              })}
            </div>
          </div>

          <form onSubmit={handleDispatchPush} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Category Cards */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                Notification Category
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                {(Object.keys(CATEGORY_META) as PushNotificationCategory[]).map((cat) => {
                  const meta = CATEGORY_META[cat]
                  const isSelected = category === cat
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setCategory(cat)}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '12px',
                        border: isSelected ? `2px solid ${meta.color}` : '1px solid #1f2937',
                        background: isSelected ? meta.bg : '#0b0f19',
                        color: isSelected ? '#ffffff' : '#94a3b8',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: isSelected ? `0 4px 14px ${meta.glow}` : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>{meta.icon}</span>
                      <span>{meta.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label
                  htmlFor={`${formId}-audience`}
                  style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}
                >
                  Target Audience Scope
                </label>
                <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 800 }}>
                  Est. Reach: {audMeta.estimatedCount}
                </span>
              </div>
              <select
                id={`${formId}-audience`}
                value={audience}
                onChange={(e) => setAudience(e.target.value as PushNotificationAudience)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: '#0b0f19',
                  border: '1.5px solid #374151',
                  color: '#f8fafc',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  outline: 'none',
                }}
              >
                {(Object.keys(AUDIENCE_META) as PushNotificationAudience[]).map((aud) => (
                  <option key={aud} value={aud}>
                    {AUDIENCE_META[aud].icon} {AUDIENCE_META[aud].label} — ({AUDIENCE_META[aud].estimatedCount})
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                {audMeta.reachDesc}
              </div>
            </div>

            {/* Specific School Picker if selected */}
            {audience === 'specific_school' && (
              <div style={{ background: '#090e1a', padding: '1rem', borderRadius: '14px', border: '1px solid #1f2937' }}>
                <label
                  htmlFor={`${formId}-target-school`}
                  style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '6px' }}
                >
                  Select Designated Campus
                </label>
                <select
                  id={`${formId}-target-school`}
                  value={targetSchoolSlug}
                  onChange={(e) => setTargetSchoolSlug(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '10px',
                    background: '#111827',
                    border: '1px solid #374151',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.slug}>
                      {s.name} ({s.campus_count || 1} campus[es] • {s.city || 'Kenya'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notification Title with Emoji Shortcuts */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label
                  htmlFor={`${formId}-title-input`}
                  style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}
                >
                  Notification Title *
                </label>
                <span style={{ fontSize: '0.7rem', color: title.length > 50 ? '#f59e0b' : '#64748b' }}>
                  {title.length}/60 chars
                </span>
              </div>

              {/* Fast Emoji Injector */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', alignSelf: 'center', marginRight: '4px' }}>
                  Add Icon:
                </span>
                {EMOJI_PRESETS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => appendEmoji(em)}
                    style={{
                      background: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      padding: '2px 6px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>

              <input
                id={`${formId}-title-input`}
                type="text"
                required
                maxLength={70}
                placeholder="e.g. 🛠️ Scheduled System Optimization"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  borderRadius: '12px',
                  background: '#0b0f19',
                  border: '1.5px solid #374151',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  outline: 'none',
                }}
              />
            </div>

            {/* Notification Message Body */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label
                  htmlFor={`${formId}-body-input`}
                  style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}
                >
                  Notification Message Body *
                </label>
                <span style={{ fontSize: '0.7rem', color: body.length > 180 ? '#f59e0b' : '#64748b' }}>
                  {body.length}/240 chars
                </span>
              </div>
              <textarea
                id={`${formId}-body-input`}
                required
                rows={3}
                maxLength={240}
                placeholder="e.g. The Global College Cloud SMS will undergo a 15-minute optimization at 23:00 EAT. All data is backed up."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  borderRadius: '12px',
                  background: '#0b0f19',
                  border: '1.5px solid #374151',
                  color: '#e2e8f0',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Target URL with Instant Route Buttons */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label
                  htmlFor={`${formId}-url-input`}
                  style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}
                >
                  Destination Tap Route / Action Link
                </label>
              </div>

              {/* URL Quick Presets */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                {URL_PRESETS.map((p) => (
                  <button
                    key={p.url}
                    type="button"
                    onClick={() => setTargetUrl(p.url)}
                    style={{
                      background: targetUrl === p.url ? '#2563eb' : '#1f2937',
                      color: targetUrl === p.url ? '#ffffff' : '#94a3b8',
                      border: targetUrl === p.url ? '1px solid #3b82f6' : '1px solid #374151',
                      borderRadius: '8px',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <input
                id={`${formId}-url-input`}
                type="text"
                placeholder="/saas-admin or /fees"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '10px',
                  background: '#0b0f19',
                  border: '1px solid #374151',
                  color: '#38bdf8',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            {/* Dispatch CTA Buttons */}
            <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={isDispatching || !title.trim() || !body.trim()}
                style={{
                  flex: 2,
                  background: isDispatching
                    ? '#374151'
                    : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.92rem',
                  padding: '0.95rem 1.25rem',
                  borderRadius: '14px',
                  border: 'none',
                  cursor: isDispatching || !title.trim() || !body.trim() ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 20px rgba(124, 58, 237, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{isDispatching ? '⏳ Transmitting Broadcast...' : '🚀 Transmit Broadcast Notification'}</span>
              </button>

              <button
                type="button"
                onClick={handleTestThisDevice}
                style={{
                  flex: 1,
                  background: '#1f2937',
                  color: '#cbd5e1',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  padding: '0.95rem 1rem',
                  borderRadius: '14px',
                  border: '1px solid #374151',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>🧪 Test Device</span>
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: MULTI-DEVICE REALISTIC LIVE PREVIEW */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Device Frame Card */}
          <div
            style={{
              background: '#111827',
              borderRadius: '24px',
              padding: '1.75rem',
              border: '1px solid #1f2937',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
            }}
          >
            {/* Preview Device Header & Switcher */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#f8fafc' }}>
                  Multi-Device Simulation
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                  Interactive live rendering on recipient screens.
                </p>
              </div>

              {/* Mobile vs Desktop Toggle */}
              <div
                style={{
                  background: '#090e1a',
                  padding: '3px',
                  borderRadius: '12px',
                  border: '1px solid #374151',
                  display: 'flex',
                  gap: '2px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  style={{
                    background: previewDevice === 'mobile' ? '#3b82f6' : 'transparent',
                    color: previewDevice === 'mobile' ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    padding: '5px 12px',
                    borderRadius: '9px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>📱 Phone</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  style={{
                    background: previewDevice === 'desktop' ? '#3b82f6' : 'transparent',
                    color: previewDevice === 'desktop' ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    padding: '5px 12px',
                    borderRadius: '9px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>💻 PC</span>
                </button>
              </div>
            </div>

            {/* PREVIEW CONTAINER */}
            {previewDevice === 'mobile' ? (
              /* REALISTIC MOBILE LOCK SCREEN FRAME */
              <div
                style={{
                  background: 'linear-gradient(180deg, #090e1a 0%, #1e1b4b 100%)',
                  borderRadius: '28px',
                  padding: '1.5rem 1.25rem 2rem',
                  border: '3px solid #374151',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
                  position: 'relative',
                  minHeight: '340px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                {/* Smartphone Top Notch & Status Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, paddingBottom: '1rem' }}>
                    <span>{currentTimeStr || '10:45'}</span>
                    <div style={{ width: '60px', height: '14px', background: '#030712', borderRadius: '999px', margin: '0 auto' }} />
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <span>5G</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Lock Screen Big Clock */}
                  <div style={{ textAlign: 'center', margin: '0.5rem 0 1.25rem' }}>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.03em', lineHeight: 1 }}>
                      {currentTimeStr || '10:45'}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#cbd5e1', fontWeight: 600, marginTop: '4px' }}>
                      {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  {/* High-Fidelity Mobile Notification Card */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.88)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '18px',
                      padding: '1rem 1.15rem',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    {/* Notification App Title Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <img
                          src="/logo.png"
                          alt="App Logo"
                          style={{ width: '18px', height: '18px', borderRadius: '5px' }}
                          onError={(e) => {
                            ;(e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f8fafc' }}>
                          GLOBAL COLLEGE
                        </span>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            padding: '1px 6px',
                            borderRadius: '999px',
                            background: catMeta.bg,
                            color: catMeta.color,
                            fontWeight: 800,
                          }}
                        >
                          {catMeta.icon} {catMeta.label}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>now</span>
                    </div>

                    {/* Notification Title & Body */}
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#ffffff', marginBottom: '3px', wordBreak: 'break-word' }}>
                      {title.trim() || 'Notification Title Preview'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.45, wordBreak: 'break-word' }}>
                      {body.trim() || 'Tap to view live message updates from your campus directorate.'}
                    </div>

                    {/* Action buttons on notification */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div
                        style={{
                          flex: 1,
                          background: 'rgba(56, 189, 248, 0.15)',
                          color: '#38bdf8',
                          textAlign: 'center',
                          padding: '6px',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                        }}
                      >
                        Open Portal ➔
                      </div>
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: '#94a3b8',
                          textAlign: 'center',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        Dismiss
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Home Indicator Bar */}
                <div style={{ width: '100px', height: '4px', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '999px', margin: '1.25rem auto 0' }} />
              </div>
            ) : (
              /* REALISTIC DESKTOP TOAST FRAME */
              <div
                style={{
                  background: '#090e1a',
                  borderRadius: '18px',
                  padding: '1.25rem',
                  border: '1px solid #374151',
                  boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5)',
                  minHeight: '260px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                  Windows 11 / macOS Notification Banner
                </div>
                <div
                  style={{
                    background: '#131b2e',
                    borderRadius: '14px',
                    padding: '1.15rem',
                    border: `1.5px solid ${catMeta.border}`,
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img src="/logo.png" alt="Logo" style={{ width: '18px', height: '18px', borderRadius: '4px' }} />
                      <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#f8fafc' }}>
                        Global College SMS
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Just now</span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: catMeta.bg,
                        border: `1px solid ${catMeta.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        flexShrink: 0,
                      }}
                    >
                      {catMeta.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#ffffff' }}>
                        {title.trim() || 'Notification Title Preview'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '2px', lineHeight: 1.45 }}>
                        {body.trim() || 'Notification alert text for desktop workstations and teachers.'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <div
                      style={{
                        background: '#2563eb',
                        color: '#ffffff',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      Open Portal
                    </div>
                    <div
                      style={{
                        background: '#1e293b',
                        color: '#94a3b8',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                      }}
                    >
                      Later
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Target Delivery Summary Box */}
            <div
              style={{
                marginTop: '1.25rem',
                background: '#090e1a',
                borderRadius: '14px',
                padding: '1rem',
                border: '1px solid #1f2937',
              }}
            >
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
                Active Broadcast Route &amp; Scope
              </div>
              <div style={{ fontSize: '0.82rem', color: '#f8fafc', marginTop: '4px' }}>
                <strong>Audience:</strong> {audMeta.label}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                <strong>Action Destination URL:</strong> <code style={{ color: '#38bdf8' }}>{targetUrl || '/saas-admin'}</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          DISPATCHED BROADCAST HISTORY LEDGER
          ========================================================================= */}
      <div
        style={{
          background: '#111827',
          borderRadius: '24px',
          padding: '2rem',
          border: '1px solid #1f2937',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
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
              Dispatched Broadcast Activity Ledger ({filteredNotifications.length})
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              Complete history of transmitted push alerts and recipient counts across campuses.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Filter by Category */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{
                background: '#0b0f19',
                color: '#f8fafc',
                border: '1px solid #374151',
                padding: '0.55rem 0.9rem',
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
                background: '#0b0f19',
                color: '#f8fafc',
                border: '1px solid #374151',
                padding: '0.55rem 0.9rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                outline: 'none',
              }}
            />

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#fca5a5',
                  border: '1px solid #7f1d1d',
                  padding: '0.55rem 0.9rem',
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
              background: '#0b0f19',
              borderRadius: '16px',
              border: '1px dashed #374151',
            }}
          >
            <span style={{ fontSize: '2.2rem' }}>📭</span>
            <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '8px', color: '#f8fafc' }}>
              No Push Notifications Found
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
              Broadcast a new alert using the composer studio above.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1f2937', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Dispatched</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Audience Scope</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Notification Content</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Reach</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotifications.map((notif) => {
                  const meta = CATEGORY_META[notif.category] || CATEGORY_META.platform_update
                  const aud = AUDIENCE_META[notif.audience] || AUDIENCE_META.all_schools
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
                        borderBottom: '1px solid #1f2937',
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
                          <span>{aud.icon}</span>
                          <span>{notif.targetSchoolName || aud.label}</span>
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
                        <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45 }}>
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
                          ✓ Transmitted
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
                              background: '#1f2937',
                              color: '#cbd5e1',
                              border: '1px solid #374151',
                              padding: '0.4rem 0.75rem',
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
                              padding: '0.4rem 0.75rem',
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
