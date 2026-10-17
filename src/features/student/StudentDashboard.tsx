import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { AnnouncementCard } from '@/components/shared/AnnouncementCard'
import { Spinner } from '@/components/ui/Spinner'
import { CertificateGenerator } from '@/components/shared/CertificateGenerator'
import { schoolStore, schoolEventBus } from '@/lib/schoolData'
import {
  BookOpenIcon,
  CreditCardIcon,
  LibraryIcon,
  MegaphoneIcon,
  FileTextIcon,
  SparklesIcon,
} from '@/components/icons/AppIcons'
import type { Course, Enrollment, Announcement } from '@/lib/database.types'

export function StudentDashboard() {
  const { profile } = useAuth()
  const [showCertModal, setShowCertModal] = useState(false)
  const [, setStudentsVersion] = useState(0)

  // Realtime Cloud Sync & Event Listener for Student Clearance
  useEffect(() => {
    let isMounted = true
    const handleSync = () => {
      if (isMounted) setStudentsVersion((v) => v + 1)
    }

    schoolStore.syncWithCloud(true).then(handleSync).catch(() => {})

    const unsubStudent = schoolEventBus.subscribe('STUDENT_UPDATED', handleSync)
    const unsubPayment = schoolEventBus.subscribe('PAYMENT_RECORDED', handleSync)
    window.addEventListener('storage', handleSync)
    window.addEventListener('gc-data-synced', handleSync)

    return () => {
      isMounted = false
      unsubStudent()
      unsubPayment()
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('gc-data-synced', handleSync)
    }
  }, [])

  // Read current student records from schoolStore with normalized matching
  const allStudents = schoolStore.getStudents()
  const myAdmClean = (profile?.admission_number || '').trim().toLowerCase()
  const myAdmAlpha = myAdmClean.replace(/[^a-z0-9]/g, '')
  const myNameAlpha = (profile?.full_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const myIdClean = (profile?.id || '').toLowerCase()

  const matchedStudent =
    allStudents.find((s) => {
      if (!s) return false
      const sAdm = (s.admission_number || '').trim().toLowerCase()
      const sAdmAlpha = sAdm.replace(/[^a-z0-9]/g, '')
      const sNameAlpha = (s.full_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      const sId = (s.id || '').toLowerCase()
      return (
        (myIdClean && sId === myIdClean) ||
        (myAdmClean && sAdm === myAdmClean) ||
        (myAdmAlpha && sAdmAlpha === myAdmAlpha) ||
        (myNameAlpha && myNameAlpha.length > 3 && sNameAlpha === myNameAlpha)
      )
    })

  const studentReceipts = schoolStore.getReceipts().filter((r) => {
    if (!r) return false
    const rAdmClean = (r.admission_number || '').trim().toLowerCase()
    const rAdmAlpha = rAdmClean.replace(/[^a-z0-9]/g, '')
    const rStdId = (r.student_id || '').toLowerCase()
    return (
      (matchedStudent?.id && rStdId === matchedStudent.id.toLowerCase()) ||
      (myIdClean && rStdId === myIdClean) ||
      (myAdmClean && rAdmClean === myAdmClean) ||
      (myAdmAlpha && rAdmAlpha === myAdmAlpha)
    )
  })

  const studentInvoices = schoolStore.getInvoices().filter((i) => {
    if (!i) return false
    const iAdmClean = (i.admission_number || '').trim().toLowerCase()
    const iAdmAlpha = iAdmClean.replace(/[^a-z0-9]/g, '')
    const iStdId = (i.student_id || '').toLowerCase()
    return (
      (matchedStudent?.id && iStdId === matchedStudent.id.toLowerCase()) ||
      (myIdClean && iStdId === myIdClean) ||
      (myAdmClean && iAdmClean === myAdmClean) ||
      (myAdmAlpha && iAdmAlpha === myAdmAlpha)
    )
  })

  const studentUnitReg = schoolStore.getRegistrationForStudent(matchedStudent?.admission_number || profile?.admission_number || '')

  const isFeeCleared =
    matchedStudent?.fee_cleared === true ||
    (matchedStudent && matchedStudent.fee_balance === 0) ||
    studentReceipts.some((r) => (r.amount_paid ?? r.amount) > 0) ||
    studentInvoices.some((inv) => inv.status === 'Paid' || inv.balance === 0) ||
    studentUnitReg?.fee_clearance_status === 'Cleared' ||
    studentUnitReg?.exam_card_issued === true

  const currentStudent = matchedStudent || {
    id: profile?.id || '',
    admission_number: profile?.admission_number || '',
    full_name: profile?.full_name || 'Enrolled Student',
    gender: 'Not Specified',
    dob: '',
    class_id: studentUnitReg?.unit_id || 'class-main',
    class_name: studentUnitReg?.program || 'Enrolled Program',
    grade_level: `${new Date().getFullYear()} Virtual Intake`,
    stream: 'Online Campus',
    enrollment_date: new Date().toISOString().split('T')[0],
    admission_date: new Date().toISOString().split('T')[0],
    status: 'Active',
    guardian: { name: '', relationship: 'Self', phone: '', email: '' },
    emergency_contact: '',
    fee_balance: isFeeCleared ? 0 : (studentUnitReg?.balance_remaining ?? 0),
    term_fee_total: studentUnitReg?.fee_amount ?? 0,
    fee_cleared: isFeeCleared,
    attendance_rate: 0,
    discipline_points: 100,
    merits_count: 0,
    demerits_count: 0,
    biometric_enrolled: false,
    certificate_granted: false,
  }

  const reportCards = schoolStore.getReportCards()
  const studentTranscript = currentStudent
    ? reportCards.find(
        (r) =>
          (currentStudent.admission_number && r.admission_number?.toLowerCase() === currentStudent.admission_number.toLowerCase()) ||
          r.student_id === currentStudent.id
      )
    : null

  const currentDayOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(
    new Date().toLocaleDateString('en-US', { weekday: 'long' })
  )
    ? new Date().toLocaleDateString('en-US', { weekday: 'long' })
    : 'Monday'

  const todayPeriods = schoolStore
    .getTimetable()
    .filter((p) => p.day_of_week === currentDayOfWeek)
    .slice(0, 3)

  // Fetch enrollments with course details from Supabase (if online)
  const { data: _enrollments, isLoading: loadingEnrollments } = useQuery({
    queryKey: ['student-enrollments', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, course:courses(*, subject:subjects(*), teacher:profiles!teacher_id(full_name))')
        .eq('student_id', profile.id)
      if (error) return []
      return (data || []) as unknown as (Enrollment & { course: Course })[]
    },
    enabled: !!profile?.id,
  })

  // Fetch announcements from schoolStore
  const { data: announcements } = useQuery({
    queryKey: ['announcements-student'],
    queryFn: async () => {
      const notices = schoolStore.getNotices().filter(
        (n) => n.target_audience === 'All' || n.target_audience === 'Students'
      )
      return notices.slice(0, 2).map((n) => ({
        id: n.id,
        title: n.title,
        body: n.content,
        target: n.target_audience.toLowerCase(),
        pinned: n.is_pinned,
        author_id: profile?.id || '',
        created_at: n.publish_date,
        author: { full_name: n.author_name },
      })) as unknown as Announcement[]
    },
  })

  if (loadingEnrollments) {
    return (
      <PageWrapper title="My Student Dashboard">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
          <Spinner size="lg" />
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper
      title={`Welcome, ${currentStudent?.full_name || profile?.full_name || 'Trainee'}! 👋`}
      subtitle={`Admission No: ${currentStudent?.admission_number || profile?.admission_number || 'N/A'} • ${currentStudent?.class_name || 'Enrolled Student'}`}
      breadcrumbs={[
        { label: 'Portal', href: '/' },
        { label: 'Student Workspace' },
      ]}
    >
      {showCertModal && (() => {
        const matchingUnit = schoolStore.getCourseUnits().find(
          (u) =>
            u && (
              u.id === currentStudent?.class_id ||
              (u.title && currentStudent?.class_name && u.title.toLowerCase() === currentStudent.class_name.toLowerCase()) ||
              (currentStudent?.class_name && u.title && u.title.toLowerCase().includes(currentStudent.class_name.toLowerCase()))
            )
        )
        return (
          <CertificateGenerator 
            cert={{
              student_name: currentStudent?.full_name || profile?.full_name || 'Enrolled Trainee',
              admission_number: currentStudent?.admission_number || profile?.admission_number || `GC-${new Date().getFullYear()}-001`,
              course_title: matchingUnit?.title || currentStudent?.class_name || 'Comprehensive Practical Short Course',
              grade: studentTranscript?.mean_grade || 'Distinction (Grade A)',
              percentage: studentTranscript?.mean_percentage || 95,
              issue_date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
              certificate_no: `GC-CERT-${(currentStudent?.admission_number || `${new Date().getFullYear()}`).replace(/[^a-zA-Z0-9]/g, '')}`,
              duration: matchingUnit?.course_duration || '4 to 12 Weeks Intensive Practical Training',
              trainer_name: matchingUnit?.teacher_name || 'Lead Faculty Lecturer',
              provider_type: matchingUnit?.provider_type || 'individual_tutor',
              institution_name: matchingUnit?.institution_name,
              institution_logo: matchingUnit?.institution_logo,
              institution_signatory: matchingUnit?.institution_signatory,
              delivery_mode: matchingUnit?.delivery_mode || (currentStudent?.stream?.includes('Self-Paced') ? 'self_paced' : 'live_cohort'),
              skills_acquired: ['Hands-on Laboratory Mastery', 'Technical Workflow & Industry Standards', 'Applied Capstone Project'],
            }}
            onClose={() => setShowCertModal(false)} 
          />
        )
      })()}

      {/* Top Academic Status Card — Canvas-grade Clean Institutional Design */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #2563eb',
          borderRadius: '12px',
          padding: '1.25rem 1.75rem',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#2563eb', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🎓</span>
              <span>College Academic Standing: Active Short Course Cohort</span>
            </div>
            <h2 style={{ color: '#0f172a', fontSize: '1.35rem', fontWeight: 800, margin: '0.35rem 0 0.35rem' }}>
              {studentTranscript ? `${studentTranscript.mean_grade} — Mean: ${studentTranscript.mean_percentage}%` : 'Enrolled — In Progress'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
              {studentTranscript
                ? `Rank #${studentTranscript.class_position} of ${studentTranscript.total_students_in_class} in Class`
                : 'Modular practical assessments and final evaluation grades will appear here upon completion.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {currentStudent?.certificate_granted ? (
              <button
                type="button"
                onClick={() => setShowCertModal(true)}
                style={{
                  background: '#047857',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 2px 8px rgba(4, 120, 87, 0.25)',
                }}
                title="Your Certificate has been officially granted and verified by the Academic Registrar."
              >
                <span>📜 Certificate of Completion (Granted)</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                title="Certificate locked: Awaiting course evaluation and graduation clearance by the College Administrator."
                style={{
                  background: '#f8fafc',
                  color: '#64748b',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  cursor: 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>🔒 Certificate (Pending Clearance)</span>
              </button>
            )}
            <Link
              to="/exams"
              style={{
                background: '#ffffff',
                color: '#1e40af',
                fontWeight: 600,
                fontSize: '0.82rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 14px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <span>📄 Official Transcript</span>
            </Link>
            <Link
              to="/fees"
              style={{
                background: '#2563eb',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.82rem',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
              }}
            >
              <span>💳 Tuition Statement</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Student Personal KPI Grid — Standardized Canvas / Linear Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderTop: '3px solid #2563eb',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Lecture Attendance</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', marginTop: '0.35rem' }}>
            {currentStudent ? `${currentStudent.attendance_rate || 0}%` : '0%'}
          </div>
          <div style={{ fontSize: '0.74rem', fontWeight: 600, color: (currentStudent?.attendance_rate || 0) >= 75 ? '#047857' : '#64748b', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{(currentStudent?.attendance_rate || 0) >= 75 ? '✓ Meets Exam Minimum (75%)' : '0 Sessions Logged (Newly Enrolled)'}</span>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderTop: `3px solid ${isFeeCleared ? '#047857' : '#ea580c'}`,
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Fee Clearance & Exam Card</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: isFeeCleared ? '#047857' : '#ea580c', marginTop: '0.35rem' }}>
            {isFeeCleared ? '✓ Cleared' : (currentStudent ? `$${(currentStudent.fee_balance ?? 0).toLocaleString()}` : '$0')}
          </div>
          <div style={{ fontSize: '0.74rem', fontWeight: 600, color: isFeeCleared ? '#047857' : '#64748b', marginTop: '0.35rem' }}>
            {isFeeCleared ? 'Exam Card Active • Lessons Unlocked' : 'Pay Online / Bursar'}
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderTop: '3px solid #7c3aed',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Registered Course Units</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', marginTop: '0.35rem' }}>
            {schoolStore.getRegisteredUnitsForStudent(currentStudent?.admission_number || profile?.admission_number || '').length} Units
          </div>
          <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b', marginTop: '0.35rem' }}>
            {schoolStore.getRegistrationForStudent(currentStudent?.admission_number || profile?.admission_number || '') ? '✓ Formally Cleared' : 'Pending Registration'}
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderTop: '3px solid #d97706',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Merits & Conduct</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', marginTop: '0.35rem' }}>
            ⭐ {currentStudent?.merits_count || 0} Merits
          </div>
          <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#047857', marginTop: '0.35rem' }}>
            Conduct Index: 100/100
          </div>
        </div>
      </div>

      {/* Today's Schedule Preview & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Schedule */}
        <div className="card" style={{ padding: '1.25rem', gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>📅 Today’s Lecture Schedule</h3>
            <Link to="/timetable" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              View Full Week →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {todayPeriods.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                No active lectures scheduled for today. Check your full timetable for upcoming practical lab sessions.
              </div>
            ) : (
              todayPeriods.map((period) => (
                <div
                  key={period.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    background: 'var(--color-bg-secondary)',
                    borderLeft: `4px solid ${period.color_hex || '#2563eb'}`,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      <span style={{ color: period.color_hex || '#2563eb', marginRight: '6px' }}>{period.subject_code}</span>
                      {period.subject_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      📍 {period.room} • 👨‍🏫 Lecturer: {period.teacher_name}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                    {period.start_time} - {period.end_time}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Links Card */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SparklesIcon size={18} color="#f59e0b" />
            <span>Student Quick Workstations</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link to="/student/courses" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
              <BookOpenIcon size={16} color="#475569" />
              <span>Online Lessons & LMS</span>
            </Link>
            <Link to="/exams" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
              <FileTextIcon size={16} color="#475569" />
              <span>Download Transcript PDF</span>
            </Link>
            <Link to="/fees" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
              <CreditCardIcon size={16} color="#475569" />
              <span>Pay Tuition via M-Pesa</span>
            </Link>
            <Link to="/library" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
              <LibraryIcon size={16} color="#475569" />
              <span>Past Papers & Lab Manuals</span>
            </Link>
            <Link to="/noticeboard" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
              <MegaphoneIcon size={16} color="#475569" />
              <span>Student Noticeboard</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Online LMS Courses Section */}
      {(() => {
        const studentIdentifier = currentStudent?.admission_number || profile?.admission_number || profile?.id || ''
        const studentUnits = schoolStore.getRegisteredUnitsForStudent(studentIdentifier)
        const allPublished = schoolStore.getCourseUnits().filter((u) => u.is_published !== false)
        const myUnits = studentUnits.length > 0 ? studentUnits : allPublished.slice(0, 1)

        return (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 style={{ fontSize: 'var(--text-xl)', color: 'var(--color-primary)', margin: 0 }}>
                📖 My Enrolled Course Unit ({myUnits.length})
              </h2>
              <Link to="/student/courses" className="btn btn-sm btn-outline">
                View My LMS & Course Modules →
              </Link>
            </div>

            {myUnits.length === 0 ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                No active course units enrolled yet. Please contact the administrator or bursar desk.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myUnits.map((unit) => (
                  <div key={unit.id} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span className="badge badge-primary" style={{ fontWeight: 800 }}>{unit.code}</span>
                        <span className="badge badge-info">{unit.credit_hours} Credits</span>
                      </div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0.25rem 0', color: 'var(--color-text-primary)' }}>
                        {unit.title}
                      </h3>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginBottom: '0.65rem' }}>
                        👨‍🏫 {unit.teacher_name} • {unit.department}
                      </div>
                      {unit.live_schedule_text && (
                        <div style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#1e3a8a', padding: '3px 6px', borderRadius: '4px', marginBottom: '0.65rem' }}>
                          📅 {unit.live_schedule_text}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.65rem' }}>
                      {unit.live_meeting_url && (
                        <a
                          href={unit.live_meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-xs"
                          style={{ background: '#059669', color: '#ffffff', fontWeight: 700, flex: 1, textAlign: 'center' }}
                        >
                          🎥 Live Meet ↗
                        </a>
                      )}
                      <Link
                        to={`/student/lesson/${unit.lessons?.[0]?.id || unit.id}`}
                        className="btn btn-xs btn-primary"
                        style={{ flex: 1, textAlign: 'center' }}
                      >
                        📚 Open LMS
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* Announcements */}
      {announcements && announcements.length > 0 && (
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)', color: 'var(--color-primary)' }}>
            📢 College Circulars & Announcements
          </h2>
          <div className="flex flex-col gap-3">
            {announcements.map((a) => (
              <AnnouncementCard key={a.id} announcement={a} />
            ))}
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
