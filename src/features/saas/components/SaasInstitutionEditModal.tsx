import React, { useState, useEffect } from 'react'
import type { PartnerSchoolTenant, InstitutionCategory } from '@/types/tenantSchool'
import type { SubscriptionTierType } from '@/types/licensing'

export interface EditInstitutionFormPayload {
  name: string
  motto: string
  curriculum_type: string
  institution_category: InstitutionCategory
  contact_phone: string
  contact_email: string
  address: string
  city: string
  country: string
  principal_name: string
  principal_title: string
  principal_email: string
  admin_username: string
  admin_password?: string
  custom_domain?: string
  campus_count: number
  subscription_tier: SubscriptionTierType
  subscription_status: 'active' | 'trial' | 'past_due' | 'expired' | 'licensed' | 'suspended'
  primary_color: string
  accent_color: string
}

export interface SaasInstitutionEditModalProps {
  school: PartnerSchoolTenant | null
  onClose: () => void
  onSave: (slug: string, payload: EditInstitutionFormPayload) => Promise<void>
  isSaving: boolean
}

export function SaasInstitutionEditModal({
  school,
  onClose,
  onSave,
  isSaving,
}: SaasInstitutionEditModalProps) {
  const [formData, setFormData] = useState<EditInstitutionFormPayload>({
    name: '',
    motto: '',
    curriculum_type: 'General Academic & Multi-Disciplinary',
    institution_category: 'college',
    contact_phone: '',
    contact_email: '',
    address: '',
    city: '',
    country: '',
    principal_name: '',
    principal_title: 'Principal / Provost',
    principal_email: '',
    admin_username: '',
    admin_password: '',
    custom_domain: '',
    campus_count: 1,
    subscription_tier: 'gold',
    subscription_status: 'licensed',
    primary_color: '#1e3a8a',
    accent_color: '#d4af37',
  })

  useEffect(() => {
    if (school) {
      setFormData({
        name: school.name || '',
        motto: school.motto || '',
        curriculum_type: school.curriculum_type || 'General Academic & Multi-Disciplinary',
        institution_category: (school.institution_category as InstitutionCategory) || 'college',
        contact_phone: school.contact_phone || '',
        contact_email: school.contact_email || '',
        address: school.address || '',
        city: school.city || '',
        country: school.country || '',
        principal_name: school.principal_name || '',
        principal_title: school.principal_title || 'Principal / Provost',
        principal_email: school.principal_email || school.contact_email || '',
        admin_username: school.admin_username || `${school.slug}.admin`,
        admin_password: '',
        custom_domain: school.custom_domain || '',
        campus_count: school.campus_count || (school.campuses_list ? school.campuses_list.length : 1),
        subscription_tier: (school.subscription_tier as SubscriptionTierType) || 'gold',
        subscription_status: (school.subscription_status as any) || (school.active_license_key ? 'licensed' : 'trial'),
        primary_color: school.primary_color || '#1e3a8a',
        accent_color: school.accent_color || '#d4af37',
      })
    }
  }, [school])

  if (!school) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(school.slug, formData)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
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
          maxWidth: '640px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          border: '1px solid #3b82f6',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
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
              ✏️ Update Institution Profile
            </span>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.3rem', fontWeight: 900, color: '#f8fafc' }}>
              {school.name}
            </h3>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
              Slug: <strong>{school.slug}</strong> (Permanent identifier)
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
              INSTITUTION FULL NAME *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '10px',
                background: '#0a0f1d',
                border: '1px solid #334155',
                color: '#ffffff',
                fontSize: '0.88rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                INSTITUTION CATEGORY *
              </label>
              <select
                value={formData.institution_category}
                onChange={(e) => setFormData({ ...formData, institution_category: e.target.value as InstitutionCategory })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: '#0a0f1d',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                }}
              >
                <option value="college">College / Polytechnic</option>
                <option value="school">Primary / High School (K-12)</option>
                <option value="university">University / Higher Education</option>
                <option value="academy">Professional &amp; Tech Academy</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                OPERATIONAL STATUS *
              </label>
              <select
                value={formData.subscription_status}
                onChange={(e) => setFormData({ ...formData, subscription_status: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: '#0a0f1d',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                }}
              >
                <option value="active">🟢 Active</option>
                <option value="licensed">🛡️ Licensed</option>
                <option value="trial">🟡 Trial</option>
                <option value="past_due">⚠️ Past Due</option>
                <option value="suspended">🔴 Suspended</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                INSTITUTION MOTTO / SLOGAN
              </label>
              <input
                type="text"
                value={formData.motto}
                onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
                placeholder="e.g. Excellence in Technical Skill"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: '#0a0f1d',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                CURRICULUM / SECTOR
              </label>
              <select
                value={formData.curriculum_type}
                onChange={(e) => setFormData({ ...formData, curriculum_type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: '#0a0f1d',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                }}
              >
                <option value="Vocational & Technical College">Vocational &amp; Technical College</option>
                <option value="General Academic & Multi-Disciplinary">General Academic &amp; Multi-Disciplinary</option>
                <option value="STEM & Technology Institute">STEM &amp; Technology Institute</option>
                <option value="Business & Professional Academy">Business &amp; Professional Academy</option>
                <option value="National / CBC Curriculum">National / CBC Curriculum</option>
                <option value="International Academic Curriculum">International Academic Curriculum</option>
              </select>
            </div>
          </div>

          {/* Leadership & Credentials */}
          <div style={{ background: '#0a0f1d', padding: '1rem', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              👑 Executive Leadership &amp; Administrator Login
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', marginBottom: '3px' }}>
                  PRINCIPAL / PROVOST NAME *
                </label>
                <input
                  type="text"
                  required
                  value={formData.principal_name}
                  onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: '#131b2e',
                    border: '1px solid #334155',
                    color: '#ffffff',
                    fontSize: '0.84rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', marginBottom: '3px' }}>
                  TITLE
                </label>
                <input
                  type="text"
                  value={formData.principal_title}
                  onChange={(e) => setFormData({ ...formData, principal_title: e.target.value })}
                  placeholder="Principal / Provost / Dean"
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: '#131b2e',
                    border: '1px solid #334155',
                    color: '#ffffff',
                    fontSize: '0.84rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', marginBottom: '3px' }}>
                  ADMIN LOGIN ID (USERNAME) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.admin_username}
                  onChange={(e) => setFormData({ ...formData, admin_username: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: '#131b2e',
                    border: '1px solid #334155',
                    color: '#38bdf8',
                    fontFamily: 'monospace',
                    fontSize: '0.84rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', marginBottom: '3px' }}>
                  CHANGE ADMIN PASSWORD
                </label>
                <input
                  type="text"
                  value={formData.admin_password}
                  onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                  placeholder="Leave blank to keep existing"
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: '#131b2e',
                    border: '1px solid #334155',
                    color: '#fbbf24',
                    fontFamily: 'monospace',
                    fontSize: '0.84rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Subscription Tier & Campuses */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                REGISTERED CAMPUSES
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.campus_count}
                onChange={(e) => setFormData({ ...formData, campus_count: Number(e.target.value) || 1 })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: '#0a0f1d',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                SUBSCRIPTION TIER
              </label>
              <select
                value={formData.subscription_tier}
                onChange={(e) => setFormData({ ...formData, subscription_tier: e.target.value as SubscriptionTierType })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: '#0a0f1d',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                }}
              >
                <option value="silver">Standard Monthly Plan (KES 2,500 / mo per campus)</option>
                <option value="lifetime">♾️ Lifetime Purchase (KES 30,000 + KES 1,000/yr Maint.)</option>
              </select>
            </div>
          </div>

          {/* Contacts & Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                CONTACT PHONE
              </label>
              <input
                type="text"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+254 700 000 000"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: '#0a0f1d',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                CONTACT EMAIL
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="admissions@school.edu"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: '#0a0f1d',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                CITY / TOWN
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Nairobi, Nakuru, Eldoret"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: '#0a0f1d',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                COUNTRY
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="e.g. Kenya"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: '#0a0f1d',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
              CAMPUS PHYSICAL ADDRESS
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. Commercial Street, Westlands, Nairobi"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '10px',
                background: '#0a0f1d',
                border: '1px solid #334155',
                color: '#ffffff',
                fontSize: '0.88rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
              CUSTOM DOMAIN (OPTIONAL)
            </label>
            <input
              type="text"
              value={formData.custom_domain}
              onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value })}
              placeholder="e.g. portal.apextech.ac.ke or lms.school.edu"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '10px',
                background: '#0a0f1d',
                border: '1px solid #334155',
                color: '#ffffff',
                fontSize: '0.88rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #1e293b', paddingTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                background: '#1e293b',
                color: '#cbd5e1',
                border: 'none',
                padding: '0.8rem',
                borderRadius: '10px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                flex: 2,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0.8rem',
                borderRadius: '10px',
                fontWeight: 900,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
              }}
            >
              {isSaving ? 'Saving Changes...' : '💾 Save & Sync Across Network'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
