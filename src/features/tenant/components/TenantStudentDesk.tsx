import React, { useState, useMemo } from 'react'
import type {
  PartnerSchoolTenant,
  TenantStudentMember,
  TenantGradeRecord,
  TenantLessonNote,
  TenantFeePayment,
  TenantSessionUser,
} from '@/types/tenantSchool'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'

interface TenantStudentDeskProps {
  school: PartnerSchoolTenant
  studentList: TenantStudentMember[]
  gradeList: TenantGradeRecord[]
  lessonNotesList: TenantLessonNote[]
  feePaymentsList: TenantFeePayment[]
  activeStudent: TenantStudentMember
  sessionUser?: TenantSessionUser | null
  onSelectStudent: (student: TenantStudentMember) => void
  onReloadData?: () => void
  onOpenReceipt: (receipt: TenantFeePayment) => void
  onOpenTranscript?: (student: TenantStudentMember) => void
  onOpenInvoice?: (student: TenantStudentMember) => void
  onOpenExamPass?: (student: TenantStudentMember) => void
  onOpenAdmissionLetter?: (student: TenantStudentMember) => void
}

export function TenantStudentDesk({
  school,
  studentList,
  gradeList,
  lessonNotesList,
  feePaymentsList,
  activeStudent,
  sessionUser,
  onSelectStudent,
  onReloadData,
  onOpenReceipt,
  onOpenTranscript,
  onOpenInvoice,
  onOpenExamPass,
  onOpenAdmissionLetter,
}: TenantStudentDeskProps) {
  const primaryColor = school.primary_color || '#881337'
  const accentColor = school.accent_color || '#d4af37'
  const currency = school.currency || 'KES'
  const activePeriod = school.active_period_name || 'Active Term'

  // Sub-tabs navigation
  const [studentSubTab, setStudentSubTab] = useState<
    'report_card' | 'timetable' | 'notes' | 'fees' | 'attendance' | 'id_card'
  >('report_card')
  const [showDocMenu, setShowDocMenu] = useState(false)

  // Timetable Day Filter
  const [timetableDayFilter, setTimetableDayFilter] = useState<string>('ALL')

  // Notes Filter
  const [notesSubjectFilter, setNotesSubjectFilter] = useState<string>('ALL')
  const [notesSearchQuery, setNotesSearchQuery] = useState('')
  const [activeReadingNote, setActiveReadingNote] = useState<TenantLessonNote | null>(null)

  // Online Fee Payment Modal
  const [showOnlinePaymentModal, setShowOnlinePaymentModal] = useState(false)
  const [onlinePaymentInput, setOnlinePaymentInput] = useState({
    amount: activeStudent.fee_balance > 0 ? activeStudent.fee_balance : 0,
    payment_method: 'Mobile Money (M-Pesa)' as 'Bank Wire' | 'Mobile Money (M-Pesa)' | 'Credit Card' | 'Cash',
    phone_or_account: activeStudent.guardian_phone || activeStudent.phone || '',
    reference_code: '',
  })

  // Grades for active student
  const studentGrades = useMemo(() => {
    return gradeList.filter(
      (g) =>
        g.student_id === activeStudent.id ||
        (g.admission_number && g.admission_number === activeStudent.admission_number)
    )
  }, [gradeList, activeStudent.id, activeStudent.admission_number])

  // Payments for active student
  const studentPayments = useMemo(() => {
    return feePaymentsList.filter(
      (p) =>
        p.student_id === activeStudent.id ||
        (p.admission_number && p.admission_number === activeStudent.admission_number)
    )
  }, [feePaymentsList, activeStudent.id, activeStudent.admission_number])

  // Notes for student's class cohort
  const classNotes = useMemo(() => {
    return lessonNotesList.filter(
      (n) => !n.class_name || n.class_name.toLowerCase() === activeStudent.grade_class.toLowerCase()
    )
  }, [lessonNotesList, activeStudent.grade_class])

  // Subjects extracted from notes and grades
  const availableSubjects = useMemo(() => {
    const subs = new Set<string>()
    classNotes.forEach((n) => {
      if (n.subject_name) subs.add(n.subject_name)
    })
    studentGrades.forEach((g) => {
      if (g.subject_name) subs.add(g.subject_name)
    })
    return Array.from(subs)
  }, [classNotes, studentGrades])

  // Timetable for student's class
  const classTimetable = useMemo(() => {
    return tenantSchoolStore.getTimetableBySchool(school.slug, activeStudent.grade_class)
  }, [school.slug, activeStudent.grade_class])

  // Filtered timetable
  const filteredTimetable = useMemo(() => {
    if (timetableDayFilter === 'ALL') return classTimetable
    return classTimetable.filter((t) => t.day_of_week.toLowerCase() === timetableDayFilter.toLowerCase())
  }, [classTimetable, timetableDayFilter])

  // Dynamic scheduled days
  const timetableDays = useMemo(() => {
    const days = new Set<string>()
    classTimetable.forEach((t) => {
      if (t.day_of_week) days.add(t.day_of_week)
    })
    const baseDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const union = Array.from(new Set([...baseDays, ...Array.from(days)]))
    return ['ALL', ...union]
  }, [classTimetable])

  // Attendance Sessions for student's class
  const classAttendanceSessions = useMemo(() => {
    return tenantSchoolStore.getAttendanceSessions(school.slug, activeStudent.grade_class)
  }, [school.slug, activeStudent.grade_class])

  // Student's individual session records
  const studentSessionLogs = useMemo(() => {
    return classAttendanceSessions
      .map((session) => {
        const studentRec = session.records?.find(
          (r) =>
            r.student_id === activeStudent.id ||
            r.admission_number === activeStudent.admission_number
        )
        if (!studentRec) return null
        return {
          session_id: session.id,
          date: session.date,
          subject_name: session.subject_name,
          period_name: session.period_name || 'Regular',
          teacher_name: session.teacher_name,
          status: studentRec.status,
          note: studentRec.note,
        }
      })
      .filter(Boolean) as {
      session_id: string
      date: string
      subject_name: string
      period_name: string
      teacher_name: string
      status: 'present' | 'absent' | 'late' | 'excused'
      note?: string
    }[]
  }, [classAttendanceSessions, activeStudent.id, activeStudent.admission_number])

  // Dynamic Attendance Stats
  const attendanceStats = useMemo(() => {
    if (studentSessionLogs.length > 0) {
      const presentCount = studentSessionLogs.filter((s) => s.status === 'present').length
      const lateCount = studentSessionLogs.filter((s) => s.status === 'late').length
      const absentCount = studentSessionLogs.filter((s) => s.status === 'absent').length
      const excusedCount = studentSessionLogs.filter((s) => s.status === 'excused').length
      const effectiveRate = Math.round(((presentCount + 0.5 * lateCount) / studentSessionLogs.length) * 100)
      return {
        rate: effectiveRate,
        total: studentSessionLogs.length,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        excused: excusedCount,
        hasIndividualLogs: true,
      }
    }
    // If no session logs exist yet, student has 0 recorded sessions (newly enrolled)
    return {
      rate: 0,
      total: 0,
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
      hasIndividualLogs: false,
    }
  }, [studentSessionLogs])

  // Dynamic Academic Standing Calculations (No hardcoding)
  const hasGrades = studentGrades.length > 0
  const totalScoreSum = studentGrades.reduce((acc, g) => acc + g.total_score, 0)
  const averagePercentage = hasGrades ? Math.round(totalScoreSum / studentGrades.length) : null

  let overallGrade = 'Pending'
  if (averagePercentage !== null) {
    if (school.grading_scale === 'tvet_competency') {
      if (averagePercentage >= 80) overallGrade = 'Distinction'
      else if (averagePercentage >= 65) overallGrade = 'Credit'
      else if (averagePercentage >= 50) overallGrade = 'Pass'
      else overallGrade = 'Referral'
    } else if (school.grading_scale === 'letter_gpa') {
      if (averagePercentage >= 85) overallGrade = 'A (4.0)'
      else if (averagePercentage >= 75) overallGrade = 'B (3.0)'
      else if (averagePercentage >= 65) overallGrade = 'C (2.0)'
      else if (averagePercentage >= 50) overallGrade = 'D (1.0)'
      else overallGrade = 'F (0.0)'
    } else {
      if (averagePercentage >= 90) overallGrade = 'A*'
      else if (averagePercentage >= 80) overallGrade = 'A'
      else if (averagePercentage >= 70) overallGrade = 'B'
      else if (averagePercentage >= 60) overallGrade = 'C'
      else if (averagePercentage >= 50) overallGrade = 'D'
      else overallGrade = 'E'
    }
  }

  // Dynamic Class Ranking
  const classRanking = useMemo(() => {
    const classmates = studentList.filter((s) => s.grade_class === activeStudent.grade_class)
    if (classmates.length <= 1 || !hasGrades) {
      return { rank: 1, total: classmates.length || 1 }
    }

    const averages = classmates.map((mate) => {
      const mGrades = gradeList.filter(
        (g) => g.student_id === mate.id || g.admission_number === mate.admission_number
      )
      const mAvg =
        mGrades.length > 0
          ? Math.round(mGrades.reduce((acc, g) => acc + g.total_score, 0) / mGrades.length)
          : 0
      return { student_id: mate.id, avg: mAvg }
    })

    averages.sort((a, b) => b.avg - a.avg)
    const pos = averages.findIndex((a) => a.student_id === activeStudent.id)
    return {
      rank: pos >= 0 ? pos + 1 : 1,
      total: classmates.length,
    }
  }, [studentList, gradeList, activeStudent.id, activeStudent.grade_class, hasGrades])

  // Dynamic Teacher Remarks
  const dynamicTeacherRemarks = useMemo(() => {
    if (averagePercentage === null) {
      return 'Continuous assessment in progress. Attend all scheduled lectures and laboratory sessions.'
    }
    if (averagePercentage >= 85) {
      return 'Demonstrates exceptional academic distinction, rigorous analytical acumen, and exemplary leadership in class.'
    }
    if (averagePercentage >= 70) {
      return 'Commendable academic effort and consistent grasp of subject concepts. Encourage higher participation in practical projects.'
    }
    if (averagePercentage >= 55) {
      return 'Good steady performance with notable potential. Additional focus advised on examination revisions.'
    }
    return 'Needs close tutorial guidance and regular revision to reinforce core foundational concepts.'
  }, [averagePercentage])

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return classNotes.filter((n) => {
      const matchSubject = notesSubjectFilter === 'ALL' || n.subject_name === notesSubjectFilter
      const q = notesSearchQuery.toLowerCase()
      const matchQuery =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.summary.toLowerCase().includes(q) ||
        n.subject_name.toLowerCase().includes(q)
      return matchSubject && matchQuery
    })
  }, [classNotes, notesSubjectFilter, notesSearchQuery])

  // Handle Online Fee Payment Simulation
  const handleExecuteOnlinePayment = (e: React.FormEvent) => {
    e.preventDefault()
    const payAmt = Number(onlinePaymentInput.amount)
    if (isNaN(payAmt) || payAmt <= 0) {
      alert('Please enter a valid tuition payment amount.')
      return
    }

    const ref =
      onlinePaymentInput.reference_code.trim() ||
      `MP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    const newPayment = tenantSchoolStore.recordFeePayment({
      school_slug: school.slug,
      student_id: activeStudent.id,
      student_name: activeStudent.full_name,
      admission_number: activeStudent.admission_number,
      amount: payAmt,
      period_name: activePeriod,
      payment_method: onlinePaymentInput.payment_method,
      recorded_by: `${activeStudent.full_name} (Self-Service Portal - Ref: ${ref})`,
    })

    setShowOnlinePaymentModal(false)
    if (onReloadData) onReloadData()
    onOpenReceipt(newPayment)
  }

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
      {/* ============================================================ */}
      {/* STUDENT WORKSPACE HEADER */}
      {/* ============================================================ */}
      <div
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
          borderRadius: '24px',
          padding: '2rem 2.25rem',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          marginBottom: '1.75rem',
          boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.04), 0 4px 12px -2px rgba(15, 23, 42, 0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.25rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                position: 'relative',
                width: '68px',
                height: '68px',
                borderRadius: '20px',
                background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.45rem',
                fontWeight: 900,
                letterSpacing: '1px',
                boxShadow: `0 8px 24px -4px ${primaryColor}40`,
                border: `2.5px solid ${accentColor}`,
                flexShrink: 0,
              }}
            >
              {(activeStudent.full_name || 'Student')
                .split(' ')
                .map((n) => n[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase()}
              <div
                title="Active Enrolled Learner"
                style={{
                  position: 'absolute',
                  bottom: '-3px',
                  right: '-3px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#16a34a',
                  border: '2.5px solid #ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: primaryColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {school.name} • STUDENT DESK
                </span>
                <span
                  style={{
                    background: '#e0f2fe',
                    color: '#0369a1',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 9px',
                    borderRadius: '9999px',
                    border: '1px solid #bae6fd',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>🛡️</span> VERIFIED LEARNER
                </span>
                <span
                  style={{
                    background: activeStudent.fee_balance === 0 ? '#dcfce7' : '#fee2e2',
                    color: activeStudent.fee_balance === 0 ? '#15803d' : '#991b1b',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 9px',
                    borderRadius: '9999px',
                    border: activeStudent.fee_balance === 0 ? '1px solid #86efac' : '1px solid #fca5a5',
                  }}
                >
                  {activeStudent.fee_balance === 0 ? '✓ Exam Clearance Active' : '⚠️ Fee Clearance Pending'}
                </span>
              </div>

              <h2
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 900,
                  margin: '4px 0 2px',
                  color: '#0f172a',
                  letterSpacing: '-0.025em',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                {activeStudent.full_name}
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, color: '#334155' }}>
                  Admission: <strong style={{ color: '#0f172a' }}>{activeStudent.admission_number}</strong>
                </span>
                <span>•</span>
                <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, color: '#334155' }}>
                  Cohort: <strong style={{ color: '#0f172a' }}>{activeStudent.grade_class}</strong>
                </span>
                <span>•</span>
                <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, color: '#334155' }}>
                  Period: <strong style={{ color: '#0f172a' }}>{activePeriod}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Student Switcher (Admin Only) & Quick Pay & Print Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {studentList.length > 1 && sessionUser?.role === 'admin' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700 }}>Staff Switch:</span>
                <select
                  value={activeStudent.id}
                  onChange={(e) => {
                    const found = studentList.find((s) => s.id === e.target.value)
                    if (found) onSelectStudent(found)
                  }}
                  style={{
                    padding: '0.55rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    background: '#f8fafc',
                  }}
                >
                  {studentList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.admission_number}) - {s.grade_class}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeStudent.fee_balance > 0 && (
              <button
                type="button"
                onClick={() => setShowOnlinePaymentModal(true)}
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '0.65rem 1.15rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                }}
              >
                <span>💳</span> Pay Balance Online
              </button>
            )}

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowDocMenu((prev) => !prev)}
                style={{
                  background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 120%)`,
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '0.65rem 1.25rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: `0 4px 16px -2px ${primaryColor}40`,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>📑</span> Official Documents ▾
              </button>

              {showDocMenu && (
                <div
                  className="no-print"
                  style={{
                    position: 'absolute',
                    top: '110%',
                    right: 0,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '14px',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    zIndex: 100,
                    width: '260px',
                    overflow: 'hidden',
                    padding: '6px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowDocMenu(false)
                      if (onOpenTranscript) onOpenTranscript(activeStudent)
                      else setStudentSubTab('report_card')
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <span>📜</span> Official Academic Transcript
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDocMenu(false)
                      if (onOpenInvoice) onOpenInvoice(activeStudent)
                      else setStudentSubTab('fees')
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <span>📄</span> Fee Statement &amp; Invoice
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDocMenu(false)
                      if (onOpenExamPass) onOpenExamPass(activeStudent)
                      else setStudentSubTab('id_card')
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <span>🎫</span> Exam &amp; Biometric Pass
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDocMenu(false)
                      if (onOpenAdmissionLetter) onOpenAdmissionLetter(activeStudent)
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <span>✉️</span> Official Admission Letter
                  </button>

                  <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />

                  <button
                    type="button"
                    onClick={() => {
                      setShowDocMenu(false)
                      window.print()
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#64748b',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <span>🖨️</span> Print Current Screen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modern Segmented Navigation Bar */}
        <div
          style={{
            display: 'flex',
            gap: '0.45rem',
            overflowX: 'auto',
            background: '#f1f5f9',
            padding: '6px',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            scrollbarWidth: 'none',
          }}
        >
          {[
            { id: 'report_card' as const, icon: '📊', label: 'Academic Performance' },
            { id: 'timetable' as const, icon: '🗓️', label: `Timetable (${classTimetable.length})` },
            { id: 'notes' as const, icon: '📚', label: `Study Notes (${classNotes.length})` },
            {
              id: 'fees' as const,
              icon: '💳',
              label: activeStudent.fee_balance > 0
                ? `Tuition (${currency} ${activeStudent.fee_balance.toLocaleString()} due)`
                : 'Tuition (Cleared)'
            },
            { id: 'attendance' as const, icon: '📋', label: `Attendance (${attendanceStats.rate}%)` },
            { id: 'id_card' as const, icon: '🪪', label: 'Digital Student ID & Pass' },
          ].map((item) => {
            const isActive = studentSubTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStudentSubTab(item.id)}
                style={{
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? primaryColor : '#475569',
                  border: isActive ? '1px solid #cbd5e1' : '1px solid transparent',
                  padding: '0.6rem 1.15rem',
                  borderRadius: '11px',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* STUDENT METRICS INTELLIGENCE STRIP */}
      {/* ============================================================ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.15rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Card 1: Academic Standing */}
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            borderRadius: '20px',
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 18px -2px rgba(15, 23, 42, 0.04)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: primaryColor }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ACADEMIC STANDING
            </span>
            <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: `${primaryColor}14`, color: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              🏆
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
            {hasGrades ? (
              <>
                Grade {overallGrade} <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#64748b' }}>({averagePercentage}%)</span>
              </>
            ) : (
              <span style={{ fontSize: '1.2rem', color: '#64748b' }}>Assessment Pending</span>
            )}
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: '999px', height: '6px', overflow: 'hidden', margin: '6px 0 8px' }}>
            <div style={{ width: `${averagePercentage || 0}%`, background: primaryColor, height: '100%', borderRadius: '999px' }} />
          </div>
          <div style={{ fontSize: '0.78rem', color: hasGrades ? '#16a34a' : '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>●</span> {hasGrades ? `Rank ${classRanking.rank} of ${classRanking.total} in ${activeStudent.grade_class}` : 'Rank computed once grades are published'}
          </div>
        </div>

        {/* Card 2: Attendance Record */}
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            borderRadius: '20px',
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 18px -2px rgba(15, 23, 42, 0.04)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: attendanceStats.hasIndividualLogs
                ? (attendanceStats.rate >= 75 ? '#059669' : '#dc2626')
                : '#94a3b8',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ROLL CALL ATTENDANCE
            </span>
            <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: attendanceStats.hasIndividualLogs && attendanceStats.rate >= 75 ? '#ecfdf5' : '#f1f5f9', color: attendanceStats.hasIndividualLogs && attendanceStats.rate >= 75 ? '#059669' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              📋
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: attendanceStats.hasIndividualLogs ? (attendanceStats.rate >= 75 ? '#059669' : '#dc2626') : '#64748b', margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
            {attendanceStats.hasIndividualLogs ? `${attendanceStats.rate}%` : '0%'}
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: '999px', height: '6px', overflow: 'hidden', margin: '6px 0 8px' }}>
            <div style={{ width: `${Math.min(100, attendanceStats.hasIndividualLogs ? attendanceStats.rate : 0)}%`, background: attendanceStats.hasIndividualLogs ? (attendanceStats.rate >= 75 ? '#059669' : '#dc2626') : '#94a3b8', height: '100%', borderRadius: '999px' }} />
          </div>
          <div style={{ fontSize: '0.78rem', color: attendanceStats.hasIndividualLogs ? (attendanceStats.rate >= 75 ? '#059669' : '#dc2626') : '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>●</span> {attendanceStats.hasIndividualLogs ? (attendanceStats.rate >= 75 ? 'Meets Exam Threshold (≥75%)' : 'Attendance Warning (<75%)') : '0 Sessions Logged (Newly Enrolled)'}
          </div>
        </div>

        {/* Card 3: Fee Clearance */}
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            borderRadius: '20px',
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 18px -2px rgba(15, 23, 42, 0.04)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: activeStudent.fee_balance > 0 ? '#dc2626' : '#16a34a',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              FEE CLEARANCE STATUS
            </span>
            <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: activeStudent.fee_balance > 0 ? '#fef2f2' : '#f0fdf4', color: activeStudent.fee_balance > 0 ? '#dc2626' : '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              💳
            </span>
          </div>
          <div
            style={{
              fontSize: '1.75rem',
              fontWeight: 900,
              color: activeStudent.fee_balance > 0 ? '#dc2626' : '#16a34a',
              margin: '8px 0 4px',
              letterSpacing: '-0.02em',
            }}
          >
            {activeStudent.fee_balance === 0 ? 'Fully Cleared' : `${currency} ${activeStudent.fee_balance.toLocaleString()}`}
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: '999px', height: '6px', overflow: 'hidden', margin: '6px 0 8px' }}>
            <div
              style={{
                width: `${activeStudent.fee_total > 0 ? Math.min(100, Math.round((activeStudent.fee_paid / activeStudent.fee_total) * 100)) : 100}%`,
                background: activeStudent.fee_balance > 0 ? '#dc2626' : '#16a34a',
                height: '100%',
                borderRadius: '999px',
              }}
            />
          </div>
          <div style={{ fontSize: '0.78rem', color: activeStudent.fee_balance > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
            {activeStudent.fee_balance > 0 ? 'Outstanding Tuition Due' : 'Zero Outstanding Balance ✓'}
          </div>
        </div>

        {/* Card 4: Study Materials */}
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            borderRadius: '20px',
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 18px -2px rgba(15, 23, 42, 0.04)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#3b82f6' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              COURSEWORK &amp; SYLLABI
            </span>
            <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              📚
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
            {classNotes.length} <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#64748b' }}>Modules</span>
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: '999px', height: '6px', overflow: 'hidden', margin: '6px 0 8px' }}>
            <div style={{ width: '100%', background: '#3b82f6', height: '100%', borderRadius: '999px' }} />
          </div>
          <div style={{ fontSize: '0.78rem', color: '#3b82f6', fontWeight: 700 }}>
            Across {availableSubjects.length} Registered Subjects
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SUBTAB 1: OFFICIAL ACADEMIC REPORT CARD */}
      {/* ============================================================ */}
      {studentSubTab === 'report_card' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '2.5rem',
            border: `2px solid ${primaryColor}`,
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
            position: 'relative',
          }}
        >
          {/* Institutional Header Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `2.5px solid ${primaryColor}`,
              paddingBottom: '1.5rem',
              marginBottom: '1.75rem',
              flexWrap: 'wrap',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '16px',
                  background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  fontWeight: 900,
                  border: `2px solid ${accentColor}`,
                }}
              >
                {school.name.charAt(0)}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>{school.name}</h2>
                <div style={{ fontSize: '0.85rem', fontStyle: 'italic', color: '#64748b' }}>"{school.motto}"</div>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '3px' }}>
                  {school.address} • {school.contact_email} • {school.contact_phone}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => (onOpenTranscript ? onOpenTranscript(activeStudent) : window.print())}
                style={{
                  background: primaryColor,
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  padding: '0.65rem 1.15rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: `0 4px 12px -2px ${primaryColor}40`,
                }}
              >
                <span>📜</span> Official Transcript PDF
              </button>
              <div
                style={{
                  textAlign: 'right',
                  background: '#f8fafc',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: primaryColor, textTransform: 'uppercase' }}>
                  OFFICIAL TRANSCRIPT
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>{activePeriod}</div>
                <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 800 }}>Verified Digital Record ✓</div>
              </div>
            </div>
          </div>

          {/* Student Details Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              background: '#f8fafc',
              padding: '1.25rem',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              marginBottom: '1.75rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>STUDENT NAME</div>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{activeStudent.full_name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>ADMISSION NUMBER</div>
              <div style={{ fontWeight: 800, color: primaryColor, fontSize: '0.95rem' }}>
                {activeStudent.admission_number}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>CLASS / FORM COHORT</div>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{activeStudent.grade_class}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>CURRICULUM SERIES</div>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{school.curriculum_type}</div>
            </div>
          </div>

          {/* Subject Grade Table */}
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.75rem' }}>
            Continuous Assessment &amp; Final Exam Marks
          </h3>

          {studentGrades.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2.5rem',
                background: '#f8fafc',
                borderRadius: '14px',
                border: '1px dashed #cbd5e1',
                marginBottom: '1.75rem',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '6px' }}>📝</div>
              <div style={{ fontWeight: 800, color: '#0f172a' }}>Assessment Marks Being Computed</div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0' }}>
                Your instructors have not yet published marks for the active period. Check back once examinations are graded.
              </p>
            </div>
          ) : (() => {
            const dynamicCat1Max = studentGrades.find((g) => typeof g.cat1_max === 'number')?.cat1_max ?? 20
            const dynamicCat2Max = studentGrades.find((g) => typeof g.cat2_max === 'number')?.cat2_max ?? 20
            const dynamicExamMax = studentGrades.find((g) => typeof g.exam_max === 'number')?.exam_max ?? 60
            const dynamicTotalMax = dynamicCat1Max + dynamicCat2Max + dynamicExamMax

            return (
              <div style={{ overflowX: 'auto', marginBottom: '1.75rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                      <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Subject / Unit</th>
                      <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
                        CAT 1 ({dynamicCat1Max})
                      </th>
                      <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
                        CAT 2 ({dynamicCat2Max})
                      </th>
                      <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
                        Exam ({dynamicExamMax})
                      </th>
                      <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
                        Total ({dynamicTotalMax})
                      </th>
                      <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
                        Grade
                      </th>
                      <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Instructor Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentGrades.map((g) => (
                      <tr key={g.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 700, color: '#0f172a' }}>{g.subject_name}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', color: '#475569' }}>
                          {g.cat1_score} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>/{g.cat1_max ?? dynamicCat1Max}</span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', color: '#475569' }}>
                          {g.cat2_score} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>/{g.cat2_max ?? dynamicCat2Max}</span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', color: '#475569' }}>
                          {g.exam_score} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>/{g.exam_max ?? dynamicExamMax}</span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 900, color: '#0f172a' }}>
                          {g.total_score}%
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span
                          style={{
                            background: g.grade.startsWith('A') ? '#dcfce7' : g.grade === 'B' ? '#eff6ff' : '#fef3c7',
                            color: g.grade.startsWith('A') ? '#15803d' : g.grade === 'B' ? '#1d4ed8' : '#b45309',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 900,
                            fontSize: '0.8rem',
                          }}
                        >
                          {g.grade}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', color: '#64748b', fontStyle: 'italic', fontSize: '0.8rem' }}>
                        {g.remarks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })()}

          {/* Performance Summary & Official Certification */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
              background: '#f8fafc',
              padding: '1.5rem',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>PERFORMANCE SUMMARY</div>
              <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Overall Average:</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                    {averagePercentage !== null ? `${averagePercentage}%` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Mean Grade:</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16a34a' }}>{overallGrade}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Class Rank:</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: primaryColor }}>
                    {hasGrades ? `${classRanking.rank} of ${classRanking.total}` : 'Pending'}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#475569' }}>
                <strong>Class Teacher Remarks:</strong> {dynamicTeacherRemarks}
              </div>
            </div>

            <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>INSTITUTIONAL CERTIFICATION</div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                {school.principal_name}
              </div>
              <div style={{ fontSize: '0.75rem', color: primaryColor, fontWeight: 700 }}>
                {school.principal_title}, {school.name}
              </div>
              <div style={{ height: '32px', display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontFamily: 'cursive', fontSize: '1.15rem', color: '#475569' }}>
                  {school.principal_name.split(' ')[0]}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 800, marginTop: '4px' }}>
                ✓ Official Digital Seal Attached &amp; Validated
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBTAB 2: INTERACTIVE CLASS TIMETABLE */}
      {/* ============================================================ */}
      {studentSubTab === 'timetable' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                Weekly Class Timetable &amp; Schedule
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Assigned lecture rooms, instructors, and period times for <strong>{activeStudent.grade_class}</strong>.
              </p>
            </div>

            {/* Day of Week Filter */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {timetableDays.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setTimetableDayFilter(day)}
                  style={{
                    background: timetableDayFilter === day ? primaryColor : '#f1f5f9',
                    color: timetableDayFilter === day ? '#ffffff' : '#475569',
                    border: 'none',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {day === 'ALL' ? 'All Days' : day}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Day of Week</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Period</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Time Interval</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Subject</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Assigned Instructor</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Room / Lab</th>
                </tr>
              </thead>
              <tbody>
                {filteredTimetable.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>No classes scheduled for this filter.</div>
                      <p style={{ fontSize: '0.82rem', margin: '4px 0 0' }}>
                        The curriculum coordinator has not scheduled any lessons on {timetableDayFilter}.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTimetable.map((t) => (
                    <tr
                      key={t.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fcfdfe')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '0.75rem', fontWeight: 800, color: primaryColor }}>{t.day_of_week}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: '#64748b' }}>Period {t.period_number}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                        {t.start_time} - {t.end_time}
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>{t.subject_name}</td>
                      <td style={{ padding: '0.75rem', color: '#475569' }}>{t.teacher_name}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            background: '#f1f5f9',
                            color: '#334155',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {t.room}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBTAB 3: DIGITAL STUDY MATERIALS & LECTURE NOTES */}
      {/* ============================================================ */}
      {studentSubTab === 'notes' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                Course Study Materials &amp; Lecture Syllabi
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Download course modules, reading packets, and lesson summaries published by your teaching faculty.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search topic or keyword..."
                value={notesSearchQuery}
                onChange={(e) => setNotesSearchQuery(e.target.value)}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                }}
              />
              <select
                value={notesSubjectFilter}
                onChange={(e) => setNotesSubjectFilter(e.target.value)}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  background: '#ffffff',
                }}
              >
                <option value="ALL">All Subjects</option>
                {availableSubjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredNotes.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem',
                background: '#f8fafc',
                borderRadius: '16px',
                border: '1px dashed #cbd5e1',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '6px' }}>📚</div>
              <div style={{ fontWeight: 800, color: '#0f172a' }}>No Study Materials Found</div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0' }}>
                There are no uploaded lecture handouts matching your search filter.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                gap: '1.25rem',
              }}
            >
              {filteredNotes.map((n) => (
                <div
                  key={n.id}
                  style={{
                    background: '#f8fafc',
                    padding: '1.5rem',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: primaryColor,
                          background: `${primaryColor}14`,
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {n.subject_name}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {new Date(n.created_at).toLocaleDateString('en-GB')}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.05rem', fontWeight: 900, margin: '10px 0 6px', color: '#0f172a' }}>
                      {n.title}
                    </h4>
                    <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.5, margin: '0 0 14px' }}>
                      {n.summary}
                    </p>
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid #e2e8f0',
                      paddingTop: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.78rem',
                    }}
                  >
                    <span style={{ color: '#64748b' }}>Tutor: {n.teacher_name}</span>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setActiveReadingNote(n)}
                        style={{
                          background: '#ffffff',
                          color: '#0f172a',
                          border: '1px solid #cbd5e1',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                        }}
                      >
                        📖 Read Online
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          alert(`Downloading study module: "${n.title}" (${n.subject_name})`)
                        }}
                        style={{
                          background: primaryColor,
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                        }}
                      >
                        ⬇ Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBTAB 4: TUITION STATEMENT & ONLINE PAYMENT */}
      {/* ============================================================ */}
      {studentSubTab === 'fees' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                Tuition Account Statement &amp; Payment Receipts
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Itemized school fee ledger, clearance verification, and instant online tuition payment station.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => (onOpenInvoice ? onOpenInvoice(activeStudent) : window.print())}
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 800,
                  padding: '0.65rem 1.15rem',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>📄</span> Official Fee Invoice / Statement PDF
              </button>

              {activeStudent.fee_balance > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setOnlinePaymentInput({
                      amount: activeStudent.fee_balance,
                      payment_method: 'Mobile Money (M-Pesa)',
                      phone_or_account: activeStudent.guardian_phone || activeStudent.phone || '',
                      reference_code: '',
                    })
                    setShowOnlinePaymentModal(true)
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    padding: '0.65rem 1.25rem',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 16px -2px rgba(22, 163, 74, 0.4)',
                  }}
                >
                  <span>💳</span> Pay Tuition Online
                </button>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>TERM TUITION BILLED</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                {currency} {activeStudent.fee_total.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>Billed for {activePeriod}</div>
            </div>

            <div style={{ background: '#ecfdf5', padding: '1.25rem', borderRadius: '14px', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>TOTAL AMOUNT PAID</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#065f46', marginTop: '2px' }}>
                {currency} {activeStudent.fee_paid.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 700 }}>
                {activeStudent.fee_total > 0
                  ? `${Math.round((activeStudent.fee_paid / activeStudent.fee_total) * 100)}% Cleared`
                  : '100% Cleared'}
              </div>
            </div>

            <div
              style={{
                background: activeStudent.fee_balance > 0 ? '#fef2f2' : '#ecfdf5',
                padding: '1.25rem',
                borderRadius: '14px',
                border: `1px solid ${activeStudent.fee_balance > 0 ? '#fecaca' : '#a7f3d0'}`,
              }}
            >
              <div
                style={{
                  fontSize: '0.72rem',
                  color: activeStudent.fee_balance > 0 ? '#dc2626' : '#059669',
                  fontWeight: 700,
                }}
              >
                OUTSTANDING BALANCE
              </div>
              <div
                style={{
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  color: activeStudent.fee_balance > 0 ? '#991b1b' : '#065f46',
                  marginTop: '2px',
                }}
              >
                {currency} {activeStudent.fee_balance.toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: '0.76rem',
                  color: activeStudent.fee_balance > 0 ? '#dc2626' : '#059669',
                  fontWeight: 700,
                }}
              >
                {activeStudent.fee_balance > 0 ? 'Clearance Required for Exams' : 'Full Exam Clearance Active ✓'}
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.75rem' }}>
            Payment History &amp; Official Receipts
          </h4>

          {studentPayments.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2.5rem',
                background: '#f8fafc',
                borderRadius: '14px',
                border: '1px dashed #cbd5e1',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🧾</div>
              <div style={{ fontWeight: 800, color: '#0f172a' }}>No Receipts Recorded Yet</div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0' }}>
                When fee payments are made via bank wire, M-Pesa, or Bursar office, your receipts will appear here.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Receipt Number</th>
                    <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Date</th>
                    <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Payment Channel</th>
                    <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Academic Period</th>
                    <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>
                      Amount Paid
                    </th>
                    <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
                      Official Receipt
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {studentPayments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 800, color: primaryColor }}>
                        <span style={{ fontFamily: 'monospace' }}>{p.receipt_number}</span>
                      </td>
                      <td style={{ padding: '0.75rem', color: '#64748b' }}>
                        {new Date(p.date).toLocaleDateString('en-GB')}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#475569' }}>{p.payment_method}</td>
                      <td style={{ padding: '0.75rem', color: '#64748b' }}>{p.period_name || activePeriod}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 900, color: '#16a34a' }}>
                        {currency} {p.amount.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onOpenReceipt(p)}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          🖨️ View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBTAB 5: ROLL CALL ATTENDANCE & DAILY REGISTER */}
      {/* ============================================================ */}
      {studentSubTab === 'attendance' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
              Daily Roll Call Attendance Tracking
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
              Official biometric and instructor roll call registers recorded during scheduled academic periods.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.75rem',
            }}
          >
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>OVERALL ATTENDANCE</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: attendanceStats.hasIndividualLogs ? (attendanceStats.rate >= 75 ? '#16a34a' : '#dc2626') : '#64748b', marginTop: '2px' }}>
                {attendanceStats.hasIndividualLogs ? `${attendanceStats.rate}%` : '0%'}
              </div>
              <div style={{ fontSize: '0.76rem', color: attendanceStats.hasIndividualLogs ? (attendanceStats.rate >= 75 ? '#16a34a' : '#dc2626') : '#64748b', fontWeight: 700 }}>
                {attendanceStats.hasIndividualLogs
                  ? (attendanceStats.rate >= 75 ? 'Good Standing Met (≥75%)' : 'Below Minimum Requirement')
                  : 'No Sessions Logged Yet (Newly Enrolled)'}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>PRESENT SESSIONS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                {attendanceStats.hasIndividualLogs ? attendanceStats.present : '0'}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                {attendanceStats.hasIndividualLogs
                  ? `Out of ${attendanceStats.total} Total Sessions`
                  : '0 Sessions Recorded'}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>ABSENT OR MISSED</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: attendanceStats.absent > 3 ? '#dc2626' : '#64748b', marginTop: '2px' }}>
                {attendanceStats.hasIndividualLogs ? attendanceStats.absent : '0'}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                {attendanceStats.hasIndividualLogs
                  ? `Late entries: ${attendanceStats.late}`
                  : 'No unexcused absences logged'}
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.75rem' }}>
            Session Register History
          </h4>

          {studentSessionLogs.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2.5rem',
                background: '#f8fafc',
                borderRadius: '14px',
                border: '1px dashed #cbd5e1',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '6px' }}>📋</div>
              <div style={{ fontWeight: 800, color: '#0f172a' }}>No Session Register Entries Yet</div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0' }}>
                You have 0 roll-call sessions logged. Daily logs and calculated attendance percentage will automatically appear here once class instructors record roll-call attendance.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Date</th>
                    <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Subject</th>
                    <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Session / Period</th>
                    <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Instructor</th>
                    <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
                      Status
                    </th>
                    <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {studentSessionLogs.map((s, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: '#0f172a' }}>{s.date}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 800, color: primaryColor }}>{s.subject_name}</td>
                      <td style={{ padding: '0.75rem', color: '#475569' }}>{s.period_name}</td>
                      <td style={{ padding: '0.75rem', color: '#64748b' }}>{s.teacher_name}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span
                          style={{
                            background:
                              s.status === 'present'
                                ? '#dcfce7'
                                : s.status === 'late'
                                ? '#fef3c7'
                                : s.status === 'excused'
                                ? '#e0f2fe'
                                : '#fee2e2',
                            color:
                              s.status === 'present'
                                ? '#15803d'
                                : s.status === 'late'
                                ? '#b45309'
                                : s.status === 'excused'
                                ? '#0369a1'
                                : '#991b1b',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                          }}
                        >
                          {s.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.78rem' }}>
                        {s.note || 'Normal session'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBTAB 6: DIGITAL STUDENT ID CARD & EXAMINATION PASS */}
      {/* ============================================================ */}
      {studentSubTab === 'id_card' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
              Digital Student Identity &amp; Examination Hall Permit
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
              Official photographic identity card, biometric verification credential, and examination admittance pass.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
              gap: '2rem',
              alignItems: 'start',
            }}
          >
            {/* Front of ID Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#ffffff',
                borderRadius: '20px',
                padding: 'clamp(1rem, 4vw, 2rem)',
                boxShadow: '0 12px 30px -4px rgba(15, 23, 42, 0.3)',
                border: `2px solid ${accentColor}`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-40px',
                  right: '-40px',
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: `${primaryColor}33`,
                }}
              />

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: primaryColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1.3rem',
                    border: '1px solid rgba(255,255,255,0.2)',
                    flexShrink: 0,
                  }}
                >
                  {school.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>{school.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    OFFICIAL STUDENT IDENTITY CARD
                  </div>
                </div>
              </div>

              {/* Photo & Details */}
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: '85px',
                    height: '100px',
                    borderRadius: '12px',
                    background: '#334155',
                    border: '2px solid rgba(255,255,255,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    flexShrink: 0,
                  }}
                >
                  👤
                </div>

                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff' }}>
                    {activeStudent.full_name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 800, marginTop: '2px' }}>
                    Adm No: {activeStudent.admission_number}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '4px' }}>
                    Cohort: <strong>{activeStudent.grade_class}</strong>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                    Curriculum: {school.curriculum_type}
                  </div>
                </div>
              </div>

              {/* Barcode & Expiry */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>STATUS &amp; VALIDITY</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#34d399' }}>
                    ✓ Active Enrolled Student
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'monospace', letterSpacing: '2px', fontSize: '0.85rem' }}>
                  ||||| | |||| |||
                </div>
              </div>
            </div>

            {/* Examination Hall Permit */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: 'clamp(1rem, 4vw, 1.75rem)',
                border: '2px dashed #cbd5e1',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: primaryColor, textTransform: 'uppercase' }}>
                  EXAMINATION ADMISSION PERMIT
                </span>
                <span
                  style={{
                    background: activeStudent.fee_balance === 0 ? '#dcfce7' : '#fee2e2',
                    color: activeStudent.fee_balance === 0 ? '#15803d' : '#991b1b',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {activeStudent.fee_balance === 0 ? '✓ CLEARANCE GRANTED' : '⚠️ CONDITIONAL CLEARANCE'}
                </span>
              </div>

              <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                {activePeriod} End of Term Examination Hall Pass
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 1rem' }}>
                This permit certifies that candidate <strong>{activeStudent.full_name}</strong> has fulfilled the academic residency and is cleared to enter institutional exam rooms.
              </p>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Attendance Prerequisite:</span>
                  <strong style={{ color: attendanceStats.rate >= 75 ? '#16a34a' : '#dc2626' }}>
                    {attendanceStats.rate}% (Threshold 75%)
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Tuition Balance:</span>
                  <strong style={{ color: activeStudent.fee_balance > 0 ? '#dc2626' : '#16a34a' }}>
                    {currency} {activeStudent.fee_balance.toLocaleString()}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748b' }}>Assigned Center:</span>
                  <strong style={{ color: '#0f172a' }}>{activeStudent.campus || school.campuses_list?.[0]?.name || `${school.name} Examination Center`}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => (onOpenExamPass ? onOpenExamPass(activeStudent) : window.print())}
                style={{
                  width: '100%',
                  background: primaryColor,
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                }}
              >
                🖨️ Print Examination Pass
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: ONLINE LECTURE NOTE READER */}
      {/* ============================================================ */}
      {activeReadingNote && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxHeight: 'calc(100dvh - 2rem)',
              overflowY: 'auto',
              boxSizing: 'border-box',
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '680px',
              width: '100%',
              padding: 'clamp(1.25rem, 4vw, 2rem)',
              border: `2px solid ${primaryColor}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: primaryColor,
                    background: `${primaryColor}14`,
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {activeReadingNote.subject_name}
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '6px 0 0', color: '#0f172a' }}>
                  {activeReadingNote.title}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  Instructor: {activeReadingNote.teacher_name} • Class: {activeReadingNote.class_name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveReadingNote(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                background: '#f8fafc',
                padding: '1.25rem',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                marginBottom: '1.5rem',
                fontSize: '0.88rem',
                lineHeight: 1.6,
                color: '#334155',
              }}
            >
              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>Lesson Synopsis:</div>
              <p style={{ margin: '0 0 1rem' }}>{activeReadingNote.summary}</p>

              {activeReadingNote.content && (
                <div style={{ margin: '0 0 1rem', whiteSpace: 'pre-line' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>Module Content &amp; Instructions:</div>
                  <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    {activeReadingNote.content}
                  </div>
                </div>
              )}

              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>Coursework Details &amp; Citation:</div>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Subject: <strong>{activeReadingNote.subject_name}</strong> • Instructor: <strong>{activeReadingNote.teacher_name}</strong> • Institutional Digital LMS Ref: #LMS-{activeReadingNote.id.slice(0, 8).toUpperCase()}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setActiveReadingNote(null)}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(`Downloading study module: "${activeReadingNote.title}"`)
                }}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: primaryColor,
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                }}
              >
                ⬇ Download Module (PDF)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: ONLINE TUITION PAYMENT SIMULATOR */}
      {/* ============================================================ */}
      {showOnlinePaymentModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxHeight: 'calc(100dvh - 2rem)',
              overflowY: 'auto',
              boxSizing: 'border-box',
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '520px',
              width: '100%',
              padding: 'clamp(1.25rem, 4vw, 2rem)',
              border: '2px solid #16a34a',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' }}>
                  INSTANT FEE SETTLEMENT
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '2px 0 0', color: '#0f172a' }}>
                  Pay Tuition Online
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOnlinePaymentModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteOnlinePayment}>
              <div
                style={{
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Candidate:</span>
                  <strong style={{ color: '#0f172a' }}>{activeStudent.full_name} ({activeStudent.admission_number})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Current Outstanding:</span>
                  <strong style={{ color: '#dc2626' }}>{currency} {activeStudent.fee_balance.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748b' }}>Term Period:</span>
                  <strong style={{ color: '#0f172a' }}>{activePeriod}</strong>
                </div>
              </div>

              {/* Amount Presets */}
              {activeStudent.fee_balance > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.15rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setOnlinePaymentInput((prev) => ({ ...prev, amount: activeStudent.fee_balance }))}
                    style={{
                      background: '#dcfce7',
                      color: '#15803d',
                      border: '1px solid #86efac',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    ⚡ Full Balance ({currency} {activeStudent.fee_balance.toLocaleString()})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnlinePaymentInput((prev) => ({ ...prev, amount: Math.round(activeStudent.fee_balance * 0.5) }))}
                    style={{
                      background: '#f1f5f9',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    50% Installment ({currency} {Math.round(activeStudent.fee_balance * 0.5).toLocaleString()})
                  </button>
                </div>
              )}

              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>
                  Amount to Pay ({currency})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={onlinePaymentInput.amount || ''}
                  onChange={(e) => setOnlinePaymentInput({ ...onlinePaymentInput, amount: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '1rem',
                    fontWeight: 800,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>
                  Payment Method
                </label>
                <select
                  value={onlinePaymentInput.payment_method}
                  onChange={(e) => setOnlinePaymentInput({ ...onlinePaymentInput, payment_method: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Mobile Money (M-Pesa)">Mobile Money (M-Pesa Express STK Push)</option>
                  <option value="Credit Card">Debit / Credit Card (Visa, Mastercard)</option>
                  <option value="Bank Wire">Direct Bank EFT / Wire Transfer</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>
                  Payer Phone or Account Reference
                </label>
                <input
                  type="text"
                  required
                  value={onlinePaymentInput.phone_or_account}
                  onChange={(e) => setOnlinePaymentInput({ ...onlinePaymentInput, phone_or_account: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowOnlinePaymentModal(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#16a34a',
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    boxShadow: '0 4px 14px -2px rgba(22, 163, 74, 0.4)',
                  }}
                >
                  Confirm &amp; Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
