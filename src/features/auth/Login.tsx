import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthContext } from '@/features/auth/AuthContext'
import { MobileAppBottomNav } from '@/components/layout/MobileAppBottomNav'
import { sanitizeInput } from '@/lib/utils'
import { LockIcon, AlertTriangleIcon } from '@/components/icons/AppIcons'

export function Login() {
  const { signIn } = useAuthContext()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [admissionNumber, setAdmissionNumber] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)

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
    if (!admissionNumber.trim() || !password) {
      setError('Please enter your credentials.')
      return
    }

    setError(null)
    setLoading(true)
    const cleanAdmission = sanitizeInput(admissionNumber)
    const res = await signIn(cleanAdmission, password)
    setLoading(false)

    if (res.error) {
      const nextFailed = failedAttempts + 1
      setFailedAttempts(nextFailed)
      if (nextFailed >= 5) {
        setLockoutSeconds(60)
        setError('Security Lockout: 5 consecutive failed attempts. System locked for 60 seconds.')
      } else {
        setError(`Invalid credentials. (${5 - nextFailed} attempts remaining before temporary lock)`)
      }
    } else {
      setFailedAttempts(0)
      setLockoutSeconds(0)
      const role = res.profile?.role
      const nextParam = searchParams.get('next')
      if (role === 'admin') {
        navigate(nextParam || '/admin')
      } else if (role === 'bursar') {
        navigate('/bursar')
      } else if (role === 'teacher') {
        navigate('/teacher')
      } else if (role === 'parent') {
        navigate('/parent')
      } else {
        navigate('/student')
      }
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
          maxWidth: '420px',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#0f172a',
            padding: '2rem 2rem 1.5rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              fontSize: '1.75rem',
            }}
          >
            🏛️
          </div>
          <div
            style={{
              color: '#ffffff',
              fontSize: '1.1rem',
              fontWeight: 900,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Platform Admin Portal
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '4px', fontWeight: 500 }}>
            cloud.eclat.institute · Restricted Access
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: '1.75rem 2rem 2rem' }}>
          {/* School user notice */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              fontSize: '0.78rem',
              color: '#166534',
              marginBottom: '1.5rem',
              lineHeight: 1.5,
            }}
          >
            <strong>School users:</strong> Log in via your school's dedicated URL — e.g.{' '}
            <strong>prime.cloud.eclat.institute</strong>. This portal is for platform administration only.
          </div>

          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #f87171',
                borderRadius: '10px',
                padding: '0.7rem 0.9rem',
                color: '#991b1b',
                fontSize: '0.83rem',
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
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}
              >
                Admin Username / ID
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="input"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                placeholder="Enter your admin username"
                style={{ fontSize: '0.95rem', padding: '0.75rem 0.9rem', width: '100%', boxSizing: 'border-box' }}
              />
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
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>Password</label>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    padding: 0,
                  }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                autoCapitalize="none"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{ fontSize: '0.95rem', padding: '0.75rem 0.9rem', width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || lockoutSeconds > 0}
              style={{ fontWeight: 800, padding: '0.85rem', borderRadius: '12px', fontSize: '0.95rem' }}
            >
              {lockoutSeconds > 0
                ? `Locked — wait ${lockoutSeconds}s`
                : loading
                ? 'Verifying...'
                : 'Sign In →'}
            </button>
          </form>

          <div
            style={{
              fontSize: '0.72rem',
              color: '#94a3b8',
              textAlign: 'center',
              marginTop: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
            }}
          >
            <LockIcon size={12} color="#94a3b8" />
            <span>256-Bit SSL Encrypted · cloud.eclat.institute</span>
          </div>
        </div>
      </div>

      <MobileAppBottomNav />
    </div>
  )
}
