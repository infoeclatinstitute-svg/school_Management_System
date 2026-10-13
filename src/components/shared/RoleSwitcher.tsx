import { useState } from 'react'
import { useAuthContext } from '@/features/auth/AuthContext'
import type { Role } from '@/lib/database.types'
import { useNavigate } from 'react-router-dom'

export function RoleSwitcher() {
  const { profile } = useAuthContext()
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  const currentRole = profile?.role || 'admin'

  const handleSwitch = (role: Role) => {
    setIsOpen(false)
    navigate(`/login?role=${role}`)
  }

  const roleColors: Record<Role, { bg: string; text: string; label: string; icon: string }> = {
    admin: { bg: '#fee2e2', text: '#991b1b', label: 'Principal / Admin', icon: '🛡️' },
    bursar: { bg: '#ecfdf5', text: '#065f46', label: 'Bursar & Admissions', icon: '💼' },
    teacher: { bg: '#fef3c7', text: '#92400e', label: 'Faculty / HOD', icon: '👩‍🏫' },
    student: { bg: '#e0e7ff', text: '#3730a3', label: 'Student Portal', icon: '🎓' },
    parent: { bg: '#fefce8', text: '#854d0e', label: 'Parent / Sponsor', icon: '👨‍👩‍👧' },
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="role-switcher-badge"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.25rem 0.65rem',
          borderRadius: '9999px',
          fontSize: '0.78rem',
          fontWeight: 600,
          background: roleColors[currentRole]?.bg || '#f1f5f9',
          color: roleColors[currentRole]?.text || '#334155',
          border: '1px solid currentColor',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Switch active role simulation"
      >
        <span>{roleColors[currentRole]?.icon}</span>
        <span>{roleColors[currentRole]?.label}</span>
        <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>▼</span>
      </button>

      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 100 }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 6px)',
              width: '240px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 101,
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-secondary)',
                padding: '0.35rem 0.5rem',
              }}
            >
              Simulate Role / Desk
            </div>

            {(['admin', 'bursar', 'teacher', 'student', 'parent'] as Role[]).map((r) => {
              const info = roleColors[r]
              const isCurrent = currentRole === r
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleSwitch(r)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: isCurrent ? 'var(--color-bg-secondary)' : 'transparent',
                    color: 'var(--color-text-primary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: isCurrent ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent) e.currentTarget.style.background = 'var(--color-bg-hover)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{info.icon}</span>
                    <span>{info.label}</span>
                  </span>
                  {isCurrent && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
                </button>
              )
            })}

            <div
              style={{
                borderTop: '1px solid var(--color-border)',
                marginTop: '0.35rem',
                paddingTop: '0.4rem',
                paddingLeft: '0.5rem',
                fontSize: '0.7rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              Active: {profile?.full_name || currentRole}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
