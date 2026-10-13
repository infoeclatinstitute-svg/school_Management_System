// ============================================================
// Global College — Official Biometric Fee Clearance Pass
// ============================================================

import React from 'react'
import type { BiometricFeeClearancePass } from '@/types/school'
import { INSTITUTION_CONFIG } from '@/config/institution'

interface Props {
  pass: BiometricFeeClearancePass
  onClose: () => void
}

export const BiometricClearancePassModal: React.FC<Props> = ({ pass, onClose }) => {
  const isCleared = pass.status === 'CLEARED'
  const isConditional = pass.status === 'CONDITIONAL'

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1150, padding: '0.75rem' }}>
      <div
        className="modal-content modal-lg"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '780px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: 0,
          borderRadius: '16px',
        }}
      >
        {/* Top Control Bar (Hidden on print) */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 1.25rem',
            background: 'var(--color-bg-secondary)',
            borderBottom: '1px solid var(--color-border)',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🔒</span>
            <strong style={{ fontSize: '0.9rem' }}>Official Biometric Fee Clearance Pass</strong>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={handlePrint}>
              🖨️ Print Pass
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              ✕ Close
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div
          id="biometric-clearance-pass"
          style={{
            padding: 'clamp(1rem, 3.5vw, 2.5rem)',
            background: '#ffffff',
            color: '#0f172a',
            position: 'relative',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Security Watermark Background */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-25deg)',
              fontSize: '4.5rem',
              fontWeight: 900,
              color: isCleared ? 'rgba(22, 163, 74, 0.05)' : 'rgba(234, 88, 12, 0.05)',
              pointerEvents: 'none',
              letterSpacing: '0.3em',
              whiteSpace: 'nowrap',
              textTransform: 'uppercase',
              userSelect: 'none',
            }}
          >
            {isCleared ? 'BIOMETRICALLY CLEARED' : 'CONDITIONAL PASS'}
          </div>

          {/* Certificate Header */}
          <div
            style={{
              textAlign: 'center',
              borderBottom: '3px double #1e3a8a',
              paddingBottom: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', borderBottom: 'none', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <img
                src="/logo.png?v=2"
                alt={INSTITUTION_CONFIG.name}
                style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }}
                onError={(e) => {
                  ;(e.target as HTMLElement).style.display = 'none'
                }}
              />
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', fontFamily: 'var(--font-heading)', letterSpacing: '0.05em', margin: 0, textTransform: 'uppercase' }}>
                  {INSTITUTION_CONFIG.name}
                </h1>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                  {INSTITUTION_CONFIG.tagline} • Tel: {INSTITUTION_CONFIG.contact.phone} • Web: {INSTITUTION_CONFIG.domain}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'inline-block',
                background: isCleared ? '#f0fdf4' : isConditional ? '#fffbeb' : '#fef2f2',
                color: isCleared ? '#166534' : isConditional ? '#b45309' : '#991b1b',
                border: `1px solid ${isCleared ? '#bbf7d0' : isConditional ? '#fde68a' : '#fecaca'}`,
                padding: '4px 18px',
                borderRadius: '999px',
                fontSize: '0.85rem',
                fontWeight: 800,
                marginTop: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              🔒 BIOMETRIC FINANCIAL CLEARANCE CERTIFICATE & TRANSCRIPT PASS
            </div>
          </div>

          {/* Pass Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              background: '#f8fafc',
              padding: '1.25rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '0.88rem',
              marginBottom: '1.5rem',
            }}
          >
            <div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>CLEARANCE CERTIFICATE NO.</div>
              <strong style={{ color: '#1e3a8a', fontSize: '1.05rem', fontFamily: 'monospace' }}>{pass.clearance_code}</strong>
            </div>

            <div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>VERIFICATION TIMESTAMP</div>
              <strong>{pass.verified_at}</strong>
            </div>

            <div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>STUDENT FULL NAME</div>
              <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{pass.student_name}</strong>
            </div>

            <div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>ADMISSION NUMBER</div>
              <strong style={{ color: '#1e3a8a', fontSize: '1.05rem' }}>{pass.admission_number}</strong>
            </div>

            <div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>PROGRAM / COURSE COHORT</div>
              <strong>{pass.class_name}</strong>
            </div>

            <div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>CLEARANCE PURPOSE</div>
              <strong style={{ color: '#0284c7' }}>{pass.purpose}</strong>
            </div>
          </div>

          {/* Biometric Verification Security Details */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr',
              gap: '1.25rem',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              padding: '1rem 1.25rem',
              alignItems: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: '#e0f2fe',
                  border: '2px solid #0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  fontSize: '2.4rem',
                }}
              >
                🖐️
              </div>
              <div style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: 700, marginTop: '4px' }}>
                MATCH {pass.match_confidence}%
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#16a34a',
                  }}
                />
                <strong style={{ color: '#0369a1', fontSize: '0.9rem' }}>
                  Biometric Fingerprint Verified & Authenticated
                </strong>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.5 }}>
                <div><strong>Enrolled Sensor Finger:</strong> {pass.finger_scanned}</div>
                <div><strong>Biometric Cryptographic Hash:</strong> <code style={{ fontSize: '0.75rem' }}>{pass.security_hash}</code></div>
                <div><strong>Verifying Authority:</strong> {pass.verified_by}</div>
              </div>
            </div>
          </div>

          {/* Financial Status Summary */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '1rem',
              textAlign: 'center',
              padding: '1rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              marginBottom: '1.5rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>TOTAL BILLED</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e3a8a', marginTop: '2px' }}>
                ${pass.total_billed.toLocaleString()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>TOTAL PAID TO DATE</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#16a34a', marginTop: '2px' }}>
                ${pass.total_paid.toLocaleString()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>OUTSTANDING BALANCE</div>
              <div
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  color: pass.fee_balance === 0 ? '#16a34a' : '#ea580c',
                  marginTop: '2px',
                }}
              >
                {pass.fee_balance === 0 ? '$0.00 (CLEARED ✓)' : `$${pass.fee_balance.toLocaleString()}`}
              </div>
            </div>
          </div>

          {/* Clearance Verdict Box */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center',
              marginBottom: '1.5rem',
              background: isCleared ? '#f0fdf4' : isConditional ? '#fffbeb' : '#fef2f2',
              border: `2px solid ${isCleared ? '#22c55e' : isConditional ? '#f59e0b' : '#ef4444'}`,
            }}
          >
            <div
              style={{
                fontSize: '1.15rem',
                fontWeight: 900,
                color: isCleared ? '#15803d' : isConditional ? '#b45309' : '#b91c1c',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {isCleared
                ? '✓ OFFICIAL CLEARANCE GRANTED — ELIGIBLE FOR EXAMS & SITTINGS'
                : isConditional
                ? '⚠️ CONDITIONAL CLEARANCE GRANTED — PENDING BALANCE CLEARANCE'
                : '✕ CLEARANCE WITHHELD — ARREARS REQUIRED PRIOR TO EXAM ADMISSION'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '4px' }}>
              This pass is authenticated by the Global College Bursar Biometric Security Registry. Valid for the current academic session.
            </div>
          </div>

          {/* Signatures & Security Stamp */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem',
              borderTop: '1px dashed #cbd5e1',
              paddingTop: '1.25rem',
              marginTop: '1rem',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '2rem' }}>
                STUDENT BIOMETRIC SIGN-OFF
              </div>
              <div style={{ borderBottom: '1px solid #94a3b8', paddingBottom: '2px' }}>
                <strong style={{ fontSize: '0.85rem' }}>{pass.student_name}</strong>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                Digitally verified via {pass.finger_scanned} biometric match
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '2rem' }}>
                BURSAR & ACCOUNTS DIRECTORATE
              </div>
              <div style={{ borderBottom: '1px solid #94a3b8', paddingBottom: '2px' }}>
                <strong style={{ fontSize: '0.85rem', color: '#1e3a8a' }}>{pass.verified_by}</strong>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                Authorized College Financial Officer Seal & Signature
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: 'center',
              fontSize: '0.7rem',
              color: '#94a3b8',
              marginTop: '1.5rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            Global College Integrated SIMS & Biometric Gateway • Document Verification Hash: {pass.security_hash.slice(0, 24)}...
          </div>
        </div>
      </div>
    </div>
  )
}
