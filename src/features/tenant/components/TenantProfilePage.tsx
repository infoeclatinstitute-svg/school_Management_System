import React, { useState, useEffect } from 'react'
import type { PartnerSchoolTenant, TenantSessionUser } from '@/types/tenantSchool'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'

interface TenantProfilePageProps {
  school: PartnerSchoolTenant
  currentSession: TenantSessionUser | null
  primaryColor: string
  accentColor: string
  onSessionUpdate: (session: TenantSessionUser) => void
  onOpenLogin: () => void
}

export function TenantProfilePage({
  school,
  currentSession,
  primaryColor,
  accentColor,
  onSessionUpdate,
  onOpenLogin,
}: TenantProfilePageProps) {
  // ── Profile edit state ──────────────────────────────────────────────
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [profileSaved, setProfileSaved] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  // ── Password change state ───────────────────────────────────────────
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null)
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSaving, setPwdSaving] = useState(false)

  // Populate fields when session changes
  useEffect(() => {
    if (!currentSession) return
    setName(currentSession.name || '')
    const role = currentSession.role
    const slug = school.slug
    if (role === 'admin' || role === 'principal') {
      setEmail(school.principal_email || '')
      setPhone(school.contact_phone || '')
    } else if (currentSession.staff_id) {
      const staff = tenantSchoolStore.getStaffBySchool(slug).find(s => s.id === currentSession.staff_id)
      if (staff) { setEmail(staff.email || ''); setPhone(staff.phone || '') }
    } else if (currentSession.student_id) {
      const student = tenantSchoolStore.getStudentsBySchool(slug).find(s => s.id === currentSession.student_id)
      if (student) {
        setEmail(student.email || '')
        setPhone(student.phone || '')
        setGuardianName(student.guardian_name || '')
        setGuardianPhone(student.guardian_phone || '')
      }
    }
  }, [currentSession, school])

  if (!currentSession) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.5rem' }}>Sign In to View Your Profile</h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          You need to be signed in to access your profile and change your password.
        </p>
        <button
          type="button"
          onClick={onOpenLogin}
          style={{ background: primaryColor, color: '#fff', fontWeight: 800, padding: '0.75rem 2rem', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
        >
          Sign In ➔
        </button>
      </div>
    )
  }

  const roleLabel =
    currentSession.role === 'admin' ? 'Principal / Administrator'
    : currentSession.role === 'teacher' ? 'Teacher / Lecturer'
    : currentSession.role === 'bursar' ? 'Bursar / Finance Officer'
    : currentSession.role === 'student' ? 'Student'
    : 'Staff'

  const initial = (currentSession.name || '?').charAt(0).toUpperCase()
  const isStudent = currentSession.role === 'student'
  const isAdmin = currentSession.role === 'admin' || currentSession.role === 'principal'

  // ── Get stored password for current user ────────────────────────────
  const getStoredPassword = (): string => {
    if (isAdmin) return school.admin_password || 'GC-ADMIN-2026'
    if (currentSession.staff_id) {
      const staff = tenantSchoolStore.getStaffBySchool(school.slug).find(s => s.id === currentSession.staff_id)
      return staff?.temp_password || `${school.slug.toUpperCase()}@2026`
    }
    if (currentSession.student_id) {
      const student = tenantSchoolStore.getStudentsBySchool(school.slug).find(s => s.id === currentSession.student_id)
      return student?.temp_password || `${school.slug.toUpperCase()}@2026`
    }
    return ''
  }

  // ── Save profile details ────────────────────────────────────────────
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError(null)
    if (!name.trim()) { setProfileError('Name cannot be empty.'); return }

    const slug = school.slug
    const updatedSession = { ...currentSession, name: name.trim() }

    if (isAdmin) {
      tenantSchoolStore.updateSchoolBranding(school.slug, {
        principal_name: name.trim(),
        ...(phone ? { contact_phone: phone } : {}),
      })
    } else if (currentSession.staff_id) {
      tenantSchoolStore.updateStaffMember(currentSession.staff_id, {
        full_name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      })
    } else if (currentSession.student_id) {
      tenantSchoolStore.updateStudent(currentSession.student_id, {
        full_name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        guardian_name: guardianName.trim(),
        guardian_phone: guardianPhone.trim(),
      })
    }

    tenantSchoolStore.setActiveSession(slug, updatedSession)
    onSessionUpdate(updatedSession)
    setProfileSaved('Profile updated successfully ✓')
    setTimeout(() => setProfileSaved(null), 3000)
  }

  // ── Change password ─────────────────────────────────────────────────
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setPwdError(null)
    setPwdSuccess(null)

    const stored = getStoredPassword()
    if (currentPwd.trim() !== stored) {
      setPwdError('Current password is incorrect.')
      return
    }
    if (newPwd.length < 8) { setPwdError('New password must be at least 8 characters.'); return }
    if (!/[a-zA-Z]/.test(newPwd) || !/[0-9]/.test(newPwd)) {
      setPwdError('New password must contain at least one letter and one number.')
      return
    }
    if (newPwd !== confirmPwd) { setPwdError('Passwords do not match.'); return }

    setPwdSaving(true)

    if (isAdmin) {
      tenantSchoolStore.resetSchoolAdminPassword(school.slug, newPwd)
    } else if (currentSession.staff_id) {
      tenantSchoolStore.updateStaffMember(currentSession.staff_id, { temp_password: newPwd })
    } else if (currentSession.student_id) {
      tenantSchoolStore.updateStudent(currentSession.student_id, { temp_password: newPwd })
    }

    setPwdSaving(false)
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    setPwdSuccess('Password changed successfully. Use your new password next time you sign in.')
    setTimeout(() => setPwdSuccess(null), 5000)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.7rem 0.9rem', borderRadius: '10px',
    border: '1.5px solid #e2e8f0', fontSize: '1rem', boxSizing: 'border-box',
    outline: 'none', color: '#0f172a', background: '#f8fafc',
  }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }
  const cardStyle: React.CSSProperties = { background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: 'clamp(1.1rem, 4vw, 2rem)', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>

      {/* Avatar card */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
          color: '#ffffff', fontSize: '2rem', fontWeight: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `3px solid ${accentColor}`,
        }}>
          {initial}
        </div>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>{currentSession.name}</div>
          <div style={{ fontSize: '0.82rem', color: primaryColor, fontWeight: 700, marginTop: '2px' }}>{roleLabel}</div>
          {currentSession.title && <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{currentSession.title}{currentSession.department ? ` — ${currentSession.department}` : ''}</div>}
          {isStudent && currentSession.grade_class && (
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
              {currentSession.grade_class} • Admission: {currentSession.admission_number}
            </div>
          )}
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            🏫 {school.name} • @{currentSession.username}
          </div>
        </div>
      </div>

      {/* Edit profile */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', margin: '0 0 1.25rem' }}>✏️ Edit Profile</h3>
        <form onSubmit={handleSaveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '0.9rem', marginBottom: '0.9rem' }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input style={inputStyle} type="text" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>Email Address</label>
              <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={isAdmin} placeholder={isAdmin ? 'Contact SaaS admin' : 'your@email.com'} />
            </div>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input style={inputStyle} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" />
            </div>
            {isStudent && (
              <>
                <div>
                  <label style={labelStyle}>Guardian Name</label>
                  <input style={inputStyle} type="text" value={guardianName} onChange={e => setGuardianName(e.target.value)} placeholder="Parent / Guardian full name" />
                </div>
                <div>
                  <label style={labelStyle}>Guardian Phone</label>
                  <input style={inputStyle} type="tel" value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} placeholder="+254 7XX XXX XXX" />
                </div>
              </>
            )}
          </div>

          {profileError && (
            <div style={{ padding: '0.65rem 0.9rem', borderRadius: '8px', background: '#fee2e2', color: '#991b1b', fontSize: '0.83rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              ⚠ {profileError}
            </div>
          )}
          {profileSaved && (
            <div style={{ padding: '0.65rem 0.9rem', borderRadius: '8px', background: '#dcfce7', color: '#166534', fontSize: '0.83rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              ✓ {profileSaved}
            </div>
          )}

          <button
            type="submit"
            style={{ background: primaryColor, color: '#fff', fontWeight: 800, padding: '0.7rem 1.75rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', minHeight: '44px' }}
          >
            Save Profile
          </button>
        </form>
      </div>

      {/* Change password */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.25rem' }}>🔑 Change Password</h3>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem', marginTop: 0 }}>
          Must be 8+ characters, include at least one letter and one number.
        </p>
        <form onSubmit={handleChangePassword}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '0.9rem', marginBottom: '0.9rem' }}>
            <div>
              <label style={labelStyle}>Current Password</label>
              <input style={inputStyle} type={showPwd ? 'text' : 'password'} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} required autoComplete="current-password" />
            </div>
            <div>
              <label style={labelStyle}>New Password</label>
              <input style={inputStyle} type={showPwd ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)} required autoComplete="new-password" />
            </div>
            <div>
              <label style={labelStyle}>Confirm New Password</label>
              <input style={inputStyle} type={showPwd ? 'text' : 'password'} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} required autoComplete="new-password" />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#475569', marginBottom: '0.9rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={showPwd} onChange={e => setShowPwd(e.target.checked)} /> Show passwords
          </label>

          {pwdError && (
            <div style={{ padding: '0.65rem 0.9rem', borderRadius: '8px', background: '#fee2e2', color: '#991b1b', fontSize: '0.83rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              ⚠ {pwdError}
            </div>
          )}
          {pwdSuccess && (
            <div style={{ padding: '0.65rem 0.9rem', borderRadius: '8px', background: '#dcfce7', color: '#166534', fontSize: '0.83rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              ✓ {pwdSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={pwdSaving}
            style={{ background: '#0f172a', color: '#fff', fontWeight: 800, padding: '0.7rem 1.75rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', minHeight: '44px', opacity: pwdSaving ? 0.7 : 1 }}
          >
            {pwdSaving ? 'Saving…' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Read-only account info */}
      <div style={{ ...cardStyle, background: '#f8fafc' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#64748b', margin: '0 0 0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Info</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '0.75rem' }}>
          {[
            { label: 'Username / ID', value: currentSession.username },
            { label: 'Role', value: roleLabel },
            { label: 'Institution', value: school.name },
            ...(currentSession.department ? [{ label: 'Department', value: currentSession.department }] : []),
            ...(currentSession.admission_number ? [{ label: 'Admission No.', value: currentSession.admission_number }] : []),
            ...(currentSession.grade_class ? [{ label: 'Class', value: currentSession.grade_class }] : []),
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>{item.label}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
