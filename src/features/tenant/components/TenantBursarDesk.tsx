import React, { useState } from 'react'
import type {
  PartnerSchoolTenant,
  TenantStaffMember,
  TenantStudentMember,
  TenantPayrollRecord,
  TenantFeePayment,
} from '@/types/tenantSchool'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import { CreditCardIcon, FileTextIcon, UsersIcon, ShieldCheckIcon } from '@/components/icons/AppIcons'

interface TenantBursarDeskProps {
  school: PartnerSchoolTenant
  staffList: TenantStaffMember[]
  studentList: TenantStudentMember[]
  payrollList: TenantPayrollRecord[]
  feePaymentsList: TenantFeePayment[]
  onReloadData: () => void
  onOpenPayslip: (payslip: TenantPayrollRecord) => void
  onOpenReceipt: (receipt: TenantFeePayment) => void
}

export function TenantBursarDesk({
  school,
  staffList,
  studentList,
  payrollList,
  feePaymentsList,
  onReloadData,
  onOpenPayslip,
  onOpenReceipt,
}: TenantBursarDeskProps) {
  const primaryColor = school.primary_color || '#881337'
  const accentColor = school.accent_color || '#d4af37'

  const [bursarSubTab, setBursarSubTab] = useState<'payroll' | 'payments' | 'arrears' | 'structure'>('payroll')
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false)
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('')
  const [arrearsClassFilter, setArrearsClassFilter] = useState('All')

  // New Payment Form Input
  const [newPaymentInput, setNewPaymentInput] = useState({
    student_id: studentList[0]?.id || '',
    amount: 0,
    payment_method: 'Bank Wire' as 'Bank Wire' | 'Mobile Money (M-Pesa)' | 'Credit Card' | 'Cash',
  })

  // Selected student for payment
  const selectedStudentForPayment = studentList.find((s) => s.id === newPaymentInput.student_id) || studentList[0]

  // Financial Metrics
  const totalBilled = studentList.reduce((acc, s) => acc + s.fee_total, 0)
  const totalCollected = studentList.reduce((acc, s) => acc + s.fee_paid, 0)
  const totalArrears = studentList.reduce((acc, s) => acc + s.fee_balance, 0)
  const totalGrossPayroll = payrollList.reduce((acc, p) => acc + p.gross_salary, 0)
  const totalNetPayroll = payrollList.reduce((acc, p) => acc + p.net_salary, 0)

  // Students with Arrears
  const defaultersList = studentList.filter((s) => s.fee_balance > 0)

  // Handle Record Fee Payment
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentForPayment) return

    const payment = tenantSchoolStore.recordFeePayment({
      school_slug: school.slug,
      student_id: selectedStudentForPayment.id,
      student_name: selectedStudentForPayment.full_name,
      admission_number: selectedStudentForPayment.admission_number,
      amount: Number(newPaymentInput.amount) || 1800,
      period_name: school.active_period_name,
      payment_method: newPaymentInput.payment_method,
      recorded_by: `${school.name} Bursar's Office`,
    })

    setShowRecordPaymentModal(false)
    onReloadData()
    onOpenReceipt(payment)
  }

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
      {/* Header Banner */}
      {/* Top Banner & Executive Title */}
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
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #b45309 0%, #0f172a 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.65rem',
                boxShadow: '0 8px 20px -4px rgba(180, 83, 9, 0.35)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                flexShrink: 0,
              }}
            >
              🏛️
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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
              </div>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 900, margin: '4px 0 0', color: '#0f172a', letterSpacing: '-0.02em' }}>
                Bursar Accounts, Payroll &amp; Tuition Terminal
              </h2>
              <div style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '4px' }}>
                Active Accounting Period: <strong style={{ color: '#0f172a' }}>{school.active_period_name}</strong> • Bank Account: <strong style={{ color: '#0f172a' }}>{school.name} School Trust</strong>
              </div>
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setShowRecordPaymentModal(true)}
              style={{
                background: 'linear-gradient(135deg, #b45309 0%, #92400e 100%)',
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
              <span>💳</span> + Record Fee Payment
            </button>
          </div>
        </div>

        {/* Sub-tab Navigation Pills */}
        <div
          style={{
            display: 'flex',
            gap: '0.35rem',
            flexWrap: 'wrap',
            background: '#f8fafc',
            padding: '6px',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            onClick={() => setBursarSubTab('payroll')}
            style={{
              background: bursarSubTab === 'payroll' ? '#b45309' : 'transparent',
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
            <span>💼</span> Staff Payroll Register ({payrollList.length})
          </button>
          <button
            type="button"
            onClick={() => setBursarSubTab('payments')}
            style={{
              background: bursarSubTab === 'payments' ? '#b45309' : 'transparent',
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
              background: bursarSubTab === 'arrears' ? '#b45309' : 'transparent',
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
            <span>⚠️</span> Fee Arrears &amp; Defaulters ({defaultersList.length})
          </button>
          <button
            type="button"
            onClick={() => setBursarSubTab('structure')}
            style={{
              background: bursarSubTab === 'structure' ? '#b45309' : 'transparent',
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
            <span>📋</span> Official Term Fee Structure
          </button>
        </div>
      </div>

      {/* Financial Metrics Intelligence Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
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
            <span style={{ fontSize: '1rem' }}>🏛️</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '6px 0 2px', letterSpacing: '-0.02em' }}>
            {school.currency || 'KES'} {totalBilled.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
            {studentList.length} Invoiced Students
          </div>
        </div>

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
            <span style={{ fontSize: '1rem' }}>📈</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#16a34a', margin: '6px 0 2px', letterSpacing: '-0.02em' }}>
            {school.currency || 'KES'} {totalCollected.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>●</span> {totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 100}% Recovery Rate
          </div>
        </div>

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
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: totalArrears > 0 ? '#dc2626' : '#16a34a' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              OUTSTANDING ARREARS
            </span>
            <span style={{ fontSize: '1rem' }}>⚠️</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: totalArrears > 0 ? '#dc2626' : '#16a34a', margin: '6px 0 2px', letterSpacing: '-0.02em' }}>
            {school.currency || 'KES'} {totalArrears.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: totalArrears > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
            {defaultersList.length} Pending Balances
          </div>
        </div>

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
              DISBURSED PAYROLL
            </span>
            <span style={{ fontSize: '1rem' }}>💼</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '6px 0 2px', letterSpacing: '-0.02em' }}>
            {school.currency || 'KES'} {totalNetPayroll.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 700 }}>
            {payrollList.length} Active Staff Slips
          </div>
        </div>
      </div>

      {/* SUBTAB 1: STAFF PAYROLL REGISTER */}
      {bursarSubTab === 'payroll' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>Staff Monthly Payroll Register</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Compute base salaries, statutory PAYE tax, pension, and net salary disbursements.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  tenantSchoolStore.generateMonthlyPayroll(school.slug, 'October 2026')
                  onReloadData()
                  alert('Re-computed October 2026 Payroll batch for all active registered staff!')
                }}
                style={{ background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', padding: '0.5rem 0.95rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
              >
                ⚡ Re-compute Batch
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Staff Member</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Role / Dept</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>Base Pay</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>Allowances</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>Deductions</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>Net Pay</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Official Slip</th>
                </tr>
              </thead>
              <tbody>
                {payrollList.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>{p.staff_name}</td>
                    <td style={{ padding: '0.75rem', color: '#64748b' }}>{p.role} • {p.department}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>{school.currency || 'KES'} {p.base_salary.toLocaleString()}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: '#059669' }}>+{school.currency || 'KES'} {(p.housing_allowance + p.transport_allowance).toLocaleString()}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: '#dc2626' }}>-{school.currency || 'KES'} {(p.tax_deduction + p.pension_deduction).toLocaleString()}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 900, color: '#0f172a' }}>{school.currency || 'KES'} {p.net_salary.toLocaleString()}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span
                        style={{
                          background: p.status === 'disbursed' ? '#dcfce7' : '#fef3c7',
                          color: p.status === 'disbursed' ? '#15803d' : '#b45309',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                        }}
                      >
                        {p.status === 'disbursed' ? '✓ Disbursed' : '⏳ Approved'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => onOpenPayslip(p)}
                        style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        🖨️ Payslip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: TUITION PAYMENT LEDGER & RECEIPTS */}
      {bursarSubTab === 'payments' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>Tuition Payment Ledger &amp; Receipts</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Bank wire, electronic credit, and mobile money fee payment records.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search receipt # or student..."
                value={paymentSearchQuery}
                onChange={(e) => setPaymentSearchQuery(e.target.value)}
                style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '220px' }}
              />
              <button
                type="button"
                onClick={() => setShowRecordPaymentModal(true)}
                style={{ background: '#b45309', color: '#ffffff', fontWeight: 800, padding: '0.45rem 0.95rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                + Record Payment
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Receipt Number</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Student Candidate</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Date</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Payment Channel</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>Amount Paid</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Official Receipt</th>
                </tr>
              </thead>
              <tbody>
                {feePaymentsList
                  .filter((p) => !paymentSearchQuery || p.receipt_number.toLowerCase().includes(paymentSearchQuery.toLowerCase()) || p.student_name.toLowerCase().includes(paymentSearchQuery.toLowerCase()))
                  .map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 800, color: '#b45309' }}>{p.receipt_number}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{p.student_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Adm: {p.admission_number}</div>
                      </td>
                      <td style={{ padding: '0.75rem', color: '#64748b' }}>
                        {new Date(p.date).toLocaleDateString('en-GB')}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#475569' }}>{p.payment_method}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 900, color: '#16a34a' }}>
                        {school.currency || 'KES'} {p.amount.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onOpenReceipt(p)}
                          style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          🖨️ Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: FEE ARREARS & DEFAULTERS */}
      {bursarSubTab === 'arrears' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>Student Fee Arrears &amp; Defaulters</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Students with pending balances. Send reminder notifications and print statements.
              </p>
            </div>
          </div>

          {defaultersList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#f8fafc', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#16a34a' }}>All Tuition Fees Fully Cleared!</div>
              <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '4px 0 0' }}>There are zero outstanding arrears for the active period.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Admission No</th>
                    <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Student Name</th>
                    <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Class</th>
                    <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>Total Fee</th>
                    <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>Paid</th>
                    <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>Outstanding Arrears</th>
                    <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Guardian Action</th>
                  </tr>
                </thead>
                <tbody>
                  {defaultersList.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 800, color: primaryColor }}>{s.admission_number}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>{s.full_name}</td>
                      <td style={{ padding: '0.75rem', color: '#64748b' }}>{s.grade_class}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{school.currency || 'KES'} {s.fee_total.toLocaleString()}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#16a34a' }}>{school.currency || 'KES'} {s.fee_paid.toLocaleString()}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 900, color: '#dc2626' }}>
                        {school.currency || 'KES'} {s.fee_balance.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => alert(`Generated Fee Demand Notice for ${s.guardian_name} (${s.guardian_phone}) for balance ${school.currency || 'KES'} ${s.fee_balance}!`)}
                          style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          📩 Send Demand
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

      {/* SUBTAB 4: FEE STRUCTURE */}
      {bursarSubTab === 'structure' && (() => {
        const schoolPrograms = tenantSchoolStore.getProgramsBySchool(school.slug)
        return (
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                  Official Institutional Term Fee Structure &amp; Levies
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Standard tuition fees and billable schedules per academic program / level.
                </p>
              </div>
            </div>

            {schoolPrograms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
                <h4 style={{ margin: '0 0 0.35rem', color: '#0f172a', fontWeight: 800 }}>No Program Fee Schedules Configured</h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                  The Principal can register academic programs and tuition rates in the Principal / Admin Desk.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {schoolPrograms.map((prog) => (
                  <div key={prog.id} style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>{prog.title}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>{prog.level} • {prog.department}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#b45309', marginTop: '6px' }}>
                      {school.currency || prog.fee_currency || 'KES'} {prog.tuition_fee.toLocaleString()} / Term
                    </div>
                    {prog.duration && (
                      <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '6px' }}>
                        ⏱️ Duration: <strong>{prog.duration}</strong>
                      </div>
                    )}
                    {prog.intake_period && (
                      <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '4px' }}>
                        📅 Intake: <strong>{prog.intake_period}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* MODAL: RECORD FEE PAYMENT */}
      {showRecordPaymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto', boxSizing: 'border-box', background: '#ffffff', borderRadius: '20px', maxWidth: '540px', width: '100%', padding: 'clamp(1.1rem, 4vw, 2rem)', border: '2px solid #b45309' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 1rem', color: '#0f172a' }}>+ Record Tuition Fee Payment</h3>
            <form onSubmit={handleRecordPayment}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Select Student</label>
                <select
                  value={newPaymentInput.student_id}
                  onChange={(e) => setNewPaymentInput({ ...newPaymentInput, student_id: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                >
                  {studentList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.admission_number}) — Balance: {school.currency || 'KES'} {s.fee_balance}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Amount to Credit ({school.currency || 'KES'})</label>
                  <input
                    type="number"
                    required
                    value={newPaymentInput.amount}
                    onChange={(e) => setNewPaymentInput({ ...newPaymentInput, amount: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Payment Channel</label>
                  <select
                    value={newPaymentInput.payment_method}
                    onChange={(e) => setNewPaymentInput({ ...newPaymentInput, payment_method: e.target.value as any })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  >
                    <option value="Bank Wire">Bank Wire / Transfer</option>
                    <option value="Mobile Money (M-Pesa)">Mobile Money (M-Pesa)</option>
                    <option value="Credit Card">Credit / Debit Card</option>
                    <option value="Cash">Cash Deposit</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowRecordPaymentModal(false)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: '#b45309', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Credit &amp; Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
