import React, { useState } from 'react'
import type {
  PartnerSchoolTenant,
  TenantStaffMember,
  TenantStudentMember,
  TenantPayrollRecord,
  TenantTimetableEntry,
} from '@/types/tenantSchool'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import { UsersIcon, GraduationCapIcon, CalendarIcon, ShieldCheckIcon, CreditCardIcon } from '@/components/icons/AppIcons'

interface TenantPrincipalDeskProps {
  school: PartnerSchoolTenant
  staffList: TenantStaffMember[]
  studentList: TenantStudentMember[]
  payrollList: TenantPayrollRecord[]
  onReloadData: () => void
  onOpenStaffSlip: (staff: TenantStaffMember) => void
  onOpenAdmissionSlip: (student: TenantStudentMember) => void
  onOpenDomainSettings: () => void
}

export function TenantPrincipalDesk({
  school,
  staffList,
  studentList,
  payrollList,
  onReloadData,
  onOpenStaffSlip,
  onOpenAdmissionSlip,
  onOpenDomainSettings,
}: TenantPrincipalDeskProps) {
  const primaryColor = school.primary_color || '#881337'
  const accentColor = school.accent_color || '#d4af37'

  const [principalSubTab, setPrincipalSubTab] = useState<'staff' | 'admissions' | 'timetable' | 'payroll' | 'governance'>('staff')

  // Modals inside Principal Desk
  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [showAdmitStudentModal, setShowAdmitStudentModal] = useState(false)
  const [showAddTimetableModal, setShowAddTimetableModal] = useState(false)

  // Filters & Search
  const [staffSearchQuery, setStaffSearchQuery] = useState('')
  const [staffDeptFilter, setStaffDeptFilter] = useState('All')
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [studentClassFilter, setStudentClassFilter] = useState('All')
  const [selectedTimetableClass, setSelectedTimetableClass] = useState('Grade 10 Senior')

  // New Staff Input Form State
  const [newStaffInput, setNewStaffInput] = useState({
    full_name: '',
    role: 'teacher' as 'teacher' | 'bursar' | 'admin',
    email: '',
    phone: '',
    department: 'Languages & Humanities',
    title: 'Senior Subject Instructor',
    assigned_classes: 'Grade 10 Senior',
    assigned_subjects: 'Pure Mathematics, Physics',
    salary_base: 3200,
    salary_housing: 500,
    salary_transport: 250,
    salary_tax: 600,
    salary_pension: 240,
  })

  // New Student Input Form State
  const [newStudentInput, setNewStudentInput] = useState({
    full_name: '',
    grade_class: 'Grade 10 Senior',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
    fee_total: 1800,
    fee_paid: 1800,
  })

  // New Timetable Period State
  const [newTimetableInput, setNewTimetableInput] = useState({
    day_of_week: 'Monday' as 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday',
    period_number: 1,
    start_time: '08:00',
    end_time: '08:50',
    subject_name: 'Pure Mathematics',
    teacher_name: 'Mr. Marcus Sterling, M.Sc',
    room: 'Room M-201',
  })

  // Calculations for KPI Strip
  const totalStudents = studentList.length
  const totalStaff = staffList.length
  const totalGrossPayroll = payrollList.reduce((acc, p) => acc + p.gross_salary, 0)
  const totalTuitionBilled = studentList.reduce((acc, s) => acc + s.fee_total, 0)
  const totalTuitionCollected = studentList.reduce((acc, s) => acc + s.fee_paid, 0)
  const collectionRate = totalTuitionBilled > 0 ? Math.round((totalTuitionCollected / totalTuitionBilled) * 100) : 100

  // Timetable Entries for active class
  const classTimetable = tenantSchoolStore.getTimetableBySchool(school.slug, selectedTimetableClass)

  // Handle Hiring New Staff
  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStaffInput.full_name.trim()) return

    const slug = school.slug.toLowerCase()
    const nameSlug = newStaffInput.full_name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.')
    const generatedUsername = `${nameSlug}@${slug}.globalcollege.edu`
    const generatedPassword = `StaffPass2026!${Math.floor(100 + Math.random() * 900)}`

    const created = tenantSchoolStore.createStaffMember({
      school_slug: school.slug,
      full_name: newStaffInput.full_name,
      role: newStaffInput.role,
      title: newStaffInput.title,
      email: newStaffInput.email || `${nameSlug}@${slug}.edu`,
      username: generatedUsername,
      temp_password: generatedPassword,
      phone: newStaffInput.phone || '+254 700 000 000',
      department: newStaffInput.department,
      assigned_classes: newStaffInput.assigned_classes.split(',').map((c) => c.trim()),
      assigned_subjects: newStaffInput.assigned_subjects.split(',').map((s) => s.trim()),
      salary_base: Number(newStaffInput.salary_base) || 3000,
      salary_housing: Number(newStaffInput.salary_housing) || 400,
      salary_transport: Number(newStaffInput.salary_transport) || 200,
      salary_tax: Number(newStaffInput.salary_tax) || 500,
      salary_pension: Number(newStaffInput.salary_pension) || 200,
    })

    setShowAddStaffModal(false)
    setNewStaffInput({
      full_name: '',
      role: 'teacher',
      email: '',
      phone: '',
      department: 'Languages & Humanities',
      title: 'Senior Subject Instructor',
      assigned_classes: 'Grade 10 Senior',
      assigned_subjects: 'Pure Mathematics, Physics',
      salary_base: 3200,
      salary_housing: 500,
      salary_transport: 250,
      salary_tax: 600,
      salary_pension: 240,
    })
    onReloadData()
    onOpenStaffSlip(created)
  }

  // Handle Admitting New Student
  const handleAdmitStudent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStudentInput.full_name.trim()) return

    const slug = school.slug.toUpperCase()
    const nextSeq = Math.floor(1000 + Math.random() * 9000)
    const admNo = `${slug}-2026-${nextSeq}`
    const username = `${admNo.replace(/[^a-zA-Z0-9]/g, '')}`
    const tempPin = `PIN-${Math.floor(1000 + Math.random() * 9000)}`

    const created = tenantSchoolStore.admitStudent({
      school_slug: school.slug,
      admission_number: admNo,
      full_name: newStudentInput.full_name,
      grade_class: newStudentInput.grade_class,
      guardian_name: newStudentInput.guardian_name || 'Primary Guardian',
      guardian_phone: newStudentInput.guardian_phone || '+254 711 000 000',
      guardian_email: newStudentInput.guardian_email || 'guardian@globalcollege.edu',
      username,
      temp_password: tempPin,
      fee_total: Number(newStudentInput.fee_total) || 1800,
      fee_paid: Number(newStudentInput.fee_paid) || 1800,
    })

    setShowAdmitStudentModal(false)
    setNewStudentInput({
      full_name: '',
      grade_class: 'Grade 10 Senior',
      guardian_name: '',
      guardian_phone: '',
      guardian_email: '',
      fee_total: 1800,
      fee_paid: 1800,
    })
    onReloadData()
    onOpenAdmissionSlip(created)
  }

  // Handle Add Timetable Entry
  const handleAddTimetableEntry = (e: React.FormEvent) => {
    e.preventDefault()
    tenantSchoolStore.addTimetableEntry({
      school_slug: school.slug,
      class_name: selectedTimetableClass,
      day_of_week: newTimetableInput.day_of_week,
      period_number: Number(newTimetableInput.period_number),
      start_time: newTimetableInput.start_time,
      end_time: newTimetableInput.end_time,
      subject_name: newTimetableInput.subject_name,
      teacher_name: newTimetableInput.teacher_name,
      room: newTimetableInput.room,
    })
    setShowAddTimetableModal(false)
    onReloadData()
  }

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
      {/* Top Banner & Title */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '1.75rem 2rem',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '1.25rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {school.name} EXECUTIVE LEADERSHIP
            </span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '4px 0 0', color: '#0f172a' }}>
              {school.principal_name} — {school.principal_title} Office
            </h2>
            <div style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '3px' }}>
              Institutional Governance, Staff HR, Student Admissions &amp; Academic Scheduling
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowAddStaffModal(true)}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                fontWeight: 800,
                padding: '0.55rem 1.15rem',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.82rem',
              }}
            >
              + Hire / Register Staff
            </button>
            <button
              type="button"
              onClick={() => setShowAdmitStudentModal(true)}
              style={{
                background: primaryColor,
                color: '#ffffff',
                fontWeight: 800,
                padding: '0.55rem 1.15rem',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.82rem',
              }}
            >
              + Admit New Student
            </button>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setPrincipalSubTab('staff')}
            style={{
              background: principalSubTab === 'staff' ? primaryColor : '#f1f5f9',
              color: principalSubTab === 'staff' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            👥 Staff Directory &amp; HR ({staffList.length})
          </button>
          <button
            type="button"
            onClick={() => setPrincipalSubTab('admissions')}
            style={{
              background: principalSubTab === 'admissions' ? primaryColor : '#f1f5f9',
              color: principalSubTab === 'admissions' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            🎓 Student Admissions ({studentList.length})
          </button>
          <button
            type="button"
            onClick={() => setPrincipalSubTab('timetable')}
            style={{
              background: principalSubTab === 'timetable' ? primaryColor : '#f1f5f9',
              color: principalSubTab === 'timetable' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            🗓️ Master Class Timetable
          </button>
          <button
            type="button"
            onClick={() => setPrincipalSubTab('payroll')}
            style={{
              background: principalSubTab === 'payroll' ? primaryColor : '#f1f5f9',
              color: principalSubTab === 'payroll' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            💼 Executive Payroll Oversight
          </button>
          <button
            type="button"
            onClick={() => setPrincipalSubTab('governance')}
            style={{
              background: principalSubTab === 'governance' ? primaryColor : '#f1f5f9',
              color: principalSubTab === 'governance' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            ⚙️ Cloud Subscription &amp; DNS
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>ENROLLED CANDIDATES</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>{totalStudents} Active</div>
          <div style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: 700 }}>100% In Good Standing</div>
        </div>
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>CERTIFIED FACULTY</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>{totalStaff} Appointed</div>
          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>Across {school.stats.departments} Faculties</div>
        </div>
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>TUITION REVENUE RECOVERY</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: primaryColor, marginTop: '2px' }}>{collectionRate}%</div>
          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>${totalTuitionCollected.toLocaleString()} of ${totalTuitionBilled.toLocaleString()}</div>
        </div>
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>MONTHLY PAYROLL BUDGET</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>${totalGrossPayroll.toLocaleString()}</div>
          <div style={{ fontSize: '0.76rem', color: '#15803d', fontWeight: 700 }}>Electronic Bank Wire</div>
        </div>
      </div>

      {/* SUBTAB 1: STAFF DIRECTORY & HR */}
      {principalSubTab === 'staff' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>Staff Directory &amp; Portal Login Accounts</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Provision system accounts and print official login slips for teachers and bursars.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search staff by name or role..."
                value={staffSearchQuery}
                onChange={(e) => setStaffSearchQuery(e.target.value)}
                style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '220px' }}
              />
              <button
                type="button"
                onClick={() => setShowAddStaffModal(true)}
                style={{ background: '#0f172a', color: '#ffffff', fontWeight: 800, padding: '0.45rem 0.95rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                + Add Staff Member
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Staff Name</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Role</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Department</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Portal Username</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>Net Salary</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Official Slip</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {staffList
                  .filter((s) => !staffSearchQuery || s.full_name.toLowerCase().includes(staffSearchQuery.toLowerCase()) || s.role.toLowerCase().includes(staffSearchQuery.toLowerCase()))
                  .map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{s.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.title} • Joined {s.joined_date}</div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            background: s.role === 'teacher' ? '#ecfdf5' : s.role === 'bursar' ? '#fefce8' : '#eff6ff',
                            color: s.role === 'teacher' ? '#065f46' : s.role === 'bursar' ? '#854d0e' : '#1e40af',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            textTransform: 'capitalize',
                          }}
                        >
                          {s.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', color: '#475569' }}>{s.department}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: primaryColor }}>{s.username}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 900, color: '#0f172a' }}>
                        ${s.net_salary.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onOpenStaffSlip(s)}
                          style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          🖨️ Login Slip
                        </button>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remove ${s.full_name} from staff register?`)) {
                              tenantSchoolStore.deleteStaffMember(s.id)
                              onReloadData()
                            }
                          }}
                          style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: STUDENT ADMISSIONS */}
      {principalSubTab === 'admissions' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>Student Admissions &amp; Enrollment Registry</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Admit new candidates, generate Admission Numbers, Portal PINs, and Official Admission Letters.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search student or admission no..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '220px' }}
              />
              <button
                type="button"
                onClick={() => setShowAdmitStudentModal(true)}
                style={{ background: primaryColor, color: '#ffffff', fontWeight: 800, padding: '0.45rem 0.95rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                + Admit New Candidate
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Adm Number</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Student Name</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Class Cohort</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Guardian Contact</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>Fee Balance</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Official Slip</th>
                </tr>
              </thead>
              <tbody>
                {studentList
                  .filter((s) => !studentSearchQuery || s.full_name.toLowerCase().includes(studentSearchQuery.toLowerCase()) || s.admission_number.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                  .map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 800, color: primaryColor }}>{s.admission_number}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>{s.full_name}</td>
                      <td style={{ padding: '0.75rem', color: '#475569' }}>{s.grade_class}</td>
                      <td style={{ padding: '0.75rem', color: '#64748b' }}>
                        {s.guardian_name} • {s.guardian_phone}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 800, color: s.fee_balance > 0 ? '#dc2626' : '#16a34a' }}>
                        ${s.fee_balance.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onOpenAdmissionSlip(s)}
                          style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          📜 Admission Letter
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: TIMETABLE */}
      {principalSubTab === 'timetable' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>Master Class Timetable &amp; Schedule</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Weekly class periods, assigned instructors, and laboratory/lecture room allocations.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Select Class:</span>
              <select
                value={selectedTimetableClass}
                onChange={(e) => setSelectedTimetableClass(e.target.value)}
                style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', background: '#f8fafc' }}
              >
                <option value="Grade 10 Senior">Grade 10 Senior</option>
                <option value="Grade 11 Senior">Grade 11 Senior</option>
                <option value="Form 3 Alpha">Form 3 Alpha</option>
                <option value="Diploma Year 1">Diploma Year 1</option>
              </select>
              <button
                type="button"
                onClick={() => setShowAddTimetableModal(true)}
                style={{ background: primaryColor, color: '#ffffff', border: 'none', padding: '0.45rem 0.95rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
              >
                + Add Period
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Day</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Period</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Time</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Subject</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Faculty Instructor</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Room / Lab</th>
                </tr>
              </thead>
              <tbody>
                {classTimetable.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 800, color: primaryColor }}>{t.day_of_week}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: '#64748b' }}>Period {t.period_number}</td>
                    <td style={{ padding: '0.75rem', color: '#0f172a', fontWeight: 600 }}>{t.start_time} - {t.end_time}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>{t.subject_name}</td>
                    <td style={{ padding: '0.75rem', color: '#475569' }}>{t.teacher_name}</td>
                    <td style={{ padding: '0.75rem', color: '#64748b' }}>{t.room}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: EXECUTIVE PAYROLL SIGN-OFF */}
      {principalSubTab === 'payroll' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>Executive Payroll Authorization &amp; Disbursement</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Review monthly payroll compiled by the Bursar and sign off on electronic disbursements.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                tenantSchoolStore.disbursePayrollBatch(school.slug, 'October 2026', 'Bank Wire')
                onReloadData()
                alert(`Authorized & Disbursed October 2026 Payroll for ${school.name}!`)
              }}
              style={{
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '0.6rem 1.25rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ✓ Authorize &amp; Disburse Batch via Bank Wire
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>GROSS SALARIES</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                ${totalGrossPayroll.toLocaleString()}
              </div>
            </div>
            <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '12px', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700 }}>STATUTORY WITHHOLDING</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#991b1b', marginTop: '2px' }}>
                ${payrollList.reduce((acc, p) => acc + (p.tax_deduction + p.pension_deduction), 0).toLocaleString()}
              </div>
            </div>
            <div style={{ background: '#ecfdf5', padding: '1rem', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>NET PAYABLE TO STAFF</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#065f46', marginTop: '2px' }}>
                ${payrollList.reduce((acc, p) => acc + p.net_salary, 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Staff Member</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Department</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>Gross Pay</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>Net Disbursed</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {payrollList.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>{p.staff_name}</td>
                    <td style={{ padding: '0.75rem', color: '#64748b' }}>{p.department}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>${p.gross_salary.toLocaleString()}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 900, color: '#0f172a' }}>${p.net_salary.toLocaleString()}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span
                        style={{
                          background: p.status === 'disbursed' ? '#dcfce7' : '#fef3c7',
                          color: p.status === 'disbursed' ? '#15803d' : '#b45309',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                        }}
                      >
                        {p.status === 'disbursed' ? '✓ Disbursed' : '⏳ Pending Exec Sign-off'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 5: CLOUD SUBSCRIPTION & GOVERNANCE */}
      {principalSubTab === 'governance' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 1rem', color: '#0f172a' }}>
            School Cloud LMS Subscription &amp; Domain Setup
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Current Subscription Plan</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: primaryColor, marginTop: '4px', textTransform: 'capitalize' }}>
                {school.subscription_tier || 'Enterprise'} Edition
              </div>
              <div style={{ fontSize: '0.85rem', color: '#0f172a', marginTop: '2px' }}>
                <strong>${school.subscription_monthly_rate || 99} / month</strong> billed {school.subscription_billing_cycle || 'monthly'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700, marginTop: '8px' }}>
                ✓ Unlimited students, faculty credentials &amp; report cards
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Custom Domain &amp; Subdomain</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                {school.custom_domain || `${school.slug}.globalcollege.edu`}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                Status: <span style={{ color: '#16a34a', fontWeight: 800 }}>● Active &amp; SSL Secured</span>
              </div>
              <button
                type="button"
                onClick={onOpenDomainSettings}
                style={{ marginTop: '12px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                ⚙️ Configure DNS &amp; Custom Domain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD STAFF */}
      {showAddStaffModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '640px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', border: `2px solid ${primaryColor}` }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 1rem', color: '#0f172a' }}>+ Register &amp; Appoint Staff Member</h3>
            <form onSubmit={handleCreateStaff}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Full Legal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Arthur Sterling"
                    value={newStaffInput.full_name}
                    onChange={(e) => setNewStaffInput({ ...newStaffInput, full_name: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>System Portal Role</label>
                  <select
                    value={newStaffInput.role}
                    onChange={(e) => setNewStaffInput({ ...newStaffInput, role: e.target.value as any })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  >
                    <option value="teacher">Teacher / Faculty</option>
                    <option value="bursar">Bursar / Finance Officer</option>
                    <option value="admin">Executive Administrator</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Department</label>
                  <input
                    type="text"
                    required
                    value={newStaffInput.department}
                    onChange={(e) => setNewStaffInput({ ...newStaffInput, department: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Official Designation</label>
                  <input
                    type="text"
                    required
                    value={newStaffInput.title}
                    onChange={(e) => setNewStaffInput({ ...newStaffInput, title: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '4px' }}>Base Salary ($)</label>
                  <input
                    type="number"
                    value={newStaffInput.salary_base}
                    onChange={(e) => setNewStaffInput({ ...newStaffInput, salary_base: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '4px' }}>Housing ($)</label>
                  <input
                    type="number"
                    value={newStaffInput.salary_housing}
                    onChange={(e) => setNewStaffInput({ ...newStaffInput, salary_housing: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '4px' }}>Tax &amp; Pension ($)</label>
                  <input
                    type="number"
                    value={newStaffInput.salary_tax}
                    onChange={(e) => setNewStaffInput({ ...newStaffInput, salary_tax: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: primaryColor, color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Appoint &amp; Issue Slip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADMIT STUDENT */}
      {showAdmitStudentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '640px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', border: `2px solid ${primaryColor}` }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 1rem', color: '#0f172a' }}>+ Admit Candidate &amp; Issue Credentials</h3>
            <form onSubmit={handleAdmitStudent}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Candidate Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Liam Chen"
                    value={newStudentInput.full_name}
                    onChange={(e) => setNewStudentInput({ ...newStudentInput, full_name: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Class / Form Cohort</label>
                  <select
                    value={newStudentInput.grade_class}
                    onChange={(e) => setNewStudentInput({ ...newStudentInput, grade_class: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  >
                    <option value="Grade 10 Senior">Grade 10 Senior</option>
                    <option value="Grade 11 Senior">Grade 11 Senior</option>
                    <option value="Form 3 Alpha">Form 3 Alpha</option>
                    <option value="Diploma Year 1">Diploma Year 1</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Guardian Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Meili Chen"
                    value={newStudentInput.guardian_name}
                    onChange={(e) => setNewStudentInput({ ...newStudentInput, guardian_name: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Guardian Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="+254 700 000 000"
                    value={newStudentInput.guardian_phone}
                    onChange={(e) => setNewStudentInput({ ...newStudentInput, guardian_phone: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Term Tuition Total ($)</label>
                  <input
                    type="number"
                    value={newStudentInput.fee_total}
                    onChange={(e) => setNewStudentInput({ ...newStudentInput, fee_total: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Initial Amount Paid ($)</label>
                  <input
                    type="number"
                    value={newStudentInput.fee_paid}
                    onChange={(e) => setNewStudentInput({ ...newStudentInput, fee_paid: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAdmitStudentModal(false)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: primaryColor, color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Admit &amp; Generate Letter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD TIMETABLE PERIOD */}
      {showAddTimetableModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '540px', width: '100%', padding: '2rem', border: `2px solid ${primaryColor}` }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 1rem', color: '#0f172a' }}>+ Add Timetable Lecture Period</h3>
            <form onSubmit={handleAddTimetableEntry}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Day of Week</label>
                  <select
                    value={newTimetableInput.day_of_week}
                    onChange={(e) => setNewTimetableInput({ ...newTimetableInput, day_of_week: e.target.value as any })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Period #</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={newTimetableInput.period_number}
                    onChange={(e) => setNewTimetableInput({ ...newTimetableInput, period_number: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Start Time</label>
                  <input
                    type="time"
                    value={newTimetableInput.start_time}
                    onChange={(e) => setNewTimetableInput({ ...newTimetableInput, start_time: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>End Time</label>
                  <input
                    type="time"
                    value={newTimetableInput.end_time}
                    onChange={(e) => setNewTimetableInput({ ...newTimetableInput, end_time: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Subject</label>
                <input
                  type="text"
                  required
                  value={newTimetableInput.subject_name}
                  onChange={(e) => setNewTimetableInput({ ...newTimetableInput, subject_name: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Faculty Teacher</label>
                  <input
                    type="text"
                    required
                    value={newTimetableInput.teacher_name}
                    onChange={(e) => setNewTimetableInput({ ...newTimetableInput, teacher_name: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Room / Lab</label>
                  <input
                    type="text"
                    required
                    value={newTimetableInput.room}
                    onChange={(e) => setNewTimetableInput({ ...newTimetableInput, room: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddTimetableModal(false)}
                  style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: '0.82rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', background: primaryColor, color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem' }}
                >
                  Save Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
