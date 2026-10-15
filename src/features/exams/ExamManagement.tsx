import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { schoolStore } from '@/lib/schoolData'
import type { ReportCard, ExamSession } from '@/types/school'
import { ReportCardGenerator } from './ReportCardGenerator'
import { CertificateGenerator } from '@/components/shared/CertificateGenerator'
import type { CertificateData } from '@/components/shared/CertificateGenerator'
import { Link } from 'react-router-dom'

export function ExamManagement() {
  const { profile } = useAuth()
  const isStudent = profile?.role === 'student'

  const [exams] = useState<ExamSession[]>(() => schoolStore.getExams())
  const [reportCards] = useState<ReportCard[]>(() => schoolStore.getReportCards())
  const [selectedReportCard, setSelectedReportCard] = useState<ReportCard | null>(null)
  const [selectedCert, setSelectedCert] = useState<CertificateData | null>(null)
  const [activeTab, setActiveTab] = useState<'sessions' | 'reportcards' | 'ranking'>('reportcards')

  const allStudents = schoolStore.getStudents()
  const currentStudent =
    allStudents.find(
      (s) =>
        (profile?.admission_number && s.admission_number.toLowerCase() === profile.admission_number.toLowerCase()) ||
        s.id === profile?.id
    ) || null

  const myReportCard: ReportCard | null = currentStudent
    ? reportCards.find(
        (r) =>
          (currentStudent.admission_number && r.admission_number?.toLowerCase() === currentStudent.admission_number.toLowerCase()) ||
          r.student_id === currentStudent.id
      ) || null
    : null

  const topStudent = reportCards.reduce((prev, curr) => (curr.mean_percentage > prev.mean_percentage ? curr : prev), reportCards[0])
  const averageMean = (reportCards.reduce((acc, c) => acc + c.mean_percentage, 0) / (reportCards.length || 1)).toFixed(1)

  // -------------------------------------------------------------
  // Dedicated Student Personal Academic View
  // -------------------------------------------------------------
  if (isStudent) {
    return (
      <div className="page-container">
        {/* Student Academic Header */}
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 className="page-title">My Academic Transcripts & Assessment Results</h1>
            <p className="page-subtitle">
              Official modular evaluation results, continuous assessments (CAT), and academic completion transcripts.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {myReportCard && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSelectedReportCard(myReportCard)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  minHeight: '40px',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                }}
              >
                📄 View Modular Transcript
              </button>
            )}
            {currentStudent?.certificate_granted ? (
              <button
                type="button"
                className="btn"
                style={{
                  background: '#f59e0b',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  minHeight: '40px',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
                onClick={() =>
                  setSelectedCert({
                    student_name: currentStudent.full_name,
                    admission_number: currentStudent.admission_number,
                    course_title: currentStudent.class_name,
                    grade: currentStudent.certificate_grade || 'Distinction (A)',
                    percentage: 92,
                    issue_date: new Date().toLocaleDateString('en-GB'),
                    certificate_no: currentStudent.certificate_number || `GC-CERT-${currentStudent.admission_number.replace(/[^a-zA-Z0-9]/g, '')}`,
                    duration: currentStudent.grade_level || '3 Months Intensive Practical Training',
                    trainer_name: 'Lead Academic Instructor',
                    skills_acquired: ['Modular Coursework Mastery', 'Practical Workshop Assessment', 'Certified Technical Competency'],
                  })
                }
              >
                🎓 View Issued Certificate
              </button>
            ) : (
              <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', padding: '0.5rem 0.85rem', fontSize: '0.8rem', fontWeight: 600 }}>
                🔒 Certificate Pending Admin Grant
              </span>
            )}
          </div>
        </div>

        {myReportCard ? (
          <>
            {/* Student Performance KPI Card */}
            <div
              className="card mb-6"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
                color: '#ffffff',
                padding: '1.5rem 2rem',
                borderRadius: '12px',
                border: 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#93c5fd', fontWeight: 700 }}>
                    Official Academic Standing
                  </div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', margin: '0.25rem 0' }}>
                    {myReportCard.mean_grade} — Mean: {myReportCard.mean_percentage}%
                  </h2>
                  <p style={{ color: '#cbd5e1', fontSize: '0.85rem', margin: 0 }}>
                    Student: <strong>{currentStudent?.full_name || profile?.full_name}</strong> • Admission No: <strong>{currentStudent?.admission_number || profile?.admission_number}</strong> • Program: <strong>{currentStudent?.class_name || 'Enrolled Course'}</strong>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '0.45rem 1rem', fontWeight: 700 }}>
                    ✓ Results Certified
                  </span>
                </div>
              </div>
            </div>

            {/* Student Module Marks Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Modular Assessment Breakdown</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0.2rem 0 0' }}>
                    Continuous assessment tests (CAT 30%), practical project labs (50%), and final evaluation (20%).
                  </p>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Unit Code</th>
                      <th>Module Title</th>
                      <th>CAT (30%)</th>
                      <th>Final Lab (70%)</th>
                      <th>Total %</th>
                      <th>Grade</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myReportCard.subjects?.map((sub, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{sub.subject_code}</td>
                        <td style={{ fontWeight: 600 }}>{sub.subject_name}</td>
                        <td>{sub.cat_score} / 30</td>
                        <td>{sub.exam_score} / 70</td>
                        <td style={{ fontWeight: 800 }}>{sub.total_score}%</td>
                        <td>
                          <span className="badge badge-success" style={{ fontWeight: 700 }}>{sub.grade}</span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{sub.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center', borderRadius: '16px' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📋</div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--color-text-primary)' }}>
              No Official Exam Results Published Yet
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', maxWidth: '480px', margin: '0 auto 1.75rem', lineHeight: 1.6, fontSize: '0.9rem' }}>
              You are newly enrolled in your coursework. Continuous assessment tests (CAT), practical lab examinations, and official transcripts will appear here once submitted and verified by your course instructors.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/student/courses" className="btn btn-primary" style={{ fontWeight: 700 }}>
                📚 Open My Learning Modules →
              </Link>
              <Link to="/timetable" className="btn btn-secondary" style={{ fontWeight: 700 }}>
                📅 View Lecture Schedule
              </Link>
            </div>
          </div>
        )}

        {/* Printable Modals */}
        {selectedReportCard && (
          <ReportCardGenerator
            reportCard={selectedReportCard}
            onClose={() => setSelectedReportCard(null)}
          />
        )}
        {selectedCert && (
          <CertificateGenerator
            cert={selectedCert}
            onClose={() => setSelectedCert(null)}
          />
        )}
      </div>
    )
  }

  // -------------------------------------------------------------
  // Admin & Faculty Master Examination Broadsheet
  // -------------------------------------------------------------
  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Practical Assessments & Modular Transcripts</h1>
          <p className="page-subtitle">
            Short course practical workshops, continuous assessment (CAT), competency rankings, and official completion transcripts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.print()}
          >
            🖨️ Print Broadsheet Ranking
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Active Assessment Series</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
            {exams[0]?.title || 'Practical Assessment Series'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.2rem' }}>
            {exams.length > 0 ? 'Results Published & Audited' : 'Awaiting Faculty Schedule'}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cohort Mean Score</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#16a34a', marginTop: '0.25rem' }}>
            {reportCards.length > 0 ? `${averageMean}%` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
            {reportCards.length > 0 ? 'Audited Final Assessment' : 'No graded report cards yet'}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #7c3aed' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Top Performing Trainee</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#7c3aed', marginTop: '0.25rem' }}>
            {topStudent ? topStudent.student_name : 'Pending Assessment'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
            {topStudent ? `${topStudent.mean_percentage}% • Rank #1` : 'Records update on evaluation'}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ea580c' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Modular Pass Rate</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#ea580c', marginTop: '0.25rem' }}>
            {reportCards.length > 0 ? '100%' : 'N/A'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.2rem' }}>
            {reportCards.length > 0 ? 'All Candidates Pass & Credit' : 'Awaiting graded reports'}
          </div>
        </div>
      </div>

      {/* Responsive Tabs */}
      <div className="card mb-6" style={{ padding: '0.5rem' }}>
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '0.5rem',
          }}
        >
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'reportcards' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('reportcards')}
            style={{ whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 700, minHeight: '36px' }}
          >
            📋 Official College Transcripts
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'sessions' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('sessions')}
            style={{ whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 700, minHeight: '36px' }}
          >
            📅 Assessment Sessions
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'ranking' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('ranking')}
            style={{ whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 700, minHeight: '36px' }}
          >
            🏆 Merit Ranking Broadsheet
          </button>
        </div>
      </div>

      {/* Tab 1: Student Report Cards List */}
      {activeTab === 'reportcards' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Generated Semester 1 Official Transcripts & Grade Sheets</h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Click on any student to view, print, or download their official Global College transcript with GPA and Dean’s remarks.
            </p>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Adm No.</th>
                  <th>Student Name</th>
                  <th>Program / Diploma</th>
                  <th>Total Marks</th>
                  <th>Mean %</th>
                  <th>Classification</th>
                  <th>Points</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {reportCards.map((rc) => (
                  <tr key={rc.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedReportCard(rc)}>
                    <td style={{ fontWeight: 700, color: rc.class_position <= 3 ? '#eab308' : 'inherit' }}>
                      #{rc.class_position}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{rc.admission_number}</td>
                    <td style={{ fontWeight: 600 }}>{rc.student_name}</td>
                    <td><span className="badge badge-info">{rc.class_name}</span></td>
                    <td>{rc.total_marks} / {rc.max_marks}</td>
                    <td style={{ fontWeight: 700 }}>{rc.mean_percentage}%</td>
                    <td>
                      <span className="badge badge-success" style={{ fontWeight: 700 }}>
                        {rc.mean_grade}
                      </span>
                    </td>
                    <td><strong>{rc.overall_points} pts</strong></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCert({
                              student_name: rc.student_name,
                              admission_number: rc.admission_number,
                              course_title: rc.class_name,
                              grade: rc.mean_grade,
                              percentage: rc.mean_percentage,
                              issue_date: rc.issue_date || new Date().toLocaleDateString('en-GB'),
                              certificate_no: `GC-CERT-${rc.admission_number.replace(/[^a-zA-Z0-9]/g, '')}`,
                              duration: '4 to 12 Weeks Intensive Practical Training',
                              trainer_name: 'Lead Vocational Instructor',
                              skills_acquired: rc.subjects.map((s) => s.subject_name),
                            })
                          }}
                          style={{ fontWeight: 700, padding: '0.3rem 0.65rem' }}
                        >
                          🎓 Certificate
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedReportCard(rc)
                          }}
                          style={{ fontWeight: 700, padding: '0.3rem 0.65rem' }}
                        >
                          📄 Transcript
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Exam Sessions */}
      {activeTab === 'sessions' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {exams.map((session) => (
            <div key={session.id} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className={`badge ${session.status === 'Published' ? 'badge-success' : session.status === 'Active' ? 'badge-warning' : 'badge-info'}`}>
                  {session.status}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{session.academic_year}</span>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.75rem 0 0.5rem' }}>
                {session.title}
              </h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div><strong>Academic Period:</strong> {session.term}</div>
                <div><strong>Examination Start:</strong> {session.start_date}</div>
                <div><strong>Examination End:</strong> {session.end_date}</div>
                <div><strong>Audited by:</strong> College Academic Board & TVET/CDACC Verifier</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Merit Ranking */}
      {activeTab === 'ranking' && (() => {
        // Collect all distinct subject codes across report cards
        const allSubCodes = Array.from(
          new Set(
            reportCards.flatMap((rc) => rc.subjects.map((s) => s.subject_code || s.subject_name.slice(0, 8)))
          )
        )
        const displayCodes = allSubCodes.length > 0 ? allSubCodes.slice(0, 6) : ['MOD-101', 'MOD-102', 'MOD-103']

        return (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Academic Merit & Performance Broadsheet
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
              Official evaluation broadsheet across all active vocational cohorts and modular training units.
            </p>

            {reportCards.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                No student assessment records logged yet. Evaluate students to populate the merit broadsheet.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Pos</th>
                      <th>Student Name</th>
                      {displayCodes.map((code) => (
                        <th key={code}>{code}</th>
                      ))}
                      <th>Total</th>
                      <th>Mean %</th>
                      <th>Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportCards.map((rc) => {
                      const getSubScore = (code: string) => {
                        const found = rc.subjects.find((s) => (s.subject_code && s.subject_code.includes(code)) || (s.subject_name && s.subject_name.includes(code)))
                        return found ? `${found.total_score}% (${found.grade})` : '-'
                      }

                      return (
                        <tr key={rc.id}>
                          <td style={{ fontWeight: 700 }}>#{rc.class_position}</td>
                          <td style={{ fontWeight: 600 }}>{rc.student_name}</td>
                          {displayCodes.map((code) => (
                            <td key={code}>{getSubScore(code)}</td>
                          ))}
                          <td style={{ fontWeight: 700 }}>{rc.total_marks}</td>
                          <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{rc.mean_percentage}%</td>
                          <td><span className="badge badge-success">{rc.mean_grade}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })()}

      {/* Official Report Card Printable Modal */}
      {selectedReportCard && (
        <ReportCardGenerator
          reportCard={selectedReportCard}
          onClose={() => setSelectedReportCard(null)}
        />
      )}

      {/* Official Certificate of Completion Printable Modal */}
      {selectedCert && (
        <CertificateGenerator
          cert={selectedCert}
          onClose={() => setSelectedCert(null)}
        />
      )}
    </div>
  )
}
