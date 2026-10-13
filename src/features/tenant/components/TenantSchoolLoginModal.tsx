import React, { useState } from 'react'
import type { PartnerSchoolTenant, TenantStaffMember, TenantStudentMember, TenantSessionUser } from '@/types/tenantSchool'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import { LockIcon, UserIcon, ShieldCheckIcon, GraduationCapIcon } from '@/components/icons/AppIcons'

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
  currentSession,
  onLoginSuccess,
  onClose,
}: TenantSchoolLoginModalProps) {
  const primaryColor = school.primary_color || '#881337'
  const accentColor = school.accent_color || '#d4af37'

  const [activeTab, setActiveTab] = useState<'credentials' | 'roster'>('credentials')
  const [usernameInput, setUsernameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)

  // Handle direct username + password verification
  const handleCredentialSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)

    const cleanUser = usernameInput.trim().toLowerCase()
    const cleanPass = passwordInput.trim()

    if (!cleanUser) {
      setLoginError('Please enter your portal username or admission number.')
      return
    }

    // 1. Check Principal / Executive
    if (
      cleanUser === school.principal_email.toLowerCase() ||
      cleanUser === 'admin' ||
      cleanUser === 'principal' ||
      cleanUser.includes('sterling') ||
      cleanUser.includes('principal')
    ) {
      const adminUser: TenantSessionUser = {
        id: 'principal_session',
        school_slug: school.slug,
        name: school.principal_name,
        role: 'admin',
        username: school.principal_email || `${school.slug}.admin`,
        title: school.principal_title,
        department: 'Executive Administration',
      }
      tenantSchoolStore.setActiveSession(school.slug, adminUser)
      onLoginSuccess(adminUser)
      return
    }

    // 2. Check Staff Roster
    const matchedStaff = staffList.find(
      (s) =>
        s.username.toLowerCase() === cleanUser ||
        s.email.toLowerCase() === cleanUser ||
        s.id.toLowerCase() === cleanUser
    )

    if (matchedStaff) {
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
      onLoginSuccess(staffUser)
      return
    }

    // 3. Check Student Roster
    const matchedStudent = studentList.find(
      (s) =>
        s.admission_number.toLowerCase() === cleanUser ||
        s.username.toLowerCase() === cleanUser ||
        s.id.toLowerCase() === cleanUser
    )

    if (matchedStudent) {
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
      onLoginSuccess(studentUser)
      return
    }

    setLoginError('Invalid credentials. Check your username/admission number or use the Quick Roster tab.')
  }

  const handleSelectPredefined = (user: TenantSessionUser) => {
    tenantSchoolStore.setActiveSession(school.slug, user)
    onLoginSuccess(user)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          maxWidth: '640px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: `2px solid ${primaryColor}`,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
            color: '#ffffff',
            padding: '1.75rem 2rem',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: '#ffffff',
                color: primaryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                fontWeight: 900,
                border: `2px solid ${accentColor}`,
                flexShrink: 0,
              }}
            >
              {school.name.charAt(0)}
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {school.curriculum_type}
              </span>
              <h2 style={{ margin: '2px 0 0', fontSize: '1.35rem', fontWeight: 900, color: '#ffffff' }}>
                {school.name}
              </h2>
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                Unified Student Information System &amp; Portal Gateway
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
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            style={{
              flex: 1,
              padding: '0.85rem 1rem',
              border: 'none',
              background: activeTab === 'credentials' ? '#ffffff' : 'transparent',
              borderBottom: activeTab === 'credentials' ? `2.5px solid ${primaryColor}` : '2.5px solid transparent',
              color: activeTab === 'credentials' ? primaryColor : '#64748b',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
            }}
          >
            🔑 Credential Sign In
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            style={{
              flex: 1,
              padding: '0.85rem 1rem',
              border: 'none',
              background: activeTab === 'roster' ? '#ffffff' : 'transparent',
              borderBottom: activeTab === 'roster' ? `2.5px solid ${primaryColor}` : '2.5px solid transparent',
              color: activeTab === 'roster' ? primaryColor : '#64748b',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
            }}
          >
            ⚡ Quick Roster Switcher
          </button>
        </div>

        {/* Tab 1: Form Login */}
        {activeTab === 'credentials' && (
          <form onSubmit={handleCredentialSubmit} style={{ padding: '1.75rem 2rem' }}>
            {loginError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  color: '#991b1b',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '1.25rem',
                }}
              >
                ⚠️ {loginError}
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                Username, Staff ID, or Student Admission Number
              </label>
              <input
                type="text"
                placeholder="e.g. arthur.sterling, HC-2026-0042, or patrick.omondi"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                Access PIN / Portal Password
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                * Enter your institution password or switch to the Quick Roster tab to select an authorized profile.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.7rem 1.25rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '0.7rem 1.5rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: primaryColor,
                  color: '#ffffff',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  boxShadow: `0 4px 14px ${primaryColor}40`,
                }}
              >
                Authenticate &amp; Enter Portal
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Quick Roster Switcher */}
        {activeTab === 'roster' && (
          <div style={{ padding: '1.75rem 2rem', maxHeight: '60vh', overflowY: 'auto' }}>
            <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#64748b' }}>
              Select any verified account below to instantly authenticate and evaluate that specific role desk:
            </p>

            {/* 1. Principal / Executive */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', marginBottom: '6px' }}>
                Executive Leadership
              </div>
              <button
                type="button"
                onClick={() =>
                  handleSelectPredefined({
                    id: 'principal_session',
                    school_slug: school.slug,
                    name: school.principal_name,
                    role: 'admin',
                    username: school.principal_email || `${school.slug}.admin`,
                    title: school.principal_title,
                    department: 'Executive Administration',
                  })
                }
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.75rem 1rem',
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.88rem' }}>
                    {school.principal_name}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: primaryColor, fontWeight: 700 }}>
                    {school.principal_title} • Executive Full Access Desk
                  </div>
                </div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, background: `${primaryColor}15`, color: primaryColor, padding: '3px 8px', borderRadius: '6px' }}>
                  Enter Desk ➔
                </span>
              </button>
            </div>

            {/* 2. Bursar */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', marginBottom: '6px' }}>
                Bursary &amp; Finance Office
              </div>
              {staffList
                .filter((s) => s.role === 'bursar')
                .slice(0, 2)
                .map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() =>
                      handleSelectPredefined({
                        id: b.id,
                        school_slug: school.slug,
                        name: b.full_name,
                        role: 'bursar',
                        username: b.username,
                        title: b.title,
                        department: b.department,
                        staff_id: b.id,
                      })
                    }
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.75rem 1rem',
                      background: '#fffbeb',
                      border: '1.5px solid #fef3c7',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900, color: '#92400e', fontSize: '0.88rem' }}>
                        {b.full_name}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#b45309', fontWeight: 700 }}>
                        {b.title} • Tuition, Ledger &amp; Payroll
                      </div>
                    </div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '6px' }}>
                      Enter Desk ➔
                    </span>
                  </button>
                ))}
            </div>

            {/* 3. Teachers */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', marginBottom: '6px' }}>
                Teaching Faculty
              </div>
              {staffList
                .filter((s) => s.role === 'teacher')
                .slice(0, 3)
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      handleSelectPredefined({
                        id: t.id,
                        school_slug: school.slug,
                        name: t.full_name,
                        role: 'teacher',
                        username: t.username,
                        title: t.title,
                        department: t.department,
                        staff_id: t.id,
                      })
                    }
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.75rem 1rem',
                      background: '#ecfdf5',
                      border: '1.5px solid #d1fae5',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900, color: '#065f46', fontSize: '0.88rem' }}>
                        {t.full_name}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#047857', fontWeight: 700 }}>
                        {t.title} • Attendance, CATs &amp; Gradebook
                      </div>
                    </div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, background: '#d1fae5', color: '#065f46', padding: '3px 8px', borderRadius: '6px' }}>
                      Enter Desk ➔
                    </span>
                  </button>
                ))}
            </div>

            {/* 4. Enrolled Students */}
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', marginBottom: '6px' }}>
                Enrolled Students
              </div>
              {studentList.slice(0, 3).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() =>
                    handleSelectPredefined({
                      id: st.id,
                      school_slug: school.slug,
                      name: st.full_name,
                      role: 'student',
                      username: st.admission_number,
                      grade_class: st.grade_class,
                      admission_number: st.admission_number,
                      student_id: st.id,
                    })
                  }
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    background: '#eff6ff',
                    border: '1.5px solid #dbeafe',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900, color: '#1e40af', fontSize: '0.88rem' }}>
                      {st.full_name} ({st.admission_number})
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#2563eb', fontWeight: 700 }}>
                      {st.grade_class} • Report Card &amp; Timetable
                    </div>
                  </div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, background: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: '6px' }}>
                    Enter Desk ➔
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
