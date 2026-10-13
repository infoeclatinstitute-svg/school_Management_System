import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/features/auth/AuthContext'
import { INSTITUTION_CONFIG } from '@/config/institution'

export function ConcurrentSessionAlertModal() {
  const { isSessionTerminatedByOtherDevice, terminatedDeviceName, dismissTerminatedModal } = useAuthContext()
  const navigate = useNavigate()

  if (!isSessionTerminatedByOtherDevice) return null

  const handleReLogin = () => {
    dismissTerminatedModal()
    navigate('/login', { replace: true })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        backgroundColor: 'rgba(5, 10, 25, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        animation: 'fadeIn 0.25s ease-out',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'linear-gradient(145deg, #131b2e 0%, #0d1220 100%)',
          border: '1.5px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '1.25rem',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px -5px rgba(239, 68, 68, 0.25)',
          padding: '2rem 1.75rem',
          color: '#f8fafc',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Security Alert Header Icon */}
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.35) 100%)',
            border: '2px solid rgba(239, 68, 68, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            fontSize: '2rem',
            boxShadow: '0 0 24px rgba(239, 68, 68, 0.35)',
          }}
        >
          📱🔒
        </div>

        <span
          style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
          }}
        >
          Security & Account Protection Notice
        </span>

        <h2
          style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: '#ffffff',
            marginBottom: '0.75rem',
            fontFamily: 'var(--font-heading, sans-serif)',
          }}
        >
          Session Terminated on This Device
        </h2>

        <p
          style={{
            fontSize: '0.92rem',
            lineHeight: '1.55',
            color: '#cbd5e1',
            marginBottom: '1.25rem',
          }}
        >
          Your account was just logged in from another device
          {terminatedDeviceName ? (
            <strong style={{ color: '#f87171', display: 'block', marginTop: '0.35rem', fontWeight: 600 }}>
              [{terminatedDeviceName}]
            </strong>
          ) : null}
        </p>

        {/* Anti-Account Sharing Policy Box */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '0.85rem',
            padding: '1rem',
            textAlign: 'left',
            marginBottom: '1.5rem',
            fontSize: '0.82rem',
            color: '#94a3b8',
            lineHeight: '1.5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>🚫</span>
            <span style={{ color: '#e2e8f0' }}>
              <strong>Single-Device Policy:</strong> Simultaneous logins across multiple phones, laptops, or browsers are disabled to prevent account sharing and safeguard course progress.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>🛡️</span>
            <span>
              If this was not authorized by you, please re-authenticate immediately and notify the {INSTITUTION_CONFIG.name} administration.
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleReLogin}
          style={{
            width: '100%',
            padding: '0.85rem 1.25rem',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            border: '1px solid rgba(59, 130, 246, 0.5)',
            borderRadius: '0.75rem',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.6)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(37, 99, 235, 0.4)'
          }}
        >
          <span>🔑</span>
          <span>Log In on This Device</span>
        </button>
      </div>
    </div>
  )
}
