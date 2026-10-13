import type { UnitRegistrationReceipt } from '@/types/school'
import { INSTITUTION_CONFIG } from '@/config/institution'

export function UnitRegistrationSlip({
  receipt,
  onClose,
}: {
  receipt: UnitRegistrationReceipt
  onClose: () => void
}) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-content modal-lg"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          color: '#0f172a',
          padding: '2.5rem',
          maxWidth: '820px',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Printable Unit Registration Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #1e3a8a', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#1e3a8a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>
              EI
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#1e3a8a', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                {INSTITUTION_CONFIG.name}
              </h1>
              <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                {INSTITUTION_CONFIG.tagline} • Office of Academic Affairs • {INSTITUTION_CONFIG.domain}
              </div>
            </div>
          </div>
          <div style={{ display: 'inline-block', background: '#f1f5f9', padding: '4px 16px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a', marginTop: '0.5rem' }}>
            PROFESSIONAL SHORT COURSE UNIT REGISTRATION & ASSESSMENT CLEARANCE SLIP
          </div>
        </div>

        {/* Metadata Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          <div>
            <div style={{ marginBottom: '0.4rem' }}>
              <strong style={{ color: '#64748b' }}>Student Name:</strong> <span style={{ fontWeight: 700 }}>{receipt.student_name}</span>
            </div>
            <div style={{ marginBottom: '0.4rem' }}>
              <strong style={{ color: '#64748b' }}>Admission Number:</strong> <span style={{ fontWeight: 800, color: '#1e3a8a' }}>{receipt.admission_number}</span>
            </div>
            <div>
              <strong style={{ color: '#64748b' }}>Academic Program:</strong> <span>{receipt.program}</span>
            </div>
          </div>
          <div>
            <div style={{ marginBottom: '0.4rem' }}>
              <strong style={{ color: '#64748b' }}>Receipt / Slip Number:</strong> <span style={{ fontWeight: 700 }}>{receipt.receipt_number}</span>
            </div>
            <div style={{ marginBottom: '0.4rem' }}>
              <strong style={{ color: '#64748b' }}>Course Duration:</strong> <span>{receipt.course_duration || receipt.semester || 'Short Course'} ({receipt.academic_year})</span>
            </div>
            <div>
              <strong style={{ color: '#64748b' }}>Registration Date:</strong> <span>{receipt.registered_at}</span>
            </div>
          </div>
        </div>

        {/* Registered Units Table */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '0.75rem' }}>
            Approved Course Units ({receipt.registered_units?.length || 0})
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#1e3a8a', color: '#ffffff', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>#</th>
                <th style={{ padding: '8px 12px' }}>Unit Code</th>
                <th style={{ padding: '8px 12px' }}>Course Unit Title</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Credits</th>
                <th style={{ padding: '8px 12px' }}>Course Lecturer</th>
              </tr>
            </thead>
            <tbody>
              {receipt.registered_units?.map((u, i) => (
                <tr key={u.code} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{i + 1}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1e3a8a' }}>{u.code}</td>
                  <td style={{ padding: '8px 12px' }}>{u.title}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>{u.credit_hours}</td>
                  <td style={{ padding: '8px 12px', color: '#64748b' }}>{u.teacher_name || 'Department Faculty'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f1f5f9', fontWeight: 800 }}>
                <td colSpan={3} style={{ padding: '10px 12px', textAlign: 'right' }}>Total Registered Credit Units:</td>
                <td style={{ padding: '10px 12px', textAlign: 'center', color: '#1e3a8a' }}>{receipt.total_credits} Credits</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Certification & Sign-off Block */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #cbd5e1' }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: '0.25rem' }}>
              Fee Clearance Certification
            </div>
            <div style={{ display: 'inline-block', background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700 }}>
              ✓ {receipt.fee_clearance_status}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
              Issued by: <strong>{receipt.registered_by}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: '2.5rem' }}>
              Official College Seal & Registrar Signature
            </div>
            <div style={{ borderTop: '1px dashed #94a3b8', display: 'inline-block', width: '220px', textAlign: 'center', paddingTop: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#1e3a8a' }}>
              Registrar of Academic Affairs
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn-primary" onClick={handlePrint}>
            🖨️ Print Unit Registration Slip
          </button>
        </div>
      </div>
    </div>
  )
}
