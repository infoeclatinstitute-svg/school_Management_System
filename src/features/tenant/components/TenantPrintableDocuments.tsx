import React from 'react'
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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: `2px solid ${primaryColor}`,
          position: 'relative',
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
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>
            Official Institutional Document • Registry Reference: ADM-{student.admission_number}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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
        <div style={{ padding: '2.5rem 3rem', color: '#0f172a' }}>
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: primaryColor }}>{student.admission_number}</div>
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
          </div>

          {/* Formal Body Paragraphs */}
          <div style={{ fontSize: '0.88rem', lineHeight: 1.65, color: '#334155', marginBottom: '1.5rem' }}>
            <p>
              Dear <strong>{student.full_name}</strong> and Guardian <strong>{student.guardian_name}</strong>,
            </p>
            <p>
              On behalf of the Governing Academic Board of <strong>{school.name}</strong>, we are pleased to inform you that you have been formally admitted to undertake your studies in <strong>{student.grade_class}</strong> commencing with <strong>{school.active_period_name}</strong>.
            </p>
            <p>
              Your admission has been confirmed under our accredited <strong>{school.curriculum_type}</strong> framework. You are required to observe all institutional regulations, maintain a continuous attendance threshold of not less than 85%, and participate diligently in all scheduled coursework, continuous assessment tests (CATs), and examination series.
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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: `2px solid ${primaryColor}`,
          position: 'relative',
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
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>
            Official Staff Provisioning Slip • Staff ID: {staff.id.toUpperCase()}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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

        <div style={{ padding: '2.5rem 3rem', color: '#0f172a' }}>
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
  const accentColor = school.accent_color || '#d4af37'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: `2px solid ${primaryColor}`,
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
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>
            Official Payslip • Period: {payslip.month_period} • Batch ID: {payslip.id.toUpperCase()}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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

        <div style={{ padding: '2.5rem 3rem', color: '#0f172a' }}>
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
                Bursary &amp; Compensation Directorate • Trust Payroll
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
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
  const accentColor = school.accent_color || '#d4af37'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: `2px solid ${primaryColor}`,
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
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>
            Official Payment Receipt • Serial: {receipt.receipt_number}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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

        <div style={{ padding: '2.5rem 3rem', color: '#0f172a' }}>
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
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>STUDENT NAME</div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>{receipt.student_name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>ADMISSION NUMBER</div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: primaryColor }}>{receipt.admission_number}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>FEE TERM / PERIOD</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{receipt.period_name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>PAYMENT METHOD</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{receipt.payment_method}</div>
            </div>
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
              <div style={{ fontSize: '0.82rem', color: '#15803d' }}>
                Recorded by: {receipt.recorded_by}
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
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Authorized Signatory:</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                Bursary Accounts Department
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
