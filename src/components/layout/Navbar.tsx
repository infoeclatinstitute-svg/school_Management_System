import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { Notification } from '@/lib/database.types'
import { RoleBadge } from '@/components/ui/Badge'
import { INSTITUTION_CONFIG } from '@/config/institution'
import { dispatchSchoolBellAlert } from '@/components/shared/ClassBellReminderModal'
import { formatDateTime } from '@/lib/utils'
import { isNativeApp, isElectronApp } from '@/utils/platform'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { SafariInstallModal } from '@/components/shared/SafariInstallModal'
import { schoolStore } from '@/lib/schoolData'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import { licensingStore } from '@/lib/licensingStore'
import { checkForOTAUpdates, clearAllWebCaches } from '@/lib/otaUpdater'

export function Navbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { isInstalled, isIOS, showInstallGuide, setShowInstallGuide, promptInstall, promptNativeInstall, hasNativePrompt } = usePWAInstall()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleManualRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      await Promise.allSettled([
        schoolStore.syncWithCloud(true),
        tenantSchoolStore.syncWithCloud(),
        licensingStore.syncWithCloud(),
        clearAllWebCaches(),
      ])
      window.dispatchEvent(new CustomEvent('gc-data-synced'))
      window.dispatchEvent(new Event('storage'))

      const hasNewBuild = await checkForOTAUpdates(true)
      if (!hasNewBuild) {
        setTimeout(() => setIsRefreshing(false), 600)
      }
    } catch {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (!profile?.id) return

    // Fetch notifications
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setNotifications(data || []))

    // Realtime subscription
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllAsRead = async () => {
    if (!profile?.id) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <nav className="navbar">
      <button className="navbar-menu-btn" onClick={onToggleSidebar} aria-label="Toggle Navigation">
        ☰
      </button>

      <Link to="/" className="navbar-brand">
        <div>
          <div className="navbar-school-name" style={{ fontFamily: 'var(--font-heading)', color: '#1e3a8a', letterSpacing: '0.04em', fontWeight: 800 }}>{INSTITUTION_CONFIG.name}</div>
          <span className="navbar-tagline" style={{ color: '#64748b', letterSpacing: '0.08em', fontSize: '0.65rem', fontWeight: 600 }}>{INSTITUTION_CONFIG.tagline}</span>
        </div>
      </Link>

      <div className="navbar-spacer" />

      <div className="navbar-actions">

        {/* Instant Self-Refresh & Cloud Sync Button */}
        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="btn btn-sm"
          style={{
            background: isRefreshing ? '#e2e8f0' : '#f8fafc',
            color: '#1e293b',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '4px 10px',
            fontSize: '0.78rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            cursor: isRefreshing ? 'wait' : 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            transition: 'all 0.2s ease',
          }}
          title="Refresh system & sync latest cloud updates"
        >
          <span
            style={{
              display: 'inline-block',
              transition: 'transform 0.6s ease',
              transform: isRefreshing ? 'rotate(360deg)' : 'none',
            }}
          >
            🔄
          </span>
          <span className="hide-on-mobile">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>

        {/* Live School Bell Alert Button */}
        <button
          type="button"
          onClick={() => dispatchSchoolBellAlert()}
          className="btn btn-sm"
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '4px 10px',
            fontSize: '0.78rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
          }}
          title="School Bell & Live Class Schedule Alarm"
        >
          <span>🔔</span>
          <span className="hide-on-mobile">School Bell</span>
        </button>

        {/* Desktop Workstation Status Pill */}
        {isElectronApp() && (
          <div
            className="hide-mobile"
            style={{
              background: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '0.74rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Hardware DRM Screenshot & Recording Protection Active"
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
            <span>Desktop Workstation</span>
          </div>
        )}

        {/* Direct E-Library Link (Desktop web only - mobile has bottom navigation) */}
        {!isNativeApp() && (
          <Link
            to="/library"
            className="btn btn-sm hide-mobile"
            style={{
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '4px 12px',
              fontSize: '0.8rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              textDecoration: 'none',
            }}
            title="Browse Open E-Library & Academic Resources"
          >
            <span>📖</span>
            <span>E-Library</span>
          </Link>
        )}

        {/* Install Web App Button */}
        {!isInstalled && (
          <button
            type="button"
            onClick={() => promptInstall()}
            className="btn btn-sm"
            style={{
              background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '4px 11px',
              fontSize: '0.78rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(29, 78, 216, 0.35)',
            }}
            title="Install Global College Web App on Phone or Computer"
          >
            <span>📲</span>
            <span className="hide-on-mobile">Install App</span>
          </button>
        )}

        {!profile && (
          <Link
            to="/login"
            className="btn btn-sm btn-primary"
            style={{
              fontWeight: 800,
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              textDecoration: 'none',
            }}
          >
            🔐 Login
          </Link>
        )}

        {profile && (
          <>
            {/* Notification Bell */}
            <div className="notif-bell-wrapper">
              <button
                className="notif-bell-btn"
                onClick={() => {
                  setShowNotifs(!showNotifs)
                  if (!showNotifs && unreadCount > 0) markAllAsRead()
                }}
                title="Notifications"
              >
                🔔
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>

              {showNotifs && (
                <div className="notif-dropdown">
                  <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 'var(--text-sm)' }}>Notifications</strong>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="btn btn-xs btn-ghost text-xs">
                        Mark read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-muted)', fontSize: 'var(--text-xs)' }}>
                      No new notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`notif-item ${!n.read ? 'unread' : ''}`}
                        onClick={() => {
                          if (n.link) navigate(n.link)
                          setShowNotifs(false)
                        }}
                      >
                        <div className="notif-message">{n.message}</div>
                        <div className="notif-time">{formatDateTime(n.created_at)}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* User profile badge & logout */}
            <div className="navbar-user">
              <div className="avatar">{profile.full_name[0]?.toUpperCase()}</div>
              <div className="navbar-user-name hide-mobile">
                <div>{profile.full_name}</div>
                <RoleBadge role={profile.role} />
              </div>
            </div>

            <button
              type="button"
              className="btn btn-sm"
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '0.4rem 0.65rem',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.4)',
                flexShrink: 0,
                fontSize: '0.8rem',
              }}
              onClick={() => signOut().then(() => navigate('/login'))}
              title="Sign Out of Global College Portal"
            >
              <span>🚪</span>
              <span className="hide-on-mobile">Logout</span>
            </button>
          </>
        )}
      </div>
      <SafariInstallModal
        isOpen={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
        isIOS={isIOS}
        hasNativePrompt={hasNativePrompt}
        onNativeInstallPrompt={promptNativeInstall}
      />
    </nav>
  )
}
