import type { ReportCard } from '@/types/school'
import { INSTITUTION_CONFIG } from '@/config/institution'

interface ReportCardGeneratorProps {
  reportCard: ReportCard
  onClose: () => void
}

export function ReportCardGenerator({ reportCard, onClose }: ReportCardGeneratorProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="modal-overlay printable-modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content modal-lg printable-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '880px', maxHeight: '92vh', overflowY: 'auto', padding: 0 }}
      >
        {/* Modal Top Actions Toolbar (Hidden on Print) */}
        <div
          className="no-print"
          style={{
            padding: '1rem 1.5rem',
            background: 'var(--color-bg-secondary)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>📜</span>
            <strong style={{ fontSize: '1rem' }}>Official College Academic Transcript Preview</strong>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={handlePrint}>
              🖨️ Print / Download Official Transcript PDF
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {/* Printable Official Document Body */}
        <div
          id="official-report-card"
          style={{
            padding: 'clamp(1rem, 3.5vw, 2.5rem)',
            background: '#ffffff',
            color: '#0f172a',
            fontFamily: 'Inter, system-ui, sans-serif',
            boxSizing: 'border-box',
          }}
        >
          {/* School Header Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '3px double #1e3a8a',
              paddingBottom: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <img
                src="/logo.png?v=2"
                alt="Global College Crest"
                style={{ width: '85px', height: '85px', objectFit: 'contain' }}
              />
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: '1.65rem',
                    fontWeight: 800,
                    color: '#1e3a8a',
                    letterSpacing: '-0.02em',
                    textTransform: 'uppercase',
                  }}
                >
                  {INSTITUTION_CONFIG.name}
                </h1>
                <p
                  style={{
                    margin: '0.15rem 0 0',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#475569',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {INSTITUTION_CONFIG.tagline}
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#334155', fontWeight: 600 }}>
                  Web: {INSTITUTION_CONFIG.domain} • Tel: {INSTITUTION_CONFIG.contact.phone}
                </p>
              </div>
            </div>

            <div
              style={{
                textAlign: 'right',
                border: '2px solid #1e3a8a',
                padding: '0.5rem 0.85rem',
                borderRadius: '6px',
                background: '#f8fafc',
              }}
            >
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color: '#1e3a8a' }}>
                Academic Transcript
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                {reportCard.academic_year || '2026 Intake'} — Short Course Cohort
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Date Issued: {reportCard.issue_date}</div>
            </div>
          </div>

          {/* Student Dossier Bio Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
              gap: '0.75rem',
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '1.5rem',
              fontSize: '0.82rem',
            }}
          >
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                Student Name:
              </span>
              <strong style={{ fontSize: '0.95rem', color: '#1e3a8a' }}>{reportCard.student_name}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                Student ID / Adm No:
              </span>
              <strong>{reportCard.admission_number}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                Program / Department:
              </span>
              <strong>{reportCard.class_name}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                Lecture Attendance:
              </span>
              <strong>
                {reportCard.attendance_present_days} / {reportCard.attendance_total_days} Sessions (
                {Math.round((reportCard.attendance_present_days / reportCard.attendance_total_days) * 100)}%)
              </strong>
            </div>
          </div>

          {/* Subject Modular Unit Breakdown Table */}
          <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: '1.5rem' }}>
            <table
              style={{
                width: '100%',
                minWidth: '550px',
                borderCollapse: 'collapse',
                fontSize: '0.82rem',
              }}
            >
              <thead>
                <tr style={{ background: '#1e3a8a', color: '#ffffff', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', border: '1px solid #1e3a8a' }}>Unit Code & Title</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #1e3a8a', textAlign: 'center' }}>CAT (30%)</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #1e3a8a', textAlign: 'center' }}>Exam (70%)</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #1e3a8a', textAlign: 'center' }}>Total (100%)</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #1e3a8a', textAlign: 'center' }}>Grade</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #1e3a8a', textAlign: 'center' }}>Points</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #1e3a8a' }}>Course Lecturer Remarks</th>
                </tr>
              </thead>
              <tbody>
                {reportCard.subjects.map((sub, i) => (
                  <tr
                    key={sub.subject_id}
                    style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}
                  >
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                      <span style={{ color: 'var(--color-primary)', marginRight: '6px' }}>{sub.subject_code}</span>
                      {sub.subject_name}
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      {sub.cat_score}
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      {sub.exam_score}
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700 }}>
                      {sub.total_score}%
                    </td>
                    <td
                      style={{
                        padding: '8px 10px',
                        border: '1px solid #e2e8f0',
                        textAlign: 'center',
                        fontWeight: 800,
                        color: sub.grade.startsWith('A') ? '#16a34a' : '#1e3a8a',
                      }}
                    >
                      {sub.grade}
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 600 }}>
                      {sub.points}
                    </td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', color: '#334155' }}>
                      {sub.remarks}{' '}
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic' }}>
                        — {sub.teacher_name}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Performance Aggregate Box */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 110px), 1fr))',
              gap: '0.75rem',
              background: '#eff6ff',
              border: '2px solid #3b82f6',
              borderRadius: '8px',
              padding: '1rem',
              textAlign: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#1e40af', fontWeight: 700 }}>
                Total Marks
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a' }}>
                {reportCard.total_marks} / {reportCard.max_marks}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#1e40af', fontWeight: 700 }}>
                Mean Score
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a' }}>
                {reportCard.mean_percentage}%
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#1e40af', fontWeight: 700 }}>
                Academic Standing
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#16a34a' }}>
                {reportCard.mean_grade}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#1e40af', fontWeight: 700 }}>
                Cohort Rank
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a' }}>
                #{reportCard.class_position} of {reportCard.total_students_in_class}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#1e40af', fontWeight: 700 }}>
                Dean's List Status
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e3a8a' }}>
                ⭐ Honors List
              </div>
            </div>
          </div>

          {/* Official Remarks & Sign-offs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            <div
              style={{
                border: '1px solid #e2e8f0',
                padding: '0.85rem 1rem',
                borderRadius: '6px',
                background: '#f8fafc',
              }}
            >
              <div style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: '0.25rem' }}>
                Head of Department (HOD) Assessment:
              </div>
              <div style={{ fontStyle: 'italic', color: '#334155' }}>
                "{reportCard.class_teacher_remarks}"
              </div>
            </div>

            <div
              style={{
                border: '1px solid #e2e8f0',
                padding: '0.85rem 1rem',
                borderRadius: '6px',
                background: '#f8fafc',
              }}
            >
              <div style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: '0.25rem' }}>
                College Principal & Dean of Academic Affairs Remarks:
              </div>
              <div style={{ fontStyle: 'italic', color: '#334155' }}>
                "{reportCard.principal_remarks}"
              </div>
            </div>
          </div>

          {/* Closing and Signature Footer */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
              gap: '1rem',
              paddingTop: '1rem',
              borderTop: '2px solid #e2e8f0',
              fontSize: '0.78rem',
            }}
          >
            <div>
              <div><strong>Semester Recess Begins:</strong> {reportCard.term_closing_date}</div>
              <div style={{ marginTop: '0.25rem' }}>
                <strong>Next Semester Registration:</strong> {reportCard.next_term_opening_date}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ height: '35px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <span style={{ borderBottom: '1px dotted #64748b', width: '140px', display: 'inline-block' }} />
              </div>
              <div style={{ marginTop: '4px', fontWeight: 600 }}>Head of Department Signature</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ height: '35px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <span style={{ borderBottom: '1px dotted #64748b', width: '140px', display: 'inline-block' }} />
              </div>
              <div style={{ marginTop: '4px', fontWeight: 600 }}>Academic Registrar & College Seal</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
