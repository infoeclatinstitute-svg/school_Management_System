import { useState } from 'react'
import { licensingStore } from '@/lib/licensingStore'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import type { PartnerSchoolTenant } from '@/types/tenantSchool'

export interface TenantLicenseActivationModalProps {
  isOpen: boolean
  onClose: () => void
  school: PartnerSchoolTenant | null
  primaryColor?: string
  isLicenseActive: boolean
  onLicenseActivated?: (updatedSchool: PartnerSchoolTenant) => void
}

export function TenantLicenseActivationModal({
  isOpen,
  onClose,
  school,
  primaryColor = '#1e3a8a',
  isLicenseActive,
  onLicenseActivated,
}: TenantLicenseActivationModalProps) {
  const [licenseKeyInput, setLicenseKeyInput] = useState('')
  const [licenseFeedback, setLicenseFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [isActivating, setIsActivating] = useState(false)

  if (!isOpen || !school) return null

  const campusCount = school.campus_count || (school.campuses_list ? school.campuses_list.length : 1)

  const handleActivate = async () => {
    if (!licenseKeyInput.trim()) {
      setLicenseFeedback({ type: 'error', message: 'Please enter a valid product key.' })
      return
    }

    setIsActivating(true)
    try {
      const res = await licensingStore.redeemProductKey(licenseKeyInput.trim(), school.slug)
      if (res.success) {
        setLicenseFeedback({ type: 'success', message: res.message })
        const updated = tenantSchoolStore.getSchoolBySlug(school.slug)
        if (updated && onLicenseActivated) {
          onLicenseActivated(updated)
        }
      } else {
        setLicenseFeedback({ type: 'error', message: res.message })
      }
    } finally {
      setIsActivating(false)
    }
  }

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          maxWidth: '580px',
          width: '100%',
          maxHeight: 'calc(100dvh - 2rem)',
          overflowY: 'auto',
          padding: 'clamp(1.1rem, 4vw, 2rem)',
          border: `2px solid ${primaryColor}`,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>🔑</span>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                Institutional Campus Product Key
              </h3>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Subscription &amp; Campus Access Authorization
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        {/* Campus Pricing & Status Card */}
        <div
          style={{
            background: '#f8fafc',
            padding: '1.15rem',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            marginBottom: '1.25rem',
            fontSize: '0.84rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b' }}>Institution:</span>
            <strong>{school.name}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b' }}>Registered Campuses:</span>
            <strong>{campusCount} Campus(es)</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b' }}>Subscription Tier:</span>
            <span
              style={{
                fontWeight: 900,
                fontSize: '0.78rem',
                padding: '2px 8px',
                borderRadius: '6px',
                background: school.subscription_tier === 'lifetime' ? '#dcfce7' : '#eff6ff',
                color: school.subscription_tier === 'lifetime' ? '#065f46' : '#1e40af',
                border: school.subscription_tier === 'lifetime' ? '1px solid #6ee7b7' : '1px solid #bfdbfe',
              }}
            >
              {school.subscription_tier === 'lifetime'
                ? '♾️ LIFETIME LICENSE (KES 30k + 1k/yr)'
                : '⭐ STANDARD MONTHLY (KES 2,500/mo)'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b' }}>Public Page Showcase:</span>
            <span style={{ fontWeight: 800, color: '#15803d' }}>
              ✓ Dedicated Page &amp; Programs Catalog Unlocked
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#64748b' }}>License Status:</span>
            <span
              style={{
                fontWeight: 800,
                color: isLicenseActive ? '#15803d' : '#b45309',
                background: isLicenseActive ? '#dcfce7' : '#fef3c7',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.75rem',
              }}
            >
              {isLicenseActive ? (school.subscription_status || 'LICENSED').toUpperCase() : 'PENDING ACTIVATION'}
            </span>
          </div>
          {school.license_valid_until && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Valid Through:</span>
              <strong>
                {school.subscription_tier === 'lifetime'
                  ? 'Perpetual (KES 1,000/yr Maint.)'
                  : new Date(school.license_valid_until).toLocaleDateString()}
              </strong>
            </div>
          )}
        </div>

        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.82rem',
            color: '#065f46',
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: '4px' }}>📲 Subscription &amp; Tier Activation (M-Pesa):</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '6px', fontSize: '0.8rem' }}>
            <div>
              &bull; <strong>♾️ Lifetime Purchase:</strong> KES 30,000 one-time / campus + only KES 1,000 / year maintenance (Unlocks ALL features forever)
            </div>
            <div>
              &bull; <strong>Standard Monthly Plan:</strong> KES 2,500 / campus / month (All Portals + Dedicated Public Page &amp; Programs Catalog)
            </div>
          </div>
          <div>Send payment to:</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#047857', marginTop: '2px', letterSpacing: '0.04em' }}>
            M-Pesa: 0740027346
          </div>
          <div style={{ fontSize: '0.74rem', color: '#059669', marginTop: '3px' }}>
            Once processed, your 19-character Product Key (e.g. <code>GC-LFT-...</code> or <code>GC-SLV-...</code>) will be issued to activate access below.
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
            Product Activation Key
          </label>
          <input
            type="text"
            placeholder="GC-SLV-XXXX-XXXX-XXXX-XXXX"
            value={licenseKeyInput}
            onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: '2px solid #cbd5e1',
              fontSize: '0.95rem',
              fontFamily: 'monospace',
              fontWeight: 800,
              letterSpacing: '0.05em',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {licenseFeedback && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: '1.25rem',
              background: licenseFeedback.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: licenseFeedback.type === 'success' ? '#166534' : '#991b1b',
              border: licenseFeedback.type === 'success' ? '1px solid #86efac' : '1px solid #fca5a5',
            }}
          >
            {licenseFeedback.message}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.65rem 1.15rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 700,
              }}
            >
              Close
            </button>
            <button
              type="button"
              disabled={isActivating}
              onClick={handleActivate}
              style={{
                padding: '0.65rem 1.35rem',
                borderRadius: '10px',
                border: 'none',
                background: primaryColor,
                color: '#ffffff',
                fontWeight: 800,
                cursor: isActivating ? 'not-allowed' : 'pointer',
                fontSize: '0.82rem',
              }}
            >
              {isActivating ? 'Activating...' : 'Activate License'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
