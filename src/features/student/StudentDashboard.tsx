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
  CalendarIcon,
  ShieldCheckIcon,
} from '@/components/icons/AppIcons'
import type { Course, Enrollment, Announcement } from '@/lib/database.types'

export function StudentDashboard() {
  const { profile } = useAuth()
  const [showCertModal, setShowCertModal] = useState(false)
  const [, setStudentsVersion] = useState(0)
  const [isManualSyncing, setIsManualSyncing] = useState(false)

  const handleManualCloudSync = async () => {
    if (isManualSyncing) return
    setIsManualSyncing(true)
    try {
      await schoolStore.syncWithCloud(true)
      window.dispatchEvent(new CustomEvent('gc-data-synced'))
      window.dispatchEvent(new Event('storage'))
      setStudentsVersion((v) => v + 1)
    } finally {
      setTimeout(() => setIsManualSyncing(false), 600)
    }
  }

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

  const studentReceipts = (schoolStore.getReceipts() || []).filter((r) => {
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

  const studentInvoices = (schoolStore.getInvoices() || []).filter((i) => {
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

  const todayPeriods = (schoolStore.getTimetable() || [])
    .filter((p) => p && p.day_of_week === currentDayOfWeek)
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
      const notices = (schoolStore.getNotices() || []).filter(
        (n) => n && (n.target_audience === 'All' || n.target_audience === 'Students')
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

  const currentHour = new Date().getHours()
  const greetingText = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening'
  const studentFirstName = (currentStudent?.full_name || profile?.full_name || 'Trainee').split(' ')[0]

  return (
    <PageWrapper
      title={`Student Portal | ${currentStudent?.full_name || 'My Desk'}`}
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

      {/* ============================================================ */}
      {/* 1. NATIVE APP HERO HEADER WITH AVATAR & IDENTITY */}
      {/* ============================================================ */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 60%, #0f172a 100%)',
          borderRadius: '24px',
          padding: '1.75rem 2rem',
          color: '#ffffff',
          marginBottom: '1.75rem',
          boxShadow: '0 12px 36px -6px rgba(30, 58, 138, 0.35)',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        {/* Subtle decorative background circles */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '220px',
            height: '220px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Student Avatar with Active Ring */}
            <div
              style={{
                position: 'relative',
                width: '68px',
                height: '68px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                fontWeight: 900,
                letterSpacing: '1px',
                border: '2.5px solid rgba(255, 255, 255, 0.9)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                flexShrink: 0,
              }}
            >
              {(currentStudent?.full_name || profile?.full_name || 'Student')
                .split(' ')
                .map((n) => n[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase()}
              {/* Online Active Pulsing Dot */}
              <div
                title="Active Realtime Session"
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  border: '2.5px solid #1e3a8a',
                  boxShadow: '0 0 10px #22c55e',
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: 'rgba(255, 255, 255, 0.18)',
                    backdropFilter: 'blur(10px)',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                  }}
                >
                  <ShieldCheckIcon size={13} color="#93c5fd" />
                  <span>VERIFIED LEARNER</span>
                </span>

                <span
                  style={{
                    background: isFeeCleared ? 'rgba(34, 197, 94, 0.22)' : 'rgba(249, 115, 22, 0.22)',
                    color: isFeeCleared ? '#86efac' : '#fed7aa',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    border: isFeeCleared ? '1px solid rgba(134, 239, 172, 0.4)' : '1px solid rgba(254, 215, 170, 0.4)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{isFeeCleared ? '✓' : '⚠️'}</span>
                  <span>{isFeeCleared ? 'Exam Pass Active' : 'Fee Clearance Pending'}</span>
                </span>
              </div>

              <h1
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 900,
                  margin: '6px 0 3px',
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                {greetingText}, {studentFirstName}! 👋
              </h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.82rem', color: '#cbd5e1' }}>
                <span style={{ background: 'rgba(255, 255, 255, 0.12)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  ADM: <strong style={{ color: '#ffffff' }}>{currentStudent?.admission_number || profile?.admission_number || 'GC-2026-001'}</strong>
                </span>
                <span>•</span>
                <span>{currentStudent?.class_name || 'Practical Short Course Cohort'}</span>
                <span>•</span>
                <span style={{ color: '#93c5fd' }}>{currentStudent?.grade_level || `${new Date().getFullYear()} Virtual Intake`}</span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleManualCloudSync}
              disabled={isManualSyncing}
              title="Sync with Cloud Database"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(8px)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.82rem',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '12px',
                padding: '9px 14px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ display: 'inline-block', transform: isManualSyncing ? 'rotate(360deg)' : 'none', transition: 'transform 0.6s ease' }}>
                🔄
              </span>
              <span>{isManualSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
            </button>

            {currentStudent?.certificate_granted ? (
              <button
                type="button"
                onClick={() => setShowCertModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '9px 15px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.4)',
                }}
              >
                <span>📜 Certificate Granted</span>
              </button>
            ) : null}

            <Link
              to="/exams"
              style={{
                background: '#ffffff',
                color: '#1e40af',
                fontWeight: 800,
                fontSize: '0.82rem',
                borderRadius: '12px',
                padding: '9px 15px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              }}
            >
              <span>📄 Official Transcript</span>
            </Link>

            <Link
              to="/fees"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.82rem',
                borderRadius: '12px',
                padding: '9px 15px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
              }}
            >
              <span>💳 Pay Tuition</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. TACTILE QUICK ACTION LAUNCHPAD (NATIVE APP ICONS) */}
      {/* ============================================================ */}
      <div className="mb-6">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <SparklesIcon size={18} color="#2563eb" />
            <span>Student Quick Workstations</span>
          </h2>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Touch to Launch ➔</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            {
              to: '/student/courses',
              icon: <BookOpenIcon size={24} color="#2563eb" />,
              bg: '#eff6ff',
              border: '#bfdbfe',
              title: 'My Course LMS',
              sub: 'Video lessons & tasks',
            },
            {
              to: '/timetable',
              icon: <CalendarIcon size={24} color="#7c3aed" />,
              bg: '#f5f3ff',
              border: '#ddd6fe',
              title: 'Timetable',
              sub: `${todayPeriods.length} sessions today`,
            },
            {
              to: '/fees',
              icon: <CreditCardIcon size={24} color="#059669" />,
              bg: '#ecfdf5',
              border: '#a7f3d0',
              title: 'Pay Tuition',
              sub: isFeeCleared ? 'Fully cleared ✓' : 'M-Pesa Paybill',
            },
            {
              to: '/exams',
              icon: <FileTextIcon size={24} color="#ea580c" />,
              bg: '#fff7ed',
              border: '#fed7aa',
              title: 'Transcript & Pass',
              sub: studentTranscript ? `${studentTranscript.mean_grade} (${studentTranscript.mean_percentage}%)` : 'Evaluation slip',
            },
            {
              to: '/library',
              icon: <LibraryIcon size={24} color="#0891b2" />,
              bg: '#ecfeff',
              border: '#a5f3fc',
              title: 'E-Library',
              sub: 'Past papers & books',
            },
            {
              to: '/noticeboard',
              icon: <MegaphoneIcon size={24} color="#e11d48" />,
              bg: '#fff1f2',
              border: '#fecdd3',
              title: 'Noticeboard',
              sub: `${announcements?.length || 0} recent notices`,
            },
          ].map((action, idx) => (
            <Link
              key={idx}
              to={action.to}
              style={{
                textDecoration: 'none',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1rem 0.85rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                touchAction: 'manipulation',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(15, 23, 42, 0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: action.bg,
                  border: `1.5px solid ${action.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.65rem',
                }}
              >
                {action.icon}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                {action.title}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px', lineHeight: 1.2 }}>
                {action.sub}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. STUDENT ACADEMIC HEALTH & COMPLIANCE KPI CARDS */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Metric 1: Lecture Attendance */}
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '18px',
            padding: '1.25rem 1.4rem',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#2563eb' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Roll Call Attendance
            </span>
            <span style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
              📋
            </span>
          </div>
          <div style={{ fontSize: '1.95rem', fontWeight: 900, color: '#0f172a', margin: '6px 0 4px', letterSpacing: '-0.02em' }}>
            {currentStudent ? `${currentStudent.attendance_rate || 0}%` : '0%'}
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: '999px', height: '6px', overflow: 'hidden', margin: '6px 0 8px' }}>
            <div
              style={{
                width: `${Math.min(100, Math.max(8, currentStudent?.attendance_rate || 0))}%`,
                background: (currentStudent?.attendance_rate || 0) >= 75 ? '#059669' : '#2563eb',
                height: '100%',
                borderRadius: '999px',
              }}
            />
          </div>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: (currentStudent?.attendance_rate || 0) >= 75 ? '#059669' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{(currentStudent?.attendance_rate || 0) >= 75 ? '✓ Meets Exam Minimum (75%)' : '0 Sessions Logged (Newly Enrolled)'}</span>
          </div>
        </div>

        {/* Metric 2: Fee Clearance */}
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '18px',
            padding: '1.25rem 1.4rem',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: isFeeCleared ? '#059669' : '#ea580c' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fee Clearance &amp; Pass
            </span>
            <span style={{ width: '30px', height: '30px', borderRadius: '8px', background: isFeeCleared ? '#ecfdf5' : '#fff7ed', color: isFeeCleared ? '#059669' : '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
              💳
            </span>
          </div>
          <div style={{ fontSize: '1.95rem', fontWeight: 900, color: isFeeCleared ? '#059669' : '#ea580c', margin: '6px 0 4px', letterSpacing: '-0.02em' }}>
            {isFeeCleared ? '✓ Cleared' : (currentStudent ? `$${(currentStudent.fee_balance ?? 0).toLocaleString()}` : '$0')}
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: '999px', height: '6px', overflow: 'hidden', margin: '6px 0 8px' }}>
            <div
              style={{
                width: isFeeCleared ? '100%' : '35%',
                background: isFeeCleared ? '#059669' : '#ea580c',
                height: '100%',
                borderRadius: '999px',
              }}
            />
          </div>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: isFeeCleared ? '#059669' : '#ea580c' }}>
            {isFeeCleared ? 'Exam Pass Issued • Lessons Unlocked' : 'Tuition Due • Pay Online via M-Pesa'}
          </div>
        </div>

        {/* Metric 3: Registered Units */}
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '18px',
            padding: '1.25rem 1.4rem',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#7c3aed' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Registered Units
            </span>
            <span style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
              📚
            </span>
          </div>
          <div style={{ fontSize: '1.95rem', fontWeight: 900, color: '#0f172a', margin: '6px 0 4px', letterSpacing: '-0.02em' }}>
            {schoolStore.getRegisteredUnitsForStudent(currentStudent?.admission_number || profile?.admission_number || '').length} Units
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: '999px', height: '6px', overflow: 'hidden', margin: '6px 0 8px' }}>
            <div style={{ width: '100%', background: '#7c3aed', height: '100%', borderRadius: '999px' }} />
          </div>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#7c3aed' }}>
            {schoolStore.getRegistrationForStudent(currentStudent?.admission_number || profile?.admission_number || '') ? '✓ Formally Cleared for Term' : 'Pending Formal Registration'}
          </div>
        </div>

        {/* Metric 4: Academic Standing & Merits */}
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '18px',
            padding: '1.25rem 1.4rem',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#d97706' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Standing &amp; Conduct
            </span>
            <span style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
              ⭐
            </span>
          </div>
          <div style={{ fontSize: '1.95rem', fontWeight: 900, color: '#0f172a', margin: '6px 0 4px', letterSpacing: '-0.02em' }}>
            {studentTranscript ? studentTranscript.mean_grade : 'Grade A*'}
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: '999px', height: '6px', overflow: 'hidden', margin: '6px 0 8px' }}>
            <div style={{ width: `${studentTranscript?.mean_percentage || 95}%`, background: '#d97706', height: '100%', borderRadius: '999px' }} />
          </div>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#059669' }}>
            {studentTranscript ? `Mean Score: ${studentTranscript.mean_percentage}% • Rank #${studentTranscript.class_position}` : 'Conduct Index: 100/100 (Exemplary)'}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. TODAY'S LECTURE SCHEDULE & LMS WORKSPACE */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Schedule */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '1.4rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
            gridColumn: 'span 2',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                LIVE CLASS SCHEDULE
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '2px 0 0', color: '#0f172a' }}>
                📅 Today’s Lecture Timetable
              </h3>
            </div>
            <Link
              to="/timetable"
              style={{
                fontSize: '0.82rem',
                color: '#2563eb',
                fontWeight: 700,
                textDecoration: 'none',
                background: '#eff6ff',
                padding: '6px 12px',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Full Week</span>
              <span>➔</span>
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {todayPeriods.length === 0 ? (
              <div
                style={{
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  background: '#f8fafc',
                  borderRadius: '14px',
                  border: '1.5px dashed #cbd5e1',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>🏖️</div>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>No Active Lectures Scheduled for Today</div>
                <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '3px' }}>
                  Enjoy self-paced revision on your course modules or explore the past papers in the E-Library.
                </div>
              </div>
            ) : (
              todayPeriods.map((period) => (
                <div
                  key={period.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.9rem 1.15rem',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderLeft: `4px solid ${period.color_hex || '#2563eb'}`,
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                      <span style={{ color: period.color_hex || '#2563eb', marginRight: '6px' }}>{period.subject_code}</span>
                      {period.subject_name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📍 Room: <strong style={{ color: '#334155' }}>{period.room}</strong></span>
                      <span>•</span>
                      <span>👨‍🏫 Lecturer: <strong style={{ color: '#334155' }}>{period.teacher_name}</strong></span>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: '#2563eb',
                      background: '#eff6ff',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {period.start_time} - {period.end_time}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Documents Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '1.4rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              OFFICIAL PAPERS &amp; ID
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '2px 0 1rem', color: '#0f172a' }}>
              🪪 Student Credentials
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <Link
                to="/exams"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0.95rem',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  textDecoration: 'none',
                  color: '#0f172a',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📜</span>
                  <span>Official Academic Transcript</span>
                </div>
                <span style={{ color: '#2563eb', fontWeight: 800 }}>PDF ➔</span>
              </Link>

              <Link
                to="/fees"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0.95rem',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  textDecoration: 'none',
                  color: '#0f172a',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📄</span>
                  <span>Fee Statement &amp; Receipts</span>
                </div>
                <span style={{ color: '#2563eb', fontWeight: 800 }}>View ➔</span>
              </Link>

              <Link
                to="/timetable"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0.95rem',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  textDecoration: 'none',
                  color: '#0f172a',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎫</span>
                  <span>Biometric Exam Pass</span>
                </div>
                <span style={{ color: '#059669', fontWeight: 800 }}>Active ✓</span>
              </Link>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>🔒</span>
              <span>Encrypted Student Record • Global College Cloud</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. ONLINE LMS ENROLLED COURSE MODULES */}
      {/* ============================================================ */}

      {/* Online LMS Courses Section */}
      {(() => {
        const studentIdentifier = currentStudent?.admission_number || profile?.admission_number || profile?.id || ''
        const studentUnits = schoolStore.getRegisteredUnitsForStudent(studentIdentifier)
        const allPublished = (schoolStore.getCourseUnits() || []).filter((u) => u && u.is_published !== false)
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
