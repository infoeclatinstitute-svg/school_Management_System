import { useState, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { schoolStore } from '@/lib/schoolData'
import { supabase } from '@/lib/supabase'
import type {
  FeeInvoice,
  FeeInvoiceItem,
  FeePaymentReceipt,
  PaymentReminder,
  StudentRecord,
  SecretaryInquiry,
  CourseUnit,
  UnitRegistrationReceipt,
  BiometricFeeClearancePass,
} from '@/types/school'
import { UnitRegistrationSlip } from '@/components/shared/UnitRegistrationSlip'
import { BiometricScannerModal } from '@/components/biometrics/BiometricScannerModal'
import { BiometricEnrollModal } from '@/components/biometrics/BiometricEnrollModal'
import { BiometricClearancePassModal } from '@/components/biometrics/BiometricClearancePassModal'
import { generateBiometricVerificationCode } from '@/lib/biometricEngine'
import { INSTITUTION_CONFIG } from '@/config/institution'
import { getDynamicCoursesList } from '@/config/officialCourses'

export function BursarDesk() {
  const [invoices, setInvoices] = useState<FeeInvoice[]>(() => schoolStore.getInvoices())
  const [receipts, setReceipts] = useState<FeePaymentReceipt[]>(() => schoolStore.getReceipts())
  const [reminders, setReminders] = useState<PaymentReminder[]>(() => schoolStore.getReminders())
  const [students, setStudents] = useState<StudentRecord[]>(() => schoolStore.getStudents())
  const [inquiries, setInquiries] = useState<SecretaryInquiry[]>(() => schoolStore.getInquiries())
  const [courseUnits] = useState<CourseUnit[]>(() => schoolStore.getCourseUnits())
  const [unitRegistrations, setUnitRegistrations] = useState<UnitRegistrationReceipt[]>(() => schoolStore.getUnitRegistrations())
  const [clearanceLogs, setClearanceLogs] = useState<BiometricFeeClearancePass[]>(() => schoolStore.getBiometricClearanceLogs())
  const [unlockingAdm, setUnlockingAdm] = useState<string | null>(null)
  const [unlockSuccessMsg, setUnlockSuccessMsg] = useState<string | null>(null)

  // Tab State
  const [activeTab, setActiveTab] = useState<
    'overview' | 'invoices' | 'receipts' | 'biometrics' | 'admissions' | 'unit_registration' | 'idcards' | 'reminders' | 'inquiries'
  >('overview')

  // Modals
  const [showPayModal, setShowPayModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showInquiryModal, setShowInquiryModal] = useState(false)
  const [showUnitRegModal, setShowUnitRegModal] = useState(false)
  const [showBiometricStation, setShowBiometricStation] = useState(false)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [studentToEnroll, setStudentToEnroll] = useState<StudentRecord | null>(null)
  const [selectedClearancePass, setSelectedClearancePass] = useState<BiometricFeeClearancePass | null>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<FeePaymentReceipt | null>(null)
  const [editingReceipt, setEditingReceipt] = useState<FeePaymentReceipt | null>(null)
  const currencySymbol = INSTITUTION_CONFIG.pricing.currencySymbol || '$'
  const defaultTuitionFee = INSTITUTION_CONFIG.pricing.defaultTuitionFee || 0

  const [editFormData, setEditFormData] = useState({
    amount: defaultTuitionFee,
    payment_method: 'M-Pesa' as 'Card' | 'Bank Transfer' | 'Paybill' | 'PayPal' | 'M-Pesa' | 'Cash Deposit',
    reference_code: '',
    paid_by: '',
    update_notes: '',
  })
  const [selectedStudentForLetter, setSelectedStudentForLetter] = useState<StudentRecord | null>(null)
  const [selectedStudentForIdCard, setSelectedStudentForIdCard] = useState<StudentRecord | null>(null)
  const [selectedSlipForView, setSelectedSlipForView] = useState<UnitRegistrationReceipt | null>(null)
  const [reminderAlert, setReminderAlert] = useState<string | null>(null)

  const { profile } = useAuth()
  const defaultIssuer = profile?.full_name
    ? `${profile.full_name} (${profile.role === 'admin' ? 'Principal & Administrator' : 'Bursar & Accounts Directorate'})`
    : 'Bursar & Accounts Directorate'

  const handleOpenEditReceipt = (rec: FeePaymentReceipt) => {
    setEditingReceipt(rec)
    setEditFormData({
      amount: rec.amount_paid ?? rec.amount,
      payment_method: rec.payment_method,
      reference_code: rec.reference_code,
      paid_by: rec.paid_by,
      update_notes: rec.update_notes || '',
    })
  }

  const handleSaveUpdateReceipt = async (e: React.FormEvent) => {
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
    if (window.confirm(`Are you sure you want to delete Receipt "${recNum}"?`)) {
      await schoolStore.deleteReceipt(recId)
      setReceipts(schoolStore.getReceipts())
      setInvoices(schoolStore.getInvoices())
      setStudents(schoolStore.getStudents())
    }
  }

  const [editingInvoice, setEditingInvoice] = useState<FeeInvoice | null>(null)
  const [editInvoiceData, setEditInvoiceData] = useState({
    total_amount: defaultTuitionFee,
    due_date: '',
    term: 'Semester 1',
    description: 'Certified Course Tuition Fee',
    update_notes: '',
  })

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
    if (window.confirm('Are you sure you want to clear all invoices from the system?')) {
      await schoolStore.clearAllInvoices()
      setInvoices(schoolStore.getInvoices())
      setStudents(schoolStore.getStudents())
    }
  }

  const handleClearAllReceipts = async () => {
    if (window.confirm('Are you sure you want to clear all receipts from the system?')) {
      await schoolStore.clearAllReceipts()
      setReceipts(schoolStore.getReceipts())
      setInvoices(schoolStore.getInvoices())
      setStudents(schoolStore.getStudents())
    }
  }

  // Payment Form
  const [paymentData, setPaymentData] = useState({
    student_id: '',
    admission_number: '',
    student_name: '',
    course_name: '',
    total_fee: defaultTuitionFee,
    amount: defaultTuitionFee,
    payment_method: 'Bank Transfer' as 'Card' | 'Bank Transfer' | 'Paybill' | 'PayPal' | 'M-Pesa' | 'Cash Deposit',
    reference_code: '',
    paid_by: '',
    issued_by: defaultIssuer,
    biometric_verified: false,
    biometric_finger_used: 'Right Thumb',
    biometric_verification_code: '',
  })

  const currentAcademicYear = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`

  // Invoice Form
  const [newInvoice, setNewInvoice] = useState({
    student_id: '',
    student_name: '',
    admission_number: '',
    class_name: '',
    term: 'Short Course',
    academic_year: currentAcademicYear,
    item_description: 'Tuition & Practical Training',
    total_amount: 0,
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  })

  // Unit Registration Form State
  const [regStudentId, setRegStudentId] = useState<string>(students[0]?.id || '')
  const dynamicDurations = useMemo(() => {
    return Array.from(
      new Set([
        ...courseUnits.map((u) => u.course_duration).filter((d): d is string => Boolean(d)),
        ...getDynamicCoursesList(schoolStore.getSubjects(), schoolStore.getCourseUnits()).map((c) => c.duration).filter((d): d is string => Boolean(d)),
        '1 Month (Intensive Skills)',
        '2 Months (Fast-Track Skills)',
        '3 Months (Certificate Program)',
        '4 Months (Professional Course)',
        '6 Months (Modular Diploma)',
        '1 Year (Full Diploma)',
        'Executive Masterclass',
      ])
    )
  }, [courseUnits])
  const [regCourseDuration, setRegCourseDuration] = useState('3 Months (Certificate Program)')
  const [regAcademicYear, setRegAcademicYear] = useState(currentAcademicYear)
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([])

  // Inquiry Form State
  const [newInquiry, setNewInquiry] = useState<Partial<SecretaryInquiry>>({
    visitor_name: '',
    phone: '',
    email: '',
    purpose: 'New Admission Inquiry',
    program_of_interest: 'General Admissions Consultation',
    notes: '',
    status: 'Open',
  })

  // Financial KPIs
  const totalBilled = invoices.reduce((acc, inv) => acc + inv.total_amount, 0)
  const totalCollected = invoices.reduce((acc, inv) => acc + inv.paid_amount, 0)
  const totalOutstanding = invoices.reduce((acc, inv) => acc + inv.balance, 0)
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 100

  // Export Financial Ledger
  const handleExportFinancials = () => {
    const headers = [
      'Invoice #',
      'Admission Number',
      'Student Name',
      'Program',
      'Course Duration / Cohort',
      'Total Billed ($ USD)',
      'Total Paid ($ USD)',
      'Balance ($ USD)',
      'Payment Status',
      'Issue Date',
      'Due Date',
    ]

    const rows = invoices.map((inv) => [
      `"${inv.invoice_number}"`,
      `"${inv.admission_number}"`,
      `"${inv.student_name}"`,
      `"${inv.class_name}"`,
      `"${inv.term}"`,
      inv.total_amount,
      inv.paid_amount,
      inv.balance,
      `"${inv.status}"`,
      `"${inv.issue_date}"`,
      `"${inv.due_date}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `global_college_Bursar_Ledger_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Handle Record Payment
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentData.admission_number || !paymentData.amount) return

    const student = students.find((s) => s.admission_number.toLowerCase() === paymentData.admission_number.toLowerCase()) || {
      id: `std-${Date.now()}`,
      full_name: paymentData.student_name || 'Walk-in Student',
      admission_number: paymentData.admission_number,
      class_name: paymentData.course_name || 'Short Course Cohort',
    }

    const existingInv = invoices.find(
      (inv) => inv.admission_number.toLowerCase() === paymentData.admission_number.toLowerCase() || inv.student_id === student.id
    )

    // Accurate dynamic balance calculation (zero hardcoding)
    const currentBill = existingInv ? existingInv.balance : Number(paymentData.total_fee || paymentData.amount)
    const remainingBalance = Math.max(0, currentBill - Number(paymentData.amount))
    const issuerName = paymentData.issued_by?.trim() || defaultIssuer

    const receipt: FeePaymentReceipt = {
      id: `rcpt-${Date.now()}`,
      receipt_number: `RCT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      invoice_id: existingInv ? existingInv.id : `inv-${Date.now()}`,
      student_id: student.id,
      student_name: student.full_name,
      admission_number: student.admission_number,
      amount: Number(paymentData.amount),
      amount_paid: Number(paymentData.amount),
      payment_method: paymentData.payment_method,
      reference_code: paymentData.reference_code,
      received_by: issuerName,
      recorded_by: issuerName,
      paid_by: paymentData.paid_by || student.full_name,
      payment_date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      balance_after: remainingBalance,
      balance_remaining: remainingBalance,
      biometric_verified: paymentData.biometric_verified,
      biometric_finger_used: paymentData.biometric_verified ? paymentData.biometric_finger_used : undefined,
      biometric_verification_code: paymentData.biometric_verified
        ? paymentData.biometric_verification_code || generateBiometricVerificationCode()
        : undefined,
      biometric_verified_at: paymentData.biometric_verified ? new Date().toISOString() : undefined,
    }

    await schoolStore.recordPayment(receipt)
    
    // Auto-renew Supabase profile access_expires_at (+365 days)
    const renewed = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    if (student.admission_number) {
      Promise.resolve(supabase.from('profiles').update({ access_expires_at: renewed }).ilike('admission_number', student.admission_number)).catch(() => {})
    }
    if (student.id) {
      Promise.resolve(supabase.from('profiles').update({ access_expires_at: renewed }).eq('id', student.id)).catch(() => {})
    }

    setReceipts(schoolStore.getReceipts())
    setInvoices(schoolStore.getInvoices())
    setStudents(schoolStore.getStudents())
    setShowPayModal(false)
    setSelectedReceipt(receipt)
  }

  // Quick 1-Click Action: Clear & Unlock LMS Lessons for any student
  const handleQuickUnlockStudent = async (std: StudentRecord) => {
    try {
      setUnlockingAdm(std.admission_number)
      
      await schoolStore.unlockStudentLessons(std.admission_number || std.id, defaultIssuer)
      
      const renewed = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      if (std.admission_number) {
        try {
          await supabase.from('profiles').update({ access_expires_at: renewed }).ilike('admission_number', std.admission_number)
        } catch {}
      }
      if (std.id) {
        try {
          await supabase.from('profiles').update({ access_expires_at: renewed }).eq('id', std.id)
        } catch {}
      }

      setStudents(schoolStore.getStudents())
      setInvoices(schoolStore.getInvoices())
      setReceipts(schoolStore.getReceipts())
      setUnitRegistrations(schoolStore.getUnitRegistrations())
      
      setUnlockSuccessMsg(`⚡ LMS Lessons & Exam Card cleared and unlocked successfully for ${std.full_name} (${std.admission_number})!`)
      setTimeout(() => setUnlockSuccessMsg(null), 6000)
    } catch (err: any) {
      alert('Error unlocking student lessons: ' + (err?.message || err))
    } finally {
      setUnlockingAdm(null)
    }
  }

  // Handle Unit Selection Toggle
  const handleToggleUnitSelect = (unitId: string) => {
    if (selectedUnitIds.includes(unitId)) {
      setSelectedUnitIds(selectedUnitIds.filter((id) => id !== unitId))
    } else {
      setSelectedUnitIds([...selectedUnitIds, unitId])
    }
  }

  // Handle Unit Registration
  const handleCompleteUnitRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetStudent = students.find((s) => s.id === regStudentId) || students[0]
    if (!targetStudent) {
      alert('Please select a student.')
      return
    }

    if (selectedUnitIds.length === 0) {
      alert('Please select at least one course unit to register.')
      return
    }

    const selectedUnitsList = courseUnits.filter((u) => selectedUnitIds.includes(u.id))
    const totalCredits = selectedUnitsList.reduce((acc, u) => acc + (u.credit_hours || 3), 0)

    const receipt: UnitRegistrationReceipt = {
      id: `reg-${Date.now()}`,
      receipt_number: `UNIT-REG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      student_id: targetStudent.id,
      student_name: targetStudent.full_name,
      admission_number: targetStudent.admission_number,
      program: targetStudent.class_name,
      academic_year: regAcademicYear,
      course_duration: regCourseDuration,
      semester: regCourseDuration,
      registered_unit_ids: selectedUnitIds,
      registered_units: selectedUnitsList.map((u) => ({
        code: u.code,
        title: u.title,
        credit_hours: u.credit_hours,
        teacher_name: u.teacher_name,
      })),
      total_credits: totalCredits,
      fee_clearance_status: targetStudent.fee_cleared ? 'Cleared' : 'Conditional Approval',
      registered_by: 'Bursar & Admissions Office',
      registered_at: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      exam_card_issued: true,
    }

    await schoolStore.registerStudentUnits(receipt)
    setUnitRegistrations(schoolStore.getUnitRegistrations())
    setShowUnitRegModal(false)
    setSelectedSlipForView(receipt)
  }

  const handleDeleteUnitReg = async (id: string, slipNumber: string) => {
    if (window.confirm(`Are you sure you want to delete registration clearance slip "${slipNumber}"?`)) {
      await schoolStore.deleteUnitRegistration(id)
      setUnitRegistrations(schoolStore.getUnitRegistrations())
    }
  }

  const handleClearAllUnitReg = async () => {
    if (window.confirm('Are you sure you want to delete all unit registration clearance slips? This action cannot be undone.')) {
      await schoolStore.clearAllUnitRegistrations()
      setUnitRegistrations([])
    }
  }

  // Handle Add Inquiry
  const handleAddInquiry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newInquiry.visitor_name || !newInquiry.phone) return

    const item: SecretaryInquiry = {
      id: `inq-${Date.now()}`,
      visitor_name: newInquiry.visitor_name || '',
      phone: newInquiry.phone || '',
      email: newInquiry.email || '',
      purpose: newInquiry.purpose as any,
      program_of_interest: newInquiry.program_of_interest,
      notes: newInquiry.notes || '',
      recorded_by: `${defaultIssuer}`,
      created_at: new Date().toLocaleString(),
      status: 'Open',
    }

    await schoolStore.addInquiry(item)
    setInquiries(schoolStore.getInquiries())
    setShowInquiryModal(false)
    setNewInquiry({ visitor_name: '', phone: '', email: '', purpose: 'New Admission Inquiry', notes: '' })
  }

  // Handle Generate Invoice
  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newInvoice.admission_number || !newInvoice.total_amount) return

    const std = students.find((s) => s.admission_number.toLowerCase() === newInvoice.admission_number.toLowerCase() || s.id === newInvoice.student_id)

    const invoice: FeeInvoice = {
      id: `inv-${Date.now()}`,
      invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      student_id: std ? std.id : `std-${Date.now()}`,
      student_name: std ? std.full_name : (newInvoice.student_name || 'Student'),
      admission_number: std ? std.admission_number : newInvoice.admission_number,
      class_name: std ? std.class_name : (newInvoice.class_name || 'Vocational Short Course'),
      term: newInvoice.term || 'Short Course',
      academic_year: newInvoice.academic_year || currentAcademicYear,
      issue_date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      due_date: newInvoice.due_date,
      items: [{ id: `item-1`, description: newInvoice.item_description || 'Tuition & Practical Training', amount: Number(newInvoice.total_amount) }],
      total_amount: Number(newInvoice.total_amount),
      paid_amount: 0,
      balance: Number(newInvoice.total_amount),
      status: 'Pending',
    }

    await schoolStore.createInvoice(invoice)
    setInvoices(schoolStore.getInvoices())
    setShowInvoiceModal(false)
    setNewInvoice({
      student_id: '',
      student_name: '',
      admission_number: '',
      class_name: '',
      term: 'Short Course',
      academic_year: currentAcademicYear,
      item_description: 'Tuition & Practical Training',
      total_amount: 0,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    })
  }

  // Send SMS Reminder
  const handleSendReminder = async (student: StudentRecord, phone: string, balance: number) => {
    const reminder: PaymentReminder = {
      id: `rem-${Date.now()}`,
      student_id: student.id,
      student_name: student.full_name,
      admission_number: student.admission_number,
      guardian_name: student.guardian?.name || 'Guardian / Sponsor',
      parent_name: student.guardian?.name || 'Guardian / Sponsor',
      guardian_phone: phone,
      phone_number: phone,
      amount_due: balance,
      balance_due: balance,
      due_date: 'Immediate',
      message_text: `Dear ${student.full_name} / Guardian, this is an official fee reminder from ${INSTITUTION_CONFIG.name}. An outstanding balance of ${currencySymbol}${balance.toLocaleString()} is due for admission ${student.admission_number}. Please settle via the student portal or approved channels. Thank you.`,
      message: `Dear ${student.full_name} / Guardian, this is an official fee reminder from ${INSTITUTION_CONFIG.name}. An outstanding balance of ${currencySymbol}${balance.toLocaleString()} is due for admission ${student.admission_number}. Please settle via the student portal or approved channels. Thank you.`,
      sent_at: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'Delivered',
      channel: 'SMS',
    }

    await schoolStore.addPaymentReminder(reminder)
    setReminders(schoolStore.getReminders())
    setReminderAlert(`SMS payment reminder dispatched successfully to ${phone} for ${student.full_name}.`)
    setTimeout(() => setReminderAlert(null), 5000)
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">💼 Bursar, Admissions & Secretary Desk</h1>
          <p className="page-subtitle">
            Integrated executive office for Tuition Billing, M-Pesa Receipts, Student Admissions, TVET Short Course Registration, and Biometric Fingerprint Clearance.
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
          <button type="button" className="btn btn-secondary" onClick={handleExportFinancials}>
            📊 Export Financial Ledger
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setShowPayModal(true)}>
            💰 Record Fee Payment
          </button>
        </div>
      </div>

      {reminderAlert && (
        <div className="card mb-4" style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '0.75rem 1rem' }}>
          ✓ {reminderAlert}
        </div>
      )}

      {/* Tabs */}
      <div className="card mb-6" style={{ padding: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
          <button type="button" className={`btn btn-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('overview')}>
            📊 Overview
          </button>
          <button type="button" className={`btn btn-sm ${activeTab === 'invoices' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('invoices')}>
            📑 Billing & Invoices ({invoices.length})
          </button>
          <button type="button" className={`btn btn-sm ${activeTab === 'receipts' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('receipts')}>
            🧾 Fee Receipts ({receipts.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'biometrics' ? 'btn-primary' : 'btn-ghost'}`}
            style={activeTab === 'biometrics' ? { background: '#0284c7', borderColor: '#0284c7' } : { color: '#0284c7' }}
            onClick={() => {
              setClearanceLogs(schoolStore.getBiometricClearanceLogs())
              setActiveTab('biometrics')
            }}
          >
            🖐️ Biometric Clearance Station ({clearanceLogs.length})
          </button>
          <button type="button" className={`btn btn-sm ${activeTab === 'admissions' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('admissions')}>
            📜 Admissions & Calling Letters ({students.length})
          </button>
          <button type="button" className={`btn btn-sm ${activeTab === 'unit_registration' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('unit_registration')}>
            🎓 Course Registration Slips ({unitRegistrations.length})
          </button>
          <button type="button" className={`btn btn-sm ${activeTab === 'idcards' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('idcards')}>
            🪪 Student ID Badges
          </button>
          <button type="button" className={`btn btn-sm ${activeTab === 'reminders' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('reminders')}>
            📱 SMS Reminders ({reminders.length})
          </button>
          <button type="button" className={`btn btn-sm ${activeTab === 'inquiries' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('inquiries')}>
            📝 Visitor Inquiries ({inquiries.length})
          </button>
        </div>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-primary)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Billed Revenue</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                ${totalBilled.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>Across {invoices.length} Student Invoices</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #16a34a' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Collections</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>
                ${totalCollected.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.2rem' }}>Collection Rate: {collectionRate}%</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ea580c' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Outstanding Fee Balance</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ea580c', marginTop: '0.25rem' }}>
                ${totalOutstanding.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>Pending Payments</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #0284c7' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Biometric Enrolled</div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0284c7', marginTop: '0.25rem' }}>
                {students.filter((s) => s.biometric_enrolled).length} / {students.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '0.2rem' }}>Fingerprint Verified Students</div>
            </div>
          </div>

          {/* Quick Action Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '3px solid #0284c7' }}>
              <div>
                <div style={{ fontSize: '1.8rem', marginBottom: '0.35rem' }}>🖐️</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.35rem', color: '#0284c7' }}>Biometric Fee Clearance</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  Scan student fingerprint to instantly verify fee balance and issue exam passes.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm mt-3"
                style={{ background: '#0284c7', borderColor: '#0284c7' }}
                onClick={() => setShowBiometricStation(true)}
              >
                🖐️ Launch Scanner
              </button>
            </div>

            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '3px solid var(--color-primary)' }}>
              <div>
                <div style={{ fontSize: '1.8rem', marginBottom: '0.35rem' }}>💰</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.35rem' }}>M-Pesa Fee Recording</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  Issue verified fee receipts and unlock gated course lessons for students.
                </p>
              </div>
              <button type="button" className="btn btn-primary btn-sm mt-3" onClick={() => setShowPayModal(true)}>
                + Record Payment
              </button>
            </div>

            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '3px solid #16a34a' }}>
              <div>
                <div style={{ fontSize: '1.8rem', marginBottom: '0.35rem' }}>🎓</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.35rem' }}>Course Unit Registration</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  Register approved units and generate formal printable assessment clearance slips.
                </p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={() => { setActiveTab('unit_registration'); setShowUnitRegModal(true); }}>
                + Register Units
              </button>
            </div>

            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '3px solid #ea580c' }}>
              <div>
                <div style={{ fontSize: '1.8rem', marginBottom: '0.35rem' }}>📜</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.35rem' }}>Provisional Letters</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  Generate official admission calling letters with {INSTITUTION_CONFIG.name} seal.
                </p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={() => setActiveTab('admissions')}>
                View Admissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Billing & Invoices */}
      {activeTab === 'invoices' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Fee Invoices & Statements ({invoices.length})</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>
                Manage student billing items, tuition balances, and due dates.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {invoices.length > 0 && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                  onClick={handleClearAllInvoices}
                >
                  🗑️ Clear All Invoices
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={() => setShowInvoiceModal(true)}>
                + Generate New Fee Invoice
              </button>
            </div>
          </div>

          {invoices.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📑</div>
              <h4>No Fee Invoices Billed Yet</h4>
              <p style={{ fontSize: '0.85rem' }}>Click "+ Generate New Fee Invoice" to bill a student.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Adm No</th>
                    <th>Student Name</th>
                    <th>Program / Period</th>
                    <th>Total Billed</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <strong style={{ color: 'var(--color-primary)' }}>{inv.invoice_number}</strong>
                          {inv.is_updated && (
                            <span
                              className="badge"
                              style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.68rem', fontWeight: 800 }}
                              title={`Updated by ${inv.updated_by || 'Admin'} on ${inv.updated_at ? new Date(inv.updated_at).toLocaleString() : 'recently'}`}
                            >
                              ✏️ Updated
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{inv.admission_number}</td>
                      <td>{inv.student_name}</td>
                      <td>{inv.class_name} • {inv.term}</td>
                      <td>${inv.total_amount.toLocaleString()}</td>
                      <td style={{ color: '#16a34a', fontWeight: 600 }}>${inv.paid_amount.toLocaleString()}</td>
                      <td style={{ color: inv.balance > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                        ${inv.balance.toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${inv.status === 'Paid' ? 'badge-success' : inv.status === 'Partial' ? 'badge-warning' : 'badge-danger'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td>{inv.due_date}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="btn btn-xs btn-primary"
                            onClick={() => handleOpenEditInvoice(inv)}
                            title="Edit Invoice"
                          >
                            ✏️ Edit
                          </button>
                          {inv.balance > 0 ? (
                            <button
                              type="button"
                              className="btn btn-xs btn-secondary"
                              onClick={() => {
                                setPaymentData({
                                  ...paymentData,
                                  student_id: inv.student_id,
                                  admission_number: inv.admission_number,
                                  student_name: inv.student_name,
                                  amount: inv.balance,
                                })
                                setShowPayModal(true)
                              }}
                            >
                              Receive Pay
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>✓ Settled</span>
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

      {/* Tab 3: Receipts */}
      {activeTab === 'receipts' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Fee Payment Receipts & Ledger ({receipts.length})</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>
                Official verified payment receipts issued via M-Pesa, Bank, or Cash with optional biometric authentication.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {receipts.length > 0 && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                  onClick={handleClearAllReceipts}
                >
                  🗑️ Clear All Receipts
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                style={{ background: '#0284c7', borderColor: '#0284c7', color: '#fff' }}
                onClick={() => setShowBiometricStation(true)}
              >
                🖐️ Biometric Scan
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setShowPayModal(true)}>
                + Record New Payment
              </button>
            </div>
          </div>

          {receipts.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🧾</div>
              <h4>No Payment Receipts Issued Yet</h4>
              <p style={{ fontSize: '0.85rem' }}>All recorded payments and M-Pesa transactions will appear here.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Receipt #</th>
                    <th>Adm No</th>
                    <th>Student Name</th>
                    <th>Amount Paid</th>
                    <th>Remaining Balance</th>
                    <th>Method</th>
                    <th>Ref / M-Pesa Code</th>
                    <th>Status / Audit</th>
                    <th>Issued By</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((rcpt) => (
                    <tr key={rcpt.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <strong style={{ color: 'var(--color-primary)' }}>{rcpt.receipt_number}</strong>
                          {rcpt.is_updated && (
                            <span
                              className="badge"
                              style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.68rem', fontWeight: 800 }}
                              title={`Updated by ${rcpt.updated_by || 'Admin'} on ${rcpt.updated_at ? new Date(rcpt.updated_at).toLocaleString() : 'recently'}`}
                            >
                              ✏️ Updated
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{rcpt.admission_number}</td>
                      <td>{rcpt.student_name}</td>
                      <td style={{ color: '#16a34a', fontWeight: 700 }}>${(rcpt.amount_paid ?? rcpt.amount).toLocaleString()}</td>
                      <td>
                        {(rcpt.balance_remaining ?? rcpt.balance_after ?? 0) === 0 ? (
                          <span className="badge badge-success">✓ Cleared ($0)</span>
                        ) : (
                          <span className="badge badge-warning">${(rcpt.balance_remaining ?? rcpt.balance_after ?? 0).toLocaleString()}</span>
                        )}
                      </td>
                      <td><span className="badge badge-info">{rcpt.payment_method}</span></td>
                      <td><code>{rcpt.reference_code}</code></td>
                      <td>
                        {rcpt.is_updated ? (
                          <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 700 }}>
                            Adjusted by {rcpt.updated_by?.split(' ')[0] || 'Admin'}
                          </span>
                        ) : rcpt.biometric_verified ? (
                          <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                            🔒 🖐️ Verified
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Original</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#475569' }}><strong>{rcpt.recorded_by || rcpt.received_by || defaultIssuer}</strong></td>
                      <td>{rcpt.payment_date}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button type="button" className="btn btn-xs btn-secondary" onClick={() => setSelectedReceipt(rcpt)} title="View / Print Receipt">
                            🧾
                          </button>
                          <button type="button" className="btn btn-xs btn-primary" onClick={() => handleOpenEditReceipt(rcpt)} title="Edit Receipt">
                            ✏️ Edit
                          </button>
                          <button type="button" className="btn btn-xs" style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }} onClick={() => handleDeleteReceipt(rcpt.id, rcpt.receipt_number)} title="Delete Receipt">
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

      {/* Tab: Biometrics Clearance Station */}
      {activeTab === 'biometrics' && (
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
                    Bursar Fingerprint Fee Clearance Terminal
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#334155', margin: '0.25rem 0 0 0' }}>
                    Instant student biometric identification, fee balance audit, and official exam sitting clearance issuance.
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
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>OPTICAL BIOMETRIC GATEWAY</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                  Sensor Online & Ready
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
                            onClick={() => setSelectedClearancePass(log)}
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

      {/* Tab 4: Admissions & Calling Letters */}
      {activeTab === 'admissions' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Student Admissions & Calling Letters</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>
                View enrolled vocational trainees, manage fee clearance, unlock LMS lessons, and generate calling letters.
              </p>
            </div>
          </div>

          {unlockSuccessMsg && (
            <div
              style={{
                background: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #86efac',
                padding: '0.85rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>✅</span> {unlockSuccessMsg}
            </div>
          )}

          {students.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📜</div>
              <h4>No Admitted Students In System</h4>
              <p style={{ fontSize: '0.85rem' }}>New students admitted through the SIS Registry will be available here.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Adm Number</th>
                    <th>Student Name</th>
                    <th>Program / Course</th>
                    <th>Intake / Date</th>
                    <th>Fee Clearance</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((std) => (
                    <tr key={std.id}>
                      <td><strong>{std.admission_number}</strong></td>
                      <td>{std.full_name}</td>
                      <td><span className="badge badge-primary">{std.class_name}</span></td>
                      <td>{std.admission_date || std.enrollment_date || currentAcademicYear}</td>
                      <td>
                        <span className={`badge ${std.fee_cleared ? 'badge-success' : 'badge-warning'}`}>
                          {std.fee_cleared ? '✓ Cleared' : `$${std.fee_balance.toLocaleString()} Due`}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{
                              background: std.fee_cleared ? '#f0fdf4' : '#fffbeb',
                              color: std.fee_cleared ? '#16a34a' : '#b45309',
                              border: `1px solid ${std.fee_cleared ? '#86efac' : '#fcd34d'}`,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                            disabled={unlockingAdm === std.admission_number}
                            onClick={() => handleQuickUnlockStudent(std)}
                            title="Instantly clear fees, issue course registration slip, and unlock full online lessons access"
                          >
                            {unlockingAdm === std.admission_number ? '⏳ Unlocking...' : std.fee_cleared ? '⚡ Lessons Active' : '⚡ Clear & Unlock Lessons'}
                          </button>
                          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setSelectedStudentForLetter(std)}>
                            📜 Admission Letter
                          </button>
                          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedStudentForIdCard(std)}>
                            🪪 ID Badge
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

      {/* Tab 5: Professional Short Course Unit Registration & Slips */}
      {activeTab === 'unit_registration' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Professional Short Course Unit Registration & Clearance Slips</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>
                Register students for approved instructional course units and issue official assessment clearance slips.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {unitRegistrations.length > 0 && (
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                  onClick={handleClearAllUnitReg}
                  title="Remove all unit registration clearance slips"
                >
                  🗑️ Clear All Slips
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={() => setShowUnitRegModal(true)}>
                + Register Units for Trainee
              </button>
            </div>
          </div>

          {unitRegistrations.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📜</div>
              <h4>No Course Unit Registrations Processed Yet</h4>
              <p style={{ fontSize: '0.85rem' }}>Click "+ Register Units for Trainee" above to clear a student for their course units.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Slip Number</th>
                    <th>Adm No</th>
                    <th>Student Name</th>
                    <th>Course Duration</th>
                    <th>Units Cleared</th>
                    <th>Total Credits</th>
                    <th>Fee Status</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {unitRegistrations.map((reg) => (
                    <tr key={reg.id}>
                      <td><strong>{reg.receipt_number}</strong></td>
                      <td>{reg.admission_number}</td>
                      <td>{reg.student_name}</td>
                      <td><span className="badge badge-info">{reg.course_duration || reg.semester || '3 Months Short Course'}</span></td>
                      <td><span className="badge badge-primary">{reg.registered_units?.length || 0} Units</span></td>
                      <td><strong>{reg.total_credits} Credits</strong></td>
                      <td>
                        <span className={`badge ${reg.fee_clearance_status === 'Cleared' ? 'badge-success' : 'badge-warning'}`}>
                          ✓ {reg.fee_clearance_status}
                        </span>
                      </td>
                      <td>{reg.registered_at}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setSelectedSlipForView(reg)}>
                            📄 Print Slip
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                            onClick={() => handleDeleteUnitReg(reg.id, reg.receipt_number)}
                            title="Delete this registration slip"
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

      {/* Tab 6: ID Cards */}
      {activeTab === 'idcards' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Student ID Card Badges</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            Click on any trainee below to generate an official printable institutional Student ID Badge.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {students.map((std) => (
              <div key={std.id} className="card" style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {std.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{std.full_name}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>{std.admission_number}</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                  Program: <strong>{std.class_name}</strong>
                </div>
                <button type="button" className="btn btn-primary btn-sm w-full" onClick={() => setSelectedStudentForIdCard(std)}>
                  🪪 Print ID Badge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 7: SMS Reminders */}
      {activeTab === 'reminders' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Automated SMS Fee Payment Reminders</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>
                Direct Safaricom SMS reminders with M-Pesa Paybill payment instructions.
              </p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Adm No</th>
                  <th>Fee Balance</th>
                  <th>Guardian Phone</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.full_name}</strong></td>
                    <td>{s.admission_number}</td>
                    <td style={{ color: s.fee_cleared ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                      {s.fee_cleared ? 'Cleared ($0)' : `$${s.fee_balance.toLocaleString()}`}
                    </td>
                    <td>{s.guardian?.phone || s.emergency_contact || 'Not on file'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={s.fee_cleared || (!s.guardian?.phone && !s.emergency_contact)}
                        onClick={() => handleSendReminder(s, s.guardian?.phone || s.emergency_contact || '', s.fee_balance)}
                      >
                        📱 Send SMS Reminder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 8: Inquiries */}
      {activeTab === 'inquiries' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Front Desk Visitor Inquiries</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>
                Record walk-in prospective students, phone inquiries, and admission consultations.
              </p>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => setShowInquiryModal(true)}>
              + Log New Visitor Inquiry
            </button>
          </div>

          {inquiries.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📝</div>
              <h4>No Visitor Inquiries Logged Yet</h4>
              <p style={{ fontSize: '0.85rem' }}>Click "+ Log New Visitor Inquiry" to record visitor walk-ins.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Visitor Name</th>
                    <th>Phone / Contact</th>
                    <th>Purpose</th>
                    <th>Program of Interest</th>
                    <th>Notes</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((inq) => (
                    <tr key={inq.id}>
                      <td><strong>{inq.visitor_name}</strong></td>
                      <td>{inq.phone}</td>
                      <td><span className="badge badge-info">{inq.purpose}</span></td>
                      <td>{inq.program_of_interest || 'General'}</td>
                      <td>{inq.notes || '—'}</td>
                      <td>{inq.created_at}</td>
                      <td><span className="badge badge-success">{inq.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Record Fee Payment */}
      {showPayModal && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ margin: 0 }}>Record Student Fee Payment</h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Generate official verifiable receipt with accurate balance tracking</div>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowPayModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRecordPaymentSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Student Quick Selector */}
                {students.length > 0 && (
                  <div>
                    <label className="label">Quick Select Enrolled Student (Optional)</label>
                    <select
                      className="input"
                      value={paymentData.student_id}
                      onChange={(e) => {
                        const std = students.find((s) => s.id === e.target.value)
                        if (std) {
                          const existingInv = invoices.find((inv) => inv.student_id === std.id || inv.admission_number === std.admission_number)
                          const fee = existingInv ? existingInv.balance : (std.fee_balance !== undefined ? std.fee_balance : (std.term_fee_total || defaultTuitionFee))
                          setPaymentData({
                            ...paymentData,
                            student_id: std.id,
                            admission_number: std.admission_number,
                            student_name: std.full_name,
                            course_name: std.class_name,
                            total_fee: fee,
                            amount: fee,
                          })
                        }
                      }}
                    >
                      <option value="">-- Choose from Admitted Students or Type Below --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.admission_number} — {s.full_name} ({s.class_name})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Student Admission Number *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      placeholder="e.g. GC-2026-001"
                      value={paymentData.admission_number}
                      onChange={(e) => {
                        const adm = e.target.value
                        const std = students.find((s) => s.admission_number.toLowerCase() === adm.toLowerCase())
                        const existingInv = invoices.find((inv) => inv.admission_number.toLowerCase() === adm.toLowerCase())
                        const fee = existingInv ? existingInv.balance : (std ? (std.fee_balance !== undefined ? std.fee_balance : (std.term_fee_total || defaultTuitionFee)) : paymentData.total_fee)
                        setPaymentData({
                          ...paymentData,
                          admission_number: adm,
                          student_name: std ? std.full_name : paymentData.student_name,
                          course_name: std ? std.class_name : paymentData.course_name,
                          total_fee: fee,
                          amount: fee,
                        })
                      }}
                    />
                  </div>
                  <div>
                    <label className="label">Student Full Name *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      placeholder="Enter student full name"
                      value={paymentData.student_name}
                      onChange={(e) => setPaymentData({ ...paymentData, student_name: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Total Fee / Payable Balance ($ USD) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="input"
                      value={paymentData.total_fee}
                      onChange={(e) => setPaymentData({ ...paymentData, total_fee: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="label">Amount Paid Now ($ USD) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="input"
                      value={paymentData.amount}
                      onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Real-time Balance Calculation Banner */}
                <div
                  style={{
                    background: (paymentData.total_fee - paymentData.amount) <= 0 ? '#f0fdf4' : '#fffbeb',
                    border: `1px solid ${(paymentData.total_fee - paymentData.amount) <= 0 ? '#bbf7d0' : '#fde68a'}`,
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                    Calculated Outstanding Balance:
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800 }}>
                    {(paymentData.total_fee - paymentData.amount) <= 0 ? (
                      <span style={{ color: '#16a34a' }}>✓ $0.00 (FULL FEE CLEARED)</span>
                    ) : (
                      <span style={{ color: '#d97706' }}>${(paymentData.total_fee - paymentData.amount).toLocaleString()}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Payment Method</label>
                    <select
                      className="input"
                      value={paymentData.payment_method}
                      onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value as any })}
                    >
                      <option value="Card">💳 Credit / Debit Card (Visa, Mastercard)</option>
                      <option value="Bank Transfer">🏦 Direct Bank Wire Transfer</option>
                      <option value="Paybill">📱 Paybill / Mobile Money</option>
                      <option value="PayPal">🌐 PayPal / Stripe Gateway</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Reference / M-Pesa Code *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={paymentData.reference_code}
                      onChange={(e) => setPaymentData({ ...paymentData, reference_code: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Issued By / Authorized Officer *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      placeholder="Officer Name & Designation"
                      value={paymentData.issued_by}
                      onChange={(e) => setPaymentData({ ...paymentData, issued_by: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Payer Name (Student / Sponsor)</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Leave blank if student self-paid"
                      value={paymentData.paid_by}
                      onChange={(e) => setPaymentData({ ...paymentData, paid_by: e.target.value })}
                    />
                  </div>
                </div>

                {/* Biometric Payment Verification */}
                <div
                  style={{
                    background: paymentData.biometric_verified ? '#f0fdf4' : '#f8fafc',
                    border: `1px solid ${paymentData.biometric_verified ? '#bbf7d0' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    padding: '0.85rem',
                    marginTop: '0.25rem',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={paymentData.biometric_verified}
                      style={{ marginTop: '0.2rem' }}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setPaymentData({
                          ...paymentData,
                          biometric_verified: checked,
                          biometric_verification_code: checked
                            ? paymentData.biometric_verification_code || generateBiometricVerificationCode()
                            : '',
                        })
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: paymentData.biometric_verified ? '#166534' : 'inherit' }}>
                        🖐️ Authenticate Payment with Student Fingerprint Biometrics
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Verifies student identity at payment desk and stamps receipt with biometric security code.
                      </div>
                    </div>
                  </label>

                  {paymentData.biometric_verified && (
                    <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid #bbf7d0', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>Verified Finger:</strong> {paymentData.biometric_finger_used || 'Right Index'}
                      </div>
                      <div>
                        <strong>Auth Code:</strong> <code style={{ fontSize: '0.75rem', color: '#166534' }}>{paymentData.biometric_verification_code || 'BIO-PENDING'}</code>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">✓ Confirm & Issue Stamped Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Unit Registration */}
      {showUnitRegModal && (
        <div className="modal-overlay" onClick={() => setShowUnitRegModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Professional Short Course Unit Registration</h3>
              <button type="button" className="modal-close" onClick={() => setShowUnitRegModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCompleteUnitRegistration}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Select Student *</label>
                    <select className="input" value={regStudentId} onChange={(e) => setRegStudentId(e.target.value)}>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.admission_number} — {s.full_name} ({s.class_name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Course Duration / Period</label>
                    <select className="input" value={regCourseDuration} onChange={(e) => setRegCourseDuration(e.target.value)}>
                      {dynamicDurations.map((duration) => (
                        <option key={duration} value={duration}>
                          {duration}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Academic Year</label>
                    <input type="text" className="input" value={regAcademicYear} onChange={(e) => setRegAcademicYear(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="label">Select Approved Units to Register</label>
                  {courseUnits.length === 0 ? (
                    <div style={{ padding: '1rem', background: 'var(--color-bg-secondary)', borderRadius: '6px', fontSize: '0.85rem' }}>
                      No course units configured by faculty yet. Please ask teachers to introduce units in Faculty Portal.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                      {courseUnits.map((u) => (
                        <label
                          key={u.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.6rem 0.8rem',
                            background: selectedUnitIds.includes(u.id) ? 'var(--color-bg-alt)' : 'var(--color-bg-secondary)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedUnitIds.includes(u.id)}
                            onChange={() => handleToggleUnitSelect(u.id)}
                          />
                          <div style={{ flex: 1 }}>
                            <strong>{u.code} — {u.title}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                              {u.department} • {u.credit_hours} Credits • Lecturer: {u.teacher_name}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUnitRegModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={selectedUnitIds.length === 0}>
                  ✓ Complete Registration & Issue Slip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Generate New Fee Invoice */}
      {showInvoiceModal && (
        <div className="modal-overlay" onClick={() => setShowInvoiceModal(false)}>
          <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ margin: 0 }}>Generate Student Fee Invoice</h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Create a custom tuition invoice with dynamic billing items</div>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowInvoiceModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateInvoiceSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {students.length > 0 && (
                  <div>
                    <label className="label">Quick Select Admitted Student (Optional)</label>
                    <select
                      className="input"
                      value={newInvoice.student_id}
                      onChange={(e) => {
                        const std = students.find((s) => s.id === e.target.value)
                        if (std) {
                          setNewInvoice({
                            ...newInvoice,
                            student_id: std.id,
                            admission_number: std.admission_number,
                            student_name: std.full_name,
                            class_name: std.class_name,
                          })
                        }
                      }}
                    >
                      <option value="">-- Select from Student Directory or Type Below --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.admission_number} — {s.full_name} ({s.class_name})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Student Admission Number *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      placeholder="e.g. GC-2026-001"
                      value={newInvoice.admission_number}
                      onChange={(e) => {
                        const adm = e.target.value
                        const std = students.find((s) => s.admission_number.toLowerCase() === adm.toLowerCase())
                        setNewInvoice({
                          ...newInvoice,
                          admission_number: adm,
                          student_name: std ? std.full_name : newInvoice.student_name,
                          class_name: std ? std.class_name : newInvoice.class_name,
                        })
                      }}
                    />
                  </div>
                  <div>
                    <label className="label">Student Full Name *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      placeholder="Enter student full name"
                      value={newInvoice.student_name}
                      onChange={(e) => setNewInvoice({ ...newInvoice, student_name: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Quick Select Certified Program (Auto-fills Tuition & Duration)</label>
                  <select
                    className="input"
                    onChange={(e) => {
                      const dynamicList = getDynamicCoursesList(schoolStore.getSubjects(), schoolStore.getCourseUnits())
                      const selected = dynamicList.find((c) => c.id === e.target.value)
                      if (selected) {
                        setNewInvoice({
                          ...newInvoice,
                          class_name: selected.title,
                          term: selected.duration,
                          total_amount: selected.feeUsd,
                          item_description: `${selected.shortTitle} — Full Tuition & Practical Lab Access`,
                        })
                      }
                    }}
                  >
                    <option value="">-- Choose from Certified 2026 Programs or Type Custom Below --</option>
                    {getDynamicCoursesList(schoolStore.getSubjects(), schoolStore.getCourseUnits()).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.shortTitle} — ${c.feeUsd} (KES {c.feeKes.toLocaleString()}) • {c.duration}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Course / Program Name *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      placeholder="Enter course name"
                      value={newInvoice.class_name}
                      onChange={(e) => setNewInvoice({ ...newInvoice, class_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Course Duration / Period</label>
                    <select
                      className="input"
                      value={newInvoice.term}
                      onChange={(e) => setNewInvoice({ ...newInvoice, term: e.target.value })}
                    >
                      <option value="8 Weeks (2 Months)">8 Weeks (2 Months)</option>
                      <option value="10 Weeks">10 Weeks</option>
                      <option value="12 Weeks (3 Months)">12 Weeks (3 Months)</option>
                      <option value="16 Weeks (4 Months)">16 Weeks (4 Months)</option>
                      <option value="24 Weeks (6 Months)">24 Weeks (6 Months)</option>
                      <option value="Executive Masterclass">Executive Masterclass</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Billing Item Description *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      placeholder="e.g. Tuition Fee & Practical Lab Access"
                      value={newInvoice.item_description}
                      onChange={(e) => setNewInvoice({ ...newInvoice, item_description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Amount ($ USD) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="input"
                      placeholder="Enter amount (e.g. 120)"
                      value={newInvoice.total_amount || ''}
                      onChange={(e) => setNewInvoice({ ...newInvoice, total_amount: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Due Date</label>
                  <input
                    type="date"
                    className="input"
                    value={newInvoice.due_date}
                    onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowInvoiceModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">✓ Generate & Save Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Inquiry */}
      {showInquiryModal && (
        <div className="modal-overlay" onClick={() => setShowInquiryModal(false)}>
          <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Log Front Office Visitor Inquiry</h3>
              <button type="button" className="modal-close" onClick={() => setShowInquiryModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddInquiry}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="label">Visitor Full Name *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="Enter visitor full name"
                    value={newInquiry.visitor_name}
                    onChange={(e) => setNewInquiry({ ...newInquiry, visitor_name: e.target.value })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Phone Number *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      placeholder="07XX XXX XXX"
                      value={newInquiry.phone}
                      onChange={(e) => setNewInquiry({ ...newInquiry, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      className="input"
                      placeholder="visitor@gmail.com"
                      value={newInquiry.email}
                      onChange={(e) => setNewInquiry({ ...newInquiry, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Program of Interest</label>
                  <select
                    className="input"
                    value={newInquiry.program_of_interest}
                    onChange={(e) => setNewInquiry({ ...newInquiry, program_of_interest: e.target.value })}
                  >
                    {getDynamicCoursesList(schoolStore.getSubjects(), schoolStore.getCourseUnits()).map((c) => (
                      <option key={c.id} value={c.title}>
                        {c.icon} {c.shortTitle} (${c.feeUsd} / KES {c.feeKes.toLocaleString()})
                      </option>
                    ))}
                    <option value="General Admissions Consultation">General Admissions Consultation</option>
                  </select>
                </div>
                <div>
                  <label className="label">Inquiry Notes</label>
                  <textarea
                    rows={2}
                    className="input"
                    placeholder="Details discussed..."
                    value={newInquiry.notes}
                    onChange={(e) => setNewInquiry({ ...newInquiry, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowInquiryModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Inquiry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View & Print Official Stamped Receipt */}
      {selectedReceipt && (
        <div className="modal-overlay" onClick={() => setSelectedReceipt(null)}>
          <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', color: '#0f172a', padding: '2rem', borderRadius: '16px', maxWidth: '620px' }}>
            {/* Printable Receipt Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #1e3a8a', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <img src="/logo.png?v=2" alt={INSTITUTION_CONFIG.name} style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
                <div>
                  <h2 style={{ color: '#1e3a8a', margin: 0, fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>{INSTITUTION_CONFIG.name}</h2>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>{INSTITUTION_CONFIG.tagline} • {INSTITUTION_CONFIG.domain}</div>
                </div>
              </div>
              <div style={{ display: 'inline-block', background: '#f1f5f9', color: '#1e3a8a', padding: '3px 14px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 800 }}>
                OFFICIAL TUITION FEE PAYMENT RECEIPT (ORIGINAL)
              </div>
            </div>

            {/* Receipt Meta Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', marginBottom: '1.25rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ marginBottom: '0.35rem' }}><strong>Receipt #:</strong> <span style={{ color: '#1e3a8a', fontWeight: 800 }}>{selectedReceipt.receipt_number}</span></div>
                <div style={{ marginBottom: '0.35rem' }}><strong>Payment Date:</strong> {selectedReceipt.payment_date}</div>
                <div><strong>Ref / Transaction Code:</strong> <code>{selectedReceipt.reference_code}</code></div>
              </div>
              <div>
                <div style={{ marginBottom: '0.35rem' }}><strong>Student Adm No:</strong> <span style={{ fontWeight: 800 }}>{selectedReceipt.admission_number}</span></div>
                <div style={{ marginBottom: '0.35rem' }}><strong>Student Name:</strong> {selectedReceipt.student_name}</div>
                <div><strong>Payment Channel:</strong> <span className="badge badge-info">{selectedReceipt.payment_method}</span></div>
              </div>
            </div>

            {/* Payment Summary Box */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>AMOUNT PAID:</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#16a34a' }}>
                  ${(selectedReceipt.amount_paid ?? selectedReceipt.amount).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569', marginTop: '0.5rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem' }}>
                <span>Outstanding Balance Remaining:</span>
                <span>
                  {(selectedReceipt.balance_remaining ?? selectedReceipt.balance_after ?? 0) === 0 ? (
                    <strong style={{ color: '#16a34a' }}>$0.00 (FEE CLEARED ✓)</strong>
                  ) : (
                    <strong style={{ color: '#dc2626' }}>${(selectedReceipt.balance_remaining ?? selectedReceipt.balance_after ?? 0).toLocaleString()}</strong>
                  )}
                </span>
              </div>
            </div>

            {/* Officer & Payer Certification */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem' }}>Payer Name:</div>
                <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {selectedReceipt.paid_by || selectedReceipt.student_name}
                </div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem' }}>Issued & Received By:</div>
                <div style={{ fontWeight: 800, color: '#1e3a8a', marginTop: '2px' }}>
                  {selectedReceipt.recorded_by || selectedReceipt.received_by || defaultIssuer}
                </div>
              </div>
            </div>

              {/* Biometric Verification Stamp on Receipt */}
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

              {/* Official Digital Stamp */}
              <div style={{ background: '#f8fafc', border: '1px dashed #94a3b8', borderRadius: '8px', padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', color: '#475569' }}>
                <div>🛡️ <strong>OFFICIAL DIGITAL STAMP & VERIFICATION</strong></div>
                <div>{INSTITUTION_CONFIG.name} Directorate of Finance • 100% Online Virtual Campus</div>
                <div style={{ color: '#16a34a', fontWeight: 800, marginTop: '2px' }}>STATUS: TRANSACTION VERIFIED & ACCOUNT CREDITED</div>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'space-between', marginTop: '1.5rem', padding: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedReceipt(null)}>Close</button>
                <button type="button" className="btn btn-primary" onClick={() => window.print()}>🖨️ Print Stamped Receipt</button>
              </div>
            </div>
          </div>
        )}

      {/* Modal: View Unit Registration Slip */}
      {selectedSlipForView && (
        <UnitRegistrationSlip receipt={selectedSlipForView} onClose={() => setSelectedSlipForView(null)} />
      )}

      {/* Modal: Admission Calling Letter */}
      {selectedStudentForLetter && (
        <div className="modal-overlay" onClick={() => setSelectedStudentForLetter(null)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', color: '#0f172a', padding: '2.5rem' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #1e3a8a', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#1e3a8a', margin: 0, fontSize: '1.6rem', fontWeight: 900, textTransform: 'uppercase' }}>{INSTITUTION_CONFIG.name}</h2>
              <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Directorate of Admissions & Student Affairs</div>
              <div style={{ display: 'inline-block', background: '#f1f5f9', padding: '4px 16px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a', marginTop: '0.5rem' }}>
                OFFICIAL PROVISIONAL ADMISSION LETTER
              </div>
            </div>

            <div style={{ fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              <p>Dear <strong>{selectedStudentForLetter.full_name}</strong> (Adm No: <strong>{selectedStudentForLetter.admission_number}</strong>),</p>
              <p>
                We are pleased to inform you that you have been offered provisional admission to study <strong>{selectedStudentForLetter.class_name}</strong> at {INSTITUTION_CONFIG.name}.
              </p>
              <p>
                Your reporting date is effective from <strong>{selectedStudentForLetter.admission_date || selectedStudentForLetter.enrollment_date || currentAcademicYear}</strong>. Please ensure complete fee clearance with the Bursar's Office to finalize your unit registration and obtain your student identification badge.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{profile?.full_name || 'Academic Registrar & Bursar'}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Bursar & Admissions Registrar</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedStudentForLetter(null)}>Close</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨️ Print Letter</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Student ID Card */}
      {selectedStudentForIdCard && (
        <div className="modal-overlay" onClick={() => setSelectedStudentForIdCard(null)}>
          <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', color: '#0f172a', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)', color: '#fff', padding: '1rem', borderRadius: '8px 8px 0 0', textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>GLOBAL COLLEGE</h3>
              <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>STUDENT IDENTIFICATION PASS</div>
            </div>
            <div style={{ padding: '1.25rem', textAlign: 'center', background: '#f8fafc', borderRadius: '0 0 8px 8px', border: '1px solid #e2e8f0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#1e3a8a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', fontSize: '1.5rem', fontWeight: 800 }}>
                {selectedStudentForIdCard.full_name.slice(0, 2).toUpperCase()}
              </div>
              <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', fontWeight: 800 }}>{selectedStudentForIdCard.full_name}</h4>
              <div style={{ color: '#1e3a8a', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                {selectedStudentForIdCard.admission_number}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.75rem' }}>
                {selectedStudentForIdCard.class_name}
              </div>
              <div style={{ background: '#22c55e', color: '#fff', display: 'inline-block', padding: '2px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700 }}>
                VALID {currentAcademicYear}
              </div>
            </div>
            <div className="modal-footer" style={{ marginTop: '1rem', justifyContent: 'space-between' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedStudentForIdCard(null)}>Close</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨️ Print ID</button>
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
            setPaymentData({
              student_id: std.id,
              admission_number: std.admission_number,
              student_name: std.full_name,
              course_name: std.class_name,
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
      {selectedClearancePass && (
        <BiometricClearancePassModal
          pass={selectedClearancePass}
          onClose={() => setSelectedClearancePass(null)}
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

            <form onSubmit={handleSaveUpdateReceipt}>
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
                    placeholder="e.g. Corrected deposit ref, adjusted fee balance"
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
    </div>
  )
}
