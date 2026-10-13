// ============================================================
// Global College — Real Biometric Fingerprint Fee Verification Station
// ============================================================

import React, { useState, useEffect } from 'react'
import { schoolStore } from '@/lib/schoolData'
import {
  executeRealBiometricScan,
  isWebAuthnAvailable,
  isMobileDevice,
  evaluateFeeClearance,
  createClearancePass,
  type BiometricMode,
  type RealBiometricDevice,
} from '@/lib/biometricEngine'
import type { StudentRecord, BiometricFeeClearancePass } from '@/types/school'
import { BiometricClearancePassModal } from './BiometricClearancePassModal'

interface Props {
  officerName: string
  onClose: () => void
  onRecordPayment?: (student: StudentRecord) => void
  onEnrollRequested?: (student: StudentRecord) => void
}

export const BiometricScannerModal: React.FC<Props> = ({
  officerName,
  onClose,
  onRecordPayment,
  onEnrollRequested: _onEnrollRequested,
}) => {
  const isMobile = isMobileDevice()
  const [students] = useState<StudentRecord[]>(() => schoolStore.getStudents())
  const [biometricMode] = useState<BiometricMode>('webauthn')
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students.find((s) => s.biometric_enrolled)?.id || students[0]?.id || ''
  )
  const [scanState, setScanState] = useState<'ready' | 'scanning' | 'matched' | 'not_found'>('ready')
  const [scanProgress, setScanProgress] = useState(0)
  const [scanStatusText, setScanStatusText] = useState('Biometric Sensor Ready.')
  const [matchedStudent, setMatchedStudent] = useState<StudentRecord | null>(null)
  const [confidenceScore, setConfidenceScore] = useState(99.4)
  const [usedDeviceName, setUsedDeviceName] = useState<string>(isMobile ? '📱 Phone Hardware Fingerprint Scanner' : 'Platform Biometric Sensor')
  const [connectedUsbDev] = useState<RealBiometricDevice | null>(null)
  const [selectedPurpose, setSelectedPurpose] = useState<BiometricFeeClearancePass['purpose']>('Exam Entry')
  const [generatedPass, setGeneratedPass] = useState<BiometricFeeClearancePass | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    isWebAuthnAvailable()
  }, [isMobile])

  // Start Real Fingerprint Verification via Phone's Native Biometrics
  const handleScanFingerprint = async (targetStudent?: StudentRecord, chosenMode: BiometricMode = biometricMode) => {
    const studentToMatch = targetStudent || students.find((s) => s.id === selectedStudentId)
    setErrorMessage(null)
    setScanState('scanning')
    setScanProgress(30)
    setScanStatusText(isMobile ? "Waiting for phone fingerprint touch..." : "Waiting for biometric sensor...")

    try {
      const scanRes = await executeRealBiometricScan({
        mode: chosenMode,
        action: 'verify',
        student: studentToMatch,
        connectedUsbDevice: connectedUsbDev,
        onProgress: (label, pct) => {
          setScanStatusText(label)
          setScanProgress(pct)
        },
      })

      if (studentToMatch) {
        setConfidenceScore(scanRes.confidenceScore)
        setUsedDeviceName(scanRes.deviceUsed)
        setMatchedStudent(studentToMatch)
        setScanState('matched')
      } else {
        setScanState('not_found')
      }
    } catch (err: any) {
      console.error('Biometric scan failed:', err)
      let msg = err?.message || 'Fingerprint verification failed.'
      if (err?.name === 'NotAllowedError') {
        msg = "Phone fingerprint sensor cancelled or timed out. Please tap 'Scan Phone Fingerprint' and place your registered finger on your phone's physical sensor."
      } else if (err?.name === 'SecurityError' || err?.name === 'NotSupportedError') {
        msg = "Your phone's hardware biometric sensor requires a Secure HTTPS connection (e.g. your live website URL). You can also use the Touch Sensor below."
      }
      setErrorMessage(msg)
      setScanState('ready')
    }
  }

  // Issue Official Clearance Pass
  const handleIssueClearancePass = async () => {
    if (!matchedStudent) return
    const pass = createClearancePass(matchedStudent, officerName, selectedPurpose, confidenceScore, usedDeviceName)
    await schoolStore.saveBiometricClearanceLog(pass)
    setGeneratedPass(pass)
  }

  const handleResetScanner = () => {
    setScanState('ready')
    setMatchedStudent(null)
    setScanProgress(0)
    setErrorMessage(null)
    setScanStatusText('Biometric Sensor Ready.')
  }

  const enrolledStudents = students.filter((s) => s.biometric_enrolled)
  const feeEval = matchedStudent
    ? evaluateFeeClearance(matchedStudent.term_fee_total, matchedStudent.fee_balance)
    : null

  return (
    <>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100, padding: '0.75rem' }}>
        <div
          className="modal-content modal-lg"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '680px',
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: 'clamp(1rem, 3.5vw, 1.75rem)',
            borderRadius: '16px',
          }}
        >
          {/* Header */}
          <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.65rem' }}>
            <div>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🖐️</span> {isMobile ? "Phone's Fingerprint Fee Station" : 'Biometric Fee Clearance Station'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: '0.2rem 0 0 0' }}>
                {isMobile ? "Uses your phone's native physical fingerprint reader to verify student fees." : 'Instant live biometric verification for student exam clearance & security passes.'}
              </p>
            </div>
            <button type="button" className="modal-close" onClick={onClose}>✕</button>
          </div>

          {errorMessage && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.8rem',
                marginBottom: '1rem',
              }}
            >
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Scanner Interaction Area */}
          {scanState === 'ready' && (
            <div>
              {/* Student Selection */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.4rem' }}>
                  Select Student to Verify:
                </label>
                {students.length === 0 ? (
                  <div className="alert alert-warning" style={{ fontSize: '0.82rem' }}>
                    No students currently in the directory. Please add a student in Admissions.
                  </div>
                ) : (
                  <div>
                    <select
                      className="input"
                      style={{ fontSize: '0.88rem', padding: '0.6rem 0.75rem', width: '100%', borderRadius: '10px' }}
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.admission_number} — {s.full_name} ({s.class_name}) {s.biometric_enrolled ? '🟢 [Enrolled]' : '⚪ [Unregistered]'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Direct Primary Fingerprint Scanner Action Button */}
              <div
                style={{
                  border: '2px solid #0284c7',
                  borderRadius: '16px',
                  padding: '2rem 1.25rem',
                  textAlign: 'center',
                  background: 'linear-gradient(180deg, rgba(2, 132, 199, 0.08) 0%, rgba(2, 132, 199, 0.16) 100%)',
                  cursor: 'pointer',
                  marginBottom: '1.25rem',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 4px 15px rgba(2, 132, 199, 0.15)',
                }}
                onClick={() => handleScanFingerprint()}
              >
                <div
                  style={{
                    width: '88px',
                    height: '88px',
                    borderRadius: '50%',
                    background: '#e0f2fe',
                    border: '3px solid #0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.85rem auto',
                    fontSize: '3rem',
                    boxShadow: '0 0 25px rgba(2, 132, 199, 0.35)',
                    transform: 'scale(1)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  🖐️
                </div>
                <div style={{ fontWeight: 900, color: '#0369a1', fontSize: '1.15rem' }}>
                  {isMobile ? "👆 Tap to Scan Phone's Fingerprint" : '👆 Click to Scan Fingerprint / Passkey'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.35rem' }}>
                  {isMobile ? "Opens your phone's native hardware fingerprint reader" : "Hardware biometrics & Windows Hello passkey active"}
                </div>
              </div>

              {/* Enrolled Students Quick Badges */}
              {enrolledStudents.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '0.4rem' }}>
                    QUICK SCAN ENROLLED STUDENTS ({enrolledStudents.length}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxHeight: '120px', overflowY: 'auto' }}>
                    {enrolledStudents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="btn btn-secondary btn-xs"
                        style={{ fontSize: '0.74rem', padding: '0.3rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        onClick={() => {
                          setSelectedStudentId(s.id)
                          handleScanFingerprint(s)
                        }}
                      >
                        <span style={{ color: '#16a34a' }}>●</span>
                        <strong>{s.full_name}</strong>
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.7rem' }}>({s.admission_number})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}


          {/* Scanner Active Animation */}
          {scanState === 'scanning' && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0284c7 0%, #1e3a8a 100%)',
                  boxShadow: '0 0 30px rgba(2, 132, 199, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: `${scanProgress}%`,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: '#22c55e',
                    boxShadow: '0 0 12px #22c55e',
                    transition: 'top 0.25s linear',
                  }}
                />
                <span style={{ fontSize: '3rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>🖐️</span>
              </div>

              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
                Verifying Biometric Fingerprint...
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                {scanStatusText}
              </div>

              <div
                style={{
                  width: '100%',
                  height: '8px',
                  background: 'var(--color-bg-secondary)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  border: '1px solid var(--color-border)',
                  maxWidth: '360px',
                  margin: '0 auto',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${scanProgress}%`,
                    background: '#16a34a',
                    transition: 'width 0.25s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 700, marginTop: '0.4rem' }}>
                {scanProgress}% — Live Physical Fingerprint Verification
              </div>
            </div>
          )}

          {/* Matched Result Card — Front-Desk Fee Status & Financial Audit */}
          {scanState === 'matched' && matchedStudent && feeEval && (
            <div>
              {/* Success Banner */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: '#16a34a',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <strong style={{ color: '#166534', fontSize: '0.92rem' }}>
                      Identity Verified via Phone Fingerprint Sensor!
                    </strong>
                    <div style={{ fontSize: '0.74rem', color: '#15803d' }}>
                      {usedDeviceName} • {confidenceScore}% Biometric Confidence Score
                    </div>
                  </div>
                </div>
                <button type="button" className="btn btn-secondary btn-xs" onClick={handleResetScanner}>
                  🔄 Next Student
                </button>
              </div>

              {/* Student Identification Profile */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '56px 1fr auto',
                  gap: '0.85rem',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '0.9rem 1rem',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1.35rem',
                    boxShadow: '0 2px 8px rgba(30, 58, 138, 0.25)',
                  }}
                >
                  {matchedStudent.full_name.charAt(0)}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>
                      {matchedStudent.full_name}
                    </h4>
                    <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>{matchedStudent.class_name}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                    Adm No: <strong style={{ color: 'var(--color-primary)' }}>{matchedStudent.admission_number}</strong> • Status: <span style={{ color: '#16a34a', fontWeight: 600 }}>{matchedStudent.status}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                    Key Credential: <code style={{ fontSize: '0.68rem', background: 'var(--color-bg-primary)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>{matchedStudent.biometric_credential_id ? `PASSKEY-${matchedStudent.biometric_credential_id.slice(0, 12)}...` : (matchedStudent.biometric_template_hash || 'PASSKEY-AUTHENTICATED')}</code>
                  </div>
                </div>

                <div>
                  <span
                    className={`badge ${feeEval.status === 'CLEARED' ? 'badge-success' : feeEval.status === 'CONDITIONAL' ? 'badge-warning' : 'badge-danger'}`}
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem', fontWeight: 700 }}
                  >
                    {feeEval.status === 'CLEARED' ? '🟢 100% Cleared' : feeEval.status === 'CONDITIONAL' ? '🟡 Partial Balance' : '🔴 Overdue Arrears'}
                  </span>
                </div>
              </div>

              {/* Financial Clearance Audit KPIs */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '0.6rem',
                  textAlign: 'center',
                  marginBottom: '1rem',
                }}
              >
                <div className="card" style={{ padding: '0.8rem 0.6rem', background: '#fff', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: 700, letterSpacing: '0.04em' }}>TOTAL BILLED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '3px' }}>
                    ${matchedStudent.term_fee_total.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Course Schedule</div>
                </div>

                <div className="card" style={{ padding: '0.8rem 0.6rem', background: '#fff', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: 700, letterSpacing: '0.04em' }}>TOTAL PAID</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a', marginTop: '3px' }}>
                    ${Math.max(0, matchedStudent.term_fee_total - matchedStudent.fee_balance).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
                    {Math.round(((matchedStudent.term_fee_total - matchedStudent.fee_balance) / (matchedStudent.term_fee_total || 1)) * 100)}% Complete
                  </div>
                </div>

                <div className="card" style={{ padding: '0.8rem 0.6rem', background: '#fff', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: 700, letterSpacing: '0.04em' }}>FEE BALANCE</div>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      color: matchedStudent.fee_balance === 0 ? '#16a34a' : '#dc2626',
                      marginTop: '3px',
                    }}
                  >
                    ${matchedStudent.fee_balance.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: matchedStudent.fee_balance === 0 ? '#16a34a' : '#dc2626', fontWeight: 600, marginTop: '2px' }}>
                    {matchedStudent.fee_balance === 0 ? 'No Arrears' : 'Payment Due'}
                  </div>
                </div>
              </div>

              {/* Fee Progress Bar */}
              <div style={{ marginBottom: '1rem', background: 'var(--color-bg-secondary)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  <span>Fee Clearance Progress:</span>
                  <span style={{ color: matchedStudent.fee_balance === 0 ? '#16a34a' : '#ea580c' }}>
                    {Math.round(((matchedStudent.term_fee_total - matchedStudent.fee_balance) / (matchedStudent.term_fee_total || 1)) * 100)}% Paid
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.round(((matchedStudent.term_fee_total - matchedStudent.fee_balance) / (matchedStudent.term_fee_total || 1)) * 100))}%`,
                      background: matchedStudent.fee_balance === 0 ? '#16a34a' : '#ea580c',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {/* Clearance Verdict Box */}
              <div
                style={{
                  padding: '0.9rem',
                  borderRadius: '12px',
                  background: feeEval.status === 'CLEARED' ? '#f0fdf4' : feeEval.status === 'CONDITIONAL' ? '#fffbeb' : '#fef2f2',
                  border: `2px solid ${feeEval.color}`,
                  textAlign: 'center',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ fontSize: '1rem', fontWeight: 900, color: feeEval.color }}>
                  {feeEval.status === 'CLEARED' && '✓ FEES FULLY CLEARED — 100% AUTHORIZED FOR EXAMS'}
                  {feeEval.status === 'CONDITIONAL' && '⚠️ CONDITIONAL CLEARANCE — PARTIAL BALANCE OUTSTANDING'}
                  {feeEval.status === 'OVERDUE' && '✕ FEE ARREARS OUTSTANDING — PAYMENT REQUIRED'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.25rem', lineHeight: '1.4' }}>
                  {feeEval.status === 'CLEARED'
                    ? 'Student is 100% in good financial standing. Authorized for practical labs, term examinations, and official certificate release.'
                    : `Student has an outstanding fee balance of $${matchedStudent.fee_balance.toLocaleString()}. Please settle via the online portal.`}
                </div>
              </div>

              {/* Student's Payment History Table at Front Desk */}
              {(() => {
                const studentReceipts = schoolStore.getReceipts().filter(
                  (r) => r.student_id === matchedStudent.id || r.admission_number === matchedStudent.admission_number
                )
                if (studentReceipts.length === 0) return null
                return (
                  <div style={{ marginBottom: '1rem', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ background: 'var(--color-bg-secondary)', padding: '0.5rem 0.75rem', fontSize: '0.76rem', fontWeight: 700, borderBottom: '1px solid var(--color-border)' }}>
                      📜 Recent Payment Receipts on File ({studentReceipts.length}):
                    </div>
                    <div style={{ maxHeight: '110px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', fontSize: '0.74rem', borderCollapse: 'collapse' }}>
                        <tbody>
                          {studentReceipts.slice(0, 4).map((rc) => (
                            <tr key={rc.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '0.35rem 0.75rem' }}>
                                <strong>{rc.receipt_number}</strong>
                                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)' }}>{rc.payment_date ? rc.payment_date.slice(0, 10) : 'Recent'}</div>
                              </td>
                              <td style={{ padding: '0.35rem 0.75rem' }}>
                                <span className="badge badge-info" style={{ fontSize: '0.66rem' }}>{rc.payment_method}</span>
                                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)' }}>{rc.reference_code}</div>
                              </td>
                              <td style={{ padding: '0.35rem 0.75rem', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>
                                ${rc.amount.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}

              {/* Clearance Pass Options & Direct Payment Action */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                  background: 'var(--color-bg-secondary)',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Pass Purpose:</label>
                  <select
                    className="input"
                    style={{ width: 'auto', padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                    value={selectedPurpose}
                    onChange={(e) => setSelectedPurpose(e.target.value as any)}
                  >
                    <option value="Exam Entry">Exam Entry</option>
                    <option value="Lab Clearance">Practical Lab</option>
                    <option value="Certificate Collection">Certificate Release</option>
                    <option value="Registration Clearance">Semester Registration</option>
                    <option value="Financial Audit">Audit Verification</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {matchedStudent.fee_balance > 0 && onRecordPayment && (
                    <button
                      type="button"
                      className="btn btn-warning btn-sm"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', fontWeight: 700 }}
                      onClick={() => {
                        onClose()
                        onRecordPayment(matchedStudent)
                      }}
                    >
                      💳 Pay Fee Balance (${matchedStudent.fee_balance.toLocaleString()})
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', fontWeight: 700 }}
                    onClick={handleIssueClearancePass}
                  >
                    🖨️ Issue & Print Pass
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                    onClick={() => {
                      const text = `Global College Fee Statement:\nStudent: ${matchedStudent.full_name} (${matchedStudent.admission_number})\nClass: ${matchedStudent.class_name}\nTotal Billed: $${matchedStudent.term_fee_total.toLocaleString()}\nTotal Paid: $${Math.max(0, matchedStudent.term_fee_total - matchedStudent.fee_balance).toLocaleString()}\nBalance Due: $${matchedStudent.fee_balance.toLocaleString()}\nStatus: ${matchedStudent.fee_balance === 0 ? 'CLEARED' : 'PENDING'}`
                      navigator.clipboard.writeText(text)
                      alert('✓ Student fee statement copied to clipboard!')
                    }}
                  >
                    📋 Copy Statement
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Not Found */}
          {scanState === 'not_found' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '0.4rem' }}>❌</div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#dc2626' }}>
                Fingerprint Scan Failed or Not Recognized
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                {errorMessage || 'The physical biometric signature scanned does not match this student record.'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleResetScanner}>
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.65rem', marginTop: '0.4rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Close Station
            </button>
          </div>
        </div>
      </div>

      {/* Official Clearance Pass Modal */}
      {generatedPass && (
        <BiometricClearancePassModal
          pass={generatedPass}
          onClose={() => setGeneratedPass(null)}
        />
      )}
    </>
  )
}

