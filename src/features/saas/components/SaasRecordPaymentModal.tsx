import React, { useState } from 'react'
import type { PartnerSchoolTenant } from '@/types/tenantSchool'

export interface SaasRecordPaymentModalProps {
  school: PartnerSchoolTenant | null
  onClose: () => void
  onConfirm: (school: PartnerSchoolTenant, billingPeriod: string, mpesaRef: string) => void
}

export function SaasRecordPaymentModal({
  school,
  onClose,
  onConfirm,
}: SaasRecordPaymentModalProps) {
  const [billingPeriod, setBillingPeriod] = useState(() =>
    new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
  )
  const [mpesaRef, setMpesaRef] = useState('')

  if (!school) return null

  const campusCount = school.campus_count || (school.campuses_list ? school.campuses_list.length : 1)
  const totalKes = campusCount * 2500

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!mpesaRef.trim()) return
    onConfirm(school, billingPeriod.trim(), mpesaRef.trim().toUpperCase())
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(9, 13, 22, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.25rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#131b2e',
          borderRadius: '24px',
          maxWidth: '480px',
          width: '100%',
          padding: '2rem',
          border: '1px solid #1e293b',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.2rem', fontWeight: 900, color: '#f8fafc' }}>
          Record Payment for {school.name}
        </h3>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.8rem', color: '#94a3b8' }}>
          Rate: KES 2,500/campus &times; {campusCount} campus(es) ={' '}
          <strong style={{ color: '#10b981' }}>
            KES {totalKes.toLocaleString()}
          </strong>{' '}
          (Received via M-Pesa <strong>0740027346</strong>)
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label
              htmlFor="saas-pay-period-input"
              style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '5px' }}
            >
              BILLING PERIOD
            </label>
            <input
              id="saas-pay-period-input"
              type="text"
              value={billingPeriod}
              onChange={(e) => setBillingPeriod(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '10px',
                background: '#0a0f1d',
                border: '1px solid #334155',
                color: '#ffffff',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="saas-pay-mpesaref-input"
              style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '5px' }}
            >
              M-PESA CONFIRMATION CODE *
            </label>
            <input
              id="saas-pay-mpesaref-input"
              type="text"
              required
              placeholder="e.g. QBF9204KLL"
              value={mpesaRef}
              onChange={(e) => setMpesaRef(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '10px',
                background: '#0a0f1d',
                border: '1px solid #334155',
                color: '#fbbf24',
                fontSize: '0.95rem',
                fontWeight: 900,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                background: '#1e293b',
                color: '#cbd5e1',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 2,
                background: '#10b981',
                color: '#064e3b',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              Confirm &amp; Extend License
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
