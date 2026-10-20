import { useState, useEffect } from 'react'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import type { PartnerSchoolTenant } from '@/types/tenantSchool'

export interface TenantDomainModalProps {
  isOpen: boolean
  onClose: () => void
  school: PartnerSchoolTenant | null
  primaryColor?: string
  onDomainUpdated?: (newDomain: string) => void
}

export function TenantDomainModal({
  isOpen,
  onClose,
  school,
  primaryColor = '#1e3a8a',
  onDomainUpdated,
}: TenantDomainModalProps) {
  const [customDomainInput, setCustomDomainInput] = useState('')
  const [customDomainMessage, setCustomDomainMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  useEffect(() => {
    if (school) {
      setCustomDomainInput(school.custom_domain || '')
      setCustomDomainMessage(null)
    }
  }, [school, isOpen])

  if (!isOpen || !school) return null

  const handleSave = () => {
    tenantSchoolStore.updateSchoolCustomDomain(school.id, customDomainInput)
    setCustomDomainMessage({
      type: 'success',
      text: `Saved custom domain: ${customDomainInput || 'Subdomain default'}!`,
    })
    if (onDomainUpdated) {
      onDomainUpdated(customDomainInput)
    }
    setTimeout(() => {
      onClose()
    }, 1500)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
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
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
            Custom Domain &amp; DNS Management
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
          Connect your school&apos;s private custom domain (e.g. <code>portal.{school.slug}.ac.ke</code> or{' '}
          <code>{school.slug}.school</code>) to this SIS portal.
        </p>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
            School Custom Domain
          </label>
          <input
            type="text"
            placeholder="e.g. portal.hillcrest.ac.ke"
            value={customDomainInput}
            onChange={(e) => setCustomDomainInput(e.target.value)}
            style={{
              width: '100%',
              padding: '0.7rem 1rem',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {customDomainMessage && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginBottom: '1rem',
              background: customDomainMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: customDomainMessage.type === 'success' ? '#166534' : '#991b1b',
            }}
          >
            {customDomainMessage.text}
          </div>
        )}

        <div
          style={{
            background: '#f8fafc',
            padding: '1rem',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            fontSize: '0.78rem',
            color: '#475569',
            marginBottom: '1.5rem',
            lineHeight: 1.6,
          }}
        >
          <strong>DNS Verification Instructions:</strong>
          <div>
            Type: <strong>CNAME</strong>
          </div>
          <div>
            Host: <strong>@ / portal</strong>
          </div>
          <div>
            Target: <strong>{typeof window !== 'undefined' ? window.location.host : 'cloud-host'}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
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
            Save Domain
          </button>
        </div>
      </div>
    </div>
  )
}
