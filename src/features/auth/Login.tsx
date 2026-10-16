import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuthContext } from '@/features/auth/AuthContext'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import { MobileAppBottomNav } from '@/components/layout/MobileAppBottomNav'
import { sanitizeInput } from '@/lib/utils'
import { LockIcon, AlertTriangleIcon, UserIcon, ArrowRightIcon } from '@/components/icons/AppIcons'

export function Login() {
  const { signIn } = useAuthContext()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)

  // Dynamic registered schools from tenant store (no hardcoded schools)
  const [schools, setSchools] = useState(() => tenantSchoolStore.getSchools())

  useEffect(() => {
    const handleSync = () => setSchools(tenantSchoolStore.getSchools())
    window.addEventListener('gc-tenant-schools-updated', handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.removeEventListener('gc-tenant-schools-updated', handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  useEffect(() => {
    if (lockoutSeconds > 0) {
      const timer = setInterval(() => {
        setLockoutSeconds((prev) => (prev > 0 ? prev - 1 : 0))
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [lockoutSeconds])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lockoutSeconds > 0) {
      setError(`Security Lockout Active: Please wait ${lockoutSeconds}s before retrying.`)
      return
    }
    if (!username.trim() || !password) {
      setError('Please enter your administrator username and password.')
      return
    }

    setError(null)
    setLoading(true)
    const cleanUser = sanitizeInput(username.trim())
    const res = await signIn(cleanUser, password)
    setLoading(false)

    if (res.error) {
      const nextFailed = failedAttempts + 1
      setFailedAttempts(nextFailed)
      if (nextFailed >= 5) {
        setLockoutSeconds(60)
        setError('Security Lockout: 5 consecutive failed attempts. System locked for 60 seconds.')
      } else {
        setError(`${res.error} (${5 - nextFailed} attempts remaining)`)
      }
    } else {
      setFailedAttempts(0)
      setLockoutSeconds(0)
      const role = res.profile?.role || 'admin'
      const nextParam = searchParams.get('next')

      if (nextParam) {
        navigate(nextParam)
        return
      }

      if (role === 'admin') navigate('/admin')
      else if (role === 'bursar') navigate('/bursar')
      else if (role === 'teacher') navigate('/teacher')
      else if (role === 'parent') navigate('/parent')
      else navigate('/student')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem 0.75rem calc(80px + env(safe-area-inset-bottom, 0px))',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            padding: '2rem 1.5rem 1.5rem',
            textAlign: 'center',
            borderBottom: '1px solid #334155',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.85rem',
              fontSize: '1.75rem',
              boxShadow: '0 8px 20px rgba(37,99,235,0.35)',
            }}
          >
            🏛️
          </div>
          <h1
            style={{
              color: '#ffffff',
              fontSize: '1.4rem',
              fontWeight: 900,
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Platform Admin Portal
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '6px 0 0', fontWeight: 500 }}>
            Executive platform administration and campus governance
          </p>
        </div>

        {/* School Dedicated URL Notice */}
        <div
          style={{
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '0.9rem 1.25rem',
            fontSize: '0.78rem',
            color: '#475569',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
            <span>🏫</span>
            <span>Are you a student, teacher, or parent?</span>
          </div>
          <div>
            Please access your portal through your <strong>school's dedicated URL</strong> (e.g.,{' '}
            <span style={{ fontFamily: 'monospace', color: '#1e40af' }}>schoolname.cloud.eclat.institute</span> or{' '}
            <span style={{ fontFamily: 'monospace', color: '#1e40af' }}>/s/schoolname</span>).
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '1.75rem' }}>
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #f87171',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                color: '#991b1b',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
              }}
            >
              <AlertTriangleIcon size={16} color="#991b1b" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            <div style={{ marginBottom: '1.2rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '6px',
                }}
              >
                Administrator Username or Email *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Global@admin or principal username"
                  style={{
                    fontSize: '0.92rem',
                    padding: '0.75rem 0.9rem 0.75rem 2.4rem',
                    width: '100%',
                    boxSizing: 'border-box',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                >
                  <UserIcon size={16} color="#94a3b8" />
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <label
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#1e293b',
                  }}
                >
                  Password *
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  style={{
                    fontSize: '0.92rem',
                    padding: '0.75rem 0.9rem 0.75rem 2.4rem',
                    width: '100%',
                    boxSizing: 'border-box',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                >
                  <LockIcon size={16} color="#94a3b8" />
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || lockoutSeconds > 0}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontWeight: 800,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: loading || lockoutSeconds > 0 ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(29, 78, 216, 0.4)',
                opacity: loading || lockoutSeconds > 0 ? 0.7 : 1,
              }}
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Admin Portal'}</span>
              {!loading && <ArrowRightIcon size={16} color="#ffffff" />}
            </button>
          </form>

          {/* Dynamic Partner School Hub Selector */}
          {schools.length > 0 && (
            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid #e2e8f0',
                fontSize: '0.78rem',
                color: '#64748b',
                textAlign: 'center',
              }}
            >
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                🏛️ Dedicated Partner School Portals
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {schools.slice(0, 4).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => navigate(`/s/${s.slug}`)}
                    style={{
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title={`Open ${s.name}`}
                  >
                    {s.name} (/s/{s.slug})
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => navigate('/register-school')}
                  style={{
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  + Register New School
                </button>
              </div>
            </div>
          )}

          {/* Encryption Footer */}
          <div
            style={{
              fontSize: '0.72rem',
              color: '#94a3b8',
              textAlign: 'center',
              marginTop: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
            }}
          >
            <LockIcon size={12} color="#94a3b8" />
            <span>256-Bit SSL Encrypted • cloud.eclat.institute</span>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Link
              to="/"
              style={{
                color: '#64748b',
                fontSize: '0.8rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              ← Back to Homepage
            </Link>
          </div>
        </div>
      </div>

      <MobileAppBottomNav />
    </div>
  )
}
