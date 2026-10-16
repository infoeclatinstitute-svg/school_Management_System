import React, { useState, useEffect, useMemo } from 'react'
import type { PartnerSchoolTenant, TenantAdmissionApplication } from '@/types/tenantSchool'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'

export interface TenantApplyAdmissionModalProps {
  school: PartnerSchoolTenant
  isOpen: boolean
  initialProgramTitle?: string
  onClose: () => void
  onSubmitted?: (app: TenantAdmissionApplication) => void
}

export function TenantApplyAdmissionModal({
  school,
  isOpen,
  initialProgramTitle = '',
  onClose,
  onSubmitted,
}: TenantApplyAdmissionModalProps) {
  const primaryColor = school.primary_color || '#1e3a8a'
  const accentColor = school.accent_color || '#0284c7'

  const programs = useMemo(() => {
    return tenantSchoolStore.getProgramsBySchool(school.slug)
  }, [school.slug, isOpen])

  const calendarPeriods = useMemo(() => {
    if (school.academic_calendar && school.academic_calendar.length > 0) {
      return school.academic_calendar.map((p) => p.name)
    }
    return [school.active_period_name || 'Upcoming Intake 2026', 'Next Academic Term', 'September / Fall Intake']
  }, [school.academic_calendar, school.active_period_name])

  // Form Fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedProgram, setSelectedProgram] = useState(initialProgramTitle || '')
  const [customProgram, setCustomProgram] = useState('')
  const [selectedIntake, setSelectedIntake] = useState(school.active_period_name || calendarPeriods[0] || 'Upcoming Intake')
  const [priorQualifications, setPriorQualifications] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [notes, setNotes] = useState('')

  const [submittedApplication, setSubmittedApplication] = useState<TenantAdmissionApplication | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setSubmittedApplication(null)
      setErrorMessage(null)
      if (initialProgramTitle) {
        setSelectedProgram(initialProgramTitle)
      } else if (programs.length > 0) {
        setSelectedProgram(programs[0].title)
      }
    }
  }, [isOpen, initialProgramTitle, programs])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!fullName.trim() || !phone.trim() || !email.trim()) {
      setErrorMessage('Please provide your full legal name, email address, and phone number.')
      return
    }

    const finalProgram =
      selectedProgram === '__custom__'
        ? customProgram.trim() || 'General Academic Cohort'
        : selectedProgram || (programs[0] ? programs[0].title : 'General Academic Program')

    setIsSubmitting(true)
    try {
      const createdApp = tenantSchoolStore.submitAdmissionApplication({
        school_slug: school.slug,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        program_title: finalProgram,
        intake: selectedIntake,
        prior_qualifications: priorQualifications.trim() || 'Standard Secondary Completion',
        guardian_name: guardianName.trim(),
        guardian_phone: guardianPhone.trim(),
        notes: notes.trim(),
      })

      setSubmittedApplication(createdApp)
      if (onSubmitted) {
        onSubmitted(createdApp)
      }
    } catch {
      setErrorMessage('Failed to submit application. Please check network and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrintConfirmation = () => {
    window.print()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: 'calc(100dvh - 2rem)',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: `2px solid ${primaryColor}`,
          position: 'relative',
        }}
      >
        {/* Top Header Banner */}
        <div
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
            color: '#ffffff',
            padding: '1.75rem 2rem',
            borderTopLeftRadius: '22px',
            borderTopRightRadius: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {school.logo_url ? (
              <img
                src={school.logo_url}
                alt={school.name}
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  objectFit: 'cover',
                  background: '#ffffff',
                  padding: '3px',
                }}
              />
            ) : (
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                }}
              >
                🎓
              </div>
            )}
            <div>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: accentColor,
                }}
              >
                OFFICIAL ADMISSIONS PORTAL
              </span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '2px 0 0', color: '#ffffff' }}>
                Apply for Admission at {school.name}
              </h2>
              <div style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: '2px' }}>
                Direct submission to the Office of the Principal &amp; Admissions Committee
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: 'none',
              color: '#ffffff',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1.1rem',
              transition: 'background 0.15s',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Area */}
        <div style={{ padding: '1.85rem 2rem' }}>
          {submittedApplication ? (
            /* ========================================== */
            /* SUCCESS CONFIRMATION STATE                 */
            /* ========================================== */
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                  margin: '0 auto 1.25rem',
                  border: '3px solid #a7f3d0',
                }}
              >
                ✓
              </div>

              <span
                style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Application Delivered to Principal Office
              </span>

              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: '0.75rem 0 0.5rem' }}>
                Application Received Successfully!
              </h3>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  margin: '1.25rem auto',
                  maxWidth: '460px',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Official Tracking Reference
                </div>
                <div
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 900,
                    color: primaryColor,
                    margin: '4px 0',
                    fontFamily: 'monospace',
                    letterSpacing: '0.05em',
                  }}
                >
                  {submittedApplication.application_number}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700 }}>
                  Candidate: {submittedApplication.full_name}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                  Program: {submittedApplication.program_title} • Session: {submittedApplication.intake}
                </div>
              </div>

              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, maxWidth: '520px', margin: '0 auto 1.5rem' }}>
                Your admission dossier has landed directly in the <strong>Office of the Principal</strong> at{' '}
                <strong>{school.name}</strong>. The Admissions Secretariat is reviewing your academic details and will follow up with you directly via phone (<strong>{submittedApplication.phone}</strong>) and email (<strong>{submittedApplication.email}</strong>).
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handlePrintConfirmation}
                  style={{
                    padding: '0.7rem 1.4rem',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  🖨️ Print Confirmation Slip
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.7rem 1.6rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: primaryColor,
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Done &amp; Return to Campus
                </button>
              </div>
            </div>
          ) : (
            /* ========================================== */
            /* APPLICATION FORM                           */
            /* ========================================== */
            <form onSubmit={handleSubmit}>
              {errorMessage && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    marginBottom: '1.25rem',
                  }}
                >
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* Personal Details */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  1. Candidate Personal &amp; Contact Details
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#334155' }}>
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Liam Ndegwa"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#334155' }}>
                      Phone / WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +254 712 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#334155' }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. candidate@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Program & Academic Intake */}
              <div style={{ marginBottom: '1.25rem', background: '#f8fafc', padding: '1.15rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  2. Academic Program &amp; Desired Intake
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#334155' }}>
                      Selected Program of Interest *
                    </label>
                    <select
                      value={selectedProgram}
                      onChange={(e) => setSelectedProgram(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        background: '#ffffff',
                        boxSizing: 'border-box',
                      }}
                    >
                      {programs.map((p) => (
                        <option key={p.id} value={p.title}>
                          {p.title} ({p.level})
                        </option>
                      ))}
                      <option value="__custom__">+ Other / General Admission...</option>
                    </select>

                    {selectedProgram === '__custom__' && (
                      <input
                        type="text"
                        required
                        placeholder="Type course or area of study"
                        value={customProgram}
                        onChange={(e) => setCustomProgram(e.target.value)}
                        style={{
                          width: '100%',
                          marginTop: '6px',
                          padding: '0.55rem 0.85rem',
                          borderRadius: '8px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.84rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#334155' }}>
                      Preferred Intake Session *
                    </label>
                    <select
                      value={selectedIntake}
                      onChange={(e) => setSelectedIntake(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        background: '#ffffff',
                        boxSizing: 'border-box',
                      }}
                    >
                      {calendarPeriods.map((period) => (
                        <option key={period} value={period}>
                          {period}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#334155' }}>
                    Highest Prior Education / Examination Qualification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. KCSE Mean Grade C+, High School Diploma, Diploma in ICT"
                    value={priorQualifications}
                    onChange={(e) => setPriorQualifications(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.85rem',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Sponsor & Guardian Information */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  3. Guardian / Financial Sponsor (Optional)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#334155' }}>
                      Guardian / Sponsor Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mary Ndegwa"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#334155' }}>
                      Guardian Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +254 700 000 000"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Statement */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#334155' }}>
                  Personal Statement or Special Inquiries (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Tell the admissions board about your career goals, questions about tuition installments, or special requirements..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Footer Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '1.25rem',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                  🔒 Data processed securely under institutional privacy compliance.
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      padding: '0.65rem 1.25rem',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      background: '#ffffff',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: '0.65rem 1.6rem',
                      borderRadius: '10px',
                      border: 'none',
                      background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                      color: '#ffffff',
                      fontWeight: 800,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      fontSize: '0.88rem',
                      boxShadow: `0 4px 12px ${primaryColor}30`,
                      opacity: isSubmitting ? 0.7 : 1,
                    }}
                  >
                    {isSubmitting ? 'Submitting to Principal...' : 'Submit Application ➔'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
