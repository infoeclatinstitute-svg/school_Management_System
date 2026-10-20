import React from 'react'
import { Link } from 'react-router-dom'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import type { PartnerSchoolTenant } from '@/types/tenantSchool'

export interface SaasInstitutionInspectorModalProps {
  school: PartnerSchoolTenant | null
  onClose: () => void
  onToggleStatus: (
    slug: string,
    newStatus: 'active' | 'trial' | 'past_due' | 'expired' | 'licensed' | 'suspended'
  ) => void
  onResetPassword: (slug: string) => void
  onEditSchool: (school: PartnerSchoolTenant) => void
}

export function SaasInstitutionInspectorModal({
  school,
  onClose,
  onToggleStatus,
  onResetPassword,
  onEditSchool,
}: SaasInstitutionInspectorModalProps) {
  if (!school) return null

  const campusCount = school.campus_count || (school.campuses_list ? school.campuses_list.length : 1)
  const isLifetime = school.subscription_tier === 'lifetime' || school.subscription_billing_cycle === 'lifetime'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(5px)',
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
          maxWidth: '720px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          border: '1px solid #334155',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.25rem',
            borderBottom: '1px solid #1e293b',
            paddingBottom: '1rem',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#38bdf8',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              🏛️ Full Institution Dossier
            </span>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.4rem', fontWeight: 900, color: '#f8fafc' }}>
              {school.name}
            </h3>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
              URL Slug: <strong>{school.slug}</strong> &bull; Custom Domain:{' '}
              <strong>{school.custom_domain || 'None (Using Subdomain)'}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Grid of Profile Information */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ background: '#0a0f1d', padding: '1rem', borderRadius: '14px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
              Operational Status
            </div>
            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={school.subscription_status || (school.active_license_key ? 'licensed' : 'trial')}
                onChange={(e) =>
                  onToggleStatus(
                    school.slug,
                    e.target.value as 'active' | 'trial' | 'past_due' | 'expired' | 'licensed' | 'suspended'
                  )
                }
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  border:
                    '1px solid ' +
                    (school.subscription_status === 'licensed'
                      ? '#059669'
                      : school.subscription_status === 'active'
                      ? '#2563eb'
                      : school.subscription_status === 'suspended'
                      ? '#dc2626'
                      : school.subscription_status === 'past_due'
                      ? '#d97706'
                      : '#64748b'),
                  background:
                    school.subscription_status === 'licensed'
                      ? '#064e3b'
                      : school.subscription_status === 'active'
                      ? '#1e3a8a'
                      : school.subscription_status === 'suspended'
                      ? '#7f1d1d'
                      : school.subscription_status === 'past_due'
                      ? '#78350f'
                      : '#1e293b',
                  color: '#ffffff',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="active">🟢 ACTIVE</option>
                <option value="licensed">🛡️ LICENSED</option>
                <option value="trial">🟡 TRIAL</option>
                <option value="past_due">⚠️ PAST DUE</option>
                <option value="suspended">🔴 SUSPENDED</option>
              </select>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                Tier: <strong>{(school.subscription_tier || 'gold').toUpperCase()}</strong>
              </span>
            </div>
          </div>

          <div style={{ background: '#0a0f1d', padding: '1rem', borderRadius: '14px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
              Executive Leadership
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#f8fafc', marginTop: '3px' }}>
              {school.principal_name}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
              Title: {school.principal_title || 'Principal'} &bull; Email:{' '}
              {school.principal_email || school.contact_email}
            </div>
          </div>

          <div style={{ background: '#0a0f1d', padding: '1rem', borderRadius: '14px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
              Administrator Account
            </div>
            <div
              style={{
                fontSize: '0.95rem',
                fontWeight: 900,
                color: '#fbbf24',
                marginTop: '3px',
                fontFamily: 'monospace',
              }}
            >
              Username: {school.admin_username || `${school.slug}.admin`}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
              Current Password: <strong style={{ color: '#f8fafc' }}>{school.admin_password || '(Configured)'}</strong>
            </div>
          </div>

          <div style={{ background: '#0a0f1d', padding: '1rem', borderRadius: '14px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
              Campus Configuration
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#f8fafc', marginTop: '3px' }}>
              {campusCount} Registered Campus(es)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
              {isLifetime
                ? `Lifetime License: KES ${(campusCount * 30000).toLocaleString()} One-Time (+ KES ${(campusCount * 1000).toLocaleString()}/yr Maint.)`
                : `Billing Rate: KES ${(campusCount * 2500).toLocaleString()} / Month`}
            </div>
          </div>

          <div style={{ background: '#0a0f1d', padding: '1rem', borderRadius: '14px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
              Institutional Contacts
            </div>
            <div style={{ fontSize: '0.85rem', color: '#f8fafc', marginTop: '3px' }}>
              📞 {school.contact_phone}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
              ✉️ {school.contact_email}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
              📍 {school.address || `${school.city}, ${school.country}`}
            </div>
          </div>
        </div>

        {/* Registered Counts */}
        <div
          style={{
            background: '#0a0f1d',
            padding: '1.25rem',
            borderRadius: '14px',
            border: '1px solid #1e293b',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              fontSize: '0.76rem',
              color: '#64748b',
              fontWeight: 800,
              textTransform: 'uppercase',
              marginBottom: '0.75rem',
            }}
          >
            Live Enrolled Members &amp; Academic Structure
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
            <div style={{ background: '#131b2e', padding: '0.75rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f8fafc' }}>
                {tenantSchoolStore.getStudentsBySchool(school.slug).length}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Students</div>
            </div>
            <div style={{ background: '#131b2e', padding: '0.75rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f8fafc' }}>
                {tenantSchoolStore.getStaffBySchool(school.slug).length}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Staff &amp; Teachers</div>
            </div>
            <div style={{ background: '#131b2e', padding: '0.75rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f8fafc' }}>
                {(school.departments_list || []).length}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Faculties</div>
            </div>
            <div style={{ background: '#131b2e', padding: '0.75rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f8fafc' }}>
                {(school.classes_list || []).length}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Cohorts</div>
            </div>
          </div>
        </div>

        {/* Action Buttons inside inspector */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              onClose()
              onEditSchool(school)
            }}
            style={{
              background: '#1d4ed8',
              color: '#ffffff',
              border: 'none',
              padding: '0.7rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '0.84rem',
            }}
          >
            ✏️ Edit Profile
          </button>
          {school.subscription_status === 'suspended' ? (
            <button
              type="button"
              onClick={() => onToggleStatus(school.slug, 'active')}
              style={{
                background: '#047857',
                color: '#d1fae5',
                border: 'none',
                padding: '0.7rem 1.25rem',
                borderRadius: '10px',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.84rem',
              }}
            >
              ▶ Reactivate Institution
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onToggleStatus(school.slug, 'suspended')}
              style={{
                background: '#451a1a',
                color: '#fca5a5',
                border: '1px solid #7f1d1d',
                padding: '0.7rem 1.25rem',
                borderRadius: '10px',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.84rem',
              }}
            >
              ⏸ Suspend Institution
            </button>
          )}
          <button
            type="button"
            onClick={() => onResetPassword(school.slug)}
            style={{
              background: '#854d0e',
              color: '#fef08a',
              border: 'none',
              padding: '0.7rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '0.84rem',
            }}
          >
            ⚡ Regenerate Admin Password
          </button>
          <Link
            to={`/s/${school.slug}`}
            target="_blank"
            rel="noreferrer"
            style={{
              background: '#2563eb',
              color: '#ffffff',
              padding: '0.7rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 800,
              textDecoration: 'none',
              fontSize: '0.84rem',
            }}
          >
            Open Campus Hub →
          </Link>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#1e293b',
              color: '#cbd5e1',
              border: 'none',
              padding: '0.7rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '0.84rem',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
