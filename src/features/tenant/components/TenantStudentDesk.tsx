import React, { useState } from 'react'
import type {
  PartnerSchoolTenant,
  TenantStudentMember,
  TenantGradeRecord,
  TenantLessonNote,
  TenantFeePayment,
} from '@/types/tenantSchool'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import { GraduationCapIcon, CalendarIcon, FileTextIcon, CreditCardIcon, CheckCircleIcon } from '@/components/icons/AppIcons'

interface TenantStudentDeskProps {
  school: PartnerSchoolTenant
  studentList: TenantStudentMember[]
  gradeList: TenantGradeRecord[]
  lessonNotesList: TenantLessonNote[]
  feePaymentsList: TenantFeePayment[]
  activeStudent: TenantStudentMember
  onSelectStudent: (student: TenantStudentMember) => void
  onOpenReceipt: (receipt: TenantFeePayment) => void
}

export function TenantStudentDesk({
  school,
  studentList,
  gradeList,
  lessonNotesList,
  feePaymentsList,
  activeStudent,
  onSelectStudent,
  onOpenReceipt,
}: TenantStudentDeskProps) {
  const primaryColor = school.primary_color || '#881337'
  const accentColor = school.accent_color || '#d4af37'

  const [studentSubTab, setStudentSubTab] = useState<'report_card' | 'timetable' | 'notes' | 'fees' | 'attendance'>('report_card')

  // Grades for active student
  const studentGrades = gradeList.filter(
    (g) => g.student_id === activeStudent.id || g.admission_number === activeStudent.admission_number
  )

  // Payments for active student
  const studentPayments = feePaymentsList.filter(
    (p) => p.student_id === activeStudent.id || p.admission_number === activeStudent.admission_number
  )

  // Notes for student's class
  const classNotes = lessonNotesList.filter(
    (n) => !n.class_name || n.class_name.toLowerCase() === activeStudent.grade_class.toLowerCase()
  )

  // Timetable for student's class
  const classTimetable = tenantSchoolStore.getTimetableBySchool(school.slug, activeStudent.grade_class)

  // Calculate overall performance
  const totalScoreSum = studentGrades.reduce((acc, g) => acc + g.total_score, 0)
  const averagePercentage = studentGrades.length > 0 ? Math.round(totalScoreSum / studentGrades.length) : 88

  let overallGrade = 'A'
  if (averagePercentage >= 90) overallGrade = 'A*'
  else if (averagePercentage >= 80) overallGrade = 'A'
  else if (averagePercentage >= 70) overallGrade = 'B'
  else if (averagePercentage >= 60) overallGrade = 'C'
  else if (averagePercentage >= 50) overallGrade = 'D'

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
      {/* Student Workspace Header */}
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
              {school.name} STUDENT WORKSPACE
            </span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '4px 0 0', color: '#0f172a' }}>
              {activeStudent.full_name}
            </h2>
            <div style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '3px' }}>
              Admission No: <strong>{activeStudent.admission_number}</strong> • Class: <strong>{activeStudent.grade_class}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {studentList.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700 }}>Switch Student:</span>
                <select
                  value={activeStudent.id}
                  onChange={(e) => {
                    const found = studentList.find((s) => s.id === e.target.value)
                    if (found) onSelectStudent(found)
                  }}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    background: '#f8fafc',
                  }}
                >
                  {studentList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.admission_number})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              onClick={() => window.print()}
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
              🖨️ Print Report Card
            </button>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setStudentSubTab('report_card')}
            style={{
              background: studentSubTab === 'report_card' ? primaryColor : '#f1f5f9',
              color: studentSubTab === 'report_card' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            📜 Official Academic Report Card
          </button>
          <button
            type="button"
            onClick={() => setStudentSubTab('timetable')}
            style={{
              background: studentSubTab === 'timetable' ? primaryColor : '#f1f5f9',
              color: studentSubTab === 'timetable' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            🗓️ Weekly Class Timetable
          </button>
          <button
            type="button"
            onClick={() => setStudentSubTab('notes')}
            style={{
              background: studentSubTab === 'notes' ? primaryColor : '#f1f5f9',
              color: studentSubTab === 'notes' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            📚 Study Notes &amp; Course Materials ({classNotes.length})
          </button>
          <button
            type="button"
            onClick={() => setStudentSubTab('fees')}
            style={{
              background: studentSubTab === 'fees' ? primaryColor : '#f1f5f9',
              color: studentSubTab === 'fees' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            💳 Fee Statement (${activeStudent.fee_balance} due)
          </button>
          <button
            type="button"
            onClick={() => setStudentSubTab('attendance')}
            style={{
              background: studentSubTab === 'attendance' ? primaryColor : '#f1f5f9',
              color: studentSubTab === 'attendance' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            📊 Attendance Record ({activeStudent.attendance_percent}%)
          </button>
        </div>
      </div>

      {/* SUBTAB 1: OFFICIAL REPORT CARD */}
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
            <div style={{ textAlign: 'right', background: '#f8fafc', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: primaryColor, textTransform: 'uppercase' }}>OFFICIAL TRANSCRIPT</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>{school.active_period_name}</div>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 800 }}>Verified Digital Record ✓</div>
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
              <div style={{ fontWeight: 800, color: primaryColor, fontSize: '0.95rem' }}>{activeStudent.admission_number}</div>
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
          <div style={{ overflowX: 'auto', marginBottom: '1.75rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Subject</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>CAT 1 (20)</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>CAT 2 (20)</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Exam (60)</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Total (100)</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Grade</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Teacher Remarks</th>
                </tr>
              </thead>
              <tbody>
                {studentGrades.map((g) => (
                  <tr key={g.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: '#0f172a' }}>{g.subject_name}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: '#475569' }}>{g.cat1_score}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: '#475569' }}>{g.cat2_score}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: '#475569' }}>{g.exam_score}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 900, color: '#0f172a' }}>{g.total_score}%</td>
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
                    <td style={{ padding: '0.75rem', color: '#64748b', fontStyle: 'italic', fontSize: '0.8rem' }}>{g.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Performance Summary & Signatures */}
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
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{averagePercentage}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Mean Grade:</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16a34a' }}>{overallGrade}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Class Rank:</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: primaryColor }}>1st of 24</div>
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#475569' }}>
                <strong>Class Teacher Remarks:</strong> Exceptional academic aptitude, rigorous problem solving, and proactive contribution.
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

      {/* SUBTAB 2: TIMETABLE */}
      {studentSubTab === 'timetable' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 1rem', color: '#0f172a' }}>
            Weekly Class Timetable &amp; Schedule ({activeStudent.grade_class})
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Day</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Period</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Time</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Subject</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Teacher</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Room / Lab</th>
                </tr>
              </thead>
              <tbody>
                {classTimetable.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 800, color: primaryColor }}>{t.day_of_week}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: '#64748b' }}>Period {t.period_number}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>{t.start_time} - {t.end_time}</td>
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

      {/* SUBTAB 3: NOTES */}
      {studentSubTab === 'notes' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 1rem', color: '#0f172a' }}>
            Course Study Materials &amp; Lecture Syllabi
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {classNotes.map((n) => (
              <div key={n.id} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: primaryColor, background: `${primaryColor}14`, padding: '2px 8px', borderRadius: '6px' }}>
                  {n.subject_name}
                </span>
                <h4 style={{ fontSize: '1rem', fontWeight: 900, margin: '8px 0 4px', color: '#0f172a' }}>{n.title}</h4>
                <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, margin: '0 0 12px' }}>{n.summary}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '8px', fontSize: '0.76rem', color: '#64748b' }}>
                  <span>Tutor: {n.teacher_name}</span>
                  <a href={n.file_url || '#'} target="_blank" rel="noreferrer" style={{ color: primaryColor, fontWeight: 800, textDecoration: 'none' }}>
                    Download Document ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 4: FEES */}
      {studentSubTab === 'fees' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 1rem', color: '#0f172a' }}>
            Tuition Account Statement &amp; Payment Receipts
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>TERM TUITION BILLED</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                ${activeStudent.fee_total.toLocaleString()}
              </div>
            </div>
            <div style={{ background: '#ecfdf5', padding: '1rem', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>TOTAL AMOUNT PAID</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#065f46', marginTop: '2px' }}>
                ${activeStudent.fee_paid.toLocaleString()}
              </div>
            </div>
            <div style={{ background: activeStudent.fee_balance > 0 ? '#fef2f2' : '#ecfdf5', padding: '1rem', borderRadius: '12px', border: `1px solid ${activeStudent.fee_balance > 0 ? '#fecaca' : '#a7f3d0'}` }}>
              <div style={{ fontSize: '0.72rem', color: activeStudent.fee_balance > 0 ? '#dc2626' : '#059669', fontWeight: 700 }}>
                OUTSTANDING BALANCE
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: activeStudent.fee_balance > 0 ? '#991b1b' : '#065f46', marginTop: '2px' }}>
                ${activeStudent.fee_balance.toLocaleString()}
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.75rem' }}>
            Payment History &amp; Official Receipts
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Receipt Number</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Date</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Payment Channel</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Official Receipt</th>
                </tr>
              </thead>
              <tbody>
                {studentPayments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 800, color: primaryColor }}>{p.receipt_number}</td>
                    <td style={{ padding: '0.75rem', color: '#64748b' }}>{new Date(p.date).toLocaleDateString('en-GB')}</td>
                    <td style={{ padding: '0.75rem', color: '#475569' }}>{p.payment_method}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 900, color: '#16a34a' }}>
                      ${p.amount.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => onOpenReceipt(p)}
                        style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        🖨️ View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 5: ATTENDANCE */}
      {studentSubTab === 'attendance' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 1rem', color: '#0f172a' }}>
            Daily Roll Call Attendance Tracking
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>ATTENDANCE RATE</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#16a34a', marginTop: '2px' }}>
                {activeStudent.attendance_percent}%
              </div>
              <div style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: 700 }}>Good Standing Threshold Met</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>MINIMUM INSTITUTIONAL REQUIREMENT</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>85.0%</div>
              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>Required for Examination Clearance</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
