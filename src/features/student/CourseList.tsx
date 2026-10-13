import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { schoolStore, schoolEventBus } from '@/lib/schoolData'
import { UnitRegistrationSlip } from '@/components/shared/UnitRegistrationSlip'
import { INSTITUTION_CONFIG, getWhatsAppInquiryUrl } from '@/config/institution'
import { getCoursePhoto } from '@/config/courseImages'
import { initializePaystackCheckout } from '@/lib/paystack'
import type { CourseUnit } from '@/types/school'

export function CourseList() {
  const { profile } = useAuth()
  const [selectedUnit, setSelectedUnit] = useState<CourseUnit | null>(null)
  const [enrollUnit, setEnrollUnit] = useState<CourseUnit | null>(null)
  const [showSlipModal, setShowSlipModal] = useState(false)
  const [viewMode, setViewMode] = useState<'my_courses' | 'all_catalog'>('my_courses')
  const [, setVersion] = useState(0)

  // Enrollment checkout state
  const [mpesaCode, setMpesaCode] = useState('')
  const [paymentPhone, setPaymentPhone] = useState('')
  const [isProcessingEnrollment, setIsProcessingEnrollment] = useState(false)
  const [enrollSuccessMsg, setEnrollSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const handleSync = () => {
      if (isMounted) setVersion((v) => v + 1)
    }

    schoolStore.syncWithCloud(true).then(handleSync).catch(() => {})

    const unsubStd = schoolEventBus.subscribe('STUDENT_UPDATED', handleSync)
    const unsubReg = schoolEventBus.subscribe('UNIT_REGISTRATION_COMPLETED' as any, handleSync)
    const unsubPay = schoolEventBus.subscribe('PAYMENT_RECORDED', handleSync)
    const unsubCourse = schoolEventBus.subscribe('COURSE_UNIT_CREATED' as any, handleSync)

    window.addEventListener('gc-data-synced', handleSync)
    window.addEventListener('gc-courses-updated', handleSync)
    window.addEventListener('storage', handleSync)

    return () => {
      isMounted = false
      unsubStd()
      unsubReg()
      unsubPay()
      unsubCourse()
      window.removeEventListener('gc-data-synced', handleSync)
      window.removeEventListener('gc-courses-updated', handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  // Fetch registration for the current student
  const studentIdentifier = profile?.admission_number || profile?.id || ''
  const registrationSlip = schoolStore.getRegistrationForStudent(studentIdentifier)
  const registeredUnits = schoolStore.getRegisteredUnitsForStudent(studentIdentifier)
  const allUnits = schoolStore.getCourseUnits().filter((u) => u.is_published !== false)
  const displayedUnits = viewMode === 'my_courses' ? registeredUnits : allUnits

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enrollUnit || !studentIdentifier) return

    const studentName = profile?.full_name || 'Enrolled Student'
    const admNo = profile?.admission_number || studentIdentifier
    const feeAmount = enrollUnit.course_fee || (INSTITUTION_CONFIG.pricing.defaultTuitionFee * 130) || 15000

    setIsProcessingEnrollment(true)

    try {
      await initializePaystackCheckout({
        email: (profile as any)?.email || `${admNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.${INSTITUTION_CONFIG.domain}`,
        amount: feeAmount,
        currency: 'KES',
        studentName,
        admissionNumber: admNo,
        purpose: `Course Enrollment Fee: ${enrollUnit.title}`,
        invoiceId: `INV-${admNo}`,
        onSuccess: async (reference) => {
          const verifiedRef = `PAYSTACK-${reference}`
          const recNo = `RCT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`

          // 1. Add course to student program
          await schoolStore.addCourseToStudentProgram(studentIdentifier, enrollUnit.id)

          // 2. Record payment
          await schoolStore.recordPayment({
            id: `pay-paystack-${Date.now()}`,
            receipt_number: recNo,
            student_id: profile?.id || studentIdentifier,
            student_name: studentName,
            admission_number: admNo,
            amount: feeAmount,
            amount_paid: feeAmount,
            payment_method: 'Card',
            reference_code: verifiedRef,
            payment_reference: verifiedRef,
            paid_by: studentName,
            balance_after: 0,
            payment_date: new Date().toISOString().split('T')[0],
            description: `Course Enrollment Fee: ${enrollUnit.title}`,
            recorded_by: 'Paystack Automated Gateway',
          })

          // 3. Update student fee cleared
          const student = schoolStore.getStudents().find(
            (s) => s.admission_number.toLowerCase().replace(/[^a-z0-9]/g, '') === admNo.toLowerCase().replace(/[^a-z0-9]/g, '')
          )
          if (student) {
            student.fee_cleared = true
            student.fee_balance = 0
            await schoolStore.updateStudent(student.id, student)
          }

          setEnrollSuccessMsg(`🎉 Payment verified! Successfully enrolled in ${enrollUnit.title}. Your course units and lecture materials are now active.`)
          setTimeout(() => {
            setEnrollUnit(null)
            setEnrollSuccessMsg(null)
            setViewMode('my_courses')
            setVersion((v) => v + 1)
          }, 2000)
        },
        onClose: () => {
          setIsProcessingEnrollment(false)
        },
      })
    } catch (err: any) {
      alert('Enrollment error: ' + (err.message || 'Could not launch payment gateway'))
      setIsProcessingEnrollment(false)
    }
  }

  return (
    <PageWrapper
      title="My Certified Course Units & LMS"
      subtitle="Access your enrolled training course, lecture materials, and live interactive video sessions."
    >
      {/* Unit Registration Clearance Banner */}
      {registrationSlip && registeredUnits.length > 0 ? (
        <div
          className="card mb-6"
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)',
            color: '#ffffff',
            padding: '1.5rem 2rem',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#93c5fd', fontWeight: 700 }}>
                Official Clearance Slip: {registrationSlip.receipt_number}
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.25rem 0' }}>
                {registeredUnits.length} Course Unit(s) Enrolled ({registrationSlip.total_credits || registeredUnits.reduce((a, b) => a + (b.credit_hours || 0), 0)} Credits)
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0 }}>
                Training Period: <strong>{registrationSlip.course_duration || registrationSlip.semester || 'Short Course'}</strong> • Fee Status: <strong style={{ color: '#86efac' }}>{registrationSlip.fee_clearance_status}</strong>
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: '#ffffff', color: '#1e3a8a', fontWeight: 700 }}
              onClick={() => setShowSlipModal(true)}
            >
              📄 View Official Registration & Exam Slip
            </button>
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          type="button"
          className={`btn btn-sm ${viewMode === 'my_courses' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setViewMode('my_courses')}
        >
          🎓 My Enrolled Courses ({registeredUnits.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${viewMode === 'all_catalog' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setViewMode('all_catalog')}
        >
          🌐 Browse Full College Catalog ({allUnits.length})
        </button>
      </div>

      {/* List of Cleared Course Units */}
      {displayedUnits.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center', maxWidth: '640px', margin: '1rem auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
            {viewMode === 'my_courses' ? 'No Enrolled Courses Found' : 'No Catalog Courses Available'}
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', margin: '0 0 1.5rem' }}>
            {viewMode === 'my_courses'
              ? 'You do not have any enrolled courses in your current program. Browse the college catalog below to select and enroll in additional courses.'
              : 'The college course catalog is currently being updated by academic administrators.'}
          </p>
          {viewMode === 'my_courses' && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setViewMode('all_catalog')}
            >
              🌐 Browse College Course Catalog ({allUnits.length}) →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedUnits.map((unit) => {
            const isEnrolled = registeredUnits.some(
              (ru) => ru.id === unit.id || ru.code?.toLowerCase() === unit.code?.toLowerCase()
            )
            const fallbackFee = (INSTITUTION_CONFIG.pricing.defaultTuitionFee * 130) || 15000
            const feeDisplay = unit.course_fee ? `KES ${unit.course_fee.toLocaleString()}` : `KES ${fallbackFee.toLocaleString()}`

            return (
              <div
                key={unit.id}
                className="card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '16px',
                  border: isEnrolled ? '1.5px solid rgba(37, 99, 235, 0.4)' : '1px solid var(--color-border)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                }}
              >
                {/* Course Photo Banner */}
                <div style={{ position: 'relative', width: '100%', height: '140px', background: '#0f172a', overflow: 'hidden' }}>
                  <img
                    src={getCoursePhoto(unit.id, unit.department, unit.title)}
                    alt={unit.title}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(15,23,42,0.6) 0%, transparent 60%)',
                    }}
                  />
                  <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}>
                    <span className="badge badge-primary" style={{ fontWeight: 800, background: 'rgba(30, 58, 138, 0.9)', backdropFilter: 'blur(4px)', color: '#ffffff' }}>
                      {unit.code}
                    </span>
                    <span className="badge badge-info" style={{ background: 'rgba(255, 255, 255, 0.9)', color: '#0f172a', fontWeight: 700 }}>
                      {unit.credit_hours} Credits
                    </span>
                  </div>
                  <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                    {isEnrolled ? (
                      <span className="badge badge-success" style={{ fontWeight: 700, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                        ✓ Enrolled
                      </span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.95)', color: '#1d4ed8', fontWeight: 800 }}>
                        {feeDisplay}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    {isEnrolled ? (
                      <span className="badge badge-success" style={{ fontWeight: 700 }}>
                        ✓ Enrolled
                      </span>
                    ) : (
                      <a
                        href={getWhatsAppInquiryUrl(`Hello ${INSTITUTION_CONFIG.name} Accounts, I would like to make a Fees Inquiry for the unit: ${unit.title} (${unit.code}).`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="badge"
                        style={{ background: '#eff6ff', color: '#2563eb', fontWeight: 800, textDecoration: 'none' }}
                      >
                        💬 Fee Inquiry
                      </a>
                    )}
                  </div>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--color-primary)' }}>
                    {unit.title}
                  </h3>

                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                    👨‍🏫 Lecturer: <strong>{unit.teacher_name}</strong> • <strong style={{ color: 'var(--color-primary)' }}>{unit.course_duration || unit.semester || 'Short Course'}</strong>
                  </div>

                  {unit.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: '1.5', margin: '0 0 1rem' }}>
                      {unit.description}
                    </p>
                  )}

                  {/* Modules breakdown */}
                  <div style={{ background: 'var(--color-bg-secondary)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                      Curriculum Modules ({unit.syllabus_modules?.length || 0})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem' }}>
                      {unit.syllabus_modules?.slice(0, 3).map((m) => (
                        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>• {m.title}</span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>{m.hours} hrs</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                      🎥 {unit.lessons?.length || 0} Lessons & Labs
                    </span>
                    {isEnrolled ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setSelectedUnit(unit)}
                      >
                        🚀 Open Course Unit
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ background: '#16a34a', color: '#ffffff', fontWeight: 800 }}
                        onClick={() => setEnrollUnit(unit)}
                      >
                        💳 Enroll in Unit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Unit Lessons Modal */}
      {selectedUnit && (
        <div className="modal-overlay" onClick={() => setSelectedUnit(null)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="badge badge-primary">{selectedUnit.code}</span>
                <h3 className="modal-title" style={{ marginTop: '0.25rem' }}>{selectedUnit.title}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  Lecturer: {selectedUnit.teacher_name} • {selectedUnit.credit_hours} Credit Hours
                </p>
              </div>
              <button type="button" className="modal-close" onClick={() => setSelectedUnit(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                  Syllabus Learning Modules
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedUnit.syllabus_modules?.map((m) => (
                    <div key={m.id} style={{ background: 'var(--color-bg-secondary)', padding: '0.75rem 1rem', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.9rem' }}>
                        <span>Module {m.module_number}: {m.title}</span>
                        <span className="badge badge-info">{m.hours} Hours</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                        <strong>Topics:</strong> {m.topics?.join(', ') || 'Practical lab exercises'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                  Video Lessons & Materials
                </h4>
                {selectedUnit.lessons?.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>No video lessons uploaded yet for this unit.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedUnit.lessons?.map((les, idx) => (
                      <div
                        key={les.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem 1rem',
                          background: 'var(--color-bg-secondary)',
                          borderRadius: '6px',
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.9rem' }}>Lesson {idx + 1}: {les.title}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            ⏱️ Duration: {les.duration_minutes} minutes {les.video_url ? '• 🎥 Video Available' : ''}
                          </div>
                        </div>
                        {les.video_url ? (
                          <Link
                            to={`/student/lesson/${les.id}`}
                            className="btn btn-primary btn-xs"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          >
                            ▶️ Play Video in LMS
                          </Link>
                        ) : (
                          <Link
                            to={`/student/lesson/${les.id}`}
                            className="btn btn-secondary btn-xs"
                          >
                            📖 Read Notes
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedUnit(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Enrollment & Payment Checkout Modal */}
      {enrollUnit && (
        <div className="modal-overlay" onClick={() => setEnrollUnit(null)}>
          <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="badge badge-primary">{enrollUnit.code}</span>
                <h3 className="modal-title" style={{ marginTop: '0.25rem' }}>Enroll in {enrollUnit.title}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  Certified Short Course • {enrollUnit.credit_hours} Credits • {enrollUnit.course_duration || '3 Months'}
                </p>
              </div>
              <button type="button" className="modal-close" onClick={() => setEnrollUnit(null)}>✕</button>
            </div>

            <form onSubmit={handleEnrollSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {enrollSuccessMsg ? (
                  <div className="alert alert-success">
                    <span>{enrollSuccessMsg}</span>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        background: 'linear-gradient(135deg, #1e3a8a, #0f172a)',
                        color: '#ffffff',
                        padding: '1.25rem',
                        borderRadius: '10px',
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#93c5fd', fontWeight: 700 }}>
                        Tuition & Certification Fee
                      </div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0.25rem 0' }}>
                        {enrollUnit.course_fee
                          ? `KES ${enrollUnit.course_fee.toLocaleString()}`
                          : `KES ${((INSTITUTION_CONFIG.pricing.defaultTuitionFee * 130) || 15000).toLocaleString()}`}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                        Includes full video lecture access, downloadable interactive labs, lecturer support, and official certificate.
                      </div>
                    </div>

                    <div style={{ background: 'var(--color-bg-secondary)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.4rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⚡</span> Automated Online Payment via Paystack
                      </div>
                      <div style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                        Pay securely with instant activation using <strong>M-Pesa Express (STK prompt)</strong>, <strong>Debit/Credit Card (Visa & Mastercard)</strong>, or <strong>Apple Pay</strong>. No manual Paybill entry needed—your course units and interactive video lectures unlock immediately!
                      </div>
                    </div>
                  </>
                )}
              </div>

              {!enrollSuccessMsg && (
                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEnrollUnit(null)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isProcessingEnrollment}
                    style={{
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      borderColor: '#059669',
                      padding: '0.75rem 1.4rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
                    }}
                  >
                    <span>💳</span>
                    <span>{isProcessingEnrollment ? 'Opening Checkout...' : `Pay Online & Activate Now →`}</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Official Unit Registration Slip Modal */}
      {showSlipModal && registrationSlip && (
        <UnitRegistrationSlip
          receipt={registrationSlip}
          onClose={() => setShowSlipModal(false)}
        />
      )}
    </PageWrapper>
  )
}
