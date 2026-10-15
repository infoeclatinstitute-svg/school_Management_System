import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthContext } from '@/features/auth/AuthContext'
import { MobileAppBottomNav } from '@/components/layout/MobileAppBottomNav'
import { sanitizeInput } from '@/lib/utils'
import { LockIcon, AlertTriangleIcon, UserIcon, ArrowRightIcon } from '@/components/icons/AppIcons'
import type { Role } from '@/lib/database.types'

interface RoleOption {
  role: Role
  label: string
  shortLabel: string
  icon: string
  identifierLabel: string
  identifierPlaceholder: string
  defaultUser: string
  defaultPass: string
  helpText: string
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'student',
    label: 'Student Learning Portal',
    shortLabel: 'Student',
    icon: '🎓',
    identifierLabel: 'Student Admission Number',
    identifierPlaceholder: 'e.g. GC-2026-001 or EG-2026-001',
    defaultUser: 'GC-2026-001',
    defaultPass: 'Student@2026#!',
    helpText: 'Access courses, timetables, continuous assessments, fee invoices, and student results.',
  },
  {
    role: 'teacher',
    label: 'Faculty & Teacher Desk',
    shortLabel: 'Teacher',
    icon: '👨‍🏫',
    identifierLabel: 'Staff ID / Lecturer Username',
    identifierPlaceholder: 'e.g. STF-2026-001 or eg.teacher',
    defaultUser: 'STF-2026-001',
    defaultPass: 'Teacher@2026#!',
    helpText: 'Record attendance, submit student CAT/Exam marks, and distribute lesson materials.',
  },
  {
    role: 'bursar',
    label: 'Bursar & Finance Desk',
    shortLabel: 'Bursar',
    icon: '💼',
    identifierLabel: 'Bursar Staff ID / Username',
    identifierPlaceholder: 'e.g. BUR-SEC-001 or eg.bursar',
    defaultUser: 'BUR-SEC-001',
    defaultPass: 'Bursar@2026#!',
    helpText: 'Issue invoices, record fee receipts, manage tuition statements and payroll records.',
  },
  {
    role: 'admin',
    label: 'Principal & Executive Admin',
    shortLabel: 'Admin',
    icon: '🏛️',
    identifierLabel: 'Administrator Username / ID',
    identifierPlaceholder: 'e.g. Global@admin or eg.admin',
    defaultUser: 'Global@admin',
    defaultPass: 'Global@2026#!',
    helpText: 'Full institutional governance, campus configuration, user provisioning and reporting.',
  },
  {
    role: 'parent',
    label: 'Parent & Sponsor Portal',
    shortLabel: 'Parent',
    icon: '👨‍👩‍👧',
    identifierLabel: 'Parent ID / Student Admission Number',
    identifierPlaceholder: 'e.g. PAR-2026-001 or GC-2026-001',
    defaultUser: 'PAR-2026-001',
    defaultPass: 'Parent@2026#!',
    helpText: 'Monitor your ward’s daily attendance, academic transcripts, and tuition clearance.',
  },
]

export function Login() {
  const { signIn, signInAsDemo } = useAuthContext()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const initialRoleParam = searchParams.get('role') as Role | null
  const [selectedRole, setSelectedRole] = useState<Role>(
    initialRoleParam && ROLE_OPTIONS.some((r) => r.role === initialRoleParam)
      ? initialRoleParam
      : 'student'
  )

  const currentRole = ROLE_OPTIONS.find((r) => r.role === selectedRole) || ROLE_OPTIONS[0]

  const [admissionNumber, setAdmissionNumber] = useState(currentRole.defaultUser)
  const [password, setPassword] = useState(currentRole.defaultPass)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)

  // Switch role handler: auto-populates sample test credentials for convenience
  const handleRoleSelect = (opt: RoleOption) => {
    setSelectedRole(opt.role)
    setAdmissionNumber(opt.defaultUser)
    setPassword(opt.defaultPass)
    setError(null)
  }

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
        setError(`${res.error} (${5 - nextFailed} attempts remaining)`)
      }
    } else {
      setFailedAttempts(0)
      setLockoutSeconds(0)
      const role = res.profile?.role || selectedRole
      const nextParam = searchParams.get('next')

      if (nextParam) {
        navigate(nextParam)
        return
      }

      if (role === 'admin') {
        navigate('/admin')
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

  const handleInstantDemoLogin = (role: Role) => {
    signInAsDemo(role)
    if (role === 'admin') navigate('/admin')
    else if (role === 'bursar') navigate('/bursar')
    else if (role === 'teacher') navigate('/teacher')
    else if (role === 'parent') navigate('/parent')
    else navigate('/student')
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
            padding: '1.75rem 1.5rem 1.25rem',
            textAlign: 'center',
            borderBottom: '1px solid #334155',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem',
              fontSize: '1.6rem',
              boxShadow: '0 8px 20px rgba(37,99,235,0.35)',
            }}
          >
            {currentRole.icon}
          </div>
          <div
            style={{
              color: '#ffffff',
              fontSize: '1.25rem',
              fontWeight: 900,
              letterSpacing: '-0.01em',
            }}
          >
            {currentRole.label}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '4px', fontWeight: 500 }}>
            Global College • Universal Education Cloud Portal
          </div>
        </div>

        {/* Role Selector Tabs */}
        <div
          style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '0.35rem',
            gap: '0.25rem',
            overflowX: 'auto',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          {ROLE_OPTIONS.map((opt) => {
            const isActive = selectedRole === opt.role
            return (
              <button
                key={opt.role}
                type="button"
                onClick={() => handleRoleSelect(opt)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '0.5rem 0.4rem',
                  fontSize: '0.78rem',
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? '#1e3a8a' : '#64748b',
                  background: isActive ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{opt.icon}</span>
                <span>{opt.shortLabel}</span>
              </button>
            )
          })}
        </div>

        {/* Form Body */}
        <div style={{ padding: '1.5rem 1.75rem 1.75rem' }}>
          {/* Quick role explanation */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.65rem 0.85rem',
              fontSize: '0.76rem',
              color: '#475569',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
            }}
          >
            <span>{currentRole.helpText}</span>
            <button
              type="button"
              onClick={() => handleInstantDemoLogin(currentRole.role)}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="Skip password and test this portal immediately"
            >
              1-Click Demo ➔
            </button>
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
            <div style={{ marginBottom: '1.1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '6px',
                }}
              >
                {currentRole.identifierLabel}
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
                placeholder={currentRole.identifierPlaceholder}
                style={{
                  fontSize: '0.92rem',
                  padding: '0.75rem 0.9rem',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.4rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                  Portal Password
                </label>
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
                autoComplete="current-password"
                autoCapitalize="none"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{
                  fontSize: '0.92rem',
                  padding: '0.75rem 0.9rem',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || lockoutSeconds > 0}
              style={{
                fontWeight: 800,
                padding: '0.85rem',
                borderRadius: '12px',
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>
                {lockoutSeconds > 0
                  ? `Locked — wait ${lockoutSeconds}s`
                  : loading
                  ? 'Authenticating...'
                  : `Sign In to ${currentRole.shortLabel} Portal`}
              </span>
              <ArrowRightIcon size={16} />
            </button>
          </form>

          {/* Partner School Jump Links */}
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
              <button
                type="button"
                onClick={() => navigate('/s/eg')}
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
              >
                EG Institute (/s/eg)
              </button>
              <button
                type="button"
                onClick={() => navigate('/s/prime')}
                style={{
                  background: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Prime College (/s/prime)
              </button>
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
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ← Back to Homepage
            </button>
          </div>
        </div>
      </div>

      <MobileAppBottomNav />
    </div>
  )
}
