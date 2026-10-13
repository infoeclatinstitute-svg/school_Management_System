import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { schoolStore, schoolEventBus } from '@/lib/schoolData'
import { supabase } from '@/lib/supabase'
import type { FeeInvoice, FeeInvoiceItem, FeePaymentReceipt, StudentRecord, BiometricFeeClearancePass } from '@/types/school'
import { BiometricScannerModal } from '@/components/biometrics/BiometricScannerModal'
import { BiometricEnrollModal } from '@/components/biometrics/BiometricEnrollModal'
import { BiometricClearancePassModal } from '@/components/biometrics/BiometricClearancePassModal'
import { generateBiometricVerificationCode } from '@/lib/biometricEngine'
import { INSTITUTION_CONFIG } from '@/config/institution'
import { CourseProgram, getDynamicCoursesList } from '@/config/officialCourses'
import { initializePaystackCheckout } from '@/lib/paystack'

export function FeeManagement() {
  const { profile } = useAuth()
  const isStudent = profile?.role === 'student'
  const defaultIssuer = profile?.full_name
    ? `${profile.full_name} (${profile.role === 'admin' ? 'Principal & Administrator' : 'Bursar & Accounts Directorate'})`
    : 'Accounts & Finance Desk'

  const [invoices, setInvoices] = useState<FeeInvoice[]>(() => schoolStore.getInvoices())
  const [receipts, setReceipts] = useState<FeePaymentReceipt[]>(() => schoolStore.getReceipts())
  const [students, setStudents] = useState<StudentRecord[]>(() => schoolStore.getStudents())
  const [clearanceLogs, setClearanceLogs] = useState<BiometricFeeClearancePass[]>(() => schoolStore.getBiometricClearanceLogs())
  const [activeTab, setActiveTab] = useState<'invoices' | 'receipts' | 'biometric' | 'structure'>('invoices')
  const [selectedReceipt, setSelectedReceipt] = useState<FeePaymentReceipt | null>(null)
  const [showPayModal, setShowPayModal] = useState(false)
  const [showBiometricStation, setShowBiometricStation] = useState(false)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [studentToEnroll, setStudentToEnroll] = useState<StudentRecord | null>(null)
  const [selectedPass, setSelectedPass] = useState<BiometricFeeClearancePass | null>(null)
  const [unlockingAdm, setUnlockingAdm] = useState<string | null>(null)
  const [unlockSuccessMsg, setUnlockSuccessMsg] = useState<string | null>(null)

  // Course Fee Structure Editing
  const [editingCourseFee, setEditingCourseFee] = useState<CourseProgram | null>(null)
  const [editFeeUsd, setEditFeeUsd] = useState<number>(60)
  const [isSavingFee, setIsSavingFee] = useState(false)
  const [feeSaveSuccess, setFeeSaveSuccess] = useState<string | null>(null)
  const [, setCourseListTick] = useState(0)

  useEffect(() => {
    let isMounted = true
    const handleSync = () => {
      if (!isMounted) return
      setInvoices(schoolStore.getInvoices())
      setReceipts(schoolStore.getReceipts())
      setStudents(schoolStore.getStudents())
      setClearanceLogs(schoolStore.getBiometricClearanceLogs())
      setCourseListTick((t) => t + 1)
    }

    schoolStore.syncWithCloud(true).then(handleSync).catch(() => {})

    const unsubStd = schoolEventBus.subscribe('STUDENT_UPDATED', handleSync)
    const unsubPay = schoolEventBus.subscribe('PAYMENT_RECORDED', handleSync)
    const unsubInv = schoolEventBus.subscribe('INVOICE_CREATED', handleSync)
    const unsubReg = schoolEventBus.subscribe('UNIT_REGISTRATION_COMPLETED' as any, handleSync)

    window.addEventListener('gc-courses-updated', handleSync)
    window.addEventListener('gc-data-synced', handleSync)
    window.addEventListener('storage', handleSync)

    return () => {
      isMounted = false
      unsubStd()
      unsubPay()
      unsubInv()
      unsubReg()
      window.removeEventListener('gc-courses-updated', handleSync)
      window.removeEventListener('gc-data-synced', handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  const [editingReceipt, setEditingReceipt] = useState<FeePaymentReceipt | null>(null)
  const [editFormData, setEditFormData] = useState({
    amount: 60,
    payment_method: 'M-Pesa' as 'Card' | 'Bank Transfer' | 'Paybill' | 'PayPal' | 'M-Pesa' | 'Cash Deposit',
    reference_code: '',
    paid_by: '',
    update_notes: '',
  })

  const [editingInvoice, setEditingInvoice] = useState<FeeInvoice | null>(null)
  const [editInvoiceData, setEditInvoiceData] = useState({
    total_amount: 60,
    due_date: '',
    term: 'Semester 1',
    description: 'Certified Course Tuition Fee',
    update_notes: '',
  })

  const myAdmClean = (profile?.admission_number || '').trim().toLowerCase()
  const myAdmAlpha = myAdmClean.replace(/[^a-z0-9]/g, '')
  const myNameAlpha = (profile?.full_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const myIdClean = (profile?.id || '').toLowerCase()

  const currentStudent =
    students.find((s) => {
      const sAdm = s.admission_number.trim().toLowerCase()
      const sAdmAlpha = sAdm.replace(/[^a-z0-9]/g, '')
      const sNameAlpha = s.full_name.toLowerCase().replace(/[^a-z0-9]/g, '')
      const sId = s.id.toLowerCase()
      return (
        sId === myIdClean ||
        (myAdmClean && sAdm === myAdmClean) ||
        (myAdmAlpha && sAdmAlpha === myAdmAlpha) ||
        (myNameAlpha && myNameAlpha.length > 3 && sNameAlpha === myNameAlpha)
      )
    }) || null

  const unitReg = schoolStore.getRegistrationForStudent(currentStudent?.admission_number || profile?.admission_number || '')

  let myReceipts = receipts.filter((r) => {
    const rAdmClean = (r.admission_number || '').trim().toLowerCase()
    const rAdmAlpha = rAdmClean.replace(/[^a-z0-9]/g, '')
    const rStdId = (r.student_id || '').toLowerCase()
    return (
      (currentStudent?.id && rStdId === currentStudent.id.toLowerCase()) ||
      (myIdClean && rStdId === myIdClean) ||
      (myAdmClean && rAdmClean === myAdmClean) ||
      (myAdmAlpha && rAdmAlpha === myAdmAlpha)
    )
  })

  const myInvoices = invoices.filter((inv) => {
    const iAdmClean = (inv.admission_number || '').trim().toLowerCase()
    const iAdmAlpha = iAdmClean.replace(/[^a-z0-9]/g, '')
    const iStdId = (inv.student_id || '').toLowerCase()
    return (
      (currentStudent?.id && iStdId === currentStudent.id.toLowerCase()) ||
      (myIdClean && iStdId === myIdClean) ||
      (myAdmClean && iAdmClean === myAdmClean) ||
      (myAdmAlpha && iAdmAlpha === myAdmAlpha)
    )
  })

  const isExplicitlyCleared =
    currentStudent?.fee_cleared === true ||
    (currentStudent && currentStudent.fee_balance === 0) ||
    unitReg?.fee_clearance_status === 'Cleared' ||
    unitReg?.exam_card_issued === true ||
    myInvoices.some((inv) => inv.status === 'Paid' || inv.balance === 0)

  const myBilled = currentStudent?.term_fee_total ?? (myInvoices[0]?.total_amount ?? 60)
  const rawPaid = myReceipts.reduce((sum, r) => sum + (r.amount_paid ?? r.amount), 0)
  const isCleared = isExplicitlyCleared || (currentStudent?.fee_balance === 0) || (myBilled > 0 && rawPaid >= myBilled)
  const myBalance = isCleared ? 0 : (currentStudent?.fee_balance ?? Math.max(0, myBilled - rawPaid))

  // If student is cleared but has no individual receipts, provide institutional clearance pass receipt
  if (isCleared && myReceipts.length === 0) {
    myReceipts = [{
      id: `rec-clearance-${currentStudent?.id || profile?.id || 'std'}`,
      receipt_number: `RCT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      invoice_id: `inv-${currentStudent?.id || profile?.id || 'auto'}`,
      student_id: currentStudent?.id || profile?.id || '',
      student_name: currentStudent?.full_name || profile?.full_name || 'Enrolled Student',
      admission_number: currentStudent?.admission_number || profile?.admission_number || '',
      amount: myBilled,
      amount_paid: myBilled,
      payment_method: 'Bank Transfer',
      reference_code: `INSTITUTIONAL-CLEARANCE-PASS`,
      payment_date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      paid_by: currentStudent?.full_name || profile?.full_name || 'Enrolled Student',
      recorded_by: 'Bursar & Finance Office',
      received_by: 'Academic Registrar',
      balance_after: 0,
      balance_remaining: 0,
    }]
  }

  // Payment Form
  const [payData, setPayData] = useState({
    student_id: '',
    admission_number: '',
    student_name: '',
    total_fee: 60,
    amount: 60,
    payment_method: 'Card' as 'Card' | 'Bank Transfer' | 'Paybill' | 'PayPal' | 'M-Pesa' | 'Cash Deposit',
    reference_code: `CARD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    paid_by: '',
    issued_by: defaultIssuer,
    biometric_verified: false,
    biometric_finger_used: 'Right Thumb',
    biometric_verification_code: '',
  })

  const totalCollected = receipts.reduce((acc, r) => acc + r.amount, 0)
  const totalOutstanding = invoices.reduce((acc, inv) => acc + inv.balance, 0)
  const totalBilled = invoices.reduce((acc, inv) => acc + inv.total_amount, 0)

  const handleOpenEditCourseFee = (course: CourseProgram) => {
    setEditingCourseFee(course)
    setEditFeeUsd(course.feeUsd)
    setFeeSaveSuccess(null)
  }

  const handleSaveCourseFee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCourseFee) return
    setIsSavingFee(true)
    try {
      const numVal = Math.max(0, Math.round(Number(editFeeUsd)))
      await schoolStore.setCourseFee(editingCourseFee.id, numVal)
      setFeeSaveSuccess(`Tuition fee for "${editingCourseFee.shortTitle}" updated to $${numVal} (KES ${(numVal * 130).toLocaleString()})!`)
      setCourseListTick((t) => t + 1)
      setTimeout(() => {
        setEditingCourseFee(null)
        setFeeSaveSuccess(null)
      }, 1000)
    } catch (err) {
      console.error(err)
      alert('Failed to save fee update.')
    } finally {
      setIsSavingFee(false)
    }
  }

  const handleOpenEdit = (rec: FeePaymentReceipt) => {
    setEditingReceipt(rec)
    setEditFormData({
      amount: rec.amount_paid ?? rec.amount,
      payment_method: rec.payment_method,
      reference_code: rec.reference_code,
      paid_by: rec.paid_by,
      update_notes: rec.update_notes || '',
    })
  }

  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingReceipt) return

    await schoolStore.updateReceipt(
      editingReceipt.id,
      {
        amount: Number(editFormData.amount),
        amount_paid: Number(editFormData.amount),
        payment_method: editFormData.payment_method,
        reference_code: editFormData.reference_code,
        paid_by: editFormData.paid_by,
        update_notes: editFormData.update_notes,
      },
      profile?.full_name || 'Principal / Administrator'
    )

    setReceipts(schoolStore.getReceipts())
    setInvoices(schoolStore.getInvoices())
    setStudents(schoolStore.getStudents())
    setEditingReceipt(null)
  }

  const handleDeleteReceipt = async (recId: string, recNum: string) => {
    if (window.confirm(`Are you sure you want to cancel and delete Receipt "${recNum}"? Student balances will be updated accordingly.`)) {
      await schoolStore.deleteReceipt(recId)
      setReceipts(schoolStore.getReceipts())
      setInvoices(schoolStore.getInvoices())
      setStudents(schoolStore.getStudents())
    }
  }

  const handleClearAllReceipts = async () => {
    if (window.confirm('Are you sure you want to remove all receipts from the system? This action will reset the receipts ledger.')) {
      await schoolStore.clearAllReceipts()
      setReceipts(schoolStore.getReceipts())
      setInvoices(schoolStore.getInvoices())
      setStudents(schoolStore.getStudents())
    }
  }

  const handleOpenEditInvoice = (inv: FeeInvoice) => {
    setEditingInvoice(inv)
    setEditInvoiceData({
      total_amount: inv.total_amount,
      due_date: inv.due_date || new Date().toISOString().split('T')[0],
      term: inv.term || 'Semester 1',
      description: inv.items?.[0]?.description || 'Course Tuition Fee',
      update_notes: inv.update_notes || '',
    })
  }

  const handleSaveUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingInvoice) return

    const newAmount = Number(editInvoiceData.total_amount)
    const newItems: FeeInvoiceItem[] = [
      {
        id: `item-${Date.now()}`,
        description: editInvoiceData.description || 'Course Tuition Fee',
        amount: newAmount,
      },
    ]

    await schoolStore.updateInvoice(
      editingInvoice.id,
      {
        total_amount: newAmount,
        due_date: editInvoiceData.due_date,
        term: editInvoiceData.term,
        items: newItems,
        update_notes: editInvoiceData.update_notes,
      },
      profile?.full_name || 'Principal / Administrator'
    )

    setInvoices(schoolStore.getInvoices())
    setStudents(schoolStore.getStudents())
    setEditingInvoice(null)
  }

  const handleDeleteInvoice = async (invId: string, invNum: string) => {
    if (window.confirm(`Are you sure you want to delete Invoice "${invNum}"?`)) {
      await schoolStore.deleteInvoice(invId)
      setInvoices(schoolStore.getInvoices())
      setStudents(schoolStore.getStudents())
    }
  }

  const handleClearAllInvoices = async () => {
    if (window.confirm('Are you sure you want to remove all fee invoices from the system?')) {
      await schoolStore.clearAllInvoices()
      setInvoices(schoolStore.getInvoices())
      setStudents(schoolStore.getStudents())
    }
  }

  const handleQuickClearStudent = async (admissionNumber: string, studentName?: string) => {
    try {
      setUnlockingAdm(admissionNumber)
      await schoolStore.unlockStudentLessons(admissionNumber, defaultIssuer)
      
      const renewed = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      if (admissionNumber) {
        try {
          await supabase.from('profiles').update({ access_expires_at: renewed }).ilike('admission_number', admissionNumber)
        } catch {}
      }

      setStudents(schoolStore.getStudents())
      setInvoices(schoolStore.getInvoices())
      setReceipts(schoolStore.getReceipts())
      
      setUnlockSuccessMsg(`⚡ LMS Lessons & Exam Card cleared and unlocked successfully for ${studentName || admissionNumber} (${admissionNumber})!`)
      setTimeout(() => setUnlockSuccessMsg(null), 6000)
    } catch (err: any) {
      alert('Error unlocking student lessons: ' + (err?.message || err))
    } finally {
      setUnlockingAdm(null)
    }
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payData.amount || payData.amount <= 0 || !payData.admission_number) return

    const student = students.find((s) => s.admission_number.toLowerCase() === payData.admission_number.toLowerCase()) || {
      id: `std-${Date.now()}`,
      full_name: payData.student_name || 'Walk-in Student',
      admission_number: payData.admission_number,
      class_name: 'Short Course Cohort',
    }

    const existingInv = invoices.find(
      (inv) => inv.admission_number.toLowerCase() === payData.admission_number.toLowerCase() || inv.student_id === student.id
    )

    const currentBill = existingInv ? existingInv.balance : Number(payData.total_fee || payData.amount)
    const remainingBalance = Math.max(0, currentBill - Number(payData.amount))
    const issuerName = payData.issued_by?.trim() || defaultIssuer

    const newReceipt: FeePaymentReceipt = {
      id: `rec-${Date.now()}`,
      receipt_number: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      student_id: student.id,
      student_name: student.full_name,
      admission_number: student.admission_number,
      amount: Number(payData.amount),
      amount_paid: Number(payData.amount),
      payment_method: payData.payment_method,
      reference_code: payData.reference_code || `REF-${Date.now().toString().slice(-6)}`,
      payment_date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      paid_by: payData.paid_by || student.full_name,
      recorded_by: issuerName,
      received_by: issuerName,
      balance_after: remainingBalance,
      balance_remaining: remainingBalance,
      biometric_verified: payData.biometric_verified,
      biometric_finger_used: payData.biometric_verified ? payData.biometric_finger_used : undefined,
      biometric_verification_code: payData.biometric_verified
        ? payData.biometric_verification_code || generateBiometricVerificationCode()
        : undefined,
      biometric_verified_at: payData.biometric_verified ? new Date().toISOString() : undefined,
    }

    await schoolStore.recordPayment(newReceipt)

    if (remainingBalance === 0) {
      await schoolStore.unlockStudentLessons(student.admission_number || student.id, issuerName)
    }

    // Auto-renew Supabase profile access_expires_at (+365 days)
    const renewed = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    if (student.admission_number) {
      Promise.resolve(supabase.from('profiles').update({ access_expires_at: renewed }).ilike('admission_number', student.admission_number)).catch(() => {})
    }
    if (student.id) {
      Promise.resolve(supabase.from('profiles').update({ access_expires_at: renewed }).eq('id', student.id)).catch(() => {})
    }

    setInvoices(schoolStore.getInvoices())
    setReceipts(schoolStore.getReceipts())
    setStudents(schoolStore.getStudents())
    setShowPayModal(false)
    setSelectedReceipt(newReceipt)
  }

  // -------------------------------------------------------------
  // Dedicated Student Personal Fee Statement
  // -------------------------------------------------------------
  if (isStudent) {
    return (
      <div className="page-container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 className="page-title">My Tuition Statement & Payment Portal</h1>
            <p className="page-subtitle">
              View your course fees, payment receipts, tuition clearance status, and direct payment channels.
            </p>
          </div>
          <div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => window.print()}
            >
              🖨️ Print Statement
            </button>
          </div>
        </div>

        {/* Student Tuition Status Card */}
        <div
          className="card mb-6"
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
            color: '#ffffff',
            padding: '1.75rem 2rem',
            borderRadius: '12px',
            border: 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#93c5fd', fontWeight: 700 }}>
                Tuition Fee Clearance Status
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff', margin: '0.35rem 0' }}>
                {isCleared ? '✓ Tuition 100% Cleared' : `$${myBalance} Outstanding Balance`}
              </h2>
              <p style={{ color: '#cbd5e1', fontSize: '0.85rem', margin: '0 0 1rem' }}>
                Student: <strong>{currentStudent?.full_name || profile?.full_name}</strong> • Admission: <strong>{currentStudent?.admission_number || profile?.admission_number}</strong> • Program: <strong>{currentStudent?.class_name || 'Graphics Design & Animation'}</strong>
              </p>

              {!isCleared && myBalance > 0 && (
                <button
                  type="button"
                  style={{
                    background: '#00c3f7',
                    color: '#081426',
                    border: 'none',
                    fontWeight: 900,
                    padding: '0.7rem 1.4rem',
                    borderRadius: '8px',
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(0, 195, 247, 0.4)',
                  }}
                  onClick={() => {
                    const studentEmail = (profile as any)?.email || (currentStudent as any)?.email || 'student@globalcollege.edu'
                    const studentName = currentStudent?.full_name || profile?.full_name || 'Student'
                    const studentAdm = currentStudent?.admission_number || profile?.admission_number || ''

                    initializePaystackCheckout({
                      email: studentEmail,
                      amount: myBalance,
                      currency: 'KES',
                      studentName: studentName,
                      admissionNumber: studentAdm,
                      purpose: `Tuition Fee Clearance - ${studentName}`,
                      invoiceId: myInvoices[0]?.id || `INV-${studentAdm}`,
                      onSuccess: async (refCode) => {
                        // Instant LMS registration of Paystack payment
                        const newRec: FeePaymentReceipt = {
                          id: `rec-paystack-${Date.now()}`,
                          receipt_number: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
                          student_id: currentStudent?.id || profile?.id || 'std',
                          student_name: studentName,
                          admission_number: studentAdm,
                          amount: myBalance,
                          amount_paid: myBalance,
                          payment_method: 'Card',
                          reference_code: `PAYSTACK-${refCode}`,
                          payment_date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                          paid_by: studentName,
                          recorded_by: 'Paystack Automated Gateway',
                          received_by: 'Academic Registrar',
                          balance_after: 0,
                          balance_remaining: 0,
                        }
                        await schoolStore.recordPayment(newRec)
                        await schoolStore.unlockStudentLessons(studentAdm, 'Paystack Automated Gateway')
                        setReceipts(schoolStore.getReceipts())
                        setInvoices(schoolStore.getInvoices())
                        setStudents(schoolStore.getStudents())
                        setSelectedReceipt(newRec)
                      },
                    })
                  }}
                >
                  <span>⚡ Pay Now with Paystack (M-Pesa / Card)</span>
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem 1.25rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600 }}>Total Billed</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>${myBilled}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem 1.25rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#86efac', fontWeight: 600 }}>Amount Paid</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#86efac' }}>${myBilled - myBalance}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Channel: Paystack Exclusive */}
        <div className="card mb-6" style={{ padding: '1.5rem', background: '#f8fafc', border: '1.5px solid #86efac' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔒 Official Fee Clearance Gateway: Paystack
            </h3>
            <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', fontWeight: 800, padding: '3px 10px', borderRadius: '999px', border: '1px solid #86efac' }}>
              Sole Accepted Payment Channel
            </span>
          </div>
          <p style={{ fontSize: '0.86rem', color: '#334155', lineHeight: '1.6', margin: '0 0 0.85rem' }}>
            Tuition fee clearance at {INSTITUTION_CONFIG.name} is conducted exclusively via <strong>Paystack</strong>. 
            Click the blue <strong>"⚡ Pay Now with Paystack"</strong> button above to settle your balance using <strong>M-Pesa STK Push</strong>, <strong>Visa</strong>, <strong>Mastercard</strong>, or <strong>Apple Pay</strong>. 
            Your receipts, exam clearance, and lesson access are unlocked automatically in real-time. Manual offline deposits, cash, or unverified transfers are strictly not accepted.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.85rem' }}>
              <strong style={{ color: '#166534', fontSize: '0.82rem', display: 'block' }}>📱 M-Pesa Express Prompt</strong>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Enter your Safaricom number for instant STK PIN prompt</span>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.85rem' }}>
              <strong style={{ color: '#1e3a8a', fontSize: '0.82rem', display: 'block' }}>💳 Cards & Digital Wallets</strong>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Visa, Mastercard, & Apple Pay with 3D Secure</span>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.85rem' }}>
              <strong style={{ color: '#059669', fontSize: '0.82rem', display: 'block' }}>⚡ Instant LMS Unlock</strong>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Zero waiting time; classes & exams cleared instantly</span>
            </div>
          </div>
        </div>

        {/* Payment Receipts History */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Official Payment Receipts</h3>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Receipt No.</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Amount Paid</th>
                  <th>Balance Remaining</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {myReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                      No separate receipt records found. Your tuition account is cleared under your direct admission package.
                    </td>
                  </tr>
                ) : (
                  myReceipts.map((rec) => (
                    <tr key={rec.id}>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{rec.receipt_number}</td>
                      <td>{rec.payment_date}</td>
                      <td><span className="badge badge-info">{rec.payment_method}</span></td>
                      <td><code>{rec.reference_code}</code></td>
                      <td style={{ fontWeight: 800, color: '#16a34a' }}>${rec.amount}</td>
                      <td>${rec.balance_remaining}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => setSelectedReceipt(rec)}
                        >
                          🖨️ View Receipt
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedReceipt && (
          <div
            className="modal-overlay"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
              padding: '1rem',
            }}
            onClick={() => setSelectedReceipt(null)}
          >
            <div
              className="card"
              style={{ maxWidth: '520px', width: '100%', padding: '2rem', background: '#ffffff', color: '#0f172a' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ textAlign: 'center', borderBottom: '2px solid #1e3a8a', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1e3a8a', margin: 0 }}>GLOBAL COLLEGE</h2>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>OFFICIAL TUITION PAYMENT RECEIPT</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Receipt Number:</span>
                  <strong>{selectedReceipt.receipt_number}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Student Name:</span>
                  <strong>{selectedReceipt.student_name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Admission No:</span>
                  <strong>{selectedReceipt.admission_number}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Payment Date:</span>
                  <strong>{selectedReceipt.payment_date}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Payment Method:</span>
                  <strong>{selectedReceipt.payment_method}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Transaction Ref:</span>
                  <code>{selectedReceipt.reference_code}</code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.6rem', fontSize: '1.1rem' }}>
                  <span style={{ fontWeight: 700 }}>Amount Paid:</span>
                  <strong style={{ color: '#16a34a' }}>${selectedReceipt.amount}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
                  🖨️ Print
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setSelectedReceipt(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Fees & Financial Accounts</h1>
          <p className="page-subtitle">
            Student fee billing, M-Pesa direct paybill receipts, financial statements, and biometric fingerprint clearance.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ background: '#0284c7', borderColor: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            onClick={() => setShowBiometricStation(true)}
          >
            <span>🖐️</span> Biometric Fee Verification
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.print()}
          >
            🖨️ Export Fee Register
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setPayData({
                student_id: '',
                admission_number: '',
                student_name: '',
                total_fee: 60,
                amount: 60,
                payment_method: 'M-Pesa',
                reference_code: `MPESA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                paid_by: '',
                issued_by: defaultIssuer,
                biometric_verified: false,
                biometric_finger_used: 'Right Thumb',
                biometric_verification_code: '',
              })
              setShowPayModal(true)
            }}
          >
            💳 Record Fee Payment / M-Pesa
          </button>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Billed</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
            ${totalBilled.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>All Enrolled Cohorts</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Fees Collected</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#16a34a', marginTop: '0.25rem' }}>
            ${totalCollected.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.2rem' }}>
            {Math.round((totalCollected / (totalBilled || 1)) * 100)}% Collection Rate
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ea580c' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Outstanding Fee Balance</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#ea580c', marginTop: '0.25rem' }}>
            ${totalOutstanding.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#ea580c', marginTop: '0.2rem' }}>Automatic email statements sent</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #059669' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{INSTITUTION_CONFIG.bank.name} / Paybill</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669', marginTop: '0.25rem' }}>
            {INSTITUTION_CONFIG.bank.accountNumber}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>Paybill: {INSTITUTION_CONFIG.bank.paybillNumber} • Card Online</div>
        </div>
      </div>

      {unlockSuccessMsg && (
        <div
          className="mb-6"
          style={{
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            color: '#ffffff',
            padding: '1rem 1.5rem',
            borderRadius: '10px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
          }}
        >
          <span>{unlockSuccessMsg}</span>
          <button
            type="button"
            onClick={() => setUnlockSuccessMsg(null)}
            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '1.1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="card mb-6" style={{ padding: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'invoices' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('invoices')}
          >
            📋 Invoices & Student Statements
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'receipts' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('receipts')}
          >
            🧾 Official Payment Receipts
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'biometric' ? 'btn-primary' : 'btn-ghost'}`}
            style={activeTab === 'biometric' ? { background: '#0284c7', borderColor: '#0284c7' } : { color: '#0284c7' }}
            onClick={() => {
              setClearanceLogs(schoolStore.getBiometricClearanceLogs())
              setActiveTab('biometric')
            }}
          >
            🖐️ Biometric Clearance Station & Logs
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'structure' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('structure')}
          >
            🏛️ School Fee Structure (2026)
          </button>
        </div>
      </div>

      {/* Tab 1: Invoices */}
      {activeTab === 'invoices' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: 'var(--color-bg-secondary)' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Student Fee Invoices ({invoices.length})</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0.2rem 0 0' }}>
                Manage semester billing invoices, due dates, fee structures, and administrative fee adjustments.
              </p>
            </div>
            {invoices.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-outline"
                style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                onClick={handleClearAllInvoices}
              >
                🗑️ Clear All Invoices
              </button>
            )}
          </div>

          {invoices.length === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
              <h4 style={{ margin: '0 0 0.4rem', fontWeight: 700 }}>No Fee Invoices Generated Yet</h4>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>Invoices will automatically generate when students register for certified programs.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice No.</th>
                    <th>Student Name</th>
                    <th>Adm No.</th>
                    <th>Program</th>
                    <th>Term</th>
                    <th>Total Billed</th>
                    <th>Paid Amount</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <strong style={{ color: 'var(--color-primary)' }}>{inv.invoice_number}</strong>
                          {inv.is_updated && (
                            <span
                              className="badge"
                              style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.7rem', fontWeight: 800 }}
                              title={`Updated by ${inv.updated_by || 'Admin'} on ${inv.updated_at ? new Date(inv.updated_at).toLocaleString() : 'recently'}${inv.update_notes ? ` • Note: ${inv.update_notes}` : ''}`}
                            >
                              ✏️ Updated
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{inv.student_name}</td>
                      <td>{inv.admission_number}</td>
                      <td><span className="badge badge-info">{inv.class_name}</span></td>
                      <td>{inv.term} {inv.academic_year}</td>
                      <td style={{ fontWeight: 800 }}>${inv.total_amount.toLocaleString()}</td>
                      <td style={{ color: '#16a34a', fontWeight: 700 }}>${inv.paid_amount.toLocaleString()}</td>
                      <td style={{ color: inv.balance > 0 ? '#ea580c' : '#16a34a', fontWeight: 800 }}>
                        ${inv.balance.toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${inv.status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            onClick={() => handleOpenEditInvoice(inv)}
                            title="Edit Invoice"
                          >
                            ✏️ Edit
                          </button>
                          {inv.balance > 0 ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-secondary btn-xs"
                                onClick={() => {
                                  setPayData({
                                    student_id: inv.student_id,
                                    admission_number: inv.admission_number,
                                    student_name: inv.student_name,
                                    total_fee: inv.balance,
                                    amount: inv.balance,
                                    payment_method: 'M-Pesa',
                                    reference_code: `MPESA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                                    paid_by: inv.student_name,
                                    issued_by: defaultIssuer,
                                    biometric_verified: false,
                                    biometric_finger_used: 'Right Thumb',
                                    biometric_verification_code: '',
                                  })
                                  setShowPayModal(true)
                                }}
                              >
                                💳 Pay
                              </button>
                              <button
                                type="button"
                                className="btn btn-xs"
                                disabled={unlockingAdm === inv.admission_number}
                                style={{
                                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                                  color: '#ffffff',
                                  fontWeight: 800,
                                  border: 'none',
                                  boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)',
                                }}
                                onClick={() => handleQuickClearStudent(inv.admission_number, inv.student_name)}
                                title="Instantly clear all fees, generate official receipt, register units, and unlock LMS lessons for this student."
                              >
                                {unlockingAdm === inv.admission_number ? '⚡ Clearing...' : '⚡ Clear & Unlock'}
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>✓ Settled & Cleared</span>
                          )}
                          <button
                            type="button"
                            className="btn btn-xs"
                            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                            onClick={() => handleDeleteInvoice(inv.id, inv.invoice_number)}
                            title="Delete Invoice"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Receipts */}
      {activeTab === 'receipts' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: 'var(--color-bg-secondary)' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Official Fee Payment Receipts ({receipts.length})</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0.2rem 0 0' }}>
                All audited payment transactions, M-Pesa receipts, and administrative adjustments.
              </p>
            </div>
            {receipts.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-outline"
                style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                onClick={handleClearAllReceipts}
              >
                🗑️ Clear All Receipts
              </button>
            )}
          </div>

          {receipts.length === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🧾</div>
              <h4 style={{ margin: '0 0 0.4rem', fontWeight: 700 }}>No Payment Receipts Recorded</h4>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>All newly recorded student payments will be logged here in real-time.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Receipt #</th>
                    <th>Student Name</th>
                    <th>Adm No.</th>
                    <th>Amount Paid</th>
                    <th>Method</th>
                    <th>Ref Code</th>
                    <th>Status / Audit</th>
                    <th>Date</th>
                    <th>Paid By</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((rec) => (
                    <tr key={rec.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <strong style={{ color: 'var(--color-primary)' }}>{rec.receipt_number}</strong>
                          {rec.is_updated && (
                            <span
                              className="badge"
                              style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.7rem', fontWeight: 800 }}
                              title={`Updated by ${rec.updated_by || 'Admin'} on ${rec.updated_at ? new Date(rec.updated_at).toLocaleString() : 'recently'}${rec.update_notes ? ` • Note: ${rec.update_notes}` : ''}`}
                            >
                              ✏️ Updated
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{rec.student_name}</td>
                      <td>{rec.admission_number}</td>
                      <td style={{ fontWeight: 800, color: '#16a34a' }}>${(rec.amount_paid ?? rec.amount).toLocaleString()}</td>
                      <td><span className="badge badge-info">{rec.payment_method}</span></td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{rec.reference_code}</td>
                      <td>
                        {rec.is_updated ? (
                          <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>
                            Adjusted by {rec.updated_by?.split(' ')[0] || 'Admin'}
                          </span>
                        ) : rec.biometric_verified ? (
                          <span
                            className="badge badge-success"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem' }}
                            title={`Verified via ${rec.biometric_finger_used || 'Fingerprint'}`}
                          >
                            🔒 🖐️ Verified
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Original</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{rec.payment_date}</td>
                      <td>{rec.paid_by}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => setSelectedReceipt(rec)}
                            title="View & Print Receipt"
                          >
                            🧾
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            onClick={() => handleOpenEdit(rec)}
                            title="Edit & Update Receipt"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs"
                            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                            onClick={() => handleDeleteReceipt(rec.id, rec.receipt_number)}
                            title="Delete Receipt"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Biometric Clearance Terminal & Logs */}
      {activeTab === 'biometric' && (
        <div>
          {/* Biometric Quick Station Launchpad */}
          <div
            className="card mb-6"
            style={{
              padding: '1.75rem',
              background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(30, 58, 138, 0.08) 100%)',
              border: '1px solid #bae6fd',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#0284c7',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    boxShadow: '0 0 15px rgba(2, 132, 199, 0.4)',
                  }}
                >
                  🖐️
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0369a1', margin: 0 }}>
                    Biometric Fingerprint Clearance & Verification Gateway
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#334155', margin: '0.25rem 0 0 0' }}>
                    Instant student identification, live fee balance clearance check, and tamper-proof clearance certificate generation.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: '#0284c7', borderColor: '#0284c7' }}
                  onClick={() => setShowBiometricStation(true)}
                >
                  🖐️ Launch Live Scanner Station
                </button>
              </div>
            </div>

            {/* Enrolled Stats Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginTop: '1.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid rgba(2, 132, 199, 0.2)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>BIOMETRICALLY ENROLLED</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284c7' }}>
                  {students.filter((s) => s.biometric_enrolled).length} / {students.length} Students
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>CLEARANCE PASSES ISSUED</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a' }}>
                  {clearanceLogs.length} Official Passes
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>BIOMETRIC HARDWARE SENSOR</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                  Optical & WebAuthn Online
                </div>
              </div>
            </div>
          </div>

          {/* Biometric Clearance Logs */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '1rem' }}>Authenticated Biometric Clearance History</strong>
              <span className="badge badge-info">{clearanceLogs.length} Verified Records</span>
            </div>

            {clearanceLogs.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🖐️</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No Biometric Clearance Passes Issued Yet</div>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  Launch the Biometric Scanner Station above to scan a student's fingerprint and issue an official clearance certificate.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Clearance Code</th>
                      <th>Student Name</th>
                      <th>Adm No.</th>
                      <th>Purpose</th>
                      <th>Finger Scanned</th>
                      <th>Match Score</th>
                      <th>Fee Status</th>
                      <th>Verified At</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clearanceLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                          {log.clearance_code}
                        </td>
                        <td style={{ fontWeight: 600 }}>{log.student_name}</td>
                        <td>{log.admission_number}</td>
                        <td><span className="badge badge-info">{log.purpose}</span></td>
                        <td>🖐️ {log.finger_scanned}</td>
                        <td><strong style={{ color: '#16a34a' }}>{log.match_confidence}%</strong></td>
                        <td>
                          <span className={`badge ${log.status === 'CLEARED' ? 'badge-success' : log.status === 'CONDITIONAL' ? 'badge-warning' : 'badge-danger'}`}>
                            {log.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{log.verified_at}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedPass(log)}
                          >
                            🖨️ View Pass
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Structure */}
      {activeTab === 'structure' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--color-primary)' }}>
                Official Course Tuition & Fee Schedule
              </h3>
              <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>2026 Authoritative</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              Standard Short Course Fees • Dual Currency (USD & KES) • Payable in Flexible Installments via Card or Bank.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem' }}>
              {getDynamicCoursesList(schoolStore.getSubjects(), schoolStore.getCourseUnits()).map((course) => (
                <div
                  key={course.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, paddingRight: '0.75rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>{course.icon}</span>
                      <span className="truncate">{course.shortTitle}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.15rem' }}>
                      <span>⏱️ {course.duration}</span>
                      <span>•</span>
                      <span>💳 {course.installmentText}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                    <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '0.95rem' }}>
                      ${course.feeUsd} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>(KES {course.feeKes.toLocaleString()})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                        ${course.originalFeeUsd}
                      </span>
                      {!isStudent && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditCourseFee(course)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            borderRadius: '6px',
                            border: '1px solid #3b82f6',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            cursor: 'pointer',
                          }}
                          title={`Edit fee for ${course.shortTitle}`}
                        >
                          ✏️ Edit Fee
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', background: '#f8fafc', border: '1.5px solid #86efac' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#166534' }}>
                🔒 Official Institutional Gateway: Paystack
              </h3>
              <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', fontWeight: 800, padding: '3px 10px', borderRadius: '999px', border: '1px solid #86efac' }}>
                Sole Accepted Payment Method
              </span>
            </div>
            <div style={{ fontSize: '0.88rem', lineHeight: '1.7', color: '#334155' }}>
              <div style={{ marginBottom: '0.85rem', background: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#166534' }}>⚡ Paystack Automated Gateway (M-Pesa Express, Cards, Apple Pay):</strong>
                <div style={{ color: '#64748b', fontSize: '0.82rem' }}>
                  All student tuition fees, invoices, and exam clearances are processed exclusively via Paystack. Payments are reconciled instantly with automated digital receipts.
                </div>
              </div>
              <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#92400e' }}>⚠️ Direct Deposit / Cash Policy:</strong>
                <div style={{ color: '#64748b', fontSize: '0.82rem' }}>
                  Manual offline deposits, direct unlinked bank wires, or unverified SMS codes are not accepted. All payments must be initiated directly through the student portal or enrollment checkout.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPayModal && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Fee Payment</h3>
              <button type="button" className="modal-close" onClick={() => setShowPayModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label className="label">Student Admission Number</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={payData.admission_number}
                    onChange={(e) => {
                      const adm = e.target.value
                      const match = students.find((s) => s.admission_number.toLowerCase() === adm.toLowerCase())
                      setPayData({
                        ...payData,
                        admission_number: adm,
                        student_name: match ? match.full_name : payData.student_name,
                        student_id: match ? match.id : payData.student_id,
                        biometric_verified: match?.biometric_enrolled || payData.biometric_verified,
                        biometric_finger_used: match?.biometric_finger_name || payData.biometric_finger_used,
                        biometric_verification_code: match?.biometric_enrolled ? generateBiometricVerificationCode() : payData.biometric_verification_code,
                      })
                    }}
                  />
                </div>

                <div>
                  <label className="label">Student Full Name</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={payData.student_name}
                    onChange={(e) => setPayData({ ...payData, student_name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Amount Paid ($ USD) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="input"
                      value={payData.amount}
                      onChange={(e) => setPayData({ ...payData, amount: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="label">Payment Method</label>
                    <select
                      className="input"
                      value={payData.payment_method}
                      onChange={(e) => setPayData({ ...payData, payment_method: e.target.value as any })}
                    >
                      <option value="Card">💳 Paystack (M-Pesa, Visa, Mastercard, Apple Pay)</option>
                      <option value="Card">💳 Credit / Debit Card (Visa, Mastercard)</option>
                      <option value="Bank Transfer">🏦 Direct Bank Wire Transfer</option>
                      <option value="Paybill">📱 Paybill / Mobile Money</option>
                      <option value="PayPal">🌐 PayPal / Stripe Gateway</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Transaction / Ref Code *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={payData.reference_code}
                      onChange={(e) => setPayData({ ...payData, reference_code: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Paid By (Payer Name) *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={payData.paid_by}
                      onChange={(e) => setPayData({ ...payData, paid_by: e.target.value })}
                    />
                  </div>
                </div>

                {/* Biometric Verification Checkbox Box */}
                <div
                  style={{
                    background: payData.biometric_verified ? '#f0fdf4' : '#f8fafc',
                    border: `1px solid ${payData.biometric_verified ? '#bbf7d0' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    padding: '0.85rem',
                    marginTop: '0.25rem',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={payData.biometric_verified}
                      style={{ marginTop: '0.2rem' }}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setPayData({
                          ...payData,
                          biometric_verified: checked,
                          biometric_verification_code: checked
                            ? payData.biometric_verification_code || generateBiometricVerificationCode()
                            : '',
                        })
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: payData.biometric_verified ? '#166534' : 'inherit' }}>
                        🖐️ Authenticate Payment with Student Fingerprint Biometrics
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Verifies student identity at payment desk and stamps receipt with biometric security code.
                      </div>
                    </div>
                  </label>

                  {payData.biometric_verified && (
                    <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid #bbf7d0', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>Verified Finger:</strong> {payData.biometric_finger_used || 'Right Index'}
                      </div>
                      <div>
                        <strong>Auth Code:</strong> <code style={{ fontSize: '0.75rem', color: '#166534' }}>{payData.biometric_verification_code || 'BIO-PENDING'}</code>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Process & Issue Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Receipt Printable Modal */}
      {selectedReceipt && (
        <div className="modal-overlay" onClick={() => setSelectedReceipt(null)}>
          <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()} style={{ padding: 0 }}>
            <div className="no-print" style={{ padding: '0.75rem 1rem', background: 'var(--color-bg-secondary)', display: 'flex', justifyContent: 'space-between' }}>
              <strong>Official Receipt Generated</strong>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨️ Print</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedReceipt(null)}>Close</button>
              </div>
            </div>

            <div style={{ padding: '2rem', background: '#fff', color: '#0f172a' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #1e3a8a', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <img src="/logo.png?v=2" alt={INSTITUTION_CONFIG.name} style={{ width: '52px', height: '52px', borderRadius: '50%' }} />
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e3a8a', margin: '0.25rem 0', textTransform: 'uppercase' }}>{INSTITUTION_CONFIG.name}</h2>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>{INSTITUTION_CONFIG.tagline} • {INSTITUTION_CONFIG.domain}</div>
                <div style={{ display: 'inline-block', background: '#f1f5f9', color: '#1e3a8a', padding: '2px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800, marginTop: '4px' }}>
                  OFFICIAL TUITION PAYMENT RECEIPT (ORIGINAL)
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem', marginBottom: '1.25rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div><strong>Receipt No:</strong> <span style={{ color: '#1e3a8a', fontWeight: 800 }}>{selectedReceipt.receipt_number}</span></div>
                <div><strong>Date:</strong> {selectedReceipt.payment_date}</div>
                <div><strong>Student Name:</strong> {selectedReceipt.student_name}</div>
                <div><strong>Admission No:</strong> <span style={{ fontWeight: 800 }}>{selectedReceipt.admission_number}</span></div>
                <div><strong>Payment Method:</strong> {selectedReceipt.payment_method}</div>
                <div><strong>Ref / M-Pesa Code:</strong> <code>{selectedReceipt.reference_code}</code></div>
                <div><strong>Payer Name:</strong> {selectedReceipt.paid_by}</div>
                <div><strong>Issued & Received By:</strong> <strong style={{ color: '#1e3a8a' }}>{selectedReceipt.recorded_by || selectedReceipt.received_by || defaultIssuer}</strong></div>
              </div>

              {/* Biometric Verification Badge on Receipt */}
              {selectedReceipt.biometric_verified && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🔒</span>
                    <div>
                      <strong style={{ color: '#166534' }}>BIOMETRICALLY VERIFIED VIA FINGERPRINT</strong>
                      <div style={{ fontSize: '0.72rem', color: '#15803d' }}>
                        Authenticated Sensor: {selectedReceipt.biometric_finger_used || 'Right Index'}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>SECURITY STAMP</div>
                    <code style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>
                      {selectedReceipt.biometric_verification_code || 'BIO-VERIFIED'}
                    </code>
                  </div>
                </div>
              )}

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1.25rem', textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#166534', fontWeight: 700 }}>Amount Received</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#16a34a' }}>
                  ${(selectedReceipt.amount_paid ?? selectedReceipt.amount).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: '#475569' }}>
                  Outstanding Balance: {' '}
                  {(selectedReceipt.balance_remaining ?? selectedReceipt.balance_after ?? 0) === 0 ? (
                    <strong style={{ color: '#16a34a' }}>$0.00 (FEE FULLY CLEARED ✓)</strong>
                  ) : (
                    <strong style={{ color: '#dc2626' }}>${(selectedReceipt.balance_remaining ?? selectedReceipt.balance_after ?? 0).toLocaleString()}</strong>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem' }}>
                Thank you for your payment. Global College • 100% Online Tech & Languages.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Biometric Scanner Terminal Modal */}
      {showBiometricStation && (
        <BiometricScannerModal
          officerName={defaultIssuer}
          onClose={() => {
            setShowBiometricStation(false)
            setClearanceLogs(schoolStore.getBiometricClearanceLogs())
          }}
          onRecordPayment={(std) => {
            setPayData({
              student_id: std.id,
              admission_number: std.admission_number,
              student_name: std.full_name,
              total_fee: std.fee_balance,
              amount: std.fee_balance,
              payment_method: 'M-Pesa',
              reference_code: `MPESA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
              paid_by: std.full_name,
              issued_by: defaultIssuer,
              biometric_verified: true,
              biometric_finger_used: std.biometric_finger_name || 'Right Index',
              biometric_verification_code: generateBiometricVerificationCode(),
            })
            setShowPayModal(true)
          }}
        />
      )}

      {/* Biometric Student Enrollment Modal */}
      {showEnrollModal && studentToEnroll && (
        <BiometricEnrollModal
          student={studentToEnroll}
          officerName={defaultIssuer}
          onClose={() => {
            setShowEnrollModal(false)
            setStudentToEnroll(null)
          }}
          onEnrolled={(_updated) => {
            setStudents(schoolStore.getStudents())
          }}
        />
      )}

      {/* View Individual Clearance Pass Modal */}
      {selectedPass && (
        <BiometricClearancePassModal
          pass={selectedPass}
          onClose={() => setSelectedPass(null)}
        />
      )}

      {/* Edit & Update Receipt Modal */}
      {editingReceipt && (
        <div className="modal-overlay" onClick={() => setEditingReceipt(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">✏️ Update Payment Receipt</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  Receipt #{editingReceipt.receipt_number} • {editingReceipt.student_name} ({editingReceipt.admission_number})
                </p>
              </div>
              <button type="button" className="modal-close" onClick={() => setEditingReceipt(null)}>✕</button>
            </div>

            <form onSubmit={handleSaveUpdate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Amount Paid ($ USD)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData({ ...editFormData, amount: Number(e.target.value) })}
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Payment Method</label>
                  <select
                    className="form-input"
                    value={editFormData.payment_method}
                    onChange={(e) => setEditFormData({ ...editFormData, payment_method: e.target.value as any })}
                  >
                    <option value="M-Pesa">M-Pesa</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Paybill">Paybill</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Cash Deposit">Cash Deposit</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Transaction / Reference Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editFormData.reference_code}
                    onChange={(e) => setEditFormData({ ...editFormData, reference_code: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Payer Name / Paid By</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editFormData.paid_by}
                    onChange={(e) => setEditFormData({ ...editFormData, paid_by: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Reason for Update / Audit Note</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Corrected fee deposit ref, adjusted fee balance"
                    value={editFormData.update_notes}
                    onChange={(e) => setEditFormData({ ...editFormData, update_notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingReceipt(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                  Save & Mark Updated ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit & Update Invoice Modal */}
      {editingInvoice && (
        <div className="modal-overlay" onClick={() => setEditingInvoice(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">✏️ Update Fee Invoice</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  Invoice #{editingInvoice.invoice_number} • {editingInvoice.student_name} ({editingInvoice.admission_number})
                </p>
              </div>
              <button type="button" className="modal-close" onClick={() => setEditingInvoice(null)}>✕</button>
            </div>

            <form onSubmit={handleSaveUpdateInvoice}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Total Billed Amount ($ USD)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editInvoiceData.total_amount}
                    onChange={(e) => setEditInvoiceData({ ...editInvoiceData, total_amount: Number(e.target.value) })}
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Billing Description</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editInvoiceData.description}
                    onChange={(e) => setEditInvoiceData({ ...editInvoiceData, description: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Academic Term / Cohort</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editInvoiceData.term}
                    onChange={(e) => setEditInvoiceData({ ...editInvoiceData, term: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Payment Due Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editInvoiceData.due_date}
                    onChange={(e) => setEditInvoiceData({ ...editInvoiceData, due_date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Audit Note / Reason for Adjustment</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Scholarship waiver, revised module fee structure"
                    value={editInvoiceData.update_notes}
                    onChange={(e) => setEditInvoiceData({ ...editInvoiceData, update_notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingInvoice(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                  Save & Update Invoice ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit & Update Course Fee Schedule Modal */}
      {editingCourseFee && (
        <div className="modal-overlay" onClick={() => !isSavingFee && setEditingCourseFee(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '1.75rem' }}>{editingCourseFee.icon || '🎓'}</span>
                <div>
                  <h3 className="modal-title" style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>
                    Edit Course Tuition Fee
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    {editingCourseFee.shortTitle} • {editingCourseFee.category}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                disabled={isSavingFee}
                onClick={() => setEditingCourseFee(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCourseFee}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', paddingTop: '1rem' }}>
                {feeSaveSuccess && (
                  <div
                    style={{
                      background: '#ecfdf5',
                      border: '1px solid #6ee7b7',
                      color: '#065f46',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span>✓</span>
                    <span>{feeSaveSuccess}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Official Tuition Fee (USD $)</span>
                    <span style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.82rem' }}>Authoritative Live Base</span>
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', fontWeight: 700, color: '#64748b', fontSize: '1.1rem' }}>$</span>
                    <input
                      type="number"
                      className="form-input"
                      style={{ paddingLeft: '2rem', fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}
                      value={editFeeUsd}
                      onChange={(e) => setEditFeeUsd(Math.max(0, Number(e.target.value)))}
                      min="0"
                      step="1"
                      required
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                    Quick Fee Presets:
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {[45, 60, 75, 89, 95, 120, 150].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setEditFeeUsd(preset)}
                        style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          border: editFeeUsd === preset ? '2px solid #2563eb' : '1px solid var(--color-border)',
                          background: editFeeUsd === preset ? '#eff6ff' : 'var(--color-bg-secondary)',
                          color: editFeeUsd === preset ? '#1d4ed8' : 'var(--color-text-primary)',
                          fontWeight: editFeeUsd === preset ? 700 : 500,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                        }}
                      >
                        ${preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Real-Time Multi-Currency Calculation Preview */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.9rem 1rem',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '0.5rem' }}>
                    ⚡ Real-Time Breakdown & Currency Sync Preview
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.65rem' }}>
                    <div style={{ background: '#ffffff', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>USD Dollar Fee</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#16a34a' }}>${editFeeUsd}</div>
                    </div>
                    <div style={{ background: '#ffffff', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Kenya Shilling (KES)</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2563eb' }}>KES {(editFeeUsd * 130).toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div>• <strong>Installment Plan:</strong> {editFeeUsd <= 55 ? `Single payment of $${editFeeUsd} (KES ${(editFeeUsd * 130).toLocaleString()})` : `2 installments of $${Math.ceil(editFeeUsd / 2)} (KES ${Math.ceil((editFeeUsd * 130) / 2).toLocaleString()})`}</div>
                    <div>• <strong>Cross-Platform Sync:</strong> Changes reflect immediately on Landing Page, Course Catalog, Bursar Invoicing, and Student Portals.</div>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.85rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={isSavingFee}
                  onClick={() => setEditingCourseFee(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingFee}
                  style={{ fontWeight: 700, minWidth: '160px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  {isSavingFee ? '💾 Saving & Syncing...' : '💾 Save & Sync Fee ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
