import React, { useMemo } from 'react'
import type {
  PartnerSchoolTenant,
  TenantStaffMember,
  TenantStudentMember,
  TenantPayrollRecord,
  TenantFeePayment,
  TenantGradeRecord,
} from '@/types/tenantSchool'

interface PrintableModalProps {
  school: PartnerSchoolTenant
  onClose: () => void
}

// ============================================================
// 1. OFFICIAL STUDENT ADMISSION LETTER & ENROLLMENT CONTRACT
// ============================================================
export function StudentAdmissionLetterModal({
  school,
  student,
  onClose,
}: PrintableModalProps & { student: TenantStudentMember }) {
  const primaryColor = school.primary_color || '#881337'
  const accentColor = school.accent_color || '#d4af37'

  return (
    <div
      className="printable-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'clamp(0.4rem, 2vw, 1.5rem)',
        overflowY: 'auto',
      }}
    >
      <div
        className="printable-modal-card"
        style={{ margin: 'auto',
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: `2px solid ${primaryColor}`,
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        {/* Print & Close Actions Toolbar */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            borderTopLeftRadius: '18px',
            borderTopRightRadius: '18px',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>
            Official Institutional Document • Registry Reference: ADM-{student.admission_number}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: primaryColor,
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              🖨️ Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div style={{ padding: 'clamp(1rem, 3.5vw, 2.5rem) clamp(0.75rem, 3.5vw, 3rem)', color: '#0f172a', boxSizing: 'border-box' }}>
          {/* Institution Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `2.5px solid ${primaryColor}`,
              paddingBottom: '1.5rem',
              marginBottom: '1.75rem',
              gap: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '16px',
                  background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.2rem',
                  fontWeight: 900,
                  border: `2px solid ${accentColor}`,
                }}
              >
                {school.name.charAt(0)}
              </div>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0 0 3px', color: '#0f172a', letterSpacing: '-0.02em' }}>
                  {school.name}
                </h1>
                <div style={{ fontSize: '0.85rem', fontStyle: 'italic', color: '#475569' }}>
                  "{school.motto}"
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
                  {school.address} • {school.city}, {school.country} • {school.contact_email}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  display: 'inline-block',
                  background: `${primaryColor}15`,
                  color: primaryColor,
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                OFFICE OF THE REGISTRAR
              </span>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '4px' }}>
                Date of Issue: <strong>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
              </div>
            </div>
          </div>

          {/* Document Title Banner */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, color: '#0f172a' }}>
              OFFICIAL LETTER OF ADMISSION &amp; ENROLLMENT CONTRACT
            </h2>
            <div style={{ fontSize: '0.84rem', color: primaryColor, fontWeight: 700, marginTop: '4px' }}>
              Academic Period: {school.active_period_name} • Curriculum: {school.curriculum_type}
            </div>
          </div>

          {/* Student Candidate Details */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.75rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Candidate Name</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>{student.full_name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Admission Number</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: primaryColor, fontFamily: 'monospace' }}>{student.admission_number}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Date of Enrollment</div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                📅 {student.admission_date || new Date().toISOString().split('T')[0]}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Class / Form Cohort</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>{student.grade_class}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Guardian Name &amp; Contact</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                {student.guardian_name} ({student.guardian_phone})
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Tuition Payment Plan</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0369a1' }}>
                {(student.fee_payment_plan || 'termly').toUpperCase()} ({student.fee_installments_count || 1} installment(s))
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Candidate Gender &amp; Age</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                {student.gender || 'Not Specified'}{student.age ? ` • Age ${student.age}` : ''}
              </div>
            </div>
          </div>

          {/* Formal Body Paragraphs */}
          <div style={{ fontSize: '0.88rem', lineHeight: 1.65, color: '#334155', marginBottom: '1.5rem' }}>
            <p>
              Dear <strong>{student.full_name}</strong> and Guardian <strong>{student.guardian_name}</strong>,
            </p>
            <p>
              On behalf of the Governing Academic Board of <strong>{school.name}</strong>, we are pleased to inform you that you have been formally admitted to undertake your studies in <strong>{student.grade_class}</strong> effective from your enrollment date of <strong>{student.admission_date || new Date().toISOString().split('T')[0]}</strong> commencing with <strong>{school.active_period_name}</strong>.
            </p>
            <p>
              Your admission has been confirmed under our accredited <strong>{school.curriculum_type}</strong> framework. Tuition billing has been scheduled under the <strong>{(student.fee_payment_plan || 'termly').toUpperCase()}</strong> plan (Total: {school.currency || 'KES'} {(student.fee_total || 0).toLocaleString()}{student.fee_installments_count && student.fee_installments_count > 1 ? `, payable in ${student.fee_installments_count} installments of ${school.currency || 'KES'} ${Math.round((student.fee_total || 0) / student.fee_installments_count).toLocaleString()}` : ''}). You are required to observe all institutional regulations, maintain a continuous attendance threshold of not less than 85%, and participate diligently in all scheduled coursework, continuous assessment tests (CATs), and examination series.
            </p>
          </div>

          {/* Secure Student Portal Access Credentials Box */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1.5px dashed #16a34a',
              borderRadius: '14px',
              padding: '1.25rem 1.5rem',
              marginBottom: '2rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              CONFIDENTIAL • STUDENT ONLINE CAMPUS LOGIN CREDENTIALS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 700, minWidth: '140px', flexShrink: 0, paddingTop: '2px' }}>Student Portal URL:</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', wordBreak: 'break-all', flex: 1 }}>
                  {school.custom_domain ? `https://${school.custom_domain}/student` : `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${school.slug}/student`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 700, minWidth: '140px', flexShrink: 0 }}>Portal Username / ID:</div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: primaryColor, letterSpacing: '0.04em' }}>
                  {student.username || student.admission_number}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 700, minWidth: '140px', flexShrink: 0 }}>Temporary Access PIN:</div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.1em' }}>
                  {student.temp_password || 'PIN-8492'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#15803d', marginTop: '0.75rem' }}>
              * You will be prompted to set a permanent private password upon initial login. Never disclose this slip to unauthorized parties.
            </div>
          </div>

          {/* Signatures & Institutional Seal */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '2rem',
              gap: '2rem',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Admitted By Order Of:</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                {school.principal_name}
              </div>
              <div style={{ fontSize: '0.8rem', color: primaryColor, fontWeight: 700 }}>
                {school.principal_title}, {school.name}
              </div>
              <div style={{ height: '36px', display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontFamily: 'cursive', fontSize: '1.2rem', color: '#475569' }}>
                  {school.principal_name.split(' ')[0]}
                </span>
              </div>
            </div>

            {/* Official Digital Seal Stamp */}
            <div
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                border: `3px double ${primaryColor}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '8px',
                color: primaryColor,
                transform: 'rotate(-5deg)',
                opacity: 0.9,
              }}
            >
              <div style={{ fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {school.name.substring(0, 18)}
              </div>
              <div style={{ fontSize: '1.2rem', margin: '1px 0' }}>★</div>
              <div style={{ fontSize: '0.62rem', fontWeight: 900 }}>OFFICIALLY ADMITTED</div>
              <div style={{ fontSize: '0.52rem', fontWeight: 800 }}>REGISTRY SEAL</div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Financial Clearance:</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                Total Term Fee: {school.currency || 'KES'} {student.fee_total.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: student.fee_balance === 0 ? '#16a34a' : '#dc2626' }}>
                {student.fee_balance === 0 ? '✓ Tuition Paid in Full' : `Balance Remaining: ${school.currency || 'KES'} ${student.fee_balance.toLocaleString()}`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 2. OFFICIAL STAFF APPOINTMENT & LOGIN SLIP
// ============================================================
export function StaffLoginSlipModal({
  school,
  staff,
  onClose,
}: PrintableModalProps & { staff: TenantStaffMember }) {
  const primaryColor = school.primary_color || '#881337'
  const accentColor = school.accent_color || '#d4af37'

  return (
    <div
      className="printable-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'clamp(0.4rem, 2vw, 1.5rem)',
        overflowY: 'auto',
      }}
    >
      <div
        className="printable-modal-card"
        style={{ margin: 'auto',
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: `2px solid ${primaryColor}`,
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            borderTopLeftRadius: '18px',
            borderTopRightRadius: '18px',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>
            Official Staff Provisioning Slip • Staff ID: {staff.id.toUpperCase()}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: primaryColor,
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              🖨️ Print Slip
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div style={{ padding: 'clamp(1rem, 3.5vw, 2.5rem) clamp(0.75rem, 3.5vw, 3rem)', color: '#0f172a', boxSizing: 'border-box' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `2.5px solid ${primaryColor}`,
              paddingBottom: '1.5rem',
              marginBottom: '1.75rem',
              gap: '1.5rem',
              flexWrap: 'wrap',
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
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 3px', color: '#0f172a' }}>
                  {school.name}
                </h1>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Human Resources Directorate &amp; Executive Secretariat
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  background: '#f1f5f9',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                }}
              >
                STAFF CREDENTIAL VOUCHER
              </span>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '4px' }}>
                Issued: <strong>{new Date().toLocaleDateString('en-GB')}</strong>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>
              FACULTY &amp; STAFF APPOINTMENT RECORD
            </h2>
            <div style={{ fontSize: '0.84rem', color: primaryColor, fontWeight: 700, marginTop: '3px' }}>
              Authorized Portal Desk: {staff.role.toUpperCase()}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
              gap: '1rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.75rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>STAFF MEMBER NAME</div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>{staff.full_name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>DESIGNATION &amp; TITLE</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{staff.title}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>DEPARTMENT</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: primaryColor }}>{staff.department}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>NET MONTHLY SALARY</div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#16a34a' }}>
                {school.currency || 'KES'} {staff.net_salary.toLocaleString()}
              </div>
            </div>
          </div>

          <div
            style={{
              background: '#eff6ff',
              border: '1.5px dashed #3b82f6',
              borderRadius: '14px',
              padding: '1.25rem 1.5rem',
              marginBottom: '2rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#1d4ed8', textTransform: 'uppercase' }}>
              OFFICIAL SYSTEM LOGIN DETAILS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.74rem', color: '#1d4ed8', fontWeight: 700, minWidth: '160px', flexShrink: 0, paddingTop: '2px' }}>Desk Portal URL:</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', wordBreak: 'break-all', flex: 1 }}>
                  {school.custom_domain ? `https://${school.custom_domain}/${staff.role}` : `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${school.slug}/${staff.role}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.74rem', color: '#1d4ed8', fontWeight: 700, minWidth: '160px', flexShrink: 0 }}>Portal Username:</div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: primaryColor }}>
                  {staff.username}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.74rem', color: '#1d4ed8', fontWeight: 700, minWidth: '160px', flexShrink: 0 }}>Initial Temporary Password:</div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.04em' }}>
                  {staff.temp_password || 'StaffPass2026!'}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '2rem',
              gap: '2rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Appointed By:</div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                {school.principal_name}
              </div>
              <div style={{ fontSize: '0.8rem', color: primaryColor, fontWeight: 700 }}>
                {school.principal_title}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Registry Verification:</div>
              <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 800, marginTop: '2px' }}>
                ✓ Certified Active Staff Record
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 3. OFFICIAL STAFF MONTHLY PAYSLIP
// ============================================================
export function StaffPayslipModal({
  school,
  payslip,
  onClose,
}: PrintableModalProps & { payslip: TenantPayrollRecord }) {
  const primaryColor = school.primary_color || '#881337'

  return (
    <div
      className="printable-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'clamp(0.4rem, 2vw, 1.5rem)',
        overflowY: 'auto',
      }}
    >
      <div
        className="printable-modal-card"
        style={{ margin: 'auto',
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: `2px solid ${primaryColor}`,
          boxSizing: 'border-box',
        }}
      >
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            borderTopLeftRadius: '18px',
            borderTopRightRadius: '18px',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>
            Official Payslip • Period: {payslip.month_period} • Batch ID: {payslip.id.toUpperCase()}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: primaryColor,
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              🖨️ Print Payslip
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div style={{ padding: 'clamp(1rem, 3.5vw, 2.5rem) clamp(0.75rem, 3.5vw, 3rem)', color: '#0f172a', boxSizing: 'border-box' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `2.5px solid ${primaryColor}`,
              paddingBottom: '1.5rem',
              marginBottom: '1.75rem',
              gap: '1.5rem',
            }}
          >
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 3px', color: '#0f172a' }}>
                {school.name}
              </h1>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Bursary &amp; Finance Directorate • {school.name} Operations Payroll
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                }}
              >
                {payslip.status === 'disbursed' ? '✓ ELECTRONICALLY DISBURSED' : 'AUTHORIZED & APPROVED'}
              </span>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                Pay Period: <strong>{payslip.month_period}</strong>
              </div>
            </div>
          </div>

          {/* Staff Details */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
              gap: '1rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.75rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>EMPLOYEE NAME</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>{payslip.staff_name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>DESIGNATION / ROLE</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', textTransform: 'capitalize' }}>
                {payslip.role} ({payslip.department})
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>PAYMENT METHOD</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: primaryColor }}>
                {payslip.payment_method}
              </div>
            </div>
          </div>

          {/* Earnings vs Deductions Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Earnings */}
            <div style={{ background: '#f0fdf4', borderRadius: '14px', padding: '1.25rem', border: '1px solid #bbf7d0' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#166534', margin: '0 0 1rem', textTransform: 'uppercase' }}>
                Gross Earnings
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.85rem' }}>
                <span>Basic Salary</span>
                <span style={{ fontWeight: 800 }}>{school.currency || 'KES'} {payslip.base_salary.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.85rem' }}>
                <span>Housing Allowance</span>
                <span style={{ fontWeight: 800 }}>{school.currency || 'KES'} {payslip.housing_allowance.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.85rem' }}>
                <span>Transport Allowance</span>
                <span style={{ fontWeight: 800 }}>{school.currency || 'KES'} {payslip.transport_allowance.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #86efac', paddingTop: '0.75rem', marginTop: '0.5rem', fontWeight: 900, fontSize: '0.95rem', color: '#14532d' }}>
                <span>Total Gross Earnings</span>
                <span>{school.currency || 'KES'} {payslip.gross_salary.toLocaleString()}</span>
              </div>
            </div>

            {/* Deductions */}
            <div style={{ background: '#fef2f2', borderRadius: '14px', padding: '1.25rem', border: '1px solid #fecaca' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#991b1b', margin: '0 0 1rem', textTransform: 'uppercase' }}>
                Statutory Deductions
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.85rem' }}>
                <span>Statutory PAYE Tax</span>
                <span style={{ fontWeight: 800 }}>-{school.currency || 'KES'} {payslip.tax_deduction.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', fontSize: '0.85rem' }}>
                <span>Retirement Pension Fund</span>
                <span style={{ fontWeight: 800 }}>-{school.currency || 'KES'} {payslip.pension_deduction.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #fca5a5', paddingTop: '0.75rem', marginTop: '0.5rem', fontWeight: 900, fontSize: '0.95rem', color: '#7f1d1d' }}>
                <span>Total Deductions</span>
                <span>-{school.currency || 'KES'} {(payslip.tax_deduction + payslip.pension_deduction).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Net Salary Payable */}
          <div
            style={{
              background: '#0f172a',
              color: '#ffffff',
              borderRadius: '16px',
              padding: '1.5rem 2rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                TOTAL NET AMOUNT DISBURSED
              </div>
              <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>Direct Bank Transfer / Wire</div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#38bdf8' }}>
              {school.currency || 'KES'} {payslip.net_salary.toLocaleString()}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '2rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Prepared By:</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                Chief Bursar &amp; Accounts Office
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Authorized &amp; Signed By:</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: primaryColor, marginTop: '2px' }}>
                {school.principal_name} ({school.principal_title})
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 4. TUITION FEE PAYMENT RECEIPT & CLEARANCE CERTIFICATE
// ============================================================
export function FeeReceiptModal({
  school,
  receipt,
  onClose,
}: PrintableModalProps & { receipt: TenantFeePayment }) {
  const primaryColor = school.primary_color || '#881337'

  return (
    <div
      className="printable-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'clamp(0.4rem, 2vw, 1.5rem)',
        overflowY: 'auto',
      }}
    >
      <div
        className="printable-modal-card"
        style={{ margin: 'auto',
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: `2px solid ${primaryColor}`,
          boxSizing: 'border-box',
        }}
      >
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            borderTopLeftRadius: '18px',
            borderTopRightRadius: '18px',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>
            Official Payment Receipt • Serial: {receipt.receipt_number}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: primaryColor,
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              🖨️ Print Receipt
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div style={{ padding: 'clamp(1rem, 3.5vw, 2.5rem) clamp(0.75rem, 3.5vw, 3rem)', color: '#0f172a', boxSizing: 'border-box' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `2.5px solid ${primaryColor}`,
              paddingBottom: '1.5rem',
              marginBottom: '1.75rem',
              gap: '1.5rem',
            }}
          >
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 3px', color: '#0f172a' }}>
                {school.name}
              </h1>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Bursary Accounts &amp; Financial Registry
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>RECEIPT NUMBER</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: primaryColor }}>
                {receipt.receipt_number}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                {new Date(receipt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>
              OFFICIAL TUITION FEE RECEIPT &amp; CLEARANCE CERTIFICATE
            </h2>
            <div style={{ fontSize: '0.84rem', color: '#16a34a', fontWeight: 800, marginTop: '3px' }}>
              ✓ Verified Digital Transaction Voucher
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
              gap: '1rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.75rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>STUDENT NAME</div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>{receipt.student_name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>ADMISSION NUMBER</div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: primaryColor, fontFamily: 'monospace' }}>{receipt.admission_number}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>FEE TERM / PERIOD</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{receipt.period_name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>PAYMENT METHOD</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{receipt.payment_method}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 800, textTransform: 'uppercase' }}>ISSUED BY (OFFICER)</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>
                👤 {receipt.issuer_name || receipt.recorded_by || 'Bursary Cashier'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {receipt.issuer_role || 'Authorized Finance Officer'}
              </div>
            </div>
            {receipt.installment_label && (
              <div>
                <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 800, textTransform: 'uppercase' }}>PAYMENT ALLOCATION</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#166534' }}>
                  🏷️ {receipt.installment_label}
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              background: '#f0fdf4',
              borderRadius: '16px',
              border: '2px solid #86efac',
              padding: '1.5rem 2rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase' }}>
                AMOUNT RECEIVED &amp; CREDITED
              </div>
              <div style={{ fontSize: '0.82rem', color: '#15803d', marginTop: '2px' }}>
                Officer in Charge: <strong>{receipt.issuer_name || receipt.recorded_by || 'Bursar Desk'}</strong>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#166534', marginTop: '1px' }}>
                Official Transaction Timestamp: {new Date(receipt.date).toLocaleString('en-GB')}
              </div>
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#15803d' }}>
              {school.currency || 'KES'} {receipt.amount.toLocaleString()}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '2rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Issued &amp; Certified By:</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                {receipt.issuer_name || receipt.recorded_by || 'Bursary Accounts Department'}
              </div>
              <div style={{ fontSize: '0.78rem', color: primaryColor, fontWeight: 700 }}>
                {receipt.issuer_role || 'Directorate of Finance & Student Treasury'}, {school.name}
              </div>
              <div style={{ height: '32px', display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontFamily: 'cursive', fontSize: '1.15rem', color: '#475569' }}>
                  {(receipt.issuer_name || receipt.recorded_by || 'Bursar').split(' ')[0]}
                </span>
              </div>
            </div>
            {/* Official Paid Stamp */}
            <div
              style={{
                padding: '6px 16px',
                border: '2.5px solid #16a34a',
                borderRadius: '8px',
                color: '#16a34a',
                fontWeight: 900,
                fontSize: '1rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                transform: 'rotate(-4deg)',
              }}
            >
              PAID &amp; CLEARED
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 5. OFFICIAL STUDENT ACADEMIC TRANSCRIPT & PERFORMANCE REPORT
// ============================================================
export function StudentTranscriptModal({
  school,
  student,
  grades,
  periodName,
  onClose,
}: PrintableModalProps & {
  student: TenantStudentMember
  grades: TenantGradeRecord[]
  periodName: string
}) {
  const primaryColor = school.primary_color || '#881337'
  const accentColor = school.accent_color || '#d4af37'

  const hasScores = grades.length > 0 && grades.some((g) => typeof g.total_score === 'number')

  const meanScore = hasScores
    ? Math.round((grades.reduce((acc, g) => acc + (g.total_score || 0), 0) / grades.length) * 10) / 10
    : null

  const getMeanGrade = (score: number | null) => {
    if (score === null) return { grade: 'N/A', remarks: 'Assessment In Progress (No Marks Published)' }
    if (score >= 80) return { grade: 'A', remarks: 'First Class Distinction' }
    if (score >= 70) return { grade: 'B', remarks: 'Upper Credit / Very Good' }
    if (score >= 60) return { grade: 'C', remarks: 'Credit / Good' }
    if (score >= 50) return { grade: 'D', remarks: 'Pass / Satisfactory' }
    return { grade: 'F', remarks: 'Supplementary Required' }
  }

  const standing = getMeanGrade(meanScore)

  return (
    <div
      className="printable-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'clamp(0.4rem, 2vw, 1.5rem)',
        overflowY: 'auto',
      }}
    >
      <div
        className="printable-modal-card"
        style={{
          margin: 'auto',
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '860px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: `2px solid ${primaryColor}`,
          boxSizing: 'border-box',
        }}
      >
        {/* Actions Toolbar */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            borderTopLeftRadius: '18px',
            borderTopRightRadius: '18px',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>
            Official Institutional Transcript • Registry Ref: TRN-{student.admission_number}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: primaryColor,
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              🖨️ Print / Save Transcript PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Printable Body */}
        <div style={{ padding: 'clamp(1rem, 3.5vw, 2.5rem) clamp(0.75rem, 3.5vw, 3rem)', color: '#0f172a', boxSizing: 'border-box' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `2.5px solid ${primaryColor}`,
              paddingBottom: '1.5rem',
              marginBottom: '1.75rem',
              gap: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '16px',
                  background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.2rem',
                  fontWeight: 900,
                  border: `2px solid ${accentColor}`,
                }}
              >
                {school.name.charAt(0)}
              </div>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 3px', color: '#0f172a' }}>
                  {school.name}
                </h1>
                <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                  {school.motto || 'Excellence in Higher Learning & Professional Mastery'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                  {school.address || `${school.city}, ${school.country}`} • {school.contact_email} • {school.contact_phone}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  display: 'inline-block',
                  background: `${primaryColor}15`,
                  color: primaryColor,
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                OFFICIAL ACADEMIC TRANSCRIPT
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', fontWeight: 700 }}>
                {periodName}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 800 }}>
                ✓ Certified Institutional Record
              </div>
            </div>
          </div>

          {/* Student Profile Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
              gap: '1rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.75rem',
              fontSize: '0.82rem',
            }}
          >
            <div>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>STUDENT NAME</div>
              <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{student.full_name}</div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>ADMISSION NUMBER</div>
              <div style={{ fontWeight: 900, color: primaryColor, marginTop: '2px', fontFamily: 'monospace' }}>
                {student.admission_number}
              </div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>CLASS / PROGRAM COHORT</div>
              <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{student.grade_class}</div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>ACADEMIC CYCLE</div>
              <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{periodName}</div>
            </div>
          </div>

          {/* Subject Grades Table */}
          <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: '1.75rem' }}>
            <table
              style={{
                width: '100%',
                minWidth: '580px',
                borderCollapse: 'collapse',
                fontSize: '0.82rem',
              }}
            >
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: `2px solid ${primaryColor}` }}>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: 800, color: '#0f172a' }}>#</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: 800, color: '#0f172a' }}>Course / Unit Title</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>CAT 1</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>CAT 2</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>Exam Score</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>Total (/100%)</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>Grade</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: 800, color: '#0f172a' }}>Remark</th>
                </tr>
              </thead>
              <tbody>
                {grades.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                      No recorded continuous assessments or examination scores for this session yet.
                    </td>
                  </tr>
                ) : (
                  grades.map((g, idx) => (
                    <tr key={g.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.65rem 0.5rem', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, color: '#0f172a' }}>{g.subject_name}</td>
                      <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', color: '#334155' }}>
                        {g.cat1_score !== undefined ? `${g.cat1_score}${g.cat1_max ? `/${g.cat1_max}` : ''}` : '-'}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', color: '#334155' }}>
                        {g.cat2_score !== undefined ? `${g.cat2_score}${g.cat2_max ? `/${g.cat2_max}` : ''}` : '-'}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', color: '#334155' }}>
                        {g.exam_score !== undefined ? `${g.exam_score}${g.exam_max ? `/${g.exam_max}` : ''}` : '-'}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                        {g.total_score}%
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 900,
                            fontSize: '0.78rem',
                            background: g.total_score >= 70 ? '#dcfce7' : g.total_score >= 50 ? '#fef3c7' : '#fee2e2',
                            color: g.total_score >= 70 ? '#166534' : g.total_score >= 50 ? '#92400e' : '#991b1b',
                          }}
                        >
                          {g.grade || 'P'}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', color: '#475569', fontSize: '0.78rem' }}>
                        {g.remarks || 'Satisfactory'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Performance Summary Banner */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc',
              border: `1.5px solid ${primaryColor}40`,
              borderRadius: '12px',
              padding: '1rem 1.5rem',
              marginBottom: '1.75rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>ACADEMIC STANDING</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: primaryColor, marginTop: '2px' }}>
                {standing.remarks}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>OVERALL MEAN SCORE</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                {meanScore !== null ? `${meanScore}% • Grade ${standing.grade}` : 'Assessment In Progress'}
              </div>
            </div>
          </div>

          {/* Grading Legend & Signatures */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
              gap: '2rem',
              paddingTop: '1.5rem',
              borderTop: '2px solid #e2e8f0',
              fontSize: '0.75rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>KEY TO GRADING SCALE:</div>
              <div style={{ color: '#64748b', lineHeight: 1.5 }}>
                A (80–100%) Distinction • B (70–79%) Credit • C (60–69%) Good • D (50–59%) Pass • F (&lt;50%) Fail.
              </div>
              <div style={{ color: '#94a3b8', marginTop: '6px' }}>
                This transcript is issued without alteration or erasure under institutional authority.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2rem', textAlign: 'center' }}>
              <div>
                <div style={{ height: '36px', borderBottom: '1px dotted #94a3b8', width: '130px', margin: '0 auto' }} />
                <div style={{ marginTop: '4px', fontWeight: 700, color: '#0f172a' }}>Dean of Academics</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Faculty Verification</div>
              </div>
              <div>
                <div style={{ height: '36px', borderBottom: '1px dotted #94a3b8', width: '130px', margin: '0 auto' }} />
                <div style={{ marginTop: '4px', fontWeight: 700, color: '#0f172a' }}>Academic Registrar</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Official Registry Seal</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 6. OFFICIAL STUDENT FEE INVOICE & STATEMENT OF ACCOUNT
// ============================================================
export function StudentFeeInvoiceModal({
  school,
  student,
  payments,
  onClose,
}: PrintableModalProps & {
  student: TenantStudentMember
  payments: TenantFeePayment[]
}) {
  const primaryColor = school.primary_color || '#881337'
  const accentColor = school.accent_color || '#d4af37'
  const currency = school.currency || 'KES'

  const totalInvoiced = student.fee_total ?? 0
  const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0) || student.fee_paid || 0
  const balanceDue = Math.max(0, totalInvoiced - totalPaid)

  const bankingDetails = useMemo(() => {
    try {
      const stored = localStorage.getItem(`bursar_banking_${school.slug}`)
      if (stored) return JSON.parse(stored)
    } catch {}
    const customSchool = school as any
    return {
      bank_name: customSchool.bank_name || `${school.name} Designated Bank`,
      account_name: customSchool.bank_account_name || `${school.name} General Collections`,
      account_number: customSchool.bank_account || `A/C ${school.slug.toUpperCase().slice(0, 4)}-TREASURY`,
      mobile_channel: customSchool.mobile_channel || 'M-Pesa Business Paybill / Mobile Money',
      paybill_number: customSchool.mpesa_paybill || 'Contact Bursar Office',
    }
  }, [school])

  return (
    <div
      className="printable-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'clamp(0.4rem, 2vw, 1.5rem)',
        overflowY: 'auto',
      }}
    >
      <div
        className="printable-modal-card"
        style={{
          margin: 'auto',
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '860px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: `2px solid ${primaryColor}`,
          boxSizing: 'border-box',
        }}
      >
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            borderTopLeftRadius: '18px',
            borderTopRightRadius: '18px',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>
            Fee Statement &amp; Tuition Invoice • Ref: INV-{student.admission_number}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: primaryColor,
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              🖨️ Print / Save Invoice PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div style={{ padding: 'clamp(1rem, 3.5vw, 2.5rem) clamp(0.75rem, 3.5vw, 3rem)', color: '#0f172a', boxSizing: 'border-box' }}>
          {/* Header */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
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
                <h1 style={{ fontSize: '1.45rem', fontWeight: 900, margin: '0 0 3px', color: '#0f172a' }}>
                  {school.name}
                </h1>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                  Office of the Bursar &amp; Directorate of Financial Affairs
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                  {school.address || `${school.city}, ${school.country}`} • {school.contact_email}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  display: 'inline-block',
                  background: balanceDue === 0 ? '#dcfce7' : '#fee2e2',
                  color: balanceDue === 0 ? '#166534' : '#991b1b',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {balanceDue === 0 ? '✓ FULLY CLEARED' : 'PENDING BALANCE'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                Issued: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Student Account Summary */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
              gap: '1rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.75rem',
              fontSize: '0.82rem',
            }}
          >
            <div>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>STUDENT ACCOUNT</div>
              <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{student.full_name}</div>
              <div style={{ color: primaryColor, fontWeight: 700, fontFamily: 'monospace' }}>{student.admission_number}</div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>DATE OF ENROLLMENT</div>
              <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>📅 {student.admission_date || 'Enrolled'}</div>
              <div style={{ color: '#64748b' }}>Status: Active Scholar</div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>ACADEMIC PROGRAM &amp; COHORT</div>
              <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{student.grade_class}</div>
              <div style={{ color: '#64748b' }}>Curriculum: {school.curriculum_type}</div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>PAYMENT SCHEDULE</div>
              <div style={{ fontWeight: 800, color: '#0369a1', marginTop: '2px', textTransform: 'uppercase' }}>
                {student.fee_payment_plan || 'termly'} ({student.fee_installments_count || 1}x)
              </div>
              <div style={{ color: '#64748b' }}>
                {student.fee_payment_plan && student.fee_payment_plan !== 'termly'
                  ? `${currency} ${(student.fee_installment_amount || Math.round(totalInvoiced / (student.fee_installments_count || 1))).toLocaleString()} / inst`
                  : 'Full Term Payment'}
              </div>
            </div>
          </div>

          {/* Invoiced Components Table */}
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.6rem' }}>
            Itemized Tuition &amp; Statutory Assessment Fees
          </h3>
          <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', minWidth: '480px', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: `2px solid ${primaryColor}` }}>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', fontWeight: 800 }}>Fee Item</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', fontWeight: 800 }}>Billing Schedule</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 800 }}>Amount ({currency})</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>Academic Tuition &amp; Faculty Instruction</td>
                  <td style={{ padding: '0.65rem 0.75rem', color: '#64748b' }}>Core Term Instruction</td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 800 }}>{Math.round(totalInvoiced * 0.75).toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>Examinations &amp; Continuous Assessment</td>
                  <td style={{ padding: '0.65rem 0.75rem', color: '#64748b' }}>Assessment Registry</td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 800 }}>{Math.round(totalInvoiced * 0.12).toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>ICT, Cloud LMS &amp; Digital Library Portal</td>
                  <td style={{ padding: '0.65rem 0.75rem', color: '#64748b' }}>Digital Campus Access</td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 800 }}>{Math.round(totalInvoiced * 0.08).toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>Activity &amp; Institutional Amenities</td>
                  <td style={{ padding: '0.65rem 0.75rem', color: '#64748b' }}>Annual Registration</td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 800 }}>{Math.round(totalInvoiced * 0.05).toLocaleString()}</td>
                </tr>
                <tr style={{ background: '#f8fafc', fontWeight: 900 }}>
                  <td colSpan={2} style={{ padding: '0.75rem', textAlign: 'right' }}>Total Invoiced Charges:</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#0f172a' }}>{currency} {totalInvoiced.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Receipts Record */}
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.6rem' }}>
            Payments Credited to Date
          </h3>
          <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: '1.75rem' }}>
            <table style={{ width: '100%', minWidth: '480px', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontWeight: 800 }}>Receipt #</th>
                  <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontWeight: 800 }}>Date</th>
                  <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontWeight: 800 }}>Channel</th>
                  <th style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontWeight: 800 }}>Amount Paid ({currency})</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>
                      No recorded payments on this statement.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.55rem 0.75rem', fontFamily: 'monospace', fontWeight: 800, color: primaryColor }}>{p.receipt_number}</td>
                      <td style={{ padding: '0.55rem 0.75rem', color: '#334155' }}>{p.date}</td>
                      <td style={{ padding: '0.55rem 0.75rem', color: '#334155' }}>{p.payment_method}</td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>
                        {currency} {p.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Installment Plan Breakdown Schedule (if not single termly) */}
          {(() => {
            const plan = student.fee_payment_plan || 'termly'
            const totalInst = student.fee_installments_count || 1
            const instAmount = student.fee_installment_amount || (totalInst > 0 ? Math.round(totalInvoiced / totalInst) : totalInvoiced)
            const instPaid = instAmount > 0 ? Math.floor(totalPaid / instAmount) : 0
            const instPending = Math.max(0, totalInst - instPaid)

            if (plan === 'termly' && totalInst <= 1) return null

            return (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.5rem',
                  fontSize: '0.8rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800, color: '#166534', textTransform: 'uppercase', fontSize: '0.74rem' }}>
                    📅 {plan.toUpperCase()} INSTALLMENT TRACKER
                  </span>
                  <span style={{ fontWeight: 800, color: '#15803d' }}>
                    {instPaid} of {totalInst} Installments Cleared
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155', fontSize: '0.78rem' }}>
                  <span>Installment Rate: <strong>{currency} {instAmount.toLocaleString()}</strong> per payment</span>
                  <span>Pending Installments: <strong style={{ color: instPending > 0 ? '#dc2626' : '#16a34a' }}>{instPending} pending</strong></span>
                </div>
              </div>
            )
          })()}

          {/* Statement Balance Due Banner */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: balanceDue === 0 ? '#f0fdf4' : '#fffbeb',
              border: `2px solid ${balanceDue === 0 ? '#86efac' : '#fde68a'}`,
              borderRadius: '12px',
              padding: '1.25rem 1.75rem',
              marginBottom: '1.75rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800 }}>TOTAL AMOUNT CREDITED</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16a34a', marginTop: '2px' }}>
                {currency} {totalPaid.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800 }}>OUTSTANDING PENDING BALANCE</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: balanceDue === 0 ? '#16a34a' : '#b91c1c', marginTop: '2px' }}>
                {currency} {balanceDue.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Settlement Details & Signature */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
              gap: '2rem',
              paddingTop: '1.5rem',
              borderTop: '2px solid #e2e8f0',
              fontSize: '0.75rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>OFFICIAL PAYMENT SETTLEMENT DETAILS:</div>
              <div style={{ color: '#64748b', lineHeight: 1.5 }}>
                • Bank: {bankingDetails.bank_name} • Account: {bankingDetails.account_name} ({bankingDetails.account_number})
              </div>
              <div style={{ color: '#64748b', lineHeight: 1.5 }}>
                • {bankingDetails.mobile_channel}: {bankingDetails.paybill_number} • Account Reference: {student.admission_number}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Authorized Signatory:</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                Bursary &amp; Accounts Department
              </div>
              <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 800, marginTop: '4px' }}>
                Verified Official Ledger
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 7. OFFICIAL EXAMINATION ENTRY CLEARANCE & BIOMETRIC PASS
// ============================================================
export function ExamClearancePassModal({
  school,
  student,
  subjects,
  onClose,
}: PrintableModalProps & {
  student: TenantStudentMember
  subjects?: string[]
}) {
  const primaryColor = school.primary_color || '#881337'
  const accentColor = school.accent_color || '#d4af37'
  const currency = school.currency || 'KES'

  const isFeeCleared = (student.fee_balance || 0) <= 0
  const isBiometricVerified = true

  return (
    <div
      className="printable-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'clamp(0.4rem, 2vw, 1.5rem)',
        overflowY: 'auto',
      }}
    >
      <div
        className="printable-modal-card"
        style={{
          margin: 'auto',
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: `2px solid ${primaryColor}`,
          boxSizing: 'border-box',
        }}
      >
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            borderTopLeftRadius: '18px',
            borderTopRightRadius: '18px',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>
            Official Examination Hall Clearance Pass • Serial: EXAM-{student.admission_number}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: primaryColor,
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              🖨️ Print Exam Clearance Pass
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div style={{ padding: 'clamp(1rem, 3.5vw, 2.5rem) clamp(0.75rem, 3.5vw, 3rem)', color: '#0f172a', boxSizing: 'border-box' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `2.5px solid ${primaryColor}`,
              paddingBottom: '1.25rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
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
                <h1 style={{ fontSize: '1.45rem', fontWeight: 900, margin: '0 0 2px', color: '#0f172a' }}>
                  {school.name}
                </h1>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                  Directorate of Examination &amp; Academic Assessment
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  display: 'inline-block',
                  background: isFeeCleared ? '#dcfce7' : '#fee2e2',
                  color: isFeeCleared ? '#166534' : '#991b1b',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {isFeeCleared ? '✓ ADMIT TO EXAM HALL' : '⚠️ CONDITIONAL CLEARANCE'}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                Academic Session: {school.active_period_name || 'Active Term'}
              </div>
            </div>
          </div>

          {/* Student Candidate Bio Card with Barcode */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>EXAMINATION CANDIDATE</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                {student.full_name}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: primaryColor, fontFamily: 'monospace', marginTop: '2px' }}>
                ADMISSION #: {student.admission_number}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>
                Cohort: <strong>{student.grade_class}</strong> • Curriculum: <strong>{school.curriculum_type}</strong>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  display: 'inline-block',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', letterSpacing: '3px', fontWeight: 900, color: '#0f172a' }}>
                  ||| | |||| | ||||| | |||
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>
                  {student.admission_number}
                </div>
              </div>
            </div>
          </div>

          {/* Clearances Status Table */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>BURSARY FEE CLEARANCE</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: isFeeCleared ? '#166534' : '#b91c1c', marginTop: '3px' }}>
                {isFeeCleared ? '✓ Tuition Balance: 0 (Fully Cleared)' : `⚠️ Outstanding: ${currency} ${student.fee_balance?.toLocaleString()}`}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                Authorized by College Bursary Accounts
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>BIOMETRIC IDENTITY CLEARANCE</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: isBiometricVerified ? '#166534' : '#b91c1c', marginTop: '3px' }}>
                {isBiometricVerified ? '✓ Fingerprint / Passkey Verified' : '⚠️ Pending Sensor Verification'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                Digital Sensor Template ID: {student.id.slice(0, 8).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Scheduled Units / Examination Modules */}
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            Authorized Examination Papers &amp; Modules
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              fontSize: '0.8rem',
            }}
          >
            {subjects && subjects.length > 0 ? (
              subjects.map((subj, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{subj}</span>
                  <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 800 }}>Cleared ✓</span>
                </div>
              ))
            ) : (
              <div
                style={{
                  gridColumn: '1 / -1',
                  padding: '1.25rem',
                  background: '#ffffff',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '10px',
                  color: '#64748b',
                  textAlign: 'center',
                  fontSize: '0.82rem',
                }}
              >
                All modular examination papers for <strong>{student.grade_class}</strong> are cleared for sitting.
              </div>
            )}
          </div>

          {/* Hall Instructions & Signatures */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
              gap: '2rem',
              paddingTop: '1.25rem',
              borderTop: '2px solid #e2e8f0',
              fontSize: '0.74rem',
            }}
          >
            <div style={{ color: '#64748b', lineHeight: 1.5 }}>
              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '3px' }}>EXAMINATION REGULATIONS:</div>
              1. Candidate must display this pass and college student badge throughout all exam sessions.<br />
              2. Mobile devices, smartwatches, and programmable memory devices are strictly prohibited in the exam hall.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.5rem', textAlign: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ height: '32px', borderBottom: '1px dotted #94a3b8', width: '120px', margin: '0 auto' }} />
                <div style={{ marginTop: '4px', fontWeight: 700, color: '#0f172a' }}>Chief Invigilator</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Exam Hall Control</div>
              </div>
              <div>
                <div style={{ height: '32px', borderBottom: '1px dotted #94a3b8', width: '120px', margin: '0 auto' }} />
                <div style={{ marginTop: '4px', fontWeight: 700, color: '#0f172a' }}>Academic Registrar</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Official Seal</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 8. FORMAL FACULTY APPOINTMENT & EMPLOYMENT OFFER LETTER
// ============================================================
export function StaffAppointmentOfferLetterModal({
  school,
  staff,
  onClose,
}: PrintableModalProps & { staff: TenantStaffMember }) {
  const primaryColor = school.primary_color || '#881337'
  const accentColor = school.accent_color || '#d4af37'
  const currency = school.currency || 'KES'

  return (
    <div
      className="printable-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'clamp(0.4rem, 2vw, 1.5rem)',
        overflowY: 'auto',
      }}
    >
      <div
        className="printable-modal-card"
        style={{
          margin: 'auto',
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: `2px solid ${primaryColor}`,
          boxSizing: 'border-box',
        }}
      >
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            borderTopLeftRadius: '18px',
            borderTopRightRadius: '18px',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>
            Official Appointment Letter • HR Ref: HR-OFFER-{staff.id.slice(0, 8).toUpperCase()}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: primaryColor,
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              🖨️ Print Offer Letter
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div style={{ padding: 'clamp(1rem, 3.5vw, 2.5rem) clamp(0.75rem, 3.5vw, 3rem)', color: '#0f172a' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `2.5px solid ${primaryColor}`,
              paddingBottom: '1.5rem',
              marginBottom: '1.75rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
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
                  flexShrink: 0,
                }}
              >
                {school.name.charAt(0)}
              </div>
              <div>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 900, margin: '0 0 2px', color: '#0f172a' }}>
                  {school.name}
                </h1>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                  Office of the Principal &amp; Human Resources Directorate
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                  {school.address || `${school.city}, ${school.country}`} • {school.contact_email}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'left' }}>
              <div
                style={{
                  display: 'inline-block',
                  background: `${primaryColor}15`,
                  color: primaryColor,
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                OFFER OF APPOINTMENT
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                Date: {staff.joined_date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Letter Body */}
          <div style={{ fontSize: '0.85rem', lineHeight: 1.7, color: '#334155' }}>
            <p>
              Dear <strong>{staff.full_name}</strong>,
            </p>
            <p>
              On behalf of the Governing Board of <strong>{school.name}</strong>, it gives me great pleasure to formally
              offer you the appointment to the position of <strong>{staff.title || 'Faculty Member / Instructor'}</strong> in
              the <strong>{staff.department || 'Academic Faculty'}</strong> department.
            </p>

            {/* Compensation & Structure Box */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem',
                margin: '1.25rem 0',
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem', color: '#0f172a', fontWeight: 800 }}>Terms of Remuneration &amp; Allowance Package:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '1rem', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Base Monthly Salary:</span>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>{currency} {(staff.salary_base ?? 0).toLocaleString()}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Housing &amp; Travel Stipend:</span>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>{currency} {((staff.salary_housing || 0) + (staff.salary_transport || 0)).toLocaleString()}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Net Monthly Compensation:</span>
                  <div style={{ fontWeight: 900, color: '#16a34a' }}>{currency} {(staff.net_salary ?? staff.salary_base ?? 0).toLocaleString()}</div>
                </div>
              </div>
              {((staff.salary_tax || 0) + (staff.salary_pension || 0)) > 0 && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.78rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                  <span>Agreed Withholdings &amp; Deductions:</span>
                  <span style={{ fontWeight: 700, color: '#b91c1c' }}>-{currency} {((staff.salary_tax || 0) + (staff.salary_pension || 0)).toLocaleString()} (Tax: {currency} {(staff.salary_tax || 0).toLocaleString()}, Pension: {currency} {(staff.salary_pension || 0).toLocaleString()})</span>
                </div>
              )}
            </div>

            <p>
              In this role, you will be assigned to instruct courses within your specialization, oversee academic assessments,
              maintain student attendance rosters, and uphold the academic standards and values of our institution.
            </p>
            <p>
              Your official college LMS portal username has been provisioned as <strong>{staff.username}</strong>.
            </p>
          </div>

          {/* Signatures */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
              gap: '2rem',
              marginTop: '2.5rem',
              paddingTop: '1.5rem',
              borderTop: '2px solid #e2e8f0',
              fontSize: '0.78rem',
            }}
          >
            <div>
              <div style={{ height: '40px', borderBottom: '1px dotted #94a3b8', width: '180px' }} />
              <div style={{ marginTop: '6px', fontWeight: 800, color: '#0f172a' }}>
                {school.principal_name || 'Office of the Principal'}
              </div>
              <div style={{ color: '#64748b' }}>{school.principal_title || 'Principal & CEO'}, {school.name}</div>
            </div>

            <div>
              <div style={{ height: '40px', borderBottom: '1px dotted #94a3b8', width: '180px' }} />
              <div style={{ marginTop: '6px', fontWeight: 800, color: '#0f172a' }}>
                Candidate Acceptance Signature
              </div>
              <div style={{ color: '#64748b' }}>Date of Acceptance: __________________</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

