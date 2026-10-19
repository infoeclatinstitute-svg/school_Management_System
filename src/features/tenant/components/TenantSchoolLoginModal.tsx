import React, { useState } from 'react'
import type { PartnerSchoolTenant, TenantStaffMember, TenantStudentMember, TenantSessionUser } from '@/types/tenantSchool'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import { verifyPassword } from '@/lib/crypto'
import { LockIcon, AlertTriangleIcon } from '@/components/icons/AppIcons'

interface TenantSchoolLoginModalProps {
  school: PartnerSchoolTenant
  staffList: TenantStaffMember[]
  studentList: TenantStudentMember[]
  currentSession: TenantSessionUser | null
  onLoginSuccess: (user: TenantSessionUser) => void
  onClose: () => void
}

export function TenantSchoolLoginModal({
  school,
  staffList,
  studentList,
  currentSession: _currentSession,
  onLoginSuccess,
  onClose,
}: TenantSchoolLoginModalProps) {
  const primaryColor = school.primary_color || '#1e3a8a'
  const accentColor = school.accent_color || '#0284c7'

  const [usernameInput, setUsernameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  const RATE_LIMIT_KEY = `gc_login_attempts_${school.slug}`
  const MAX_FAILED_ATTEMPTS = 5
  const LOCKOUT_DURATION_MS = 60_000

  const checkRateLimit = (): { locked: boolean; remainingSec: number } => {
    try {
      const raw = sessionStorage.getItem(RATE_LIMIT_KEY)
      if (!raw) return { locked: false, remainingSec: 0 }
      const state = JSON.parse(raw) as { count: number; lockUntil?: number }
      if (state.lockUntil && Date.now() < state.lockUntil) {
        return {
          locked: true,
          remainingSec: Math.ceil((state.lockUntil - Date.now()) / 1000),
        }
      }
      if (state.lockUntil && Date.now() >= state.lockUntil) {
        sessionStorage.removeItem(RATE_LIMIT_KEY)
      }
    } catch {}
    return { locked: false, remainingSec: 0 }
  }

  const recordFailedAttempt = () => {
    try {
      const raw = sessionStorage.getItem(RATE_LIMIT_KEY)
      const prev = raw ? (JSON.parse(raw) as { count: number; lockUntil?: number }) : { count: 0 }
      const nextCount = (prev.count || 0) + 1
      const lockUntil = nextCount >= MAX_FAILED_ATTEMPTS ? Date.now() + LOCKOUT_DURATION_MS : undefined
      sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ count: nextCount, lockUntil }))
    } catch {}
  }

  const clearFailedAttempts = () => {
    try {
      sessionStorage.removeItem(RATE_LIMIT_KEY)
    } catch {}
  }

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)

    const limitStatus = checkRateLimit()
    if (limitStatus.locked) {
      setLoginError(`Too many failed sign-in attempts. Please wait ${limitStatus.remainingSec}s before trying again.`)
      return
    }

    const cleanUser = usernameInput.trim().toLowerCase()
    const cleanPass = passwordInput.trim()

    if (!cleanUser) {
      setLoginError('Please enter your username, staff ID, or student admission number.')
      return
    }

    if (!cleanPass) {
      setLoginError('Please enter your portal password.')
      return
    }

    setIsVerifying(true)

    // 1. Check Principal / Executive Administrator
    const expectedAdminUser = (school.admin_username || `${school.slug}.admin`).toLowerCase()
    const expectedPrincipalEmail = (school.principal_email || '').toLowerCase()
    const expectedAdminPass = school.admin_password || ''

    const isAdminUsernameMatch =
      cleanUser === expectedAdminUser ||
      (expectedPrincipalEmail !== '' && cleanUser === expectedPrincipalEmail) ||
      cleanUser === `${school.slug}.admin`

    if (isAdminUsernameMatch) {
      if (!expectedAdminPass) {
        setIsVerifying(false)
        setLoginError('Administrator credentials have not been configured for this institution.')
        return
      }
      const isValidAdmin = await verifyPassword(cleanPass, expectedAdminPass)
      if (isValidAdmin) {
        clearFailedAttempts()
        const adminUser: TenantSessionUser = {
          id: 'principal_session',
          school_slug: school.slug,
          name: school.principal_name,
          role: 'admin',
          username: school.admin_username || `${school.slug}.admin`,
          title: school.principal_title,
          department: 'Executive Administration',
        }
        tenantSchoolStore.setActiveSession(school.slug, adminUser)
        setIsVerifying(false)
        onLoginSuccess(adminUser)
        return
      } else {
        recordFailedAttempt()
        setIsVerifying(false)
        setLoginError('Incorrect password for Executive Administrator account.')
        return
      }
    }

    // 2. Check Staff Roster (Teacher, Bursar, Registrar)
    const matchedStaff = staffList.find(
      (s) =>
        s.username.toLowerCase() === cleanUser ||
        (s.email && s.email.toLowerCase() === cleanUser) ||
        s.id.toLowerCase() === cleanUser
    )

    if (matchedStaff) {
      const expectedStaffPass = matchedStaff.temp_password || ''
      if (!expectedStaffPass) {
        setIsVerifying(false)
        setLoginError('Staff password not configured. Please contact your Principal.')
        return
      }
      const isValidStaff = await verifyPassword(cleanPass, expectedStaffPass)
      if (isValidStaff) {
        clearFailedAttempts()
        const staffUser: TenantSessionUser = {
          id: matchedStaff.id,
          school_slug: school.slug,
          name: matchedStaff.full_name,
          role: matchedStaff.role === 'principal' ? 'admin' : matchedStaff.role,
          username: matchedStaff.username,
          title: matchedStaff.title,
          department: matchedStaff.department,
          staff_id: matchedStaff.id,
        }
        tenantSchoolStore.setActiveSession(school.slug, staffUser)
        setIsVerifying(false)
        onLoginSuccess(staffUser)
        return
      } else {
        recordFailedAttempt()
        setIsVerifying(false)
        setLoginError('Incorrect password for Staff account. Please check with your Principal.')
        return
      }
    }

    // 3. Check Student Roster
    const matchedStudent = studentList.find(
      (s) =>
        s.admission_number.toLowerCase() === cleanUser ||
        s.username.toLowerCase() === cleanUser ||
        s.id.toLowerCase() === cleanUser
    )

    if (matchedStudent) {
      const expectedStudentPass = matchedStudent.temp_password || ''
      if (!expectedStudentPass) {
        setIsVerifying(false)
        setLoginError('Student password not configured. Please contact your institution administrator.')
        return
      }
      const isValidStudent = await verifyPassword(cleanPass, expectedStudentPass)
      if (isValidStudent) {
        clearFailedAttempts()
        const studentUser: TenantSessionUser = {
          id: matchedStudent.id,
          school_slug: school.slug,
          name: matchedStudent.full_name,
          role: 'student',
          username: matchedStudent.admission_number,
          grade_class: matchedStudent.grade_class,
          admission_number: matchedStudent.admission_number,
          student_id: matchedStudent.id,
        }
        tenantSchoolStore.setActiveSession(school.slug, studentUser)
        setIsVerifying(false)
        onLoginSuccess(studentUser)
        return
      } else {
        recordFailedAttempt()
        setIsVerifying(false)
        setLoginError('Incorrect password for Student account. Please verify your credentials.')
        return
      }
    }

    recordFailedAttempt()
    setIsVerifying(false)
    setLoginError('Account not found. Please ensure your admission number or staff username is correct.')
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '1.25rem',
        overflowY: 'auto',
      }}
    >
      <div
        style={{ margin: 'auto',
          background: '#ffffff',
          borderRadius: '24px',
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1.5px solid #e2e8f0',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
            color: '#ffffff',
            padding: '1.75rem 2rem 1.5rem',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: school.logo_url && school.logo_url !== '/logo.png?v=2' ? '#ffffff' : 'rgba(255, 255, 255, 0.15)',
                color: primaryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                fontWeight: 900,
                border: `2px solid ${accentColor}`,
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {school.logo_url && school.logo_url !== '/logo.png?v=2' ? (
                <img src={school.logo_url} alt={school.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                school.name.charAt(0)
              )}
            </div>
            <div>
              <h2 style={{ margin: '2px 0 0', fontSize: '1.35rem', fontWeight: 900, color: '#ffffff' }}>
                {school.name}
              </h2>
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                Official Digital Campus Portal Gateway
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#ffffff',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: '2rem' }}>
          {loginError && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                color: '#991b1b',
                fontSize: '0.84rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangleIcon size={18} color="#dc2626" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleCredentialSubmit} autoComplete="off">
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                Portal Username / Admission Number / Staff ID *
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                autoCapitalize="none"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="e.g. admin or STF-001 or STU-2026-001"
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.92rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                  Portal Password *
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: primaryColor,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showPassword ? 'Hide Password' : 'Show Password'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter your assigned password"
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.92rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              style={{
                width: '100%',
                background: primaryColor,
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: `0 4px 16px ${primaryColor}40`,
              }}
            >
              {isVerifying ? 'Verifying Credentials...' : 'Sign In to Portal Desk ➔'}
            </button>
          </form>

          {/* Secure Institutional Access Note */}
          <div
            style={{
              marginTop: '1.5rem',
              padding: '0.9rem 1rem',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              fontSize: '0.76rem',
              color: '#64748b',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <LockIcon size={14} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Role-Based Access Control:</strong> Portal accounts are issued directly by the{' '}
              <strong>Campus Executive Administration</strong> office. Students, teachers, and bursars receive credentials upon enrolment or appointment.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
