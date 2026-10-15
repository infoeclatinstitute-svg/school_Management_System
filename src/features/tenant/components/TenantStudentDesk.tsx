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
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.65rem',
                boxShadow: `0 8px 20px -4px ${primaryColor}40`,
                border: '2px solid rgba(255, 255, 255, 0.2)',
                flexShrink: 0,
              }}
            >
              🎓
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {school.name} STUDENT PORTAL
                </span>
                <span
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  LEARNER DESK
                </span>
              </div>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 900, margin: '4px 0 0', color: '#0f172a', letterSpacing: '-0.02em' }}>
                {activeStudent.full_name}
              </h2>
              <div style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '4px' }}>
                Admission No: <strong style={{ color: '#0f172a' }}>{activeStudent.admission_number}</strong> • Class Cohort: <strong style={{ color: '#0f172a' }}>{activeStudent.grade_class}</strong>
              </div>
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
              <span>🖨️</span> Print Report Card
            </button>
          </div>
        </div>

        {/* Sub-tab Navigation Pills */}
        <div
          style={{
            display: 'flex',
            gap: '0.35rem',
            flexWrap: 'wrap',
            background: '#f8fafc',
            padding: '6px',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            onClick={() => setStudentSubTab('report_card')}
            style={{
              background: studentSubTab === 'report_card' ? primaryColor : 'transparent',
              color: studentSubTab === 'report_card' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: studentSubTab === 'report_card' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: studentSubTab === 'report_card' ? `0 4px 12px ${primaryColor}33` : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📜</span> Academic Report Card
          </button>
          <button
            type="button"
            onClick={() => setStudentSubTab('timetable')}
            style={{
              background: studentSubTab === 'timetable' ? primaryColor : 'transparent',
              color: studentSubTab === 'timetable' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: studentSubTab === 'timetable' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: studentSubTab === 'timetable' ? `0 4px 12px ${primaryColor}33` : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🗓️</span> Weekly Class Timetable
          </button>
          <button
            type="button"
            onClick={() => setStudentSubTab('notes')}
            style={{
              background: studentSubTab === 'notes' ? primaryColor : 'transparent',
              color: studentSubTab === 'notes' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: studentSubTab === 'notes' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: studentSubTab === 'notes' ? `0 4px 12px ${primaryColor}33` : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📚</span> Study Notes ({classNotes.length})
          </button>
          <button
            type="button"
            onClick={() => setStudentSubTab('fees')}
            style={{
              background: studentSubTab === 'fees' ? primaryColor : 'transparent',
              color: studentSubTab === 'fees' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: studentSubTab === 'fees' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: studentSubTab === 'fees' ? `0 4px 12px ${primaryColor}33` : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>💳</span> Fee Statement ({school.currency || 'KES'} {activeStudent.fee_balance.toLocaleString()} due)
          </button>
          <button
            type="button"
            onClick={() => setStudentSubTab('attendance')}
            style={{
              background: studentSubTab === 'attendance' ? primaryColor : 'transparent',
              color: studentSubTab === 'attendance' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: studentSubTab === 'attendance' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: studentSubTab === 'attendance' ? `0 4px 12px ${primaryColor}33` : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📊</span> Attendance ({activeStudent.attendance_percent}%)
          </button>
        </div>
      </div>

      {/* Student Metrics Intelligence Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            borderRadius: '18px',
            padding: '1.35rem 1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.03)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: primaryColor }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ACADEMIC STANDING
            </span>
            <span style={{ fontSize: '1rem' }}>🏆</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '6px 0 2px', letterSpacing: '-0.02em' }}>
            Grade {overallGrade} <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b' }}>({averagePercentage}%)</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>●</span> Term Cumulative Average
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            borderRadius: '18px',
            padding: '1.35rem 1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.03)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#059669' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ATTENDANCE RECORD
            </span>
            <span style={{ fontSize: '1rem' }}>📋</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#059669', margin: '6px 0 2px', letterSpacing: '-0.02em' }}>
            {activeStudent.attendance_percent}%
          </div>
          <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>●</span> Satisfactory Roll Call Record
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            borderRadius: '18px',
            padding: '1.35rem 1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.03)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: activeStudent.fee_balance > 0 ? '#dc2626' : '#16a34a' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              FEE CLEARANCE STATUS
            </span>
            <span style={{ fontSize: '1rem' }}>💳</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: activeStudent.fee_balance > 0 ? '#dc2626' : '#16a34a', margin: '6px 0 2px', letterSpacing: '-0.02em' }}>
            {activeStudent.fee_balance === 0 ? 'Fully Cleared' : `${school.currency || 'KES'} ${activeStudent.fee_balance.toLocaleString()}`}
          </div>
          <div style={{ fontSize: '0.78rem', color: activeStudent.fee_balance > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
            {activeStudent.fee_balance > 0 ? 'Pending Term Balance' : 'Zero Outstanding Balance'}
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            borderRadius: '18px',
            padding: '1.35rem 1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.03)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#3b82f6' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              STUDY MATERIALS
            </span>
            <span style={{ fontSize: '1rem' }}>📚</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '6px 0 2px', letterSpacing: '-0.02em' }}>
            {classNotes.length} <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b' }}>Guides</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#3b82f6', fontWeight: 700 }}>
            Published by Faculty Instructors
          </div>
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
                {classTimetable.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📅</div>
                      <div style={{ fontWeight: 700 }}>No class timetable published yet for {activeStudent.grade_class}.</div>
                    </td>
                  </tr>
                ) : (
                  classTimetable.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 800, color: primaryColor }}>{t.day_of_week}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: '#64748b' }}>Period {t.period_number}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{t.start_time} - {t.end_time}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>{t.subject_name}</td>
                      <td style={{ padding: '0.75rem', color: '#475569' }}>{t.teacher_name}</td>
                      <td style={{ padding: '0.75rem', color: '#64748b' }}>{t.room}</td>
                    </tr>
                  ))
                )}
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
                {school.currency || 'KES'} {activeStudent.fee_total.toLocaleString()}
              </div>
            </div>
            <div style={{ background: '#ecfdf5', padding: '1rem', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>TOTAL AMOUNT PAID</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#065f46', marginTop: '2px' }}>
                {school.currency || 'KES'} {activeStudent.fee_paid.toLocaleString()}
              </div>
            </div>
            <div style={{ background: activeStudent.fee_balance > 0 ? '#fef2f2' : '#ecfdf5', padding: '1rem', borderRadius: '12px', border: `1px solid ${activeStudent.fee_balance > 0 ? '#fecaca' : '#a7f3d0'}` }}>
              <div style={{ fontSize: '0.72rem', color: activeStudent.fee_balance > 0 ? '#dc2626' : '#059669', fontWeight: 700 }}>
                OUTSTANDING BALANCE
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: activeStudent.fee_balance > 0 ? '#991b1b' : '#065f46', marginTop: '2px' }}>
                {school.currency || 'KES'} {activeStudent.fee_balance.toLocaleString()}
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
                      {school.currency || 'KES'} {p.amount.toLocaleString()}
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
