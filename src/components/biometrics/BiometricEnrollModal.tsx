// ============================================================
// Global College — Student Biometric Fingerprint Enrollment Modal
// ============================================================

import React, { useState } from 'react'
import { schoolStore } from '@/lib/schoolData'
import {
  executeRealBiometricScan,
  isMobileDevice,
  type FingerOption,
  type BiometricMode,
} from '@/lib/biometricEngine'
import type { StudentRecord } from '@/types/school'

interface Props {
  student: StudentRecord
  officerName: string
  onClose: () => void
  onEnrolled: (updatedStudent: StudentRecord) => void
}

export const BiometricEnrollModal: React.FC<Props> = ({ student, officerName, onClose, onEnrolled }) => {
  const isMobile = isMobileDevice()
  const [biometricMode] = useState<BiometricMode>('webauthn')
  const [selectedFinger, setSelectedFinger] = useState<FingerOption>(
    (student.biometric_finger_name as FingerOption) || 'Right Index'
  )
  const [step, setStep] = useState<'idle' | 'scanning' | 'success'>('idle')
  const [scanStatusText, setScanStatusText] = useState('Place finger on biometric scanner.')
  const [scanProgress, setScanProgress] = useState(0)
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null)
  const [enrolledStudent, setEnrolledStudent] = useState<StudentRecord | null>(null)
  const [usedDeviceName, setUsedDeviceName] = useState<string>(isMobile ? '📱 Phone Hardware Fingerprint Scanner' : 'Platform Biometric Sensor')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Unified Enrollment Execution
  const executeEnrollment = async (chosenMode: BiometricMode = biometricMode) => {
    setStep('scanning')
    setScanProgress(15)
    setErrorMessage(null)

    try {
      const scanResult = await executeRealBiometricScan({
        mode: chosenMode,
        action: 'enroll',
        student,
        fingerName: selectedFinger,
        officerName,
        connectedUsbDevice: undefined,
        onProgress: (label, pct) => {
          setScanStatusText(label)
          setScanProgress(pct)
        },
      })

      const updated = await schoolStore.enrollStudentBiometric(
        student.id,
        selectedFinger,
        officerName,
        scanResult.credentialId,
        scanResult.deviceUsed,
        undefined,
        scanResult.templateHash
      )

      setConfidenceScore(scanResult.confidenceScore)
      setUsedDeviceName(scanResult.deviceUsed)
      setEnrolledStudent(updated)
      setStep('success')
    } catch (err: any) {
      console.error('Biometric enrollment failed:', err)
      let msg = err?.message || 'Biometric sensor error.'
      if (err?.name === 'NotAllowedError') {
        msg = 'Phone fingerprint scan canceled or timed out. Please tap the button again and place your registered finger on your phone sensor.'
      } else if (err?.name === 'SecurityError' || err?.name === 'NotSupportedError') {
        msg = 'Hardware fingerprint prompt requires HTTPS or local secure context. You can also use the Touch Sensor below.'
      }
      setErrorMessage(msg)
      setStep('idle')
    }
  }

  const handleFinish = () => {
    if (enrolledStudent) {
      onEnrolled(enrolledStudent)
    }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100, padding: '0.75rem' }}>
      <div
        className="modal-content modal-md"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '540px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: 'clamp(1rem, 3.5vw, 1.75rem)',
          borderRadius: '16px',
        }}
      >
        <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.65rem' }}>
          <div>
            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
              <span>🖐️</span> {isMobile ? 'Phone Fingerprint Enrollment' : 'Biometric Fingerprint Enrollment'}
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: '0.2rem 0 0 0' }}>
              {isMobile ? "Register using your phone's built-in fingerprint scanner or screen touch." : 'Register physical biometric template via Windows Hello, USB Scanner, or Native Sensor.'}
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Student Preview Card */}
        <div
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            padding: '0.75rem 0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'var(--color-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.05rem',
              flexShrink: 0,
            }}
          >
            {student.full_name.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {student.full_name}
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)' }}>
              Adm: <strong style={{ color: 'var(--color-primary)' }}>{student.admission_number}</strong> • {student.class_name}
            </div>
          </div>
          {student.biometric_enrolled && (
            <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', flexShrink: 0 }}>
              Enrolled ({student.biometric_finger_name || 'Active'})
            </span>
          )}
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

        {/* Step: IDLE / CONFIGURATION */}
        {step === 'idle' && (
          <div>
            {/* Finger Choice */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="label" style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                Select Finger to Enroll:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
                {[
                  { id: 'Right Index', label: '👉 Right Index' },
                  { id: 'Right Thumb', label: '👍 Right Thumb' },
                  { id: 'Right Middle', label: '🖐️ Right Middle' },
                  { id: 'Left Index', label: '👈 Left Index' },
                  { id: 'Left Thumb', label: '👍 Left Thumb' },
                  { id: 'Left Middle', label: '🖐️ Left Middle' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`btn btn-xs ${selectedFinger === f.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.74rem', padding: '0.35rem 0.25rem', whiteSpace: 'nowrap' }}
                    onClick={() => setSelectedFinger(f.id as FingerOption)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Primary Fingerprint Scanner Action Button */}
            <div
              style={{
                border: '2px solid var(--color-primary)',
                borderRadius: '16px',
                padding: '1.75rem 1rem',
                textAlign: 'center',
                background: 'linear-gradient(180deg, rgba(30, 58, 138, 0.05) 0%, rgba(30, 58, 138, 0.12) 100%)',
                cursor: 'pointer',
                marginBottom: '1rem',
                transition: 'all 0.15s ease',
                boxShadow: '0 4px 15px rgba(30, 58, 138, 0.12)',
              }}
              onClick={() => executeEnrollment()}
            >
              <div
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  background: 'rgba(30, 58, 138, 0.1)',
                  border: '3px solid var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem auto',
                  fontSize: '2.8rem',
                  boxShadow: '0 0 25px rgba(30, 58, 138, 0.25)',
                  transform: 'scale(1)',
                  transition: 'all 0.15s ease',
                }}
              >
                🖐️
              </div>
              <div style={{ fontWeight: 900, color: 'var(--color-primary)', fontSize: '1.1rem' }}>
                {isMobile ? "👆 Tap to Open Phone's Fingerprint Scanner" : 'Click to Enroll with Physical Biometric Reader'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                Enrolling: <strong>{selectedFinger}</strong> • {isMobile ? "Triggers your phone's native fingerprint reader" : "Windows Hello / Platform Sensor"}
              </div>
            </div>

            <div className="modal-footer" style={{ marginTop: '0.75rem', padding: 0, display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => executeEnrollment()}>
                🖐️ Tap to Scan Now
              </button>
            </div>
          </div>
        )}

        {/* Step: SCANNING ANIMATION */}
        {step === 'scanning' && (
          <div style={{ textAlign: 'center', padding: '1.25rem 0' }}>
            <div
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                boxShadow: '0 0 25px rgba(59, 130, 246, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto',
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
                  boxShadow: '0 0 10px #22c55e',
                  transition: 'top 0.25s linear',
                }}
              />
              <span style={{ fontSize: '2.6rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>🖐️</span>
            </div>

            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
              Scanning Physical {selectedFinger}...
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.85rem' }}>
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
              {scanProgress}% — Capturing Biometric Minutiae
            </div>
          </div>
        )}

        {/* Step: SUCCESS */}
        {step === 'success' && enrolledStudent && (
          <div style={{ textAlign: 'center', padding: '0.75rem 0' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#f0fdf4',
                border: '2px solid #22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.85rem auto',
                fontSize: '1.75rem',
                color: '#16a34a',
              }}
            >
              ✓
            </div>

            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d', marginBottom: '0.25rem' }}>
              Fingerprint Successfully Enrolled!
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              Biometric template hash generated and permanently linked for fee clearance.
            </p>

            <div
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '0.75rem 0.85rem',
                textAlign: 'left',
                fontSize: '0.8rem',
                lineHeight: 1.6,
                marginBottom: '1rem',
              }}
            >
              <div><strong>Registered Finger:</strong> 🖐️ {enrolledStudent.biometric_finger_name}</div>
              <div><strong>Hardware Sensor:</strong> {usedDeviceName}</div>
              <div><strong>Template Signature:</strong> <code style={{ fontSize: '0.72rem' }}>{enrolledStudent.biometric_template_hash}</code></div>
              <div><strong>Sensor Match Score:</strong> <strong style={{ color: '#16a34a' }}>{confidenceScore}% Quality Score</strong></div>
              <div><strong>Enrolled By:</strong> {officerName}</div>
            </div>

            <div className="modal-footer" style={{ padding: 0 }}>
              <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={handleFinish}>
                Done & Apply Biometrics
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

