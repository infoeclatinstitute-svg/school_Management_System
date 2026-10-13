import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuthContext } from '@/features/auth/AuthContext'
import { MobileAppBottomNav } from '@/components/layout/MobileAppBottomNav'
import { isNativeApp } from '@/utils/platform'
import { sanitizeInput } from '@/lib/utils'
import { INSTITUTION_CONFIG } from '@/config/institution'
import type { Role } from '@/lib/database.types'
import {
  GraduationCapIcon,
  BookOpenIcon,
  UsersIcon,
  BuildingIcon,
  CreditCardIcon,
  LockIcon,
  AlertTriangleIcon,
  CheckIcon,
} from '@/components/icons/AppIcons'

export function Login() {
  const { signIn } = useAuthContext()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const paramRole = searchParams.get('role') as Role | null

  const isNative = isNativeApp()
  const initialRole: Role =
    paramRole && ['admin', 'bursar', 'teacher', 'student', 'parent'].includes(paramRole)
      ? paramRole
      : isNative
      ? 'student'
      : 'admin'

  const [isStaffMode, setIsStaffMode] = useState<boolean>(initialRole === 'admin' || initialRole === 'bursar')
  const [selectedRole, setSelectedRole] = useState<Role>(initialRole)
  const [selectedPortalKey, setSelectedPortalKey] = useState<string>(initialRole)
  const [admissionNumber, setAdmissionNumber] = useState(initialRole === 'admin' ? 'Global@admin' : '')
  const [password, setPassword] = useState(initialRole === 'admin' ? 'Global@2026#!' : '')
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

  useEffect(() => {
    if (paramRole && ['admin', 'bursar', 'teacher', 'student', 'parent'].includes(paramRole)) {
      setSelectedRole(paramRole)
      setSelectedPortalKey(paramRole)
      setIsStaffMode(paramRole === 'admin' || paramRole === 'bursar')
      if (paramRole === 'admin') {
        setAdmissionNumber('Global@admin')
        setPassword('Global@2026#!')
      } else {
        setAdmissionNumber('')
        setPassword('')
      }
    }
  }, [paramRole])

  // Academic & Portal Role Options
  const publicRoles = [
    {
      role: 'student' as Role,
      portalKey: 'student',
      label: 'Students Portal',
      renderIcon: () => <GraduationCapIcon size={22} color="#1d4ed8" />,
      route: '/student',
      desc: 'Access your enrolled courses, live classrooms, video lessons, and academic transcripts.',
    },
    {
      role: 'teacher' as Role,
      portalKey: 'teacher',
      label: 'Faculty & Lecturer Portal',
      renderIcon: () => <BookOpenIcon size={22} color="#059669" />,
      route: '/teacher',
      desc: 'Upload practical lessons, mark attendance, and manage student gradebooks.',
    },
    {
      role: 'parent' as Role,
      portalKey: 'parent',
      label: 'Parent & Sponsor Portal',
      renderIcon: () => <UsersIcon size={22} color="#7c3aed" />,
      route: '/parent',
      desc: 'Track student attendance, fee clearance, and academic reports.',
    },
  ]

  // Staff / Administration Role Options
  const staffRoles = [
    {
      role: 'admin' as Role,
      portalKey: 'admin',
      label: 'Principal & Directorate Terminal',
      renderIcon: () => <BuildingIcon size={22} color="#d97706" />,
      route: '/admin',
      desc: 'Institutional administration, student directories, user credential provisioning, and pricing.',
    },
    {
      role: 'bursar' as Role,
      portalKey: 'bursar',
      label: 'Finance & Admissions Registry',
      renderIcon: () => <CreditCardIcon size={22} color="#0284c7" />,
      route: '/bursar',
      desc: 'Verify tuition payments, card settlements, M-Pesa receipts, and fee ledgers.',
    },
  ]

  const allPortalRoles = [...staffRoles, ...publicRoles]

  const handleSelectPortal = (cfg: { role: Role; portalKey: string }) => {
    setSelectedRole(cfg.role)
    setSelectedPortalKey(cfg.portalKey)
    setIsStaffMode(cfg.role === 'admin' || cfg.role === 'bursar')
    // Auto-fill only for Admin so the rest of the portals test real Admin-created accounts
    if (cfg.role === 'admin') {
      setAdmissionNumber('Global@admin')
      setPassword('Global@2026#!')
    } else {
      setAdmissionNumber('')
      setPassword('')
    }
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lockoutSeconds > 0) {
      setError(`Security Lockout Active: Please wait ${lockoutSeconds}s before retrying.`)
      return
    }

    if (!admissionNumber.trim() || !password) {
      setError('Please enter your Admin-issued Admission Number / Staff ID and Password.')
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
        setError(`${res.error} (${5 - nextFailed} attempts remaining before temporary security lock)`)
      }
    } else {
      setFailedAttempts(0)
      setLockoutSeconds(0)
      const role = res.profile?.role || selectedRole
      // If a ?next= destination was requested (e.g. from RequireSaasAdmin guard), honour it
      const nextParam = searchParams.get('next')
      if (role === 'admin' || cleanAdmission.toLowerCase().includes('admin')) {
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

  const currentActiveRole =
    allPortalRoles.find((r) => r.portalKey === selectedPortalKey) || staffRoles[0]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 50%, #f1f5f9 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem 0.75rem calc(80px + env(safe-area-inset-bottom, 0px))',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '920px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        }}
      >
        {/* Left Side: Workstation Selector */}
        <div
          style={{
            background: '#f8fafc',
            padding: 'clamp(1.25rem, 4vw, 2.25rem)',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ marginBottom: '1.35rem' }}>
              <div>
                <div
                  style={{
                    fontSize: '1.3rem',
                    fontWeight: 900,
                    color: '#0f172a',
                    fontFamily: 'var(--font-heading)',
                    letterSpacing: '0.03em',
                    lineHeight: 1.1,
                  }}
                >
                  GLOBAL COLLEGE
                </div>
                <div style={{ fontSize: '0.72rem', color: '#1d4ed8', fontWeight: 800, letterSpacing: '0.04em' }}>
                  SCHOOL MANAGEMENT SYSTEM & PORTALS
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Select Institutional Portal
              </h3>
              {isStaffMode && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    background: '#fee2e2',
                    color: '#991b1b',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 800,
                  }}
                >
                  ADMIN & STAFF
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0 0 1rem' }}>
              Choose your assigned portal below and sign in with the credentials issued by the Administrator:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {allPortalRoles.map((cfg) => (
                <button
                  key={cfg.portalKey}
                  type="button"
                  onClick={() => handleSelectPortal(cfg)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '12px',
                    border: selectedPortalKey === cfg.portalKey ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: selectedPortalKey === cfg.portalKey ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                    <span
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: selectedPortalKey === cfg.portalKey ? '#dbeafe' : '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {cfg.renderIcon()}
                    </span>
                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          color: selectedPortalKey === cfg.portalKey ? '#1e3a8a' : '#0f172a',
                        }}
                      >
                        {cfg.label}
                      </div>
                      <div style={{ fontSize: '0.71rem', color: '#64748b', marginTop: '2px', lineHeight: 1.25 }}>
                        {cfg.desc}
                      </div>
                    </div>
                  </div>
                  {selectedPortalKey === cfg.portalKey && (
                    <span style={{ color: '#2563eb', marginLeft: '6px' }}>
                      <CheckIcon size={18} color="#2563eb" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '0.85rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <Link to="/library" style={{ fontSize: '0.82rem', color: '#2563eb', textDecoration: 'none', fontWeight: 700 }}>
              📖 Open E-Library
            </Link>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
              Admin-Managed Access Control
            </span>
          </div>
        </div>

        {/* Right Side: Strictly Admin-Provisioned Sign-In */}
        <div
          style={{
            padding: 'clamp(1.25rem, 4vw, 2.25rem)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* Official Admin-Provisioned Policy Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                padding: '0.75rem 0.9rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ marginTop: '2px', flexShrink: 0 }}>
                <LockIcon size={16} color="#1d4ed8" />
              </div>
              <div style={{ fontSize: '0.78rem', color: '#1e3a8a', lineHeight: 1.4 }}>
                <strong style={{ display: 'block', marginBottom: '2px', fontWeight: 800 }}>
                  Official Administrator-Provisioned Access
                </strong>
                Login details (Admission Number / Staff ID &amp; Password) are strictly generated and provided by the{' '}
                <strong>School Administrator</strong>. Public self-registration is disabled.
              </div>
            </div>

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
                <AlertTriangleIcon size={18} color="#991b1b" />
                <div>{error}</div>
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: isStaffMode ? '#dc2626' : '#2563eb',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {isStaffMode ? 'ADMINISTRATIVE & FINANCE TERMINAL' : 'AUTHORIZED PORTAL SIGN-IN'}
              </span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '0.25rem 0 0.35rem' }}>
                {currentActiveRole.label}
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0 }}>
                {selectedRole === 'admin'
                  ? 'Administrator credentials are auto-filled for demonstration. Click Sign In to manage users.'
                  : 'Enter the login credentials created for this account in the Admin Portal.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off">
              <div style={{ marginBottom: '1.1rem' }}>
                <label className="label" style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b' }}>
                  {selectedRole === 'student'
                    ? 'Student Admission Number (Admin-Issued)'
                    : selectedRole === 'admin'
                    ? 'Administrator Username / ID'
                    : selectedRole === 'bursar'
                    ? 'Bursar Staff ID / Username'
                    : selectedRole === 'parent'
                    ? 'Parent ID / Student Admission Number'
                    : 'Lecturer Staff ID / Username'}
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
                  placeholder={
                    selectedRole === 'student'
                      ? 'e.g. GC-2026-001 (Created by Admin)'
                      : selectedRole === 'admin'
                      ? 'Global@admin'
                      : selectedRole === 'bursar'
                      ? 'e.g. BUR-2026-001 (Created by Admin)'
                      : selectedRole === 'parent'
                      ? 'e.g. PAR-2026-001 (Created by Admin)'
                      : 'e.g. STF-2026-001 (Created by Admin)'
                  }
                  style={{ fontSize: '0.95rem', padding: '0.75rem 0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.3rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.35rem',
                  }}
                >
                  <label className="label" style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: '#1e293b' }}>
                    Admin-Issued Password
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
                  autoCorrect="off"
                  spellCheck={false}
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password created by Admin"
                  style={{ fontSize: '0.95rem', padding: '0.75rem 0.9rem' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading}
                style={{ fontWeight: 800, padding: '0.85rem', borderRadius: '12px', fontSize: '0.95rem' }}
              >
                {loading ? 'Verifying Credentials...' : `Sign In to ${currentActiveRole.role.toUpperCase()} Portal →`}
              </button>
            </form>

            {/* Credential Assistance Box */}
            <div
              style={{
                marginTop: '1.35rem',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                fontSize: '0.78rem',
                color: '#475569',
                lineHeight: 1.45,
              }}
            >
              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                🔑 Production Workflow: Create &amp; Test Users from Admin
              </div>
              <div>
                Sign in to the <strong>Principal &amp; Directorate Terminal</strong> (auto-filled above), open{' '}
                <strong>Manage Users (`/admin/users`)</strong>, and issue login credentials for Students, Teachers, Bursars, or Parents to test them live.
              </div>
              <div style={{ marginTop: '6px', fontWeight: 700, color: '#1e3a8a' }}>
                Admissions &amp; Admin Desk: {INSTITUTION_CONFIG.contact.phoneFormatted} • {INSTITUTION_CONFIG.contact.admissionsEmail}
              </div>
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  🏛️ Setting up a new School, College, or TVET Campus?
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/register-school')}
                  style={{
                    background: '#1e3a8a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Onboard School / College →
                </button>
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              color: '#64748b',
              textAlign: 'center',
              marginTop: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <LockIcon size={14} color="#64748b" />
            <span>256-Bit SSL Encrypted • Global College School Management System</span>
          </div>
        </div>
      </div>

      <MobileAppBottomNav />
    </div>
  )
}
