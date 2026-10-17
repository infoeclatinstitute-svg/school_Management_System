import React, { useState, useEffect, useId } from 'react'
import { Link } from 'react-router-dom'
import { licensingStore } from '@/lib/licensingStore'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import type {
  ProductKeyLicense,
  SaasCampusInvoice,
  LicenseDurationType,
  MasterLicensingMetrics,
  SubscriptionTierType,
} from '@/types/licensing'
import {
  SUBSCRIPTION_TIER_RATES,
  SUBSCRIPTION_TIER_DETAILS,
} from '@/types/licensing'
import type { PartnerSchoolTenant, InstitutionCategory } from '@/types/tenantSchool'
import { SearchIcon } from '@/components/icons/AppIcons'
import { AppLogo } from '@/components/common/AppLogo'
import { SaasPushNotificationManager } from './components/SaasPushNotificationManager'
import { pushNotificationService } from '@/lib/pushNotificationService'

export function MasterSaasPortal() {
  const formId = useId()

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    licensingStore.isMasterAuthenticated()
  )
  const [passcode, setPasscode] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)

  // Navigation Tabs: 'keys' | 'institutions' | 'invoices' | 'mobile_apks' | 'notifications'
  const [activeTab, setActiveTab] = useState<'keys' | 'institutions' | 'invoices' | 'mobile_apks' | 'notifications'>('keys')
  const [copiedShareMsg, setCopiedShareMsg] = useState(false)
  const [notificationCount, setNotificationCount] = useState<number>(() =>
    pushNotificationService.getHistory().length
  )
  const [pushPermStatus, setPushPermStatus] = useState<string>(() =>
    pushNotificationService.getPermissionStatus()
  )

  useEffect(() => {
    const unsub = pushNotificationService.subscribe(() => {
      setNotificationCount(pushNotificationService.getHistory().length)
      setPushPermStatus(pushNotificationService.getPermissionStatus())
    })
    return () => unsub()
  }, [])

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
  const [selectedTier, setSelectedTier] = useState<SubscriptionTierType>('gold')
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
  const [editingSchool, setEditingSchool] = useState<PartnerSchoolTenant | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: '',
    motto: '',
    curriculum_type: 'General Academic & Multi-Disciplinary',
    institution_category: 'college' as InstitutionCategory,
    contact_phone: '',
    contact_email: '',
    address: '',
    principal_name: '',
    campus_count: 1,
    subscription_tier: 'gold' as SubscriptionTierType,
  })
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [generatedAdminPasswordMsg, setGeneratedAdminPasswordMsg] = useState<{ schoolSlug: string; pass: string } | null>(null)

  const [metrics, setMetrics] = useState<MasterLicensingMetrics>(() => licensingStore.getMetrics())
  const [isGeneratingKey, setIsGeneratingKey] = useState(false)

  // Sync state listeners & privacy guards
  useEffect(() => {
    const prevTitle = document.title
    document.title = 'Access Restricted | Platform Administration'

    let metaTag = document.querySelector('meta[name="robots"]')
    let createdMeta = false
    if (!metaTag) {
      metaTag = document.createElement('meta')
      metaTag.setAttribute('name', 'robots')
      metaTag.setAttribute('content', 'noindex, nofollow, noarchive')
      document.head.appendChild(metaTag)
      createdMeta = true
    } else {
      metaTag.setAttribute('content', 'noindex, nofollow, noarchive')
    }

    // Proactively pull cloud data on mount
    tenantSchoolStore.syncWithCloud()
    licensingStore.syncWithCloud()

    const handleSync = () => {
      setSchools(tenantSchoolStore.getSchools())
      setLicenses(licensingStore.getLicenses())
      setInvoices(licensingStore.getInvoices())
      setMetrics(licensingStore.getMetrics())
    }
    window.addEventListener('gc-licensing-updated', handleSync)
    window.addEventListener('gc-tenant-schools-updated', handleSync)
    return () => {
      document.title = prevTitle
      if (createdMeta && metaTag?.parentNode) {
        metaTag.parentNode.removeChild(metaTag)
      }
      window.removeEventListener('gc-licensing-updated', handleSync)
      window.removeEventListener('gc-tenant-schools-updated', handleSync)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    if (licensingStore.verifyMasterAuth(passcode)) {
      setIsAuthenticated(true)
      await Promise.all([
        tenantSchoolStore.syncWithCloud(),
        licensingStore.syncWithCloud(),
      ])
      setSchools(tenantSchoolStore.getSchools())
      setLicenses(licensingStore.getLicenses())
      setInvoices(licensingStore.getInvoices())
      setMetrics(licensingStore.getMetrics())
    } else {
      setAuthError('Invalid Master Access Passcode. Access denied.')
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

  // Handle Generate Product Key
  const handleGenerateKey = async (e: React.FormEvent) => {
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

    setIsGeneratingKey(true)
    try {
      const newKey = licensingStore.generateProductKey({
        school_slug: sSlug || sName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        school_name: sName,
        campus_count: Number(campusCount) || 1,
        plan_duration: planDuration,
        tier: selectedTier,
        customer_contact: customerContact,
        notes: generatorNotes,
      })

      await licensingStore.pushToCloud()
      setLatestGeneratedKey(newKey)
      setLicenses(licensingStore.getLicenses())
      setInvoices(licensingStore.getInvoices())
      setMetrics(licensingStore.getMetrics())
      setCustomSchoolName('')
      setCustomSchoolSlug('')
    } finally {
      setIsGeneratingKey(false)
    }
  }

  const openEditSchool = (sch: PartnerSchoolTenant) => {
    setEditingSchool(sch)
    setEditFormData({
      name: sch.name || '',
      motto: sch.motto || '',
      curriculum_type: sch.curriculum_type || 'General Academic & Multi-Disciplinary',
      institution_category: sch.institution_category || 'college',
      contact_phone: sch.contact_phone || '',
      contact_email: sch.contact_email || '',
      address: sch.address || '',
      principal_name: sch.principal_name || '',
      campus_count: sch.campus_count || 1,
      subscription_tier: (sch.subscription_tier as SubscriptionTierType) || 'gold',
    })
  }

  const handleSaveSchoolEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSchool) return

    setIsSavingEdit(true)
    try {
      tenantSchoolStore.updateSchoolBranding(editingSchool.slug, {
        name: editFormData.name.trim() || editingSchool.name,
        motto: editFormData.motto.trim(),
        curriculum_type: editFormData.curriculum_type.trim(),
        institution_category: editFormData.institution_category,
        contact_phone: editFormData.contact_phone.trim(),
        contact_email: editFormData.contact_email.trim(),
        address: editFormData.address.trim(),
        principal_name: editFormData.principal_name.trim(),
        campus_count: Number(editFormData.campus_count) || 1,
        subscription_tier: editFormData.subscription_tier,
      })
      await tenantSchoolStore.pushToCloud()
      setSchools(tenantSchoolStore.getSchools())
      setEditingSchool(null)
    } finally {
      setIsSavingEdit(false)
    }
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

  // Handle WhatsApp Sharing & APK distribution
  const handleShareWhatsApp = (flavor: 'saasAdmin' | 'sms') => {
    const isSaas = flavor === 'saasAdmin'
    const apkUrl = `${window.location.origin}/downloads/${isSaas ? 'GlobalCollege-SaaSAdmin.apk' : 'GlobalCollege-SMS.apk'}`
    const msg = isSaas
      ? `👑 *Global College — SaaS Admin Dedicated Mobile APK*\n\n📲 *Download APK:* ${apkUrl}\n\n🔐 *Role:* Platform Owner Directorate\n💼 *Campus Billing:* KES 2,500/campus\n\n*Features Included:*\n• Direct startup to Master Security Gate\n• Instant Campus Activation & Product Key Generation\n• Multi-Campus Subscription & MRR Management\n• M-Pesa Transaction Verification (0740027346)\n• Institution Admin Password Reset\n\n*Quick Android Install:*\n1. Download the APK file from the link above.\n2. Tap the file in Downloads & click "Install" (enable "Install unknown apps" if prompted).\n3. Open app & enter your Master Access Passcode.`
      : `🎓 *Global College — School Management System Mobile APK*\n\n📲 *Download APK:* ${apkUrl}\n\n*Features:*\n• Student Portal & Course Materials\n• Faculty & Teacher Desks\n• Bursar Fee Collection & Receipts\n• E-Library & Timetables\n\n*Installation:*\n1. Tap the link to download the APK.\n2. Tap "Install" on your Android device.`

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`
    window.open(waUrl, '_blank')
  }

  const handleCopyShareMsg = (flavor: 'saasAdmin' | 'sms') => {
    const isSaas = flavor === 'saasAdmin'
    const apkUrl = `${window.location.origin}/downloads/${isSaas ? 'GlobalCollege-SaaSAdmin.apk' : 'GlobalCollege-SMS.apk'}`
    const msg = isSaas
      ? `👑 Global College — SaaS Admin Dedicated Mobile APK\nDownload APK: ${apkUrl}\n\nFeatures:\n• Direct startup to Master Passcode Terminal\n• Instant Campus Activation & Product Key Generation\n• Multi-Campus Subscription & MRR Management\n• M-Pesa Transaction Verification (0740027346)\n• Institution Admin Password Reset\n\nInstallation:\n1. Download the APK file from: ${apkUrl}\n2. Tap to Install on Android.\n3. Open & enter Master Passcode.`
      : `🎓 Global College — School Management System Mobile APK\nDownload APK: ${apkUrl}`

    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg)
      setCopiedShareMsg(true)
      setTimeout(() => setCopiedShareMsg(false), 2500)
    }
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
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <AppLogo size="xl" variant="icon" />
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
                placeholder="Enter Master Passcode"
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
            <AppLogo size="md" variant="icon" />
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
              onClick={() => setActiveTab('notifications')}
              style={{
                background: activeTab === 'notifications' ? 'rgba(124, 58, 237, 0.3)' : '#1e293b',
                color: activeTab === 'notifications' ? '#c084fc' : '#cbd5e1',
                padding: '0.5rem 0.9rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 800,
                border: activeTab === 'notifications' ? '1px solid #a855f7' : '1px solid #334155',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🔔 Push Alerts</span>
              <span
                style={{
                  background: pushPermStatus === 'granted' ? '#10b981' : '#f59e0b',
                  color: '#064e3b',
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  fontWeight: 900,
                }}
              >
                {notificationCount}
              </span>
            </button>
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

        {/* Quick Mobile Access & WhatsApp Share Bar */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.4) 0%, rgba(19, 27, 46, 0.95) 100%)',
            border: '1px solid #059669',
            borderRadius: '18px',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                flexShrink: 0,
              }}
            >
              📱
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#ecfdf5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>SaaS Admin Dedicated Android APK</span>
                <span style={{ fontSize: '0.68rem', background: '#10b981', color: '#064e3b', padding: '1px 7px', borderRadius: '999px', fontWeight: 900 }}>
                  STANDALONE
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                Standalone package for Platform Owners — instant Master Passcode startup, billing &amp; key generator.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a
              href="/downloads/GlobalCollege-SaaSAdmin.apk"
              download="GlobalCollege-SaaSAdmin.apk"
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                padding: '0.55rem 1.1rem',
                borderRadius: '10px',
                fontSize: '0.84rem',
                fontWeight: 800,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
              }}
            >
              <span>📥 Download APK</span>
            </a>

            <button
              type="button"
              onClick={() => handleShareWhatsApp('saasAdmin')}
              style={{
                background: '#25D366',
                color: '#075E54',
                padding: '0.55rem 1.1rem',
                borderRadius: '10px',
                fontSize: '0.84rem',
                fontWeight: 900,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)',
              }}
            >
              <span>💬 Send to WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mobile_apks')}
              style={{
                background: '#1e293b',
                color: '#94a3b8',
                padding: '0.55rem 0.9rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: '1px solid #334155',
                cursor: 'pointer',
              }}
            >
              View APK Details →
            </button>
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

          <button
            type="button"
            onClick={() => setActiveTab('mobile_apks')}
            style={{
              background: activeTab === 'mobile_apks' ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : '#131b2e',
              color: activeTab === 'mobile_apks' ? '#ffffff' : '#94a3b8',
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
            <span>📱 Mobile APKs &amp; WhatsApp Share</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            style={{
              background: activeTab === 'notifications' ? 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)' : '#131b2e',
              color: activeTab === 'notifications' ? '#ffffff' : '#94a3b8',
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
            <span>🔔 Push Notifications ({notificationCount})</span>
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
                Issue activation keys for client institutions. <strong>Gold Tier (KES 3,000/mo)</strong> unlocks the dedicated public showcase, programs catalog, About Us &amp; facilities; <strong>Silver Tier (KES 2,500/mo)</strong> covers core role portals.
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
                        {s.name} ({s.campus_count || 1} campus[es]) {s.subscription_tier ? `[${s.subscription_tier.toUpperCase()}]` : ''}
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

                {/* SUBSCRIPTION TIER SELECTOR */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8' }}>
                      SUBSCRIPTION TIER &amp; PRODUCT LEVEL *
                    </label>
                    <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 800 }}>
                      ⭐ Gold Tier = KES 3,000 / mo
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {(['gold', 'silver', 'platinum'] as SubscriptionTierType[]).map((tierKey) => {
                      const details = SUBSCRIPTION_TIER_DETAILS[tierKey]
                      const isSel = selectedTier === tierKey
                      return (
                        <div
                          key={tierKey}
                          onClick={() => setSelectedTier(tierKey)}
                          style={{
                            background: isSel
                              ? tierKey === 'gold'
                                ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.25) 0%, rgba(245, 158, 11, 0.08) 100%)'
                                : tierKey === 'platinum'
                                ? 'rgba(99, 102, 241, 0.2)'
                                : 'rgba(59, 130, 246, 0.15)'
                              : '#0a0f1d',
                            border: isSel
                              ? tierKey === 'gold'
                                ? '2px solid #f59e0b'
                                : tierKey === 'platinum'
                                ? '2px solid #818cf8'
                                : '2px solid #3b82f6'
                              : '1px solid #334155',
                            borderRadius: '14px',
                            padding: '0.85rem',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 900, color: tierKey === 'gold' ? '#fbbf24' : '#ffffff' }}>
                              {details.badge}
                            </span>
                            {tierKey === 'gold' && (
                              <span style={{ fontSize: '0.62rem', background: '#f59e0b', color: '#000000', fontWeight: 900, padding: '2px 6px', borderRadius: '4px' }}>
                                POPULAR
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#10b981', margin: '2px 0' }}>
                            KES {details.rateKes.toLocaleString()}
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>/campus/mo</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.35 }}>
                            {tierKey === 'gold'
                              ? '⭐ Unlocks dedicated public page, programs catalog & facilities'
                              : tierKey === 'platinum'
                              ? 'Enterprise multi-campus federation & custom domain'
                              : 'Standard core portals (Learner, Teacher, Bursar, Principal)'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

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
                      @ KES {SUBSCRIPTION_TIER_RATES[selectedTier].toLocaleString()}/campus = KES {(campusCount * SUBSCRIPTION_TIER_RATES[selectedTier]).toLocaleString()}/mo
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
                        SUBSCRIPTION_TIER_RATES[selectedTier] *
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
                    {campusCount} campus(es) @ KES {SUBSCRIPTION_TIER_RATES[selectedTier].toLocaleString()}/mo ({selectedTier.toUpperCase()} TIER)
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isGeneratingKey}
                  style={{
                    background: isGeneratingKey ? '#334155' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    padding: '0.95rem',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: isGeneratingKey ? 'not-allowed' : 'pointer',
                    boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
                  }}
                >
                  {isGeneratingKey ? '⚡ Generating Key...' : '⚡ Generate & Issue Product Key'}
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 900,
                        padding: '3px 10px',
                        borderRadius: '6px',
                        background: latestGeneratedKey.tier === 'gold' ? '#fef3c7' : latestGeneratedKey.tier === 'platinum' ? '#e0e7ff' : '#f1f5f9',
                        color: latestGeneratedKey.tier === 'gold' ? '#b45309' : latestGeneratedKey.tier === 'platinum' ? '#4338ca' : '#475569',
                      }}
                    >
                      {latestGeneratedKey.tier === 'gold' ? '🥇 GOLD TIER (KES 3,000/mo)' : latestGeneratedKey.tier === 'platinum' ? '💎 PLATINUM TIER' : '🥈 SILVER TIER (KES 2,500/mo)'}
                    </span>
                    {latestGeneratedKey.tier === 'gold' && (
                      <span style={{ fontSize: '0.72rem', color: '#fde047', fontWeight: 800 }}>
                        ✓ Dedicated Public Page &amp; Offerings Unlocked
                      </span>
                    )}
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
                        const tierTitle = latestGeneratedKey.tier === 'gold'
                          ? 'Gold Tier (KES 3,000/campus/month)'
                          : latestGeneratedKey.tier === 'platinum'
                          ? 'Platinum Tier (KES 5,000/campus/month)'
                          : 'Silver Tier (KES 2,500/campus/month)'
                        const featureSummary = latestGeneratedKey.tier === 'gold'
                          ? 'Features Unlocked: Dedicated Public Page & Programs Catalog, About Us, Mission, Vision, Facilities & Core Portals'
                          : 'Features: Standard SIS & LMS Core Role Portals'
                        const msg = `Hello! Here is your Global College Cloud Campus Product Key for ${latestGeneratedKey.school_name}:\n\nKey: ${latestGeneratedKey.key}\nTier: ${tierTitle}\n${featureSummary}\nCampuses: ${latestGeneratedKey.campus_count}\nTotal Value: KES ${latestGeneratedKey.total_amount_kes.toLocaleString()}\nM-Pesa Payment Number: 0740027346\nValid until: ${latestGeneratedKey.expires_at.split('T')[0]}\n\nEnter this key in your Principal / Admin Desk under "Activate Campus License" to unlock access.`
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

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#94a3b8' }}>
                          <span>{lic.school_name} ({lic.campus_count} campus[es])</span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 900,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: lic.tier === 'gold' ? '#f59e0b20' : lic.tier === 'platinum' ? '#818cf820' : '#64748b20',
                              color: lic.tier === 'gold' ? '#f59e0b' : lic.tier === 'platinum' ? '#a5b4fc' : '#94a3b8',
                              border: lic.tier === 'gold' ? '1px solid #f59e0b50' : '1px solid #64748b40',
                            }}
                          >
                            {lic.tier === 'gold' ? '🥇 GOLD (KES 3,000/mo)' : lic.tier === 'platinum' ? '💎 PLATINUM' : '🥈 SILVER (KES 2,500/mo)'}
                          </span>
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
                      <th style={{ padding: '0.75rem' }}>Tier</th>
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
                        const tierRate = sch.subscription_tier === 'gold' ? 3000 : sch.subscription_tier === 'platinum' ? 5000 : 2500
                        const monthlyRate = cCount * tierRate

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
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 900,
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: sch.subscription_tier === 'gold' ? '#fef3c7' : sch.subscription_tier === 'platinum' ? '#e0e7ff' : '#f1f5f9',
                                  color: sch.subscription_tier === 'gold' ? '#b45309' : sch.subscription_tier === 'platinum' ? '#4338ca' : '#475569',
                                  border: sch.subscription_tier === 'gold' ? '1px solid #fde047' : '1px solid #cbd5e1',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                {sch.subscription_tier === 'gold' ? '🥇 GOLD' : sch.subscription_tier === 'platinum' ? '💎 PLATINUM' : '🥈 SILVER'}
                              </span>
                            </td>
                            <td style={{ padding: '0.85rem 0.75rem' }}>
                              <span style={{ background: '#1e293b', color: '#38bdf8', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                                🏛️ {cCount} Campus(es)
                              </span>
                            </td>
                            <td style={{ padding: '0.85rem 0.75rem', fontWeight: 900, color: '#10b981' }}>
                              KES {monthlyRate.toLocaleString()} / mo
                              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>({cCount} × {tierRate.toLocaleString()})</div>
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
                                {sch.active_license_key ? (sch.subscription_status || 'Licensed') : 'Unlicensed'}
                              </span>
                            </td>
                            <td style={{ padding: '0.85rem 0.75rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
                              {sch.license_valid_until ? sch.license_valid_until.split('T')[0] : (sch.active_license_key ? 'Active' : 'Awaiting Key')}
                            </td>
                            <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSchoolSlug(sch.slug)
                                    setSelectedTier('gold')
                                    setActiveTab('keys')
                                  }}
                                  style={{
                                    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.4rem 0.7rem',
                                    borderRadius: '8px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)',
                                  }}
                                  title="Issue Gold Tier Key (KES 3,000/mo - Unlocks Public Showcase & Programs Catalog)"
                                >
                                  <span>🥇 Issue Gold Key</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSchoolSlug(sch.slug)
                                    setSelectedTier('silver')
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
                                  + Silver Key
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
                                  onClick={() => openEditSchool(sch)}
                                  style={{
                                    background: '#1d4ed8',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.4rem 0.7rem',
                                    borderRadius: '8px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                  title="Edit institution profile, name, campuses, tier & contacts"
                                >
                                  ✏️ Edit
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
                                    if (window.confirm(`Permanently delete institution "${sch.name}"? This will purge all associated staff, students, programs, timetables, and cloud records.`)) {
                                      tenantSchoolStore.deleteSchool(sch.slug)
                                      setSchools(tenantSchoolStore.getSchools())
                                      setMetrics(licensingStore.getMetrics())
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
                                  title={`Permanently delete ${sch.name}`}
                                >
                                  🗑️ Delete
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

        {/* =========================================================================
            TAB 4: MOBILE APKS & WHATSAPP DISTRIBUTION
        ========================================================================= */}
        {activeTab === 'mobile_apks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* SaaS Admin Standalone APK Hero Card */}
            <div
              style={{
                background: '#131b2e',
                borderRadius: '24px',
                padding: '2rem',
                border: '2px solid #059669',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <img
                    src="/logo-saas-admin.png"
                    alt="SaaS Admin Logo"
                    style={{ width: '72px', height: '72px', borderRadius: '18px', boxShadow: '0 8px 24px rgba(5, 150, 105, 0.35)' }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f8fafc', margin: 0 }}>
                        Global College SaaS Admin (Android APK)
                      </h3>
                      <span style={{ fontSize: '0.72rem', background: '#059669', color: '#ecfdf5', padding: '2px 10px', borderRadius: '999px', fontWeight: 800 }}>
                        v1.0.0 • DEDICATED
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
                      Package ID: <code style={{ color: '#38bdf8', background: '#0a0f1d', padding: '2px 6px', borderRadius: '6px' }}>com.globalcollege.saasadmin</code> • Platform Owner Directorate
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <a
                    href="/downloads/GlobalCollege-SaaSAdmin.apk"
                    download="GlobalCollege-SaaSAdmin.apk"
                    style={{
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      color: '#ffffff',
                      padding: '0.75rem 1.4rem',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
                    }}
                  >
                    <span>📥 Download SaaS Admin APK</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleShareWhatsApp('saasAdmin')}
                    style={{
                      background: '#25D366',
                      color: '#075E54',
                      padding: '0.75rem 1.4rem',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      fontWeight: 900,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 16px rgba(37, 211, 102, 0.35)',
                    }}
                  >
                    <span>💬 Share via WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyShareMsg('saasAdmin')}
                    style={{
                      background: '#1e293b',
                      color: copiedShareMsg ? '#10b981' : '#cbd5e1',
                      padding: '0.75rem 1.25rem',
                      borderRadius: '12px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      border: '1px solid #334155',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{copiedShareMsg ? '✓ Message Copied!' : '📋 Copy WhatsApp Text'}</span>
                  </button>
                </div>
              </div>

              {/* Feature Highlights Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', background: '#0a0f1d', borderRadius: '16px', padding: '1.25rem', border: '1px solid #1e293b' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Direct Launch Route</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>⚡ Starts directly on Master Directorate</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Bypasses student &amp; public landing screens</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Billing &amp; Rate Engine</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#10b981', marginTop: '2px' }}>💰 KES 2,500 / Campus / Month</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Generate 1-mo, 3-mo, 1-yr keys &amp; receipts</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Security &amp; Passcode</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f59e0b', marginTop: '2px' }}>🔒 Master Access Passcode Gate</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Device authentication and session protection</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Offline &amp; Standalone</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#a855f7', marginTop: '2px' }}>📦 Local Embedded Assets</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Works offline with local cache synchronization</div>
                </div>
              </div>
            </div>

            {/* School Management System (SMS) Full Suite APK Card */}
            <div
              style={{
                background: '#131b2e',
                borderRadius: '24px',
                padding: '1.75rem',
                border: '1px solid #1e293b',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <img
                    src="/logo.png"
                    alt="Global College SMS Logo"
                    style={{ width: '60px', height: '60px', borderRadius: '16px' }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f8fafc', margin: 0 }}>
                        Global College SMS (Institutional App APK)
                      </h3>
                      <span style={{ fontSize: '0.7rem', background: '#1e3a8a', color: '#93c5fd', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                        FULL SUITE
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px' }}>
                      Package ID: <code style={{ color: '#38bdf8', background: '#0a0f1d', padding: '2px 6px', borderRadius: '6px' }}>com.globalcollege.sms</code> • For Students, Teachers, Bursars &amp; Principals
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <a
                    href="/downloads/GlobalCollege-SMS.apk"
                    download="GlobalCollege-SMS.apk"
                    style={{
                      background: '#1e293b',
                      color: '#cbd5e1',
                      padding: '0.65rem 1.25rem',
                      borderRadius: '10px',
                      fontSize: '0.86rem',
                      fontWeight: 800,
                      textDecoration: 'none',
                      border: '1px solid #334155',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>📥 Download SMS App APK</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleShareWhatsApp('sms')}
                    style={{
                      background: 'rgba(37, 211, 102, 0.15)',
                      color: '#4ade80',
                      border: '1px solid #16a34a',
                      padding: '0.65rem 1.25rem',
                      borderRadius: '10px',
                      fontSize: '0.86rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>💬 Share SMS via WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Android Phone Installation & WhatsApp Sharing Guide */}
            <div style={{ background: '#0a0f1d', borderRadius: '20px', padding: '1.75rem', border: '1px solid #1e293b' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f8fafc', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📲 How to Install &amp; Share via WhatsApp to Your Phone</span>
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                <div style={{ background: '#131b2e', borderRadius: '14px', padding: '1.25rem', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>1️⃣</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>Click "Share via WhatsApp"</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.5 }}>
                    Clicking the green WhatsApp button opens WhatsApp with the pre-formatted download link and instructions. Select your own contact ("Message Yourself") or share to team members.
                  </div>
                </div>

                <div style={{ background: '#131b2e', borderRadius: '14px', padding: '1.25rem', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>2️⃣</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>Tap the Link on Android Phone</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.5 }}>
                    Open WhatsApp on your Android phone, tap the link to download the <code>.apk</code> file directly into your phone's Downloads directory.
                  </div>
                </div>

                <div style={{ background: '#131b2e', borderRadius: '14px', padding: '1.25rem', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>3️⃣</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>Install &amp; Unlock Terminal</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.5 }}>
                    Tap the downloaded file and choose <strong>Install</strong>. If prompted, toggle <em>"Allow from this source"</em>. Launch the app and enter your Master Passcode to manage the platform on the go!
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: PUSH NOTIFICATIONS BROADCAST ENGINE
        ========================================================================= */}
        {activeTab === 'notifications' && (
          <SaasPushNotificationManager schools={schools} />
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

        {/* MODAL: EDIT INSTITUTION PROFILE */}
        {editingSchool && (
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
            onClick={() => setEditingSchool(null)}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #1e293b', paddingBottom: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ✏️ Update Institution Profile
                  </span>
                  <h3 style={{ margin: '4px 0 0', fontSize: '1.3rem', fontWeight: 900, color: '#f8fafc' }}>
                    {editingSchool.name}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                    Slug: <strong>{editingSchool.slug}</strong> (Permanent identifier)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSchool(null)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveSchoolEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                    INSTITUTION FULL NAME *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                      INSTITUTION MOTTO / SLOGAN
                    </label>
                    <input
                      type="text"
                      value={editFormData.motto}
                      onChange={(e) => setEditFormData({ ...editFormData, motto: e.target.value })}
                      placeholder="e.g. Excellence in Technical Skill"
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
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                      CURRICULUM / SECTOR
                    </label>
                    <select
                      value={editFormData.curriculum_type}
                      onChange={(e) => setEditFormData({ ...editFormData, curriculum_type: e.target.value })}
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
                      <option value="Vocational & TVET College">Vocational &amp; TVET College</option>
                      <option value="General Academic & Multi-Disciplinary">General Academic &amp; Multi-Disciplinary</option>
                      <option value="STEM & Technology Institute">STEM &amp; Technology Institute</option>
                      <option value="Business & Professional Academy">Business &amp; Professional Academy</option>
                      <option value="National / CBC Curriculum">National / CBC Curriculum</option>
                      <option value="International Academic Curriculum">International Academic Curriculum</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                      CONTACT PHONE
                    </label>
                    <input
                      type="text"
                      value={editFormData.contact_phone}
                      onChange={(e) => setEditFormData({ ...editFormData, contact_phone: e.target.value })}
                      placeholder="+254 700 000 000"
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
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                      CONTACT EMAIL
                    </label>
                    <input
                      type="email"
                      value={editFormData.contact_email}
                      onChange={(e) => setEditFormData({ ...editFormData, contact_email: e.target.value })}
                      placeholder="admissions@school.edu"
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

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                      PRINCIPAL / DIRECTOR NAME
                    </label>
                    <input
                      type="text"
                      value={editFormData.principal_name}
                      onChange={(e) => setEditFormData({ ...editFormData, principal_name: e.target.value })}
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
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                      CAMPUS COUNT
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={editFormData.campus_count}
                      onChange={(e) => setEditFormData({ ...editFormData, campus_count: Number(e.target.value) || 1 })}
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
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                      SUBSCRIPTION TIER
                    </label>
                    <select
                      value={editFormData.subscription_tier}
                      onChange={(e) => setEditFormData({ ...editFormData, subscription_tier: e.target.value as SubscriptionTierType })}
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
                      <option value="gold">Gold Tier (KES 3,000 / mo)</option>
                      <option value="silver">Silver Tier (KES 2,500 / mo)</option>
                      <option value="platinum">Platinum Tier (KES 5,000 / mo)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                    CAMPUS PHYSICAL ADDRESS
                  </label>
                  <input
                    type="text"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    placeholder="e.g. Commercial Street, Westlands, Nairobi"
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

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #1e293b', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditingSchool(null)}
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
                    disabled={isSavingEdit}
                    style={{
                      flex: 2,
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.8rem',
                      borderRadius: '10px',
                      fontWeight: 900,
                      cursor: isSavingEdit ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                    }}
                  >
                    {isSavingEdit ? 'Saving Changes...' : '💾 Save & Sync Across Network'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
