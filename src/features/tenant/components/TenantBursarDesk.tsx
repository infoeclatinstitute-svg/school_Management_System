import React, { useState, useMemo } from 'react'
import type {
  PartnerSchoolTenant,
  TenantStaffMember,
  TenantStudentMember,
  TenantPayrollRecord,
  TenantFeePayment,
  TenantSessionUser,
} from '@/types/tenantSchool'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'

interface TenantBursarDeskProps {
  school: PartnerSchoolTenant
  staffList: TenantStaffMember[]
  studentList: TenantStudentMember[]
  payrollList: TenantPayrollRecord[]
  feePaymentsList: TenantFeePayment[]
  sessionUser?: TenantSessionUser | null
  onReloadData: () => void
  onOpenPayslip: (payslip: TenantPayrollRecord) => void
  onOpenReceipt: (receipt: TenantFeePayment) => void
  onOpenInvoice?: (student: TenantStudentMember) => void
}

// Client-side CSV Exporter Utility
function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const sanitize = (val: string | number) => {
    const str = String(val ?? '').replace(/"/g, '""')
    return `"${str}"`
  }
  const content = [
    headers.map(sanitize).join(','),
    ...rows.map((row) => row.map(sanitize).join(',')),
  ].join('\r\n')

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function TenantBursarDesk({
  school,
  staffList: _staffList,
  studentList,
  payrollList,
  feePaymentsList,
  sessionUser,
  onReloadData,
  onOpenPayslip,
  onOpenReceipt,
  onOpenInvoice,
}: TenantBursarDeskProps) {
  const primaryColor = school.primary_color || '#b45309'
  const currency = school.currency || 'KES'
  const activePeriod = school.active_period_name || 'Active Term'

  // Sub-tabs navigation
  const [bursarSubTab, setBursarSubTab] = useState<
    'payments' | 'arrears' | 'payroll' | 'structure' | 'banking'
  >('payments')

  // Search & Filter States
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL')
  const [paymentPeriodFilter, setPaymentPeriodFilter] = useState<string>('ALL')

  const [arrearsSearchQuery, setArrearsSearchQuery] = useState('')
  const [arrearsClassFilter, setArrearsClassFilter] = useState<string>('ALL')
  const [arrearsSeverityFilter, setArrearsSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'ZERO_PAID'>('ALL')

  // Payroll Filter States
  const availablePayrollMonths = useMemo(() => {
    const months = Array.from(new Set(payrollList.map((p) => p.month_period)))
    if (months.length === 0) {
      const now = new Date()
      const currentMonthStr = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`
      return [currentMonthStr]
    }
    return months
  }, [payrollList])

  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState<string>(() => {
    return availablePayrollMonths[0] || 'Current Period'
  })
  const [payrollStatusFilter, setPayrollStatusFilter] = useState<'ALL' | 'draft' | 'approved' | 'disbursed'>('ALL')

  // Modals state
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false)
  const [showBatchInvoiceModal, setShowBatchInvoiceModal] = useState(false)
  const [showStudentFeeAdjustmentModal, setShowStudentFeeAdjustmentModal] = useState(false)
  const [selectedStudentForAdjustment, setSelectedStudentForAdjustment] = useState<TenantStudentMember | null>(null)
  const [adjustedFeeTotalInput, setAdjustedFeeTotalInput] = useState<number>(0)
  const [showDisburseBatchModal, setShowDisburseBatchModal] = useState(false)
  const [batchDisburseChannel, setBatchDisburseChannel] = useState<'Bank Wire' | 'Mobile Money' | 'Cheque'>('Bank Wire')

  // Exam clearance temporary permissions state (admission_number -> true)
  const [examClearanceOverrides, setExamClearanceOverrides] = useState<Record<string, boolean>>({})

  // Dynamic Cohorts list
  const cohortsList = useMemo(() => {
    if (Array.isArray(school.classes_list) && school.classes_list.length > 0) {
      return school.classes_list
    }
    const fromStudents = Array.from(new Set(studentList.map((s) => s.grade_class).filter(Boolean)))
    return fromStudents.length > 0 ? fromStudents : ['General Cohort']
  }, [school.classes_list, studentList])

  // New Payment Form Input
  const [newPaymentInput, setNewPaymentInput] = useState({
    student_id: studentList[0]?.id || '',
    student_search: '',
    amount: 0,
    payment_method: 'Bank Wire' as 'Bank Wire' | 'Mobile Money (M-Pesa)' | 'Credit Card' | 'Cash',
    reference_code: '',
    period_name: activePeriod,
    bursar_notes: '',
  })

  // Banking Channels State
  const [bankingConfig, setBankingConfig] = useState(() => {
    const code = Math.abs(
      school.slug.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)
    ) % 900000 + 100000
    return {
      bank_name: `${school.name} Designated Revenue Bank`,
      account_name: `${school.name} Operations Treasury`,
      account_number: `ACC-${school.slug.toUpperCase().slice(0, 4)}-${code}`,
      mobile_channel: 'M-Pesa Business Paybill',
      paybill_number: `${code}`,
      account_format: 'ADM-XXXX',
    }
  })
  const [isEditingBanking, setIsEditingBanking] = useState(false)

  // Batch Invoicing State
  const [batchInvoiceForm, setBatchInvoiceForm] = useState(() => {
    const firstCohort = cohortsList[0] || ''
    const cohortStudents = studentList.filter((s) => s.grade_class === firstCohort)
    const existingFee = cohortStudents[0]?.fee_total || 0
    return {
      target_cohort: firstCohort,
      tuition_component: existingFee > 0 ? Math.round(existingFee * 0.75) : 0,
      exam_component: existingFee > 0 ? Math.round(existingFee * 0.1) : 0,
      activity_component: existingFee > 0 ? Math.round(existingFee * 0.05) : 0,
      lab_component: existingFee > 0 ? Math.round(existingFee * 0.05) : 0,
      library_component: existingFee > 0 ? Math.round(existingFee * 0.05) : 0,
    }
  })


  // Selected student for fee payment modal
  const selectedStudentForPayment = useMemo(() => {
    return studentList.find((s) => s.id === newPaymentInput.student_id) || studentList[0]
  }, [studentList, newPaymentInput.student_id])

  // Financial Telemetry Metrics
  const totalBilled = useMemo(() => studentList.reduce((acc, s) => acc + (s.fee_total || 0), 0), [studentList])
  const totalCollected = useMemo(() => studentList.reduce((acc, s) => acc + (s.fee_paid || 0), 0), [studentList])
  const totalArrears = useMemo(() => studentList.reduce((acc, s) => acc + (s.fee_balance || 0), 0), [studentList])
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 100

  // Defaulters list
  const defaultersList = useMemo(() => studentList.filter((s) => (s.fee_balance || 0) > 0), [studentList])

  // Filtered Payroll List
  const filteredPayroll = useMemo(() => {
    return payrollList.filter((p) => {
      const matchMonth = selectedPayrollMonth === 'ALL' || p.month_period === selectedPayrollMonth
      const matchStatus = payrollStatusFilter === 'ALL' || p.status === payrollStatusFilter
      return matchMonth && matchStatus
    })
  }, [payrollList, selectedPayrollMonth, payrollStatusFilter])

  const totalMonthGrossPayroll = useMemo(() => filteredPayroll.reduce((acc, p) => acc + p.gross_salary, 0), [filteredPayroll])
  const totalMonthNetPayroll = useMemo(() => filteredPayroll.reduce((acc, p) => acc + p.net_salary, 0), [filteredPayroll])
  const totalMonthTax = useMemo(() => filteredPayroll.reduce((acc, p) => acc + p.tax_deduction, 0), [filteredPayroll])
  const totalMonthPension = useMemo(() => filteredPayroll.reduce((acc, p) => acc + p.pension_deduction, 0), [filteredPayroll])

  // Net operating surplus
  const netOperatingCashflow = totalCollected - totalMonthNetPayroll

  // Handle Record Fee Payment
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentForPayment) {
      alert('Please select a valid student.')
      return
    }

    const payAmount = Number(newPaymentInput.amount)
    if (isNaN(payAmount) || payAmount <= 0) {
      alert('Please enter a valid payment amount greater than zero.')
      return
    }

    const recordedByName = sessionUser
      ? `${sessionUser.name || sessionUser.full_name || 'Bursar'} (${school.name})`
      : `${school.name} Bursar's Office`

    const payment = tenantSchoolStore.recordFeePayment({
      school_slug: school.slug,
      student_id: selectedStudentForPayment.id,
      student_name: selectedStudentForPayment.full_name,
      admission_number: selectedStudentForPayment.admission_number,
      amount: payAmount,
      period_name: newPaymentInput.period_name || activePeriod,
      payment_method: newPaymentInput.payment_method,
      recorded_by: recordedByName,
    })

    setShowRecordPaymentModal(false)
    // Reset amount
    setNewPaymentInput((prev) => ({ ...prev, amount: 0, reference_code: '', bursar_notes: '' }))
    onReloadData()
    onOpenReceipt(payment)
  }

  // Handle Cohort Batch Invoicing
  const handleExecuteBatchInvoice = (e: React.FormEvent) => {
    e.preventDefault()
    const cohort = batchInvoiceForm.target_cohort
    if (!cohort) return

    const totalCalculated =
      Number(batchInvoiceForm.tuition_component) +
      Number(batchInvoiceForm.exam_component) +
      Number(batchInvoiceForm.activity_component) +
      Number(batchInvoiceForm.lab_component) +
      Number(batchInvoiceForm.library_component)

    const cohortStudents = studentList.filter((s) => s.grade_class === cohort)
    if (cohortStudents.length === 0) {
      alert(`No active students currently enrolled under class cohort "${cohort}".`)
      return
    }

    let updatedCount = 0
    cohortStudents.forEach((st) => {
      tenantSchoolStore.updateStudent(st.id, {
        fee_total: totalCalculated,
      })
      updatedCount++
    })

    setShowBatchInvoiceModal(false)
    onReloadData()
    alert(
      `✓ Successfully invoiced ${updatedCount} students in ${cohort} with new standard term rate of ${currency} ${totalCalculated.toLocaleString()}!`
    )
  }

  // Handle Individual Fee Adjustment
  const handleExecuteStudentFeeAdjustment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentForAdjustment) return

    const newTotal = Number(adjustedFeeTotalInput)
    if (isNaN(newTotal) || newTotal < 0) {
      alert('Please enter a valid billing total.')
      return
    }

    tenantSchoolStore.updateStudent(selectedStudentForAdjustment.id, {
      fee_total: newTotal,
    })

    setShowStudentFeeAdjustmentModal(false)
    setSelectedStudentForAdjustment(null)
    onReloadData()
    alert(`Updated billed fee total for ${selectedStudentForAdjustment.full_name} to ${currency} ${newTotal.toLocaleString()}.`)
  }

  // Handle Disbursing Batch
  const handleExecuteBatchDisburse = () => {
    tenantSchoolStore.disbursePayrollBatch(school.slug, selectedPayrollMonth, batchDisburseChannel)
    setShowDisburseBatchModal(false)
    onReloadData()
    alert(`✓ Successfully disbursed payroll batch for ${selectedPayrollMonth} via ${batchDisburseChannel}!`)
  }

  // CSV Export Handlers
  const handleExportPaymentsCSV = () => {
    const headers = ['Receipt Number', 'Student Name', 'Admission No', 'Date', 'Payment Channel', 'Period', 'Amount Paid', 'Recorded By']
    const rows = feePaymentsList.map((p) => [
      p.receipt_number,
      p.student_name,
      p.admission_number,
      new Date(p.date).toLocaleString('en-GB'),
      p.payment_method,
      p.period_name,
      p.amount,
      p.recorded_by,
    ])
    downloadCSV(`${school.slug}-fee-payments-ledger-${Date.now()}.csv`, headers, rows)
  }

  const handleExportArrearsCSV = () => {
    const headers = ['Admission No', 'Student Name', 'Class Cohort', 'Guardian Name', 'Guardian Phone', 'Billed Total', 'Paid Amount', 'Outstanding Arrears']
    const rows = defaultersList.map((s) => [
      s.admission_number,
      s.full_name,
      s.grade_class,
      s.guardian_name,
      s.guardian_phone,
      s.fee_total,
      s.fee_paid,
      s.fee_balance,
    ])
    downloadCSV(`${school.slug}-fee-arrears-defaulters-${Date.now()}.csv`, headers, rows)
  }

  const handleExportPayrollCSV = () => {
    const headers = ['Month Period', 'Staff Name', 'Role', 'Department', 'Base Salary', 'Allowances', 'Gross Salary', 'Tax (PAYE)', 'Pension', 'Net Salary', 'Status', 'Payment Method']
    const rows = filteredPayroll.map((p) => [
      p.month_period,
      p.staff_name,
      p.role,
      p.department,
      p.base_salary,
      p.housing_allowance + p.transport_allowance,
      p.gross_salary,
      p.tax_deduction,
      p.pension_deduction,
      p.net_salary,
      p.status,
      p.payment_method,
    ])
    downloadCSV(`${school.slug}-payroll-${selectedPayrollMonth.replace(/\s+/g, '-')}-${Date.now()}.csv`, headers, rows)
  }

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    return feePaymentsList.filter((p) => {
      const q = paymentSearchQuery.toLowerCase()
      const matchQuery =
        !q ||
        p.receipt_number.toLowerCase().includes(q) ||
        p.student_name.toLowerCase().includes(q) ||
        p.admission_number.toLowerCase().includes(q) ||
        p.recorded_by.toLowerCase().includes(q)

      const matchMethod = paymentMethodFilter === 'ALL' || p.payment_method === paymentMethodFilter
      const matchPeriod = paymentPeriodFilter === 'ALL' || p.period_name === paymentPeriodFilter
      return matchQuery && matchMethod && matchPeriod
    })
  }, [feePaymentsList, paymentSearchQuery, paymentMethodFilter, paymentPeriodFilter])

  // Filtered Defaulters List
  const filteredDefaulters = useMemo(() => {
    return defaultersList.filter((s) => {
      const q = arrearsSearchQuery.toLowerCase()
      const matchQuery =
        !q ||
        s.full_name.toLowerCase().includes(q) ||
        s.admission_number.toLowerCase().includes(q) ||
        s.guardian_name.toLowerCase().includes(q)

      const matchClass = arrearsClassFilter === 'ALL' || s.grade_class === arrearsClassFilter

      let matchSeverity = true
      if (arrearsSeverityFilter === 'CRITICAL') {
        matchSeverity = s.fee_total > 0 && s.fee_balance / s.fee_total >= 0.5
      } else if (arrearsSeverityFilter === 'ZERO_PAID') {
        matchSeverity = s.fee_paid === 0
      }

      return matchQuery && matchClass && matchSeverity
    })
  }, [defaultersList, arrearsSearchQuery, arrearsClassFilter, arrearsSeverityFilter])

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* ============================================================ */}
      {/* TOP HEADER: INSTITUTIONAL TREASURY & BURSAR DESK */}
      {/* ============================================================ */}
      <div
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
          borderRadius: '24px',
          padding: '2rem 2.25rem',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          marginBottom: '1.75rem',
          boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.04), 0 4px 12px -2px rgba(15, 23, 42, 0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.25rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '18px',
                background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                boxShadow: '0 8px 24px -4px rgba(180, 83, 9, 0.35)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                flexShrink: 0,
              }}
            >
              🏛️
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: primaryColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {school.name} FINANCE &amp; TREASURY
                </span>
                <span
                  style={{
                    background: '#fef3c7',
                    color: '#92400e',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    border: '1px solid #fde68a',
                  }}
                >
                  OFFICE OF THE BURSAR
                </span>
                <span
                  style={{
                    background: '#e0f2fe',
                    color: '#0369a1',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                  }}
                >
                  {currency} Accounting Standard
                </span>
              </div>
              <h2
                style={{
                  fontSize: '1.65rem',
                  fontWeight: 900,
                  margin: '4px 0 0',
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                }}
              >
                Bursar Revenue, Tuition Ledger &amp; Payroll Desk
              </h2>
              <div style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '4px' }}>
                Active Accounting Period: <strong style={{ color: '#0f172a' }}>{activePeriod}</strong> • Collection Entity:{' '}
                <strong style={{ color: '#0f172a' }}>{school.name} Operations Treasury</strong>
              </div>
            </div>
          </div>

          {/* Quick Actions Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowBatchInvoiceModal(true)}
              style={{
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 700,
                padding: '0.65rem 1.15rem',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>📋</span> Invoice Cohort
            </button>
            <button
              type="button"
              onClick={() => setShowRecordPaymentModal(true)}
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, #92400e 100%)`,
                color: '#ffffff',
                fontWeight: 800,
                padding: '0.65rem 1.25rem',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px -2px rgba(180, 83, 9, 0.4)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>💳</span> + Record Tuition Payment
            </button>
          </div>
        </div>

        {/* Sub-tab Navigation Pills */}
        <div
          style={{
            display: 'flex',
            gap: '0.4rem',
            flexWrap: 'wrap',
            background: '#f8fafc',
            padding: '6px',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            onClick={() => setBursarSubTab('payments')}
            style={{
              background: bursarSubTab === 'payments' ? primaryColor : 'transparent',
              color: bursarSubTab === 'payments' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: bursarSubTab === 'payments' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: bursarSubTab === 'payments' ? '0 4px 12px rgba(180, 83, 9, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🧾</span> Tuition Payments &amp; Receipts ({feePaymentsList.length})
          </button>

          <button
            type="button"
            onClick={() => setBursarSubTab('arrears')}
            style={{
              background: bursarSubTab === 'arrears' ? primaryColor : 'transparent',
              color: bursarSubTab === 'arrears' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: bursarSubTab === 'arrears' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: bursarSubTab === 'arrears' ? '0 4px 12px rgba(180, 83, 9, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>⚠️</span> Arrears &amp; Defaulters Roster ({defaultersList.length})
          </button>

          <button
            type="button"
            onClick={() => setBursarSubTab('payroll')}
            style={{
              background: bursarSubTab === 'payroll' ? primaryColor : 'transparent',
              color: bursarSubTab === 'payroll' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: bursarSubTab === 'payroll' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: bursarSubTab === 'payroll' ? '0 4px 12px rgba(180, 83, 9, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>💼</span> Staff Monthly Payroll ({payrollList.length})
          </button>

          <button
            type="button"
            onClick={() => setBursarSubTab('structure')}
            style={{
              background: bursarSubTab === 'structure' ? primaryColor : 'transparent',
              color: bursarSubTab === 'structure' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: bursarSubTab === 'structure' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: bursarSubTab === 'structure' ? '0 4px 12px rgba(180, 83, 9, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📋</span> Cohort Fee Schedules &amp; Billing ({cohortsList.length})
          </button>

          <button
            type="button"
            onClick={() => setBursarSubTab('banking')}
            style={{
              background: bursarSubTab === 'banking' ? primaryColor : 'transparent',
              color: bursarSubTab === 'banking' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: bursarSubTab === 'banking' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: bursarSubTab === 'banking' ? '0 4px 12px rgba(180, 83, 9, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🏦</span> Banking &amp; Payment Channels
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* FINANCIAL INTELLIGENCE METRICS TELEMETRY STRIP */}
      {/* ============================================================ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Card 1: Gross Invoiced */}
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            borderRadius: '18px',
            padding: '1.35rem 1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.03)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#0f172a' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TOTAL BILLED TUITION
            </span>
            <span style={{ fontSize: '1.1rem' }}>🏛️</span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', margin: '6px 0 2px', letterSpacing: '-0.02em' }}>
            {currency} {totalBilled.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
            {studentList.length} Total Enrolled Students
          </div>
        </div>

        {/* Card 2: Collected Revenue */}
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            borderRadius: '18px',
            padding: '1.35rem 1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.03)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#16a34a' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              COLLECTED REVENUE
            </span>
            <span style={{ fontSize: '1.1rem' }}>📈</span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#16a34a', margin: '6px 0 2px', letterSpacing: '-0.02em' }}>
            {currency} {totalCollected.toLocaleString()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}>
            <div style={{ flex: 1, background: '#dcfce7', height: '6px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, collectionRate)}%`, background: '#16a34a', height: '100%' }} />
            </div>
            <span>{collectionRate}%</span>
          </div>
        </div>

        {/* Card 3: Arrears Deficit */}
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            borderRadius: '18px',
            padding: '1.35rem 1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.03)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: totalArrears > 0 ? '#dc2626' : '#16a34a',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              OUTSTANDING ARREARS
            </span>
            <span style={{ fontSize: '1.1rem' }}>⚠️</span>
          </div>
          <div
            style={{
              fontSize: '1.65rem',
              fontWeight: 900,
              color: totalArrears > 0 ? '#dc2626' : '#16a34a',
              margin: '6px 0 2px',
              letterSpacing: '-0.02em',
            }}
          >
            {currency} {totalArrears.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: totalArrears > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
            {defaultersList.length} Defaulter Accounts Pending
          </div>
        </div>

        {/* Card 4: Monthly Net Payroll */}
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            borderRadius: '18px',
            padding: '1.35rem 1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.03)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#b45309' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              MONTHLY NET PAYROLL
            </span>
            <span style={{ fontSize: '1.1rem' }}>💼</span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', margin: '6px 0 2px', letterSpacing: '-0.02em' }}>
            {currency} {totalMonthNetPayroll.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 700 }}>
            {filteredPayroll.length} Staff Compensation Slips
          </div>
        </div>

        {/* Card 5: Net Operating Surplus */}
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            borderRadius: '18px',
            padding: '1.35rem 1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.03)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: netOperatingCashflow >= 0 ? '#2563eb' : '#dc2626',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              NET OPERATING SURPLUS
            </span>
            <span style={{ fontSize: '1.1rem' }}>⚖️</span>
          </div>
          <div
            style={{
              fontSize: '1.65rem',
              fontWeight: 900,
              color: netOperatingCashflow >= 0 ? '#2563eb' : '#dc2626',
              margin: '6px 0 2px',
              letterSpacing: '-0.02em',
            }}
          >
            {currency} {netOperatingCashflow.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
            Tuition Inflow Less Staff Overhead
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SUBTAB 1: TUITION PAYMENTS & VERIFIED RECEIPTS */}
      {/* ============================================================ */}
      {bursarSubTab === 'payments' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                Tuition Payment Ledger &amp; Verified Receipts
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Complete audit trail of all electronic transfers, M-Pesa mobile money, bank wires, and cash deposits.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleExportPaymentsCSV}
                style={{
                  background: '#f8fafc',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  padding: '0.5rem 0.95rem',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>⬇</span> Export CSV Ledger
              </button>
              <button
                type="button"
                onClick={() => setShowRecordPaymentModal(true)}
                style={{
                  background: primaryColor,
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px -2px rgba(180, 83, 9, 0.3)',
                }}
              >
                <span>+</span> Record Fee Payment
              </button>
            </div>
          </div>

          {/* Filtering Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ flex: '1 1 240px' }}>
              <input
                type="text"
                placeholder="Search receipt #, student name, admission #..."
                value={paymentSearchQuery}
                onChange={(e) => setPaymentSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  background: '#ffffff',
                }}
              >
                <option value="ALL">All Payment Channels</option>
                <option value="Bank Wire">Bank Wire / Transfer</option>
                <option value="Mobile Money (M-Pesa)">Mobile Money (M-Pesa)</option>
                <option value="Credit Card">Credit / Debit Card</option>
                <option value="Cash">Cash Deposit</option>
              </select>
            </div>

            <div>
              <select
                value={paymentPeriodFilter}
                onChange={(e) => setPaymentPeriodFilter(e.target.value)}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  background: '#ffffff',
                }}
              >
                <option value="ALL">All Academic Periods</option>
                <option value={activePeriod}>{activePeriod} (Current)</option>
              </select>
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3.5rem 1.5rem',
                background: '#f8fafc',
                borderRadius: '16px',
                border: '1px dashed #cbd5e1',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🧾</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>No Payment Records Found</div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 1rem' }}>
                There are no fee transactions matching your current search parameters.
              </p>
              <button
                type="button"
                onClick={() => setShowRecordPaymentModal(true)}
                style={{
                  background: primaryColor,
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '0.55rem 1.15rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                + Record First Payment
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a' }}>Receipt Number</th>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a' }}>Student Candidate</th>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a' }}>Date &amp; Time</th>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a' }}>Channel</th>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a' }}>Academic Period</th>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>
                      Amount Paid
                    </th>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
                      Official Slip
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p) => (
                    <tr
                      key={p.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fcfdfe')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: primaryColor }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.receipt_number}</span>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{p.student_name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Adm: {p.admission_number}</div>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', color: '#64748b' }}>
                        {new Date(p.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <span
                          style={{
                            background:
                              p.payment_method.includes('M-Pesa') || p.payment_method.includes('Mobile')
                                ? '#dcfce7'
                                : p.payment_method === 'Bank Wire'
                                ? '#e0f2fe'
                                : '#f1f5f9',
                            color:
                              p.payment_method.includes('M-Pesa') || p.payment_method.includes('Mobile')
                                ? '#166534'
                                : p.payment_method === 'Bank Wire'
                                ? '#0369a1'
                                : '#334155',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                          }}
                        >
                          {p.payment_method}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', color: '#475569', fontSize: '0.78rem' }}>
                        {p.period_name || activePeriod}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', fontWeight: 900, color: '#16a34a', fontSize: '0.95rem' }}>
                        {currency} {p.amount.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onOpenReceipt(p)}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          }}
                        >
                          <span>🖨️</span> Print Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBTAB 2: FEE ARREARS & DEFAULTERS RECOVERY */}
      {/* ============================================================ */}
      {bursarSubTab === 'arrears' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                Aging Debtors &amp; Fee Defaulters Clearance Terminal
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Track outstanding tuition arrears, dispatch automated WhatsApp &amp; SMS demand notices, and issue exam permits.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleExportArrearsCSV}
                style={{
                  background: '#f8fafc',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  padding: '0.5rem 0.95rem',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>⬇</span> Export Arrears Roster (CSV)
              </button>
            </div>
          </div>

          {/* Filtering Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ flex: '1 1 240px' }}>
              <input
                type="text"
                placeholder="Search student, admission #, guardian..."
                value={arrearsSearchQuery}
                onChange={(e) => setArrearsSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <select
                value={arrearsClassFilter}
                onChange={(e) => setArrearsClassFilter(e.target.value)}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  background: '#ffffff',
                }}
              >
                <option value="ALL">All Classes / Cohorts</option>
                {cohortsList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={arrearsSeverityFilter}
                onChange={(e) => setArrearsSeverityFilter(e.target.value as any)}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  background: '#ffffff',
                }}
              >
                <option value="ALL">All Outstanding Debtors</option>
                <option value="CRITICAL">Critical Arrears (&gt;50% Unpaid)</option>
                <option value="ZERO_PAID">Zero Payments Made</option>
              </select>
            </div>
          </div>

          {filteredDefaulters.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3.5rem 1rem',
                background: '#f0fdf4',
                borderRadius: '16px',
                border: '1px dashed #86efac',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎉</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#16a34a' }}>
                Zero Pending Arrears Found!
              </div>
              <p style={{ fontSize: '0.85rem', color: '#166534', margin: '4px 0 0' }}>
                All student accounts under the selected filter are fully cleared or in good standing.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a' }}>Admission No</th>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a' }}>Student &amp; Class</th>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a' }}>Guardian Contact</th>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>
                      Billed Total
                    </th>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>
                      Paid to Date
                    </th>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>
                      Outstanding Arrears
                    </th>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
                      Exam Permit
                    </th>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
                      Recovery Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDefaulters.map((s) => {
                    const pctPaid = s.fee_total > 0 ? Math.round((s.fee_paid / s.fee_total) * 100) : 0
                    const isPermitted = examClearanceOverrides[s.admission_number] || false
                    const cleanPhone = (s.guardian_phone || '').replace(/[^0-9]/g, '')
                    const whatsappMsg = `Dear ${s.guardian_name}, this is an official fee reminder from ${school.name} Bursar's Office regarding student ${s.full_name} (${s.admission_number}). The outstanding tuition balance is ${currency} ${s.fee_balance.toLocaleString()}. Kindly arrange clearance before the upcoming assessment period. For inquiries, contact ${school.contact_phone}. Thank you.`

                    return (
                      <tr
                        key={s.id}
                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#fcfdfe')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: primaryColor }}>
                          <span style={{ fontFamily: 'monospace' }}>{s.admission_number}</span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{s.full_name}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{s.grade_class}</div>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <div style={{ fontWeight: 700, color: '#334155' }}>{s.guardian_name || 'Guardian'}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{s.guardian_phone || 'No phone'}</div>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', color: '#475569' }}>
                          {currency} {s.fee_total.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>
                          <div>{currency} {s.fee_paid.toLocaleString()}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>({pctPaid}% cleared)</div>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', fontWeight: 900, color: '#dc2626', fontSize: '0.95rem' }}>
                          {currency} {s.fee_balance.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setExamClearanceOverrides((prev) => ({
                                ...prev,
                                [s.admission_number]: !prev[s.admission_number],
                              }))
                            }}
                            style={{
                              background: isPermitted ? '#dcfce7' : '#fee2e2',
                              color: isPermitted ? '#15803d' : '#991b1b',
                              border: `1px solid ${isPermitted ? '#86efac' : '#fca5a5'}`,
                              padding: '0.3rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            {isPermitted ? '✓ Cleared' : '⛔ Restricted'}
                          </button>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            {/* WhatsApp Demand Notice */}
                            <a
                              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                background: '#25D366',
                                color: '#ffffff',
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Send WhatsApp Notice"
                            >
                              <span>💬</span> WhatsApp
                            </a>

                            {/* Direct Call */}
                            {s.guardian_phone && (
                              <a
                                href={`tel:${s.guardian_phone}`}
                                style={{
                                  background: '#f1f5f9',
                                  color: '#334155',
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '6px',
                                  textDecoration: 'none',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  border: '1px solid #cbd5e1',
                                }}
                                title="Call Guardian"
                              >
                                📞 Call
                              </a>
                            )}

                            {/* Official Statement / Fee Invoice PDF */}
                            {onOpenInvoice && (
                              <button
                                type="button"
                                onClick={() => onOpenInvoice(s)}
                                style={{
                                  background: '#ffffff',
                                  color: '#0f172a',
                                  border: '1px solid #cbd5e1',
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '6px',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                                title="Print Official Fee Invoice & Account Statement"
                              >
                                <span>📄</span> Invoice
                              </button>
                            )}

                            {/* Record Quick Payment for this student */}
                            <button
                              type="button"
                              onClick={() => {
                                setNewPaymentInput({
                                  student_id: s.id,
                                  student_search: '',
                                  amount: s.fee_balance,
                                  payment_method: 'Mobile Money (M-Pesa)',
                                  reference_code: '',
                                  period_name: activePeriod,
                                  bursar_notes: '',
                                })
                                setShowRecordPaymentModal(true)
                              }}
                              style={{
                                background: primaryColor,
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                              title="Record Payment for Student"
                            >
                              💳 Pay
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBTAB 3: STAFF PAYROLL REGISTER & DISBURSAL */}
      {/* ============================================================ */}
      {bursarSubTab === 'payroll' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                Staff Monthly Payroll Register &amp; Compensation
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Compute base salaries, housing/transport allowances, PAYE income tax, pension deductions, and bank/mobile disbursals.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleExportPayrollCSV}
                style={{
                  background: '#f8fafc',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  padding: '0.5rem 0.95rem',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>⬇</span> Export Payroll (CSV)
              </button>

              <button
                type="button"
                onClick={() => {
                  tenantSchoolStore.generateMonthlyPayroll(school.slug, selectedPayrollMonth)
                  onReloadData()
                  alert(`✓ Generated / refreshed payroll batch for "${selectedPayrollMonth}" across all active staff!`)
                }}
                style={{
                  background: '#f8fafc',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  padding: '0.5rem 0.95rem',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>⚡</span> Sync Staff Batch
              </button>

              <button
                type="button"
                onClick={() => {
                  tenantSchoolStore.approvePayrollBatch(school.slug, selectedPayrollMonth)
                  onReloadData()
                  alert(`✓ Approved all staff payroll slips for "${selectedPayrollMonth}"!`)
                }}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>✓</span> Approve Batch
              </button>

              <button
                type="button"
                onClick={() => setShowDisburseBatchModal(true)}
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px -2px rgba(22, 163, 74, 0.4)',
                }}
              >
                <span>🚀</span> Disburse Batch
              </button>
            </div>
          </div>

          {/* Month Selector & Filter */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              marginBottom: '1.25rem',
              alignItems: 'center',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                Payroll Month Period
              </label>
              <select
                value={selectedPayrollMonth}
                onChange={(e) => setSelectedPayrollMonth(e.target.value)}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  background: '#ffffff',
                  fontWeight: 700,
                }}
              >
                {availablePayrollMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                Disbursal Status
              </label>
              <select
                value={payrollStatusFilter}
                onChange={(e) => setPayrollStatusFilter(e.target.value as any)}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  background: '#ffffff',
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="draft">Draft / Unapproved</option>
                <option value="approved">Approved for Disbursal</option>
                <option value="disbursed">Disbursed &amp; Paid</option>
              </select>
            </div>

            {/* Sub-summary metrics for selected month */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Month Gross</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>
                  {currency} {totalMonthGrossPayroll.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Tax Withheld (PAYE)</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#dc2626' }}>
                  {currency} {totalMonthTax.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Pension / Social</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#d97706' }}>
                  {currency} {totalMonthPension.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Net Disbursable</div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#16a34a' }}>
                  {currency} {totalMonthNetPayroll.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {filteredPayroll.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                background: '#f8fafc',
                borderRadius: '16px',
                border: '1px dashed #cbd5e1',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>💼</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>No Payroll Records for this Period</div>
              <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '4px 0 1rem' }}>
                Click below to compute and generate salary slips for all active teaching and administrative staff.
              </p>
              <button
                type="button"
                onClick={() => {
                  tenantSchoolStore.generateMonthlyPayroll(school.slug, selectedPayrollMonth)
                  onReloadData()
                }}
                style={{
                  background: primaryColor,
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '0.55rem 1.25rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                ⚡ Compute {selectedPayrollMonth} Payroll Batch
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a' }}>Staff Member</th>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a' }}>Role &amp; Department</th>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>
                      Base Pay
                    </th>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>
                      Allowances
                    </th>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>
                      Deductions
                    </th>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>
                      Net Pay
                    </th>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
                      Status
                    </th>
                    <th style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
                      Official Slip &amp; Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayroll.map((p) => (
                    <tr
                      key={p.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fcfdfe')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '0.85rem 0.75rem', fontWeight: 800, color: '#0f172a' }}>
                        <div>{p.staff_name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Period: {p.month_period}</div>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', color: '#64748b' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{p.role}</div>
                        <div style={{ fontSize: '0.72rem' }}>{p.department}</div>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', color: '#475569' }}>
                        {currency} {p.base_salary.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                        +{currency} {(p.housing_allowance + p.transport_allowance).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>
                        -{currency} {(p.tax_deduction + p.pension_deduction).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right', fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>
                        {currency} {p.net_salary.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                        <span
                          style={{
                            background:
                              p.status === 'disbursed' ? '#dcfce7' : p.status === 'approved' ? '#e0f2fe' : '#fef3c7',
                            color:
                              p.status === 'disbursed' ? '#15803d' : p.status === 'approved' ? '#0369a1' : '#b45309',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            display: 'inline-block',
                          }}
                        >
                          {p.status === 'disbursed'
                            ? '✓ Disbursed'
                            : p.status === 'approved'
                            ? '⏳ Approved'
                            : '📝 Draft'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => onOpenPayslip(p)}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>🖨️</span> Payslip
                          </button>

                          {p.status !== 'disbursed' && (
                            <button
                              type="button"
                              onClick={() => {
                                tenantSchoolStore.updatePayrollRecord(p.id, {
                                  status: 'disbursed',
                                  disbursed_at: new Date().toISOString(),
                                })
                                onReloadData()
                              }}
                              style={{
                                background: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                              title="Mark Individual Disbursal"
                            >
                              🚀 Disburse
                            </button>
                          )}
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

      {/* ============================================================ */}
      {/* SUBTAB 4: COHORT FEE SCHEDULES & DYNAMIC BILLING */}
      {/* ============================================================ */}
      {bursarSubTab === 'structure' && (() => {
        const _schoolPrograms = tenantSchoolStore.getProgramsBySchool(school.slug)

        return (
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                  Institutional Fee Schedules &amp; Cohort Invoicing
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                  Configure itemized fee structures per academic level and apply 1-click batch billing to enrolled cohorts.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowBatchInvoiceModal(true)}
                  style={{
                    background: primaryColor,
                    color: '#ffffff',
                    fontWeight: 800,
                    padding: '0.55rem 1.15rem',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>⚡</span> 1-Click Invoice Cohort
                </button>
              </div>
            </div>

            {/* Academic Programs & Cohorts Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.25rem',
                marginBottom: '2rem',
              }}
            >
              {cohortsList.map((cohortName) => {
                const enrolled = studentList.filter((s) => s.grade_class === cohortName)
                const cohortBilled = enrolled.reduce((acc, s) => acc + s.fee_total, 0)
                const cohortCollected = enrolled.reduce((acc, s) => acc + s.fee_paid, 0)
                const cohortArrears = enrolled.reduce((acc, s) => acc + s.fee_balance, 0)
                const avgFee = enrolled.length > 0 ? Math.round(cohortBilled / enrolled.length) : 0

                return (
                  <div
                    key={cohortName}
                    style={{
                      background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                      borderRadius: '16px',
                      padding: '1.5rem',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: primaryColor,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          CLASS COHORT
                        </span>
                        <h4 style={{ margin: '4px 0 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                          {cohortName}
                        </h4>
                      </div>
                      <span
                        style={{
                          background: '#e0f2fe',
                          color: '#0369a1',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                        }}
                      >
                        {enrolled.length} Enrolled
                      </span>
                    </div>

                    <div style={{ margin: '1rem 0', padding: '0.85rem', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                        <span style={{ color: '#64748b' }}>Standard Term Rate:</span>
                        <strong style={{ color: '#0f172a' }}>
                          {currency} {avgFee.toLocaleString()}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                        <span style={{ color: '#64748b' }}>Total Cohort Invoiced:</span>
                        <strong style={{ color: '#0f172a' }}>
                          {currency} {cohortBilled.toLocaleString()}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                        <span style={{ color: '#64748b' }}>Collected to Date:</span>
                        <strong style={{ color: '#16a34a' }}>
                          {currency} {cohortCollected.toLocaleString()}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ color: '#64748b' }}>Outstanding Arrears:</span>
                        <strong style={{ color: cohortArrears > 0 ? '#dc2626' : '#16a34a' }}>
                          {currency} {cohortArrears.toLocaleString()}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setBatchInvoiceForm((prev) => ({
                          ...prev,
                          target_cohort: cohortName,
                        }))
                        setShowBatchInvoiceModal(true)
                      }}
                      style={{
                        width: '100%',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        padding: '0.55rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        color: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>⚡</span> Re-invoice / Adjust {cohortName}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Individual Student Fee Adjustment Section */}
            <div style={{ marginTop: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem' }}>
                Individual Student Billing &amp; Scholarship Adjustments
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 1rem' }}>
                Need to grant a bursary, partial scholarship, or custom discount? Select a student below to adjust their invoiced total directly.
              </p>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '0.65rem', fontWeight: 800 }}>Adm No</th>
                      <th style={{ padding: '0.65rem', fontWeight: 800 }}>Student Name</th>
                      <th style={{ padding: '0.65rem', fontWeight: 800 }}>Class Cohort</th>
                      <th style={{ padding: '0.65rem', fontWeight: 800, textAlign: 'right' }}>Current Invoiced</th>
                      <th style={{ padding: '0.65rem', fontWeight: 800, textAlign: 'right' }}>Paid to Date</th>
                      <th style={{ padding: '0.65rem', fontWeight: 800, textAlign: 'right' }}>Current Balance</th>
                      <th style={{ padding: '0.65rem', fontWeight: 800, textAlign: 'center' }}>Billing Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentList.slice(0, 15).map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.65rem', fontWeight: 800, color: primaryColor }}>{s.admission_number}</td>
                        <td style={{ padding: '0.65rem', fontWeight: 800, color: '#0f172a' }}>{s.full_name}</td>
                        <td style={{ padding: '0.65rem', color: '#64748b' }}>{s.grade_class}</td>
                        <td style={{ padding: '0.65rem', textAlign: 'right' }}>{currency} {s.fee_total.toLocaleString()}</td>
                        <td style={{ padding: '0.65rem', textAlign: 'right', color: '#16a34a' }}>{currency} {s.fee_paid.toLocaleString()}</td>
                        <td style={{ padding: '0.65rem', textAlign: 'right', fontWeight: 900, color: s.fee_balance > 0 ? '#dc2626' : '#16a34a' }}>
                          {currency} {s.fee_balance.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.65rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudentForAdjustment(s)
                              setAdjustedFeeTotalInput(s.fee_total)
                              setShowStudentFeeAdjustmentModal(true)
                            }}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              padding: '0.3rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            ✏️ Adjust Fee
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ============================================================ */}
      {/* SUBTAB 5: INSTITUTION BANKING & PAYMENT CHANNELS */}
      {/* ============================================================ */}
      {bursarSubTab === 'banking' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                Institution Treasury &amp; Approved Payment Channels
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Official collection accounts displayed on student invoices, demand notices, and parent payment portals.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingBanking(!isEditingBanking)}
              style={{
                background: isEditingBanking ? '#0f172a' : '#ffffff',
                color: isEditingBanking ? '#ffffff' : '#0f172a',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isEditingBanking ? '✓ Finish Editing' : '✏️ Configure Channels'}
            </button>
          </div>

          {isEditingBanking && (
            <div
              style={{
                background: '#f8fafc',
                padding: '1.5rem',
                borderRadius: '16px',
                border: '1px solid #cbd5e1',
                marginBottom: '1.75rem',
              }}
            >
              <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                Edit Institution Collection Details
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Designated Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankingConfig.bank_name}
                    onChange={(e) => setBankingConfig({ ...bankingConfig, bank_name: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={bankingConfig.account_number}
                    onChange={(e) => setBankingConfig({ ...bankingConfig, account_number: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Mobile Paybill / Till Number
                  </label>
                  <input
                    type="text"
                    value={bankingConfig.paybill_number}
                    onChange={(e) => setBankingConfig({ ...bankingConfig, paybill_number: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Primary Bank Account */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#ffffff',
                borderRadius: '18px',
                padding: '1.75rem',
                boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.2)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.08em', color: '#94a3b8' }}>
                  PRIMARY COLLECTION ACCOUNT
                </span>
                <span style={{ fontSize: '1.3rem' }}>🏦</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '4px' }}>Bank Name</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, letterSpacing: '-0.01em', marginBottom: '1rem' }}>
                {bankingConfig.bank_name}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Account Name</div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>{bankingConfig.account_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Account Number</div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', fontFamily: 'monospace' }}>
                    {bankingConfig.account_number}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.76rem', color: '#94a3b8' }}>
                Mandatory Payment Reference: <strong style={{ color: '#38bdf8' }}>ADM NO + STUDENT NAME</strong>
              </div>
            </div>

            {/* Mobile Money Paybill / Till */}
            <div
              style={{
                background: 'linear-gradient(135deg, #065f46 0%, #064e3b 100%)',
                color: '#ffffff',
                borderRadius: '18px',
                padding: '1.75rem',
                boxShadow: '0 8px 24px -4px rgba(6, 95, 70, 0.25)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.08em', color: '#a7f3d0' }}>
                  INSTANT MOBILE MONEY
                </span>
                <span style={{ fontSize: '1.3rem' }}>📱</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#a7f3d0', marginBottom: '4px' }}>Mobile Money Channel</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, letterSpacing: '-0.01em', marginBottom: '1rem' }}>
                {bankingConfig.mobile_channel}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#a7f3d0' }}>Business / Paybill #</div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', fontFamily: 'monospace' }}>
                    {bankingConfig.paybill_number}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#a7f3d0' }}>Account Format</div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', fontFamily: 'monospace' }}>
                    {bankingConfig.account_format}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.76rem', color: '#a7f3d0' }}>
                Instant auto-reconciliation: SMS confirmations arrive directly to Bursar desk.
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ============================================================ */}
      {/* MODAL 1: RECORD TUITION PAYMENT */}
      {/* ============================================================ */}
      {showRecordPaymentModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxHeight: 'calc(100dvh - 2rem)',
              overflowY: 'auto',
              boxSizing: 'border-box',
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '560px',
              width: '100%',
              padding: 'clamp(1.25rem, 4vw, 2rem)',
              border: `2px solid ${primaryColor}`,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  RECEIPTING TERMINAL
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '2px 0 0', color: '#0f172a' }}>
                  + Record Tuition Fee Payment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRecordPaymentModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment}>
              {/* Searchable Student Selection */}
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '6px', color: '#0f172a' }}>
                  Search &amp; Select Student
                </label>
                <input
                  type="text"
                  placeholder="Type student name or admission # to filter..."
                  value={newPaymentInput.student_search}
                  onChange={(e) => setNewPaymentInput((prev) => ({ ...prev, student_search: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    marginBottom: '6px',
                    boxSizing: 'border-box',
                  }}
                />

                <select
                  value={newPaymentInput.student_id}
                  onChange={(e) => {
                    const selId = e.target.value
                    const st = studentList.find((s) => s.id === selId)
                    setNewPaymentInput((prev) => ({
                      ...prev,
                      student_id: selId,
                      amount: st ? st.fee_balance : prev.amount,
                    }))
                  }}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                    background: '#ffffff',
                    fontWeight: 600,
                  }}
                >
                  {studentList
                    .filter((s) => {
                      const q = newPaymentInput.student_search.toLowerCase()
                      return !q || s.full_name.toLowerCase().includes(q) || s.admission_number.toLowerCase().includes(q)
                    })
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.admission_number}) • {s.grade_class} — Balance: {currency} {s.fee_balance.toLocaleString()}
                      </option>
                    ))}
                </select>
              </div>

              {/* Student Balance Intelligence Box */}
              {selectedStudentForPayment && (
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>CURRENT OUTSTANDING BALANCE</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: selectedStudentForPayment.fee_balance > 0 ? '#dc2626' : '#16a34a' }}>
                      {currency} {selectedStudentForPayment.fee_balance.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>BILLED TOTAL</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                      {currency} {selectedStudentForPayment.fee_total.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Preset Buttons */}
              {selectedStudentForPayment && selectedStudentForPayment.fee_balance > 0 && (
                <div style={{ marginBottom: '1.15rem' }}>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, marginBottom: '6px', color: '#64748b' }}>
                    Quick Amount Presets:
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setNewPaymentInput((prev) => ({ ...prev, amount: selectedStudentForPayment.fee_balance }))}
                      style={{
                        background: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #86efac',
                        padding: '0.35rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      ⚡ Clear Full Balance ({currency} {selectedStudentForPayment.fee_balance.toLocaleString()})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPaymentInput((prev) => ({ ...prev, amount: Math.round(selectedStudentForPayment.fee_balance * 0.5) }))}
                      style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        padding: '0.35rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      50% Installment ({currency} {Math.round(selectedStudentForPayment.fee_balance * 0.5).toLocaleString()})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPaymentInput((prev) => ({ ...prev, amount: Math.round(selectedStudentForPayment.fee_balance * 0.25) }))}
                      style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        padding: '0.35rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      25% Installment
                    </button>
                  </div>
                </div>
              )}

              {/* Amount and Payment Method */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.15rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>
                    Amount to Credit ({currency})
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newPaymentInput.amount || ''}
                    onChange={(e) => setNewPaymentInput({ ...newPaymentInput, amount: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>
                    Payment Channel
                  </label>
                  <select
                    value={newPaymentInput.payment_method}
                    onChange={(e) => setNewPaymentInput({ ...newPaymentInput, payment_method: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      background: '#ffffff',
                    }}
                  >
                    <option value="Bank Wire">Bank Wire / Electronic Transfer</option>
                    <option value="Mobile Money (M-Pesa)">Mobile Money (M-Pesa)</option>
                    <option value="Credit Card">Credit / Debit Card</option>
                    <option value="Cash">Cash Deposit</option>
                  </select>
                </div>
              </div>

              {/* Transaction Reference & Period */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>
                    Transaction Reference / Slip #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. QX98124 / Chq 0041"
                    value={newPaymentInput.reference_code}
                    onChange={(e) => setNewPaymentInput({ ...newPaymentInput, reference_code: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>
                    Accounting Academic Period
                  </label>
                  <input
                    type="text"
                    value={newPaymentInput.period_name}
                    onChange={(e) => setNewPaymentInput({ ...newPaymentInput, period_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Real-time After Credit Preview */}
              {selectedStudentForPayment && newPaymentInput.amount > 0 && (
                <div
                  style={{
                    background: '#f0fdf4',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #86efac',
                    marginBottom: '1.25rem',
                    fontSize: '0.82rem',
                    color: '#166534',
                  }}
                >
                  ✓ New student balance after receipting: <strong>{currency} {Math.max(0, selectedStudentForPayment.fee_balance - newPaymentInput.amount).toLocaleString()}</strong>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowRecordPaymentModal(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: primaryColor,
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    boxShadow: '0 4px 14px -2px rgba(180, 83, 9, 0.4)',
                  }}
                >
                  Credit &amp; Issue Official Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: BATCH COHORT INVOICING */}
      {/* ============================================================ */}
      {showBatchInvoiceModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxHeight: 'calc(100dvh - 2rem)',
              overflowY: 'auto',
              boxSizing: 'border-box',
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '540px',
              width: '100%',
              padding: 'clamp(1.25rem, 4vw, 2rem)',
              border: `2px solid ${primaryColor}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  INSTITUTIONAL BILLING
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '2px 0 0', color: '#0f172a' }}>
                  1-Click Cohort Invoicing Schedule
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchInvoiceModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteBatchInvoice}>
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>
                  Select Target Cohort / Class
                </label>
                <select
                  value={batchInvoiceForm.target_cohort}
                  onChange={(e) => setBatchInvoiceForm({ ...batchInvoiceForm, target_cohort: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    background: '#ffffff',
                    fontWeight: 700,
                  }}
                >
                  {cohortsList.map((c) => (
                    <option key={c} value={c}>
                      {c} ({studentList.filter((s) => s.grade_class === c).length} students enrolled)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Itemized Fee Breakdown ({currency})
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 700 }}>Core Tuition</label>
                    <input
                      type="number"
                      value={batchInvoiceForm.tuition_component}
                      onChange={(e) => setBatchInvoiceForm({ ...batchInvoiceForm, tuition_component: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 700 }}>Assessments &amp; Exams</label>
                    <input
                      type="number"
                      value={batchInvoiceForm.exam_component}
                      onChange={(e) => setBatchInvoiceForm({ ...batchInvoiceForm, exam_component: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700 }}>Activity &amp; Sports</label>
                    <input
                      type="number"
                      value={batchInvoiceForm.activity_component}
                      onChange={(e) => setBatchInvoiceForm({ ...batchInvoiceForm, activity_component: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700 }}>Science/IT Lab</label>
                    <input
                      type="number"
                      value={batchInvoiceForm.lab_component}
                      onChange={(e) => setBatchInvoiceForm({ ...batchInvoiceForm, lab_component: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700 }}>Library Levy</label>
                    <input
                      type="number"
                      value={batchInvoiceForm.library_component}
                      onChange={(e) => setBatchInvoiceForm({ ...batchInvoiceForm, library_component: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px dashed #cbd5e1' }}>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>Total Invoiced per Student:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: primaryColor }}>
                    {currency}{' '}
                    {(
                      Number(batchInvoiceForm.tuition_component) +
                      Number(batchInvoiceForm.exam_component) +
                      Number(batchInvoiceForm.activity_component) +
                      Number(batchInvoiceForm.lab_component) +
                      Number(batchInvoiceForm.library_component)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowBatchInvoiceModal(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: primaryColor,
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Apply &amp; Invoice Entire Cohort
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: INDIVIDUAL STUDENT FEE ADJUSTMENT */}
      {/* ============================================================ */}
      {showStudentFeeAdjustmentModal && selectedStudentForAdjustment && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxHeight: 'calc(100dvh - 2rem)',
              overflowY: 'auto',
              boxSizing: 'border-box',
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '480px',
              width: '100%',
              padding: 'clamp(1.25rem, 4vw, 2rem)',
              border: '2px solid #0284c7',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 0.5rem', color: '#0f172a' }}>
              Adjust Student Invoiced Total
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0 0 1.25rem' }}>
              Student: <strong>{selectedStudentForAdjustment.full_name}</strong> ({selectedStudentForAdjustment.admission_number})
            </p>

            <form onSubmit={handleExecuteStudentFeeAdjustment}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>
                  New Invoiced Total ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustedFeeTotalInput}
                  onChange={(e) => setAdjustedFeeTotalInput(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px' }}>
                  Paid to date: {currency} {selectedStudentForAdjustment.fee_paid.toLocaleString()} • Resulting balance will update automatically.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowStudentFeeAdjustmentModal(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: DISBURSE BATCH CONFIRMATION */}
      {/* ============================================================ */}
      {showDisburseBatchModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxHeight: 'calc(100dvh - 2rem)',
              overflowY: 'auto',
              boxSizing: 'border-box',
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '480px',
              width: '100%',
              padding: 'clamp(1.25rem, 4vw, 2rem)',
              border: '2px solid #16a34a',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🚀</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 0.5rem', color: '#0f172a' }}>
              Confirm Payroll Disbursal for {selectedPayrollMonth}
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0 0 1.25rem' }}>
              You are about to execute bank &amp; mobile payroll disbursals for{' '}
              <strong>{filteredPayroll.length} staff members</strong> totaling{' '}
              <strong style={{ color: '#16a34a' }}>
                {currency} {totalMonthNetPayroll.toLocaleString()}
              </strong>
              .
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '6px', color: '#0f172a' }}>
                Primary Disbursal Channel
              </label>
              <select
                value={batchDisburseChannel}
                onChange={(e) => setBatchDisburseChannel(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  background: '#ffffff',
                  fontWeight: 700,
                }}
              >
                <option value="Bank Wire">Bank Wire / Electronic EFT</option>
                <option value="Mobile Money">Direct Mobile Money (M-Pesa Bulk)</option>
                <option value="Cheque">Treasury Cheque</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowDisburseBatchModal(false)}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchDisburse}
                style={{
                  padding: '0.65rem 1.5rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#16a34a',
                  color: '#ffffff',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  boxShadow: '0 4px 14px -2px rgba(22, 163, 74, 0.4)',
                }}
              >
                Confirm &amp; Disburse Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
