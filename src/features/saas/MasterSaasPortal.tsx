import React, { useState, useEffect, useId } from 'react'
import { Link } from 'react-router-dom'
import { licensingStore, DEFAULT_CAMPUS_RATE_KES } from '@/lib/licensingStore'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import type { ProductKeyLicense, SaasCampusInvoice, LicenseDurationType } from '@/types/licensing'
import type { PartnerSchoolTenant } from '@/types/tenantSchool'
import {
  ShieldCheckIcon,
  LockIcon,
  KeyIcon,
  CreditCardIcon,
  BuildingIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  SearchIcon,
  UsersIcon,
  AwardIcon,
} from '@/components/icons/AppIcons'

export function MasterSaasPortal() {
  const formId = useId()

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    licensingStore.isMasterAuthenticated()
  )
  const [passcode, setPasscode] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)

  // Navigation Tabs: 'keys' | 'institutions' | 'invoices'
  const [activeTab, setActiveTab] = useState<'keys' | 'institutions' | 'invoices'>('keys')

  // Data States
  const [schools, setSchools] = useState<PartnerSchoolTenant[]>(() =>
    tenantSchoolStore.getSchools()
  )
  const [licenses, setLicenses] = useState<ProductKeyLicense[]>(() =>
    licensingStore.getLicenses()
  )
  const [invoices, setInvoices] = useState<SaasCampusInvoice[]>(() =>
    licensingStore.getInvoices()
  )
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Generator Form States
  const [selectedSchoolSlug, setSelectedSchoolSlug] = useState<string>('')
  const [customSchoolName, setCustomSchoolName] = useState<string>('')
  const [customSchoolSlug, setCustomSchoolSlug] = useState<string>('')
  const [campusCount, setCampusCount] = useState<number>(1)
  const [planDuration, setPlanDuration] = useState<LicenseDurationType>('1_month')
  const [customerContact, setCustomerContact] = useState<string>('')
  const [generatorNotes, setGeneratorNotes] = useState<string>('')
  const [latestGeneratedKey, setLatestGeneratedKey] = useState<ProductKeyLicense | null>(null)

  // Payment Recording Modal
  const [paymentModalSchool, setPaymentModalSchool] = useState<PartnerSchoolTenant | null>(null)
  const [mpesaRefInput, setMpesaRefInput] = useState('')
  const [paymentPeriodInput, setPaymentPeriodInput] = useState('October 2026')

  // Search filter
  const [searchFilter, setSearchFilter] = useState('')

  // Selected School Detail & Password Reset State
  const [inspectedSchool, setInspectedSchool] = useState<PartnerSchoolTenant | null>(null)
  const [generatedAdminPasswordMsg, setGeneratedAdminPasswordMsg] = useState<{ schoolSlug: string; pass: string } | null>(null)

  // Sync state listeners
  useEffect(() => {
    const handleSync = () => {
      setSchools(tenantSchoolStore.getSchools())
      setLicenses(licensingStore.getLicenses())
      setInvoices(licensingStore.getInvoices())
    }
    window.addEventListener('gc-licensing-updated', handleSync)
    window.addEventListener('gc-tenant-schools-updated', handleSync)
    return () => {
      window.removeEventListener('gc-licensing-updated', handleSync)
      window.removeEventListener('gc-tenant-schools-updated', handleSync)
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    if (licensingStore.verifyMasterAuth(passcode)) {
      setIsAuthenticated(true)
    } else {
      setAuthError('Invalid Master Access Passcode. (Default: GC-MASTER-2026)')
    }
  }

  const handleLogout = () => {
    licensingStore.logoutMaster()
    setIsAuthenticated(false)
  }

  const copyText = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedKey(id)
      setTimeout(() => setCopiedKey(null), 2500)
    }
  }

  const metrics = licensingStore.getMetrics()

  // Handle Generate Product Key
  const handleGenerateKey = (e: React.FormEvent) => {
    e.preventDefault()
    let sName = customSchoolName.trim()
    let sSlug = customSchoolSlug.trim().toLowerCase()

    if (selectedSchoolSlug) {
      const match = schools.find((s) => s.slug === selectedSchoolSlug)
      if (match) {
        sName = match.name
        sSlug = match.slug
      }
    }

    if (!sName) {
      alert('Please select or specify the institution name.')
      return
    }

    const newKey = licensingStore.generateProductKey({
      school_slug: sSlug || sName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      school_name: sName,
      campus_count: Number(campusCount) || 1,
      plan_duration: planDuration,
      customer_contact: customerContact,
      notes: generatorNotes,
    })

    setLatestGeneratedKey(newKey)
    setLicenses(licensingStore.getLicenses())
    setInvoices(licensingStore.getInvoices())
    setCustomSchoolName('')
    setCustomSchoolSlug('')
  }

  // Handle Record Direct Payment
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentModalSchool || !mpesaRefInput.trim()) return

    const cCount = paymentModalSchool.campus_count || 1
    licensingStore.createInvoice({
      school_slug: paymentModalSchool.slug,
      school_name: paymentModalSchool.name,
      billing_period: paymentPeriodInput,
      campus_count: cCount,
      campuses: paymentModalSchool.campuses_list?.map((c) => c.name) || ['Main Campus'],
      status: 'paid',
      payment_method: 'M-Pesa Paybill / Till',
      transaction_ref: mpesaRefInput.trim().toUpperCase(),
      paid_at: new Date().toISOString(),
    })

    tenantSchoolStore.updateSchoolBranding(paymentModalSchool.slug, {
      subscription_status: 'active',
    })

    setSchools(tenantSchoolStore.getSchools())
    setInvoices(licensingStore.getInvoices())
    setPaymentModalSchool(null)
    setMpesaRefInput('')
  }

  // =========================================================================
  // Master Security Gate (Password Prompt)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#090d16',
          color: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '460px',
            width: '100%',
            background: '#131b2e',
            borderRadius: '24px',
            padding: '2.5rem',
            border: '1px solid #1e293b',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
            }}
          >
            <ShieldCheckIcon size={36} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 0.4rem', letterSpacing: '-0.02em' }}>
            Master SaaS Directorate
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.86rem', margin: '0 0 1.75rem', lineHeight: 1.5 }}>
            Platform Owner Portal for Campus Billing (KES 2,500/campus) &amp; Product Key Generation.
          </p>

          {authError && (
            <div
              style={{
                background: '#450a0a',
                color: '#fca5a5',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: '1px solid #991b1b',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '1.25rem',
              }}
            >
              ⚠️ {authError}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ textAlign: 'left' }}>
              <label htmlFor={`${formId}-passcode`} style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px' }}>
                ENTER MASTER ACCESS PASSCODE
              </label>
              <input
                id={`${formId}-passcode`}
                type="password"
                required
                placeholder="e.g. GC-MASTER-2026"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  background: '#0a0f1d',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  fontSize: '1rem',
                  letterSpacing: '0.05em',
                  outline: 'none',
                  textAlign: 'center',
                  fontWeight: 800,
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.95rem',
                padding: '0.9rem',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)',
              }}
            >
              Unlock Master Terminal →
            </button>
          </form>

              <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #1e293b', fontSize: '0.74rem', color: '#64748b' }}>
                🔒 Platform Owner Directorate • Restricted to Authorized Platform Owners Only
              </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // Master SaaS Dashboard
  // =========================================================================
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#090d16',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top Navbar */}
      <header
        style={{
          borderBottom: '1px solid #1e293b',
          background: 'rgba(19, 27, 46, 0.95)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 900,
              }}
            >
              👑
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Global College SaaS Command</span>
                <span style={{ fontSize: '0.65rem', background: '#059669', color: '#ecfdf5', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                  SUPER-ADMIN
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Monthly Rate: <strong>KES 2,500 / Campus</strong> • Multi-Campus Billing Engine
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              to="/register-school"
              style={{
                background: '#1e293b',
                color: '#cbd5e1',
                padding: '0.5rem 0.9rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 700,
                textDecoration: 'none',
                border: '1px solid #334155',
              }}
            >
              + Onboard Campus
            </Link>
            <Link
              to="/"
              style={{
                background: '#1e293b',
                color: '#cbd5e1',
                padding: '0.5rem 0.9rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 700,
                textDecoration: 'none',
                border: '1px solid #334155',
              }}
            >
              School Portals
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: '#450a0a',
                color: '#fca5a5',
                border: '1px solid #7f1d1d',
                padding: '0.5rem 0.9rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Lock Terminal
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>
        {/* KPI Metrics Summary Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#131b2e', borderRadius: '18px', padding: '1.25rem', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
              Monthly Recurring Revenue (MRR)
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#10b981', margin: '4px 0 0' }}>
              KES {metrics.monthly_recurring_revenue_kes.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
              Based on KES 2,500/campus across {metrics.total_campuses} campuses
            </div>
          </div>

          <div style={{ background: '#131b2e', borderRadius: '18px', padding: '1.25rem', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
              Total Campuses &amp; Branches
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#38bdf8', margin: '4px 0 0' }}>
              {metrics.total_campuses} Campuses
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
              Spread across {metrics.total_institutions} registered institutions
            </div>
          </div>

          <div style={{ background: '#131b2e', borderRadius: '18px', padding: '1.25rem', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
              Issued Product Keys
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#f59e0b', margin: '4px 0 0' }}>
              {licenses.length} Keys
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
              {licenses.filter((l) => l.status === 'used').length} active / redeemed
            </div>
          </div>

          <div style={{ background: '#131b2e', borderRadius: '18px', padding: '1.25rem', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
              M-Pesa Payment Line
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#a855f7', margin: '4px 0 0' }}>
              0740027346
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
              KES 2,500/campus per month
            </div>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem', marginBottom: '2rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('keys')}
            style={{
              background: activeTab === 'keys' ? '#2563eb' : '#131b2e',
              color: activeTab === 'keys' ? '#ffffff' : '#94a3b8',
              border: '1px solid #1e293b',
              padding: '0.65rem 1.25rem',
              borderRadius: '12px',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🔑 Generate Product Keys ({licenses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('institutions')}
            style={{
              background: activeTab === 'institutions' ? '#2563eb' : '#131b2e',
              color: activeTab === 'institutions' ? '#ffffff' : '#94a3b8',
              border: '1px solid #1e293b',
              padding: '0.65rem 1.25rem',
              borderRadius: '12px',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🏛️ Institutions &amp; Campuses Ledger ({schools.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            style={{
              background: activeTab === 'invoices' ? '#2563eb' : '#131b2e',
              color: activeTab === 'invoices' ? '#ffffff' : '#94a3b8',
              border: '1px solid #1e293b',
              padding: '0.65rem 1.25rem',
              borderRadius: '12px',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>💳 Invoices &amp; M-Pesa Log ({invoices.length})</span>
          </button>
        </div>

        {/* =========================================================================
            TAB 1: PRODUCT KEY GENERATOR & ISSUED KEYS
        ========================================================================= */}
        {activeTab === 'keys' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
            {/* Left: Generator Form */}
            <div style={{ background: '#131b2e', borderRadius: '24px', padding: '1.75rem', border: '1px solid #1e293b' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f8fafc', margin: '0 0 0.4rem' }}>
                ⚡ Generate Official Product Key
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.84rem', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
                Issue activation keys for new or existing client institutions. Rate is automatically calculated at <strong>KES 2,500 per campus/month</strong>.
              </p>

              <form onSubmit={handleGenerateKey} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                <div>
                  <label htmlFor={`${formId}-existing-school`} style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px' }}>
                    SELECT EXISTING INSTITUTION
                  </label>
                  <select
                    id={`${formId}-existing-school`}
                    value={selectedSchoolSlug}
                    onChange={(e) => {
                      setSelectedSchoolSlug(e.target.value)
                      const found = schools.find((s) => s.slug === e.target.value)
                      if (found) {
                        setCampusCount(found.campus_count || (found.campuses_list ? found.campuses_list.length : 1))
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      background: '#0a0f1d',
                      border: '1px solid #334155',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                    }}
                  >
                    <option value="">-- Choose onboarded school or type custom below --</option>
                    {schools.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.name} ({s.campus_count || 1} campus[es])
                      </option>
                    ))}
                  </select>
                </div>

                {!selectedSchoolSlug && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label htmlFor={`${formId}-custom-name`} style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px' }}>
                        OR CUSTOM INSTITUTION NAME *
                      </label>
                      <input
                        id={`${formId}-custom-name`}
                        type="text"
                        placeholder="e.g. Apex TVET College"
                        value={customSchoolName}
                        onChange={(e) => setCustomSchoolName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '10px',
                          background: '#0a0f1d',
                          border: '1px solid #334155',
                          color: '#ffffff',
                          fontSize: '0.88rem',
                        }}
                      />
                    </div>
                    <div>
                      <label htmlFor={`${formId}-custom-slug`} style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px' }}>
                        URL SLUG
                      </label>
                      <input
                        id={`${formId}-custom-slug`}
                        type="text"
                        placeholder="apex-college"
                        value={customSchoolSlug}
                        onChange={(e) => setCustomSchoolSlug(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '10px',
                          background: '#0a0f1d',
                          border: '1px solid #334155',
                          color: '#ffffff',
                          fontSize: '0.88rem',
                        }}
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label htmlFor={`${formId}-campuses-input`} style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px' }}>
                      NUMBER OF CAMPUSES *
                    </label>
                    <input
                      id={`${formId}-campuses-input`}
                      type="number"
                      min={1}
                      max={20}
                      required
                      value={campusCount}
                      onChange={(e) => setCampusCount(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '10px',
                        background: '#0a0f1d',
                        border: '1px solid #334155',
                        color: '#ffffff',
                        fontSize: '0.92rem',
                        fontWeight: 900,
                      }}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
                      @ KES 2,500/campus = KES {(campusCount * 2500).toLocaleString()}/mo
                    </span>
                  </div>

                  <div>
                    <label htmlFor={`${formId}-duration`} style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px' }}>
                      LICENSE DURATION *
                    </label>
                    <select
                      id={`${formId}-duration`}
                      value={planDuration}
                      onChange={(e) => setPlanDuration(e.target.value as LicenseDurationType)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '10px',
                        background: '#0a0f1d',
                        border: '1px solid #334155',
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                      }}
                    >
                      <option value="1_month">1 Month (30 Days)</option>
                      <option value="3_months">3 Months (Quarter)</option>
                      <option value="6_months">6 Months (Half-Year)</option>
                      <option value="1_year">1 Year (Annual)</option>
                      <option value="perpetual">Lifetime (Perpetual)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor={`${formId}-contact`} style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px' }}>
                    CLIENT PHONE / WHATSAPP (FOR SENDING KEY)
                  </label>
                  <input
                    id={`${formId}-contact`}
                    type="tel"
                    placeholder="+254 7XX XXX XXX"
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      background: '#0a0f1d',
                      border: '1px solid #334155',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor={`${formId}-notes`} style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px' }}>
                    M-PESA TRANSACTION CODE / BILLING NOTES
                  </label>
                  <input
                    id={`${formId}-notes`}
                    type="text"
                    placeholder="e.g. Paid via M-Pesa Till 402010 ref QBF982KL"
                    value={generatorNotes}
                    onChange={(e) => setGeneratorNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      background: '#0a0f1d',
                      border: '1px solid #334155',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>

                {/* Live Cost Calculation Banner */}
                <div
                  style={{
                    background: '#0a0f1d',
                    borderRadius: '14px',
                    padding: '1rem',
                    border: '1px solid #1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
                      TOTAL LICENSE VALUE
                    </span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981' }}>
                      KES{' '}
                      {(
                        campusCount *
                        DEFAULT_CAMPUS_RATE_KES *
                        (planDuration === '3_months'
                          ? 3
                          : planDuration === '6_months'
                          ? 6
                          : planDuration === '1_year'
                          ? 12
                          : planDuration === 'perpetual'
                          ? 120
                          : 1)
                      ).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#94a3b8' }}>
                    {campusCount} campus(es) @ KES 2,500/mo
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    padding: '0.95rem',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
                  }}
                >
                  ⚡ Generate &amp; Issue Product Key
                </button>
              </form>
            </div>

            {/* Right: Latest Generated Key Card & List */}
            <div>
              {latestGeneratedKey && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
                    borderRadius: '24px',
                    padding: '1.75rem',
                    border: '2px solid #3b82f6',
                    marginBottom: '1.5rem',
                    boxShadow: '0 16px 36px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      ✓ NEW PRODUCT KEY ISSUED
                    </span>
                    <span style={{ fontSize: '0.7rem', background: '#22c55e', color: '#052e16', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                      ACTIVE
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: '0 0 0.35rem' }}>
                    {latestGeneratedKey.school_name}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: '0 0 1rem' }}>
                    {latestGeneratedKey.campus_count} Campus(es) • {latestGeneratedKey.duration_months} Month(s) • KES {latestGeneratedKey.total_amount_kes.toLocaleString()}
                  </p>

                  <div
                    style={{
                      background: '#090d16',
                      borderRadius: '12px',
                      padding: '0.85rem 1rem',
                      border: '1px solid #334155',
                      fontFamily: 'monospace',
                      fontSize: '1.15rem',
                      fontWeight: 900,
                      letterSpacing: '0.08em',
                      color: '#fbbf24',
                      textAlign: 'center',
                      marginBottom: '1rem',
                    }}
                  >
                    {latestGeneratedKey.key}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => copyText(latestGeneratedKey.key, 'latest')}
                      style={{
                        flex: 1,
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '0.65rem',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {copiedKey === 'latest' ? '✓ Copied Key!' : '📋 Copy Product Key'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const msg = `Hello! Here is your Global College Cloud Campus Product Key for ${latestGeneratedKey.school_name}:\n\nKey: ${latestGeneratedKey.key}\nCampuses: ${latestGeneratedKey.campus_count}\nMonthly Rate: KES ${(latestGeneratedKey.campus_count * 2500).toLocaleString()}/month\nM-Pesa Payment Number: 0740027346\nValid until: ${latestGeneratedKey.expires_at.split('T')[0]}\n\nEnter this key in your Principal / Admin Desk under "Activate Campus License" to unlock full access.`
                        copyText(msg, 'latest_msg')
                      }}
                      style={{
                        background: '#1e293b',
                        color: '#cbd5e1',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        padding: '0.65rem 0.85rem',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {copiedKey === 'latest_msg' ? '✓ Copied Message!' : '💬 Copy WhatsApp Text'}
                    </button>
                  </div>
                </div>
              )}

              {/* Table of Issued Keys */}
              <div style={{ background: '#131b2e', borderRadius: '24px', padding: '1.75rem', border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#f8fafc' }}>
                    All Issued Product Keys ({licenses.length})
                  </h4>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    Cryptographic 19-char format
                  </span>
                </div>

                {licenses.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                    No product keys generated yet. Use the form on the left to issue your first license key.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '450px', overflowY: 'auto' }}>
                    {licenses.map((lic) => (
                      <div
                        key={lic.id}
                        style={{
                          background: '#0a0f1d',
                          borderRadius: '14px',
                          padding: '0.9rem',
                          border: '1px solid #1e293b',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#fbbf24', fontSize: '0.92rem' }}>
                            {lic.key}
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: lic.status === 'used' ? '#047857' : lic.status === 'active' ? '#1d4ed8' : '#7f1d1d',
                              color: '#ffffff',
                              textTransform: 'uppercase',
                            }}
                          >
                            {lic.status}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94a3b8' }}>
                          <span>{lic.school_name} ({lic.campus_count} campus[es])</span>
                          <span>KES {lic.total_amount_kes.toLocaleString()}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b' }}>
                          <span>Expires: {lic.expires_at.split('T')[0]}</span>
                          <button
                            type="button"
                            onClick={() => copyText(lic.key, lic.id)}
                            style={{
                              background: '#1e293b',
                              color: '#cbd5e1',
                              border: 'none',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            {copiedKey === lic.id ? '✓ Copied' : 'Copy Key'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: INSTITUTIONS & CAMPUSES LEDGER (KES 2,500/CAMPUS PRICING)
        ========================================================================= */}
        {activeTab === 'institutions' && (
          <div style={{ background: '#131b2e', borderRadius: '24px', padding: '1.75rem', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>
                  Client Institutions &amp; Campuses Ledger ({schools.length})
                </h3>
                <p style={{ margin: '3px 0 0', color: '#94a3b8', fontSize: '0.84rem' }}>
                  Billing Rule: KES 2,500 per campus / branch per month. If institution operates &gt;2 campuses, each is paid separately.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {schools.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('⚠️ Are you sure you want to clean the database and delete ALL existing institutions & licenses? This will reset the platform to a completely clean state.')) {
                        tenantSchoolStore.clearAllSchools()
                        licensingStore.clearAllLicensingData()
                        setSchools([])
                        setLicenses([])
                        setInvoices([])
                      }
                    }}
                    style={{
                      background: '#7f1d1d',
                      color: '#fecaca',
                      border: '1px solid #991b1b',
                      padding: '0.55rem 0.9rem',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    🗑️ Clean All Schools
                  </button>
                )}
                <div style={{ position: 'relative', width: '220px' }}>
                  <input
                    type="text"
                    placeholder="Filter institutions..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem 0.6rem 2.2rem',
                      borderRadius: '10px',
                      background: '#0a0f1d',
                      border: '1px solid #334155',
                      color: '#ffffff',
                      fontSize: '0.84rem',
                      outline: 'none',
                    }}
                  />
                  <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                    <SearchIcon size={14} />
                  </div>
                </div>
              </div>
            </div>

            {schools.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No schools onboarded yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                      <th style={{ padding: '0.75rem' }}>Institution</th>
                      <th style={{ padding: '0.75rem' }}>Category</th>
                      <th style={{ padding: '0.75rem' }}>Campuses</th>
                      <th style={{ padding: '0.75rem' }}>Monthly Fee (KES)</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                      <th style={{ padding: '0.75rem' }}>License Expiry</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schools
                      .filter((s) => s.name.toLowerCase().includes(searchFilter.toLowerCase()) || s.slug.includes(searchFilter.toLowerCase()))
                      .map((sch) => {
                        const cCount = sch.campus_count || (sch.campuses_list ? sch.campuses_list.length : 1) || 1
                        const monthlyRate = cCount * DEFAULT_CAMPUS_RATE_KES

                        return (
                          <tr key={sch.id} style={{ borderBottom: '1px solid #1e293b' }}>
                            <td style={{ padding: '0.85rem 0.75rem' }}>
                              <strong style={{ color: '#f8fafc', fontSize: '0.92rem' }}>{sch.name}</strong>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>/s/{sch.slug}</div>
                            </td>
                            <td style={{ padding: '0.85rem 0.75rem', textTransform: 'uppercase', fontSize: '0.74rem', color: '#cbd5e1' }}>
                              {sch.institution_category || 'College'}
                            </td>
                            <td style={{ padding: '0.85rem 0.75rem' }}>
                              <span style={{ background: '#1e293b', color: '#38bdf8', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                                🏛️ {cCount} Campus(es)
                              </span>
                            </td>
                            <td style={{ padding: '0.85rem 0.75rem', fontWeight: 900, color: '#10b981' }}>
                              KES {monthlyRate.toLocaleString()} / mo
                              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>({cCount} × 2,500)</div>
                            </td>
                            <td style={{ padding: '0.85rem 0.75rem' }}>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  padding: '3px 8px',
                                  borderRadius: '999px',
                                  background: sch.subscription_status === 'licensed' ? '#047857' : sch.subscription_status === 'active' ? '#1d4ed8' : '#854d0e',
                                  color: '#ffffff',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {sch.subscription_status || 'Trial'}
                              </span>
                            </td>
                            <td style={{ padding: '0.85rem 0.75rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
                              {sch.license_valid_until ? sch.license_valid_until.split('T')[0] : '14-Day Trial'}
                            </td>
                            <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSchoolSlug(sch.slug)
                                    setActiveTab('keys')
                                  }}
                                  style={{
                                    background: '#2563eb',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.4rem 0.7rem',
                                    borderRadius: '8px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                >
                                  + Generate Key
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setInspectedSchool(sch)}
                                  style={{
                                    background: '#334155',
                                    color: '#f8fafc',
                                    border: 'none',
                                    padding: '0.4rem 0.7rem',
                                    borderRadius: '8px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                  title="View full institution profile, campuses & contact information"
                                >
                                  🔍 Details
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const res = tenantSchoolStore.resetSchoolAdminPassword(sch.slug)
                                    if (res.success) {
                                      setGeneratedAdminPasswordMsg({ schoolSlug: sch.slug, pass: res.newPassword })
                                      setSchools(tenantSchoolStore.getSchools())
                                    }
                                  }}
                                  style={{
                                    background: '#854d0e',
                                    color: '#fef08a',
                                    border: 'none',
                                    padding: '0.4rem 0.7rem',
                                    borderRadius: '8px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                  title="Regenerate Admin temporary password"
                                >
                                  🔑 Reset Pass
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPaymentModalSchool(sch)}
                                  style={{
                                    background: '#10b981',
                                    color: '#064e3b',
                                    border: 'none',
                                    padding: '0.4rem 0.7rem',
                                    borderRadius: '8px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                >
                                  💳 Record M-Pesa
                                </button>
                                <Link
                                  to={`/s/${sch.slug}`}
                                  style={{
                                    background: '#1e293b',
                                    color: '#cbd5e1',
                                    padding: '0.4rem 0.7rem',
                                    borderRadius: '8px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                  }}
                                >
                                  Hub →
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Delete institution "${sch.name}"? This will remove all associated records.`)) {
                                      tenantSchoolStore.deleteSchool(sch.slug)
                                      setSchools(tenantSchoolStore.getSchools())
                                    }
                                  }}
                                  style={{
                                    background: '#3f1212',
                                    color: '#f87171',
                                    border: '1px solid #7f1d1d',
                                    padding: '0.4rem 0.6rem',
                                    borderRadius: '8px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                  title={`Delete ${sch.name}`}
                                >
                                  🗑️
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

        {/* =========================================================================
            TAB 3: INVOICES & M-PESA LOG
        ========================================================================= */}
        {activeTab === 'invoices' && (
          <div style={{ background: '#131b2e', borderRadius: '24px', padding: '1.75rem', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 900 }}>
              SaaS Campus Invoices &amp; M-Pesa Payment Records ({invoices.length})
            </h3>

            {invoices.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No invoices issued yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                      <th style={{ padding: '0.75rem' }}>Invoice No</th>
                      <th style={{ padding: '0.75rem' }}>Institution</th>
                      <th style={{ padding: '0.75rem' }}>Period</th>
                      <th style={{ padding: '0.75rem' }}>Campuses</th>
                      <th style={{ padding: '0.75rem' }}>Amount (KES)</th>
                      <th style={{ padding: '0.75rem' }}>Method / Ref</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                      <th style={{ padding: '0.75rem' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '0.85rem 0.75rem', fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>
                          {inv.invoice_number}
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', fontWeight: 700, color: '#f8fafc' }}>
                          {inv.school_name}
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', color: '#cbd5e1' }}>{inv.billing_period}</td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>{inv.campus_count} Campus(es)</td>
                        <td style={{ padding: '0.85rem 0.75rem', fontWeight: 900, color: '#10b981' }}>
                          KES {inv.total_amount_kes.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', fontSize: '0.75rem' }}>
                          <span style={{ color: '#fbbf24', fontWeight: 700 }}>{inv.payment_method || '—'}</span>
                          {inv.transaction_ref && <div style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{inv.transaction_ref}</div>}
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: inv.status === 'paid' ? '#047857' : '#854d0e',
                              color: '#ffffff',
                              textTransform: 'uppercase',
                            }}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
                          {inv.created_at.split('T')[0]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal: Record Direct M-Pesa / Bank Payment */}
        {paymentModalSchool && (
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
            onClick={() => setPaymentModalSchool(null)}
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
              <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.2rem', fontWeight: 900 }}>
                Record Payment for {paymentModalSchool.name}
              </h3>
              <p style={{ margin: '0 0 1.25rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                Rate: KES 2,500/campus × {paymentModalSchool.campus_count || 1} campus(es) ={' '}
                <strong style={{ color: '#10b981' }}>
                  KES {((paymentModalSchool.campus_count || 1) * 2500).toLocaleString()}
                </strong>{' '}
                (Received via M-Pesa <strong>0740027346</strong>)
              </p>

              <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label htmlFor={`${formId}-pay-period`} style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '5px' }}>
                    BILLING PERIOD
                  </label>
                  <input
                    id={`${formId}-pay-period`}
                    type="text"
                    value={paymentPeriodInput}
                    onChange={(e) => setPaymentPeriodInput(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: '#0a0f1d', border: '1px solid #334155', color: '#ffffff', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label htmlFor={`${formId}-mpesa-ref`} style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '5px' }}>
                    M-PESA CONFIRMATION CODE *
                  </label>
                  <input
                    id={`${formId}-mpesa-ref`}
                    type="text"
                    required
                    placeholder="e.g. QBF9204KLL"
                    value={mpesaRefInput}
                    onChange={(e) => setMpesaRefInput(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: '#0a0f1d', border: '1px solid #334155', color: '#fbbf24', fontSize: '0.95rem', fontWeight: 900 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setPaymentModalSchool(null)}
                    style={{ flex: 1, background: '#1e293b', color: '#cbd5e1', border: 'none', padding: '0.75rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ flex: 2, background: '#10b981', color: '#064e3b', border: 'none', padding: '0.75rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 900, cursor: 'pointer' }}
                  >
                    Confirm &amp; Extend License
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: RESET ADMIN PASSWORD NOTIFICATION */}
        {generatedAdminPasswordMsg && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1.25rem',
            }}
            onClick={() => setGeneratedAdminPasswordMsg(null)}
          >
            <div
              style={{
                background: '#131b2e',
                borderRadius: '24px',
                maxWidth: '480px',
                width: '100%',
                padding: '2rem',
                border: '2px solid #854d0e',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.8rem' }}>🔑</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#fef08a' }}>
                    New Admin Temporary Password
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    School: <strong>{generatedAdminPasswordMsg.schoolSlug}</strong>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 1rem' }}>
                A new temporary password has been successfully regenerated. Provide this to the school principal or administrator. They can change it inside their profile:
              </p>

              <div
                style={{
                  background: '#090d16',
                  borderRadius: '12px',
                  padding: '1rem',
                  border: '1px solid #334155',
                  fontFamily: 'monospace',
                  fontSize: '1.3rem',
                  fontWeight: 900,
                  color: '#fbbf24',
                  textAlign: 'center',
                  letterSpacing: '0.08em',
                  marginBottom: '1.25rem',
                }}
              >
                {generatedAdminPasswordMsg.pass}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => copyText(generatedAdminPasswordMsg.pass, 'admin_pass_copied')}
                  style={{
                    flex: 1,
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {copiedKey === 'admin_pass_copied' ? '✓ Copied Password!' : '📋 Copy Password'}
                </button>
                <button
                  type="button"
                  onClick={() => setGeneratedAdminPasswordMsg(null)}
                  style={{
                    background: '#1e293b',
                    color: '#cbd5e1',
                    border: 'none',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '10px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: FULL REGISTERED SCHOOL INFORMATION INSPECTOR */}
        {inspectedSchool && (
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
            onClick={() => setInspectedSchool(null)}
          >
            <div
              style={{
                background: '#131b2e',
                borderRadius: '24px',
                maxWidth: '680px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '2rem',
                border: '1px solid #334155',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', borderBottom: '1px solid #1e293b', paddingBottom: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🏛️ Full Institution Dossier
                  </span>
                  <h3 style={{ margin: '4px 0 0', fontSize: '1.4rem', fontWeight: 900, color: '#f8fafc' }}>
                    {inspectedSchool.name}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                    URL Slug: <strong>{inspectedSchool.slug}</strong> • Custom Domain: <strong>{inspectedSchool.custom_domain || 'None (Using Subdomain)'}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedSchool(null)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Grid of Profile Information */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#0a0f1d', padding: '1rem', borderRadius: '14px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Executive Leadership</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#f8fafc', marginTop: '3px' }}>
                    {inspectedSchool.principal_name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                    Title: {inspectedSchool.principal_title} • Email: {inspectedSchool.principal_email}
                  </div>
                </div>

                <div style={{ background: '#0a0f1d', padding: '1rem', borderRadius: '14px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Administrator Account</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#fbbf24', marginTop: '3px', fontFamily: 'monospace' }}>
                    Username: {inspectedSchool.admin_username || `${inspectedSchool.slug}.admin`}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                    Current Password: <strong style={{ color: '#f8fafc' }}>{inspectedSchool.admin_password || '(Hidden / Default)'}</strong>
                  </div>
                </div>

                <div style={{ background: '#0a0f1d', padding: '1rem', borderRadius: '14px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Campus Configuration</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#f8fafc', marginTop: '3px' }}>
                    {inspectedSchool.campus_count || 1} Registered Campus(es)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                    Billing Rate: KES {((inspectedSchool.campus_count || 1) * 2500).toLocaleString()} / Month
                  </div>
                </div>

                <div style={{ background: '#0a0f1d', padding: '1rem', borderRadius: '14px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Institutional Contacts</div>
                  <div style={{ fontSize: '0.85rem', color: '#f8fafc', marginTop: '3px' }}>
                    📞 {inspectedSchool.contact_phone}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
                    ✉️ {inspectedSchool.contact_email}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                    📍 {inspectedSchool.address || `${inspectedSchool.city}, ${inspectedSchool.country}`}
                  </div>
                </div>
              </div>

              {/* Registered Counts */}
              <div style={{ background: '#0a0f1d', padding: '1.25rem', borderRadius: '14px', border: '1px solid #1e293b', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Live Enrolled Members &amp; Academic Structure
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                  <div style={{ background: '#131b2e', padding: '0.75rem', borderRadius: '10px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f8fafc' }}>
                      {tenantSchoolStore.getStudentsBySchool(inspectedSchool.slug).length}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Students</div>
                  </div>
                  <div style={{ background: '#131b2e', padding: '0.75rem', borderRadius: '10px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f8fafc' }}>
                      {tenantSchoolStore.getStaffBySchool(inspectedSchool.slug).length}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Staff &amp; Teachers</div>
                  </div>
                  <div style={{ background: '#131b2e', padding: '0.75rem', borderRadius: '10px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f8fafc' }}>
                      {(inspectedSchool.departments_list || []).length}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Faculties</div>
                  </div>
                  <div style={{ background: '#131b2e', padding: '0.75rem', borderRadius: '10px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f8fafc' }}>
                      {(inspectedSchool.classes_list || []).length}
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
                    const res = tenantSchoolStore.resetSchoolAdminPassword(inspectedSchool.slug)
                    if (res.success) {
                      setGeneratedAdminPasswordMsg({ schoolSlug: inspectedSchool.slug, pass: res.newPassword })
                      const updated = tenantSchoolStore.getSchoolBySlug(inspectedSchool.slug)
                      if (updated) setInspectedSchool(updated)
                      setSchools(tenantSchoolStore.getSchools())
                    }
                  }}
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
                  to={`/s/${inspectedSchool.slug}`}
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
                  onClick={() => setInspectedSchool(null)}
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
        )}
      </main>
    </div>
  )
}
