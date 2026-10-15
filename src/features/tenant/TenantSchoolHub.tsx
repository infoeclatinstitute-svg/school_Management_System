import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import { getTenantDomainLinks, detectTenantFromHost } from '@/lib/tenantDomain'
import type { TenantDomainLinks } from '@/lib/tenantDomain'
import { INSTITUTION_CONFIG } from '@/config/institution'
import type {
  PartnerSchoolTenant,
  TenantStaffMember,
  TenantStudentMember,
  TenantPayrollRecord,
  TenantGradeRecord,
  TenantLessonNote,
  TenantFeePayment,
  TenantSessionUser,
} from '@/types/tenantSchool'
import {
  GraduationCapIcon,
  UserIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
  CalendarIcon,
  BuildingIcon,
  GlobeIcon,
  PhoneIcon,
  MailIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LockIcon,
  ExternalLinkIcon,
  SparklesIcon,
  ClockIcon,
  CreditCardIcon,
  FileTextIcon,
  UsersIcon,
  AwardIcon,
} from '@/components/icons/AppIcons'

// Dedicated Modular School Desks
import { TenantPrincipalDesk } from './components/TenantPrincipalDesk'
import { TenantBursarDesk } from './components/TenantBursarDesk'
import { TenantTeacherDesk } from './components/TenantTeacherDesk'
import { TenantStudentDesk } from './components/TenantStudentDesk'
import { TenantProgramsPage } from './components/TenantProgramsPage'
import { TenantSchoolLoginModal } from './components/TenantSchoolLoginModal'
import { TenantProfilePage } from './components/TenantProfilePage'
import { licensingStore } from '@/lib/licensingStore'
import {
  StudentAdmissionLetterModal,
  StaffLoginSlipModal,
  StaffPayslipModal,
  FeeReceiptModal,
} from './components/TenantPrintableDocuments'

export interface TenantSchoolHubProps {
  forcedSlug?: string
  forcedSubview?: string
}

export function TenantSchoolHub({ forcedSlug, forcedSubview }: TenantSchoolHubProps = {}) {
  const { schoolSlug: routeSlug, subview: routeSubview } = useParams<{ schoolSlug: string; subview?: string }>()
  const schoolSlug = forcedSlug || routeSlug
  const subview = forcedSubview || routeSubview
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()

  const isSubdomainMode = typeof window !== 'undefined' && Boolean(detectTenantFromHost(window.location.hostname, tenantSchoolStore.getSchools()))

  const getDeskRoute = (tab: string) => {
    if (isSubdomainMode) {
      if (tab === 'hub') return '/'
      if (tab === 'principal') return '/admin'
      return `/${tab}`
    }
    const currentSlug = school?.slug || schoolSlug || ''
    if (tab === 'hub') return `/s/${currentSlug}`
    return `/s/${currentSlug}/${tab}`
  }

  const [school, setSchool] = useState<PartnerSchoolTenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // Domain Modal
  const [showDomainModal, setShowDomainModal] = useState(false)
  const [customDomainInput, setCustomDomainInput] = useState('')
  const [customDomainMessage, setCustomDomainMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Real School SIS / SMS Live Datasets
  const [staffList, setStaffList] = useState<TenantStaffMember[]>([])
  const [studentList, setStudentList] = useState<TenantStudentMember[]>([])
  const [payrollList, setPayrollList] = useState<TenantPayrollRecord[]>([])
  const [gradeList, setGradeList] = useState<TenantGradeRecord[]>([])
  const [lessonNotesList, setLessonNotesList] = useState<TenantLessonNote[]>([])
  const [feePaymentsList, setFeePaymentsList] = useState<TenantFeePayment[]>([])

  // Modal Dialogs for Printable Official Records
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [selectedStaffSlip, setSelectedStaffSlip] = useState<TenantStaffMember | null>(null)
  const [selectedAdmissionSlip, setSelectedAdmissionSlip] = useState<TenantStudentMember | null>(null)
  const [selectedPayslip, setSelectedPayslip] = useState<TenantPayrollRecord | null>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<TenantFeePayment | null>(null)
  const [activeStudent, setActiveStudent] = useState<TenantStudentMember | null>(null)

  // Active Session User State
  const [currentSession, setCurrentSession] = useState<TenantSessionUser | null>(() => {
    if (typeof window !== 'undefined' && schoolSlug) {
      return tenantSchoolStore.getActiveSession(schoolSlug)
    }
    return null
  })

  // Role resolution: Admin, Teacher, Bursar, Student, or Public
  const activeRole: 'admin' | 'teacher' | 'bursar' | 'student' | 'public' = (() => {
    if (currentSession) {
      if (currentSession.role === 'principal') return 'admin'
      return currentSession.role as 'admin' | 'teacher' | 'bursar' | 'student'
    }
    if (profile?.role === 'admin') return 'admin'
    return 'public'
  })()

  // Active Tab: Hub, Programs, Calendar, Student, Teacher, Bursar, Principal, Profile
  const [activeTab, setActiveTab] = useState<'hub' | 'programs' | 'calendar' | 'student' | 'teacher' | 'bursar' | 'principal' | 'billing' | 'profile'>(() => {
    const s = forcedSubview || subview
    if (s === 'programs' || s === 'courses') return 'programs'
    if (s === 'student' || s === 'parent') return 'student'
    if (s === 'teacher') return 'teacher'
    if (s === 'bursar') return 'bursar'
    if (s === 'principal' || s === 'admin') return 'principal'
    if (s === 'calendar') return 'calendar'
    if (s === 'billing' || s === 'license' || s === 'subscription') return 'billing'
    if (s === 'profile') return 'profile'
    return 'hub'
  })

  // Hamburger / Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeDrawer = () => setDrawerOpen(false)

  // Close drawer on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer() }
    if (drawerOpen) { document.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden' }
    else { document.body.style.overflow = '' }
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [drawerOpen])

  // Product Key License Activation State
  const [showLicenseModal, setShowLicenseModal] = useState(false)
  const [licenseKeyInput, setLicenseKeyInput] = useState('')
  const [licenseFeedback, setLicenseFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Synchronize route subview
  useEffect(() => {
    const s = forcedSubview || subview
    if (s === 'programs' || s === 'courses') setActiveTab('programs')
    else if (s === 'student' || s === 'parent') setActiveTab('student')
    else if (s === 'teacher') setActiveTab('teacher')
    else if (s === 'bursar') setActiveTab('bursar')
    else if (s === 'principal' || s === 'admin') setActiveTab('principal')
    else if (s === 'calendar') setActiveTab('calendar')
    else if (s === 'billing' || s === 'license' || s === 'subscription') setActiveTab('billing')
    else if (s === 'profile') setActiveTab('profile')
    else setActiveTab('hub')
  }, [forcedSubview, subview])

  // Reload School Data Helper
  const reloadSchoolData = (slug: string) => {
    const s = tenantSchoolStore.getStaffBySchool(slug)
    const st = tenantSchoolStore.getStudentsBySchool(slug)
    const p = tenantSchoolStore.getPayrollBySchool(slug)
    const g = tenantSchoolStore.getGradesBySchool(slug)
    const n = tenantSchoolStore.getLessonNotesBySchool(slug)
    const pm = tenantSchoolStore.getPaymentsBySchool(slug)

    setStaffList(s)
    setStudentList(st)
    setPayrollList(p)
    setGradeList(g)
    setLessonNotesList(n)
    setFeePaymentsList(pm)

    if (st.length > 0) {
      setActiveStudent((prev) => prev || st[0])
    }
  }

  // Load School on Mount — with cloud sync fallback
  useEffect(() => {
    let cancelled = false
    const resolveTargetSlug = () => {
      let targetSlug = (schoolSlug || '').toLowerCase()

      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname.toLowerCase()
        const allSchools = tenantSchoolStore.getSchools()

        const customMatched = allSchools.find((s) => {
          if (!s.custom_domain) return false
          const cleanCustom = s.custom_domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()
          return hostname === cleanCustom
        })

        if (customMatched) {
          targetSlug = customMatched.slug
        } else if (hostname.split('.').length > 2) {
          const parts = hostname.split('.')
          const sub = parts[0]
          if (sub && sub !== 'www' && sub !== 'cloud' && sub !== 'app') {
            targetSlug = sub
          }
        }
      }
      return targetSlug
    }

    const applySchool = (slug: string) => {
      const foundSchool = tenantSchoolStore.getSchoolBySlug(slug)
      if (foundSchool && !cancelled) {
        setSchool(foundSchool)
        setCustomDomainInput(foundSchool.custom_domain || '')
        reloadSchoolData(foundSchool.slug)
        const savedSession = tenantSchoolStore.getActiveSession(foundSchool.slug)
        setCurrentSession(savedSession || null)
        return true
      }
      return false
    }

    const run = async () => {
      setLoading(true)
      const targetSlug = resolveTargetSlug()

      // First try local/cached data
      if (applySchool(targetSlug)) {
        if (!cancelled) setLoading(false)
        return
      }

      // Not found locally — pull from Supabase cloud sync and retry
      try {
        await tenantSchoolStore.syncWithCloud()
      } catch { /* offline — ignore */ }

      if (!cancelled) {
        applySchool(resolveTargetSlug())
        setLoading(false)
      }
    }

    run()

    // Also listen for real-time cloud updates (e.g. from another tab or push)
    const handleCloudUpdate = () => {
      if (!cancelled) {
        const slug = resolveTargetSlug()
        applySchool(slug)
      }
    }
    window.addEventListener('gc-tenant-schools-updated', handleCloudUpdate)

    return () => {
      cancelled = true
      window.removeEventListener('gc-tenant-schools-updated', handleCloudUpdate)
    }
  }, [schoolSlug])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedLink(label)
    setTimeout(() => setCopiedLink(null), 2500)
  }

  // Dynamic Document Title for Browser Tab & SEO Search visibility
  useEffect(() => {
    if (school) {
      const tabNameMap: Record<string, string> = {
        hub: 'Campus Portal',
        programs: 'Academic Programs & Courses',
        calendar: 'Academic Calendar',
        principal: 'Principal Executive Office',
        bursar: 'Bursar & Finance Desk',
        teacher: 'Faculty Academic Desk',
        student: 'Student Learning Workspace',
        billing: 'Subscription & Cloud Licensing',
        profile: 'Account Profile',
      }
      const titleLabel = tabNameMap[activeTab] || 'Campus Portal'
      document.title = `${school.name} — ${titleLabel} | Global College Cloud`
    }
  }, [school, activeTab])

  // Handle Sign Out
  const handleSignOut = () => {
    if (school) {
      tenantSchoolStore.setActiveSession(school.slug, null)
      setCurrentSession(null)
      setShowLoginModal(true)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Connecting to School Portal Gateway...</p>
        </div>
      </div>
    )
  }

  if (!school) {
    return (
      <div style={{ maxWidth: '640px', margin: '4rem auto', textAlign: 'center', padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>School Portal Not Found</h2>
        <p style={{ color: '#64748b', margin: '0.5rem 0 1.5rem' }}>
          No registered partner school matches the link <code>{schoolSlug}</code>.
        </p>
        <Link
          to="/register-school"
          style={{
            background: 'var(--color-primary)',
            color: '#fff',
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          Register Your School on Global College Cloud ➔
        </Link>
      </div>
    )
  }

  const primaryColor = school.primary_color || '#881337'
  const accentColor = school.accent_color || '#d4af37'
  const systemTermLabel = school.academic_system === 'semester' ? 'Semester' : 'Term'
  const domainLinks: TenantDomainLinks = getTenantDomainLinks(school)

  // Restricted Access Fallback Card
  const renderRestrictedCard = (deskName: string, description: string, allowedRolesText: string) => (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '3rem 2rem',
        border: '1.5px solid #e2e8f0',
        maxWidth: '680px',
        margin: '2rem auto',
        textAlign: 'center',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: '#fef2f2',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}
      >
        <LockIcon size={28} color="#dc2626" />
      </div>

      <span
        style={{
          fontSize: '0.72rem',
          fontWeight: 800,
          color: '#dc2626',
          background: '#fee2e2',
          padding: '3px 10px',
          borderRadius: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Restricted Portal Desk
      </span>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: '0.75rem 0 0.5rem' }}>
        Authentication Required for {deskName}
      </h2>

      <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.6, maxWidth: '520px', margin: '0 auto 1.5rem' }}>
        {description}
      </p>

      <div
        style={{
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '0.75rem 1.25rem',
          border: '1px solid #e2e8f0',
          display: 'inline-block',
          marginBottom: '1.5rem',
          fontSize: '0.82rem',
          color: '#475569',
        }}
      >
        Authorized Roles: <strong>{allowedRolesText}</strong>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowLoginModal(true)}
          style={{
            background: primaryColor,
            color: '#ffffff',
            fontWeight: 800,
            padding: '0.75rem 1.75rem',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            boxShadow: `0 4px 16px ${primaryColor}40`,
          }}
        >
          Sign In to Access {deskName} ➔
        </button>
      </div>
    </div>
  )

  const isLicenseActive = Boolean(
    school.active_license_key &&
    (school.subscription_status === 'active' || school.subscription_status === 'licensed')
  )

  // Product Key License Required Fallback Card
  const renderLicenseRequiredCard = (deskName: string) => (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '3rem 2rem',
        border: '1.5px solid #fde68a',
        maxWidth: '680px',
        margin: '2rem auto',
        textAlign: 'center',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: '#fef3c7',
          color: '#b45309',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontSize: '1.8rem',
        }}
      >
        🔑
      </div>

      <span
        style={{
          fontSize: '0.72rem',
          fontWeight: 800,
          color: '#b45309',
          background: '#fef3c7',
          padding: '3px 10px',
          borderRadius: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Product Key Activation Required
      </span>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: '0.75rem 0 0.5rem' }}>
        License Key Required for {deskName}
      </h2>

      <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.6, maxWidth: '520px', margin: '0 auto 1.5rem' }}>
        {school.name} is currently awaiting institutional Product Key activation. To unlock the {deskName} and start using your digital campus, please enter your 19-character Product Key.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => {
            setLicenseFeedback(null)
            setShowLicenseModal(true)
          }}
          style={{
            background: primaryColor,
            color: '#ffffff',
            fontWeight: 800,
            padding: '0.75rem 1.75rem',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            boxShadow: `0 4px 16px ${primaryColor}40`,
          }}
        >
          🔑 Enter Product Key ➔
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('billing')
            navigate(getDeskRoute('billing'))
          }}
          style={{
            background: '#f8fafc',
            color: '#0f172a',
            fontWeight: 800,
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            border: '1.5px solid #cbd5e1',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          💳 Open Billing &amp; Licensing Portal
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      {/* ── Hamburger Drawer Backdrop ── */}
      {drawerOpen && (
        <div
          onClick={closeDrawer}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 50,
            backdropFilter: 'blur(6px)',
            transition: 'opacity 0.2s',
          }}
        />
      )}

      {/* ── Slide-out Executive Navigation Drawer ── */}
      <nav
        aria-label="Site navigation"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100dvh',
          zIndex: 60,
          width: 'min(310px, 86vw)',
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          borderRight: '1px solid #e2e8f0',
        }}
      >
        {/* Drawer Institutional Header Banner */}
        <div
          style={{
            padding: '1.25rem 1.1rem',
            background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
            color: '#ffffff',
            position: 'relative',
            boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 900,
                color: accentColor,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>🏛️</span>
              <span>Accredited Portal</span>
            </span>
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Close navigation"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#ffffff',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                flexShrink: 0,
                background: school.logo_url && school.logo_url !== '/logo.png?v=2' ? '#ffffff' : `linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)`,
                border: `2px solid ${accentColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              }}
            >
              {school.logo_url && school.logo_url !== '/logo.png?v=2' ? (
                <img src={school.logo_url} alt={school.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ color: primaryColor, fontWeight: 900, fontSize: '1.3rem' }}>{school.name.charAt(0)}</span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {school.name}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                {school.curriculum_type} • {school.city}
              </div>
            </div>
          </div>
        </div>

        {/* User Session Pill in Drawer */}
        {currentSession ? (
          <div
            style={{
              padding: '0.85rem 1.1rem',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: primaryColor,
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {currentSession.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentSession.name}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>●</span>
                  <span style={{ textTransform: 'uppercase' }}>{currentSession.role} Desk</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('profile')
                navigate(getDeskRoute('profile'))
                closeDrawer()
              }}
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: primaryColor,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '3px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Profile ➔
            </button>
          </div>
        ) : (
          <div
            style={{
              padding: '0.75rem 1.1rem',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Guest Visitor Session</span>
            <button
              type="button"
              onClick={() => {
                setShowLoginModal(true)
                closeDrawer()
              }}
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#ffffff',
                background: primaryColor,
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Sign In ➔
            </button>
          </div>
        )}

        {/* Academic Period & License Pill */}
        <div style={{ padding: '0.65rem 1.1rem', background: '#ffffff', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155' }}>
            📅 {systemTermLabel}: {school.active_period_name}
          </span>
          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: '6px',
              background: isLicenseActive ? '#dcfce7' : '#fef3c7',
              color: isLicenseActive ? '#15803d' : '#b45309',
            }}
          >
            {isLicenseActive ? '✓ Licensed' : '⚠️ Key Req.'}
          </span>
        </div>

        {/* Nav sections */}
        {(() => {
          const navGo = (tab: typeof activeTab) => {
            setActiveTab(tab)
            navigate(getDeskRoute(tab))
            closeDrawer()
          }

          const item = (tab: typeof activeTab, icon: string, label: string, badge?: React.ReactNode) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => navGo(tab)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: 'calc(100% - 1.2rem)',
                  margin: '2px 0.6rem',
                  padding: '0.65rem 0.85rem',
                  background: isActive ? `${primaryColor}14` : 'transparent',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  color: isActive ? primaryColor : '#334155',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.88rem',
                  textAlign: 'left',
                  borderLeft: isActive ? `3.5px solid ${primaryColor}` : '3.5px solid transparent',
                  transition: 'all 0.15s ease',
                  minHeight: '44px',
                }}
              >
                <span
                  style={{
                    fontSize: '1.05rem',
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: isActive ? '#ffffff' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {icon}
                </span>
                <span style={{ flex: 1 }}>{label}</span>
                {badge}
                {isActive && <span style={{ color: primaryColor, fontWeight: 900, fontSize: '0.9rem' }}>›</span>}
              </button>
            )
          }

          const sectionLabel = (text: string) => (
            <div
              key={text}
              style={{
                padding: '0.9rem 1.1rem 0.35rem',
                fontSize: '0.66rem',
                fontWeight: 900,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {text}
            </div>
          )

          const divider = (key: string) => <div key={key} style={{ height: '1px', background: '#f1f5f9', margin: '0.5rem 0.8rem' }} />

          return (
            <div style={{ flex: 1, paddingBottom: '1.5rem' }}>
              {sectionLabel('Campus Overview')}
              {item('hub', '🏫', 'School Campus Hub')}
              {item('programs', '📚', 'Programs & Courses')}
              {item('calendar', '📅', 'Academic Calendar')}

              {divider('d1')}
              {sectionLabel('Role Workspaces')}
              {activeRole === 'admin' && item('principal', '🛡️', 'Principal Office')}
              {(activeRole === 'admin' || activeRole === 'bursar') && item('bursar', '💳', 'Bursar Desk')}
              {(activeRole === 'admin' || activeRole === 'teacher') && item('teacher', '📖', 'Teacher Portal')}
              {(activeRole === 'admin' || activeRole === 'student') && item('student', '🎓', 'Student Portal')}
              {activeRole === 'public' && (
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(true)
                    closeDrawer()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: 'calc(100% - 1.2rem)',
                    margin: '2px 0.6rem',
                    padding: '0.65rem 0.85rem',
                    background: '#f8fafc',
                    border: `1.5px dashed ${primaryColor}40`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    color: primaryColor,
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    textAlign: 'left',
                    minHeight: '44px',
                  }}
                >
                  <span style={{ fontSize: '1rem', width: '28px', textAlign: 'center' }}>🔑</span>
                  <span>Sign In to Your Desk</span>
                </button>
              )}

              {divider('d2')}
              {sectionLabel('My Account')}
              {item('profile', '👤', 'My Profile')}
              <button
                type="button"
                onClick={() => {
                  setShowLoginModal(true)
                  closeDrawer()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: 'calc(100% - 1.2rem)',
                  margin: '2px 0.6rem',
                  padding: '0.65rem 0.85rem',
                  background: 'none',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  textAlign: 'left',
                  minHeight: '44px',
                }}
              >
                <span style={{ fontSize: '1.05rem', width: '28px', height: '28px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔄</span>
                <span>Switch Portal Desk</span>
              </button>
              {currentSession && (
                <button
                  type="button"
                  onClick={() => {
                    handleSignOut()
                    closeDrawer()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: 'calc(100% - 1.2rem)',
                    margin: '2px 0.6rem',
                    padding: '0.65rem 0.85rem',
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    color: '#dc2626',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    textAlign: 'left',
                    minHeight: '44px',
                  }}
                >
                  <span style={{ fontSize: '1.05rem', width: '28px', height: '28px', borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🚪</span>
                  <span>Sign Out ({currentSession.name})</span>
                </button>
              )}

              {activeRole === 'admin' && (
                <>
                  {divider('d3')}
                  {sectionLabel('Institutional Governance')}
                  {item(
                    'billing',
                    '💳',
                    'Billing & Subscription',
                    !isLicenseActive ? (
                      <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                        Key Req.
                      </span>
                    ) : undefined
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setLicenseFeedback(null)
                      setShowLicenseModal(true)
                      closeDrawer()
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: 'calc(100% - 1.2rem)',
                      margin: '2px 0.6rem',
                      padding: '0.65rem 0.85rem',
                      background: 'none',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      color: '#475569',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      textAlign: 'left',
                      minHeight: '44px',
                    }}
                  >
                    <span style={{ fontSize: '1.05rem', width: '28px', height: '28px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔑</span>
                    <span>{isLicenseActive ? 'Product Key (Verified)' : 'Enter Product Key'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDomainModal(true)
                      closeDrawer()
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: 'calc(100% - 1.2rem)',
                      margin: '2px 0.6rem',
                      padding: '0.65rem 0.85rem',
                      background: 'none',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      color: '#475569',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      textAlign: 'left',
                      minHeight: '44px',
                    }}
                  >
                    <span style={{ fontSize: '1.05rem', width: '28px', height: '28px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🌐</span>
                    <span>Domain &amp; DNS Setup</span>
                  </button>
                </>
              )}
            </div>
          )
        })()}

        {/* Drawer Institutional Footer */}
        <div style={{ padding: '1rem', borderTop: '1px solid #f1f5f9', background: '#f8fafc', fontSize: '0.72rem', color: '#94a3b8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#475569', marginBottom: '2px' }}>
            <span>🔒</span>
            <span>Enterprise Encrypted SIS v2.6</span>
          </div>
          <div>Institutional Cloud Instance • {school.slug}.cloud.eclat.institute</div>
        </div>
      </nav>

      {/* ── Executive Top Header ── */}
      <header
        style={{
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div
          style={{
            maxWidth: '1320px',
            margin: '0 auto',
            padding: '0 1rem',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
          }}
        >
          {/* Hamburger button */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              padding: '0.45rem',
              borderRadius: '10px',
              color: '#334155',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              flexShrink: 0,
              minWidth: '42px',
              minHeight: '42px',
              justifyContent: 'center',
              alignItems: 'center',
              transition: 'background 0.15s',
            }}
          >
            <span style={{ display: 'block', width: '20px', height: '2.5px', background: 'currentColor', borderRadius: '2px' }} />
            <span style={{ display: 'block', width: '20px', height: '2.5px', background: 'currentColor', borderRadius: '2px' }} />
            <span style={{ display: 'block', width: '20px', height: '2.5px', background: 'currentColor', borderRadius: '2px' }} />
          </button>

          {/* School Emblem & Name */}
          <Link
            to={getDeskRoute('hub')}
            onClick={() => setActiveTab('hub')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              textDecoration: 'none',
              color: 'inherit',
              minWidth: 0,
              flex: 1,
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '11px',
                flexShrink: 0,
                background: school.logo_url && school.logo_url !== '/logo.png?v=2' ? '#ffffff' : `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                border: `2px solid ${accentColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: `0 4px 10px ${primaryColor}20`,
              }}
            >
              {school.logo_url && school.logo_url !== '/logo.png?v=2' ? (
                <img src={school.logo_url} alt={school.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.15rem' }}>{school.name.charAt(0)}</span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.98rem',
                  fontWeight: 900,
                  color: '#0f172a',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em',
                }}
              >
                {school.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                <span
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    color: primaryColor,
                    background: `${primaryColor}14`,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {school.curriculum_type}
                </span>
                <span style={{ fontSize: '0.66rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {school.city}
                </span>
              </div>
            </div>
          </Link>

          {/* Right side: Session status + Profile avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
            {currentSession ? (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('profile')
                  navigate(getDeskRoute('profile'))
                }}
                title={`${currentSession.name} (${currentSession.role}) — Open Profile`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '999px',
                  padding: '3px 10px 3px 4px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 2px 6px ${primaryColor}30`,
                  }}
                >
                  {currentSession.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ textAlign: 'left', display: 'none' /* shown via media query or default */ }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{currentSession.name.split(' ')[0]}</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: primaryColor, textTransform: 'uppercase' }}>{currentSession.role}</div>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                style={{
                  background: primaryColor,
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  padding: '0.55rem 1.15rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: `0 4px 12px ${primaryColor}35`,
                }}
              >
                <LockIcon size={14} color="#ffffff" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Executive Tab Strip */}
        <div
          style={{
            background: '#ffffff',
            borderTop: '1px solid #f1f5f9',
            padding: '0.35rem 1rem',
            display: 'flex',
            gap: '0.35rem',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {(
            [
              { tab: 'hub', icon: '🏫', label: 'Campus Hub' },
              { tab: 'programs', icon: '📚', label: 'Programs' },
              { tab: 'calendar', icon: '📅', label: 'Calendar' },
              ...(activeRole === 'admin' ? [{ tab: 'principal', icon: '🛡️', label: 'Principal Office' }] : []),
              ...(activeRole === 'admin' || activeRole === 'bursar' ? [{ tab: 'bursar', icon: '💳', label: 'Bursar Desk' }] : []),
              ...(activeRole === 'admin' || activeRole === 'teacher' ? [{ tab: 'teacher', icon: '📖', label: 'Teacher Portal' }] : []),
              ...(activeRole === 'admin' || activeRole === 'student' ? [{ tab: 'student', icon: '🎓', label: 'Student Portal' }] : []),
              ...(activeRole === 'admin' ? [{ tab: 'billing', icon: '💳', label: 'Billing & License' }] : []),
              ...(currentSession ? [{ tab: 'profile', icon: '👤', label: 'My Profile' }] : []),
            ] as { tab: typeof activeTab; icon: string; label: string }[]
          ).map(({ tab, icon, label }) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab)
                  navigate(getDeskRoute(tab))
                }}
                style={{
                  background: isActive ? primaryColor : '#f8fafc',
                  border: isActive ? `1px solid ${primaryColor}` : '1px solid #e2e8f0',
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? '#ffffff' : '#475569',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isActive ? `0 2px 8px ${primaryColor}40` : 'none',
                  transition: 'all 0.15s ease',
                  minHeight: '34px',
                }}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      </header>

      {/* Main Page Body */}
      <main style={{ maxWidth: '1320px', margin: '0 auto', padding: '1.75rem 1rem 4rem' }}>
        {/* VIEW 1: MAIN CAMPUS HUB */}
        {activeTab === 'hub' && (
          <div>
            {/* License Activation Required Banner */}
            {!isLicenseActive && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                  border: '1.5px solid #fde68a',
                  borderRadius: '20px',
                  padding: '1.25rem 1.6rem',
                  marginBottom: '1.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  boxShadow: '0 6px 20px rgba(245, 158, 11, 0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                  >
                    🔑
                  </div>
                  <div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#92400e' }}>
                      Institutional Product Key Activation Required
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#b45309', marginTop: '2px' }}>
                      This institutional campus is awaiting license activation. Standard Rate: KES {((school.campus_count || 1) * 2500).toLocaleString()}/month. Enter your 19-character key to unlock full SIS/LMS capability.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setLicenseFeedback(null)
                      setShowLicenseModal(true)
                    }}
                    style={{
                      background: '#92400e',
                      color: '#ffffff',
                      fontWeight: 800,
                      padding: '0.65rem 1.35rem',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(146, 64, 14, 0.3)',
                    }}
                  >
                    <span>🔑 Enter Product Key ➔</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('billing')
                      navigate(getDeskRoute('billing'))
                    }}
                    style={{
                      background: '#ffffff',
                      color: '#92400e',
                      fontWeight: 800,
                      padding: '0.65rem 1.1rem',
                      borderRadius: '10px',
                      border: '1.5px solid #fde68a',
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                    }}
                  >
                    Billing &amp; License ➔
                  </button>
                </div>
              </div>
            )}

            {/* Executive Campus Hero Presentation Banner */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                border: '1px solid #e2e8f0',
                padding: 'clamp(1.5rem, 3.5vw, 2.5rem)',
                boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.06)',
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.75rem',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top ambient brand ribbon */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})` }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
                <div
                  style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '20px',
                    background: school.logo_url && school.logo_url !== '/logo.png?v=2' ? '#ffffff' : `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.4rem',
                    fontWeight: 900,
                    boxShadow: `0 12px 28px ${primaryColor}35`,
                    border: `2.5px solid ${accentColor}`,
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  {school.logo_url && school.logo_url !== '/logo.png?v=2' ? (
                    <img src={school.logo_url} alt={school.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    school.name.charAt(0)
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        color: primaryColor,
                        background: `${primaryColor}14`,
                        padding: '3px 10px',
                        borderRadius: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <span>🏛️</span>
                      <span>Verified Digital Campus</span>
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#15803d',
                        background: '#dcfce7',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <span style={{ fontSize: '0.6rem' }}>●</span>
                      <span>{systemTermLabel} Active: {school.active_period_name}</span>
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#475569',
                        background: '#f1f5f9',
                        padding: '3px 10px',
                        borderRadius: '6px',
                      }}
                    >
                      {school.campus_count || 1} Campus{(school.campus_count || 1) > 1 ? 'es' : ''}
                    </span>
                  </div>

                  <h1
                    style={{
                      fontSize: 'clamp(1.7rem, 3.4vw, 2.35rem)',
                      fontWeight: 900,
                      color: '#0f172a',
                      margin: '0 0 0.4rem',
                      lineHeight: 1.2,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {school.name}
                  </h1>

                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem', lineHeight: 1.5, maxWidth: '680px' }}>
                    <em>"{school.motto}"</em> • Official Integrated Student Information System, Continuous Assessment &amp; Learning Portal.
                  </p>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                    color: '#ffffff',
                    fontWeight: 800,
                    padding: '0.8rem 1.6rem',
                    borderRadius: '12px',
                    border: `1px solid ${accentColor}60`,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: `0 8px 24px ${primaryColor}40`,
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                >
                  <LockIcon size={16} color="#ffffff" />
                  <span>Authenticate Portal Desk ➔</span>
                </button>
              </div>
            </div>

            {/* Quick Key Performance Indicators (KPIs) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '1.1rem', marginBottom: '2.5rem' }}>
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  padding: '1.35rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: `${primaryColor}14`,
                    color: primaryColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    flexShrink: 0,
                  }}
                >
                  📅
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Academic Cycle</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                    {school.academic_system === 'semester' ? '2 Semesters' : '3 Terms'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 700, marginTop: '2px' }}>● Active Period Cycle</div>
                </div>
              </div>

              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  padding: '1.35rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    flexShrink: 0,
                  }}
                >
                  🎓
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Enrolled Scholars</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                    {studentList.length > 0 ? studentList.length : school.stats.students} Active
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: 700, marginTop: '2px' }}>✓ Biometric Records</div>
                </div>
              </div>

              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  padding: '1.35rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: '#ecfdf5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    flexShrink: 0,
                  }}
                >
                  👨‍🏫
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Certified Faculty</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                    {staffList.length > 0 ? staffList.length : school.stats.teachers} Staff
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                    {school.stats.departments || 1} Departments
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  padding: '1.35rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: '#fefce8',
                    color: '#b45309',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    flexShrink: 0,
                  }}
                >
                  🛡️
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Executive Directorate</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {school.principal_name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: primaryColor, fontWeight: 700, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {school.principal_title}
                  </div>
                </div>
              </div>
            </div>

            {/* Campus Noticeboard & Official Announcements */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '22px',
                border: '1px solid #e2e8f0',
                padding: '1.75rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                marginBottom: '2.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.9rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.35rem' }}>📢</span>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                      Campus Noticeboard &amp; Senate Announcements
                    </h3>
                    <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                      Official circulars published by the Executive Office, Examinations Registry &amp; Bursar
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: primaryColor, background: `${primaryColor}14`, padding: '3px 10px', borderRadius: '6px' }}>
                  Session: {school.active_period_name}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.1rem' }}>
                <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', borderTop: '3.5px solid #d97706' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#d97706', textTransform: 'uppercase', marginBottom: '5px' }}>
                    Examination Registry
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                    {systemTermLabel} Continuous Assessment Schedule
                  </div>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5 }}>
                    Mid-term CAT examination timetables and practical assessment rosters have been published in the Student and Teacher portals.
                  </p>
                </div>

                <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', borderTop: '3.5px solid #16a34a' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#16a34a', textTransform: 'uppercase', marginBottom: '5px' }}>
                    Bursar's Treasury
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                    Tuition Fee Statements &amp; Clearance
                  </div>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5 }}>
                    Fee payment receipts and official bank deposit slips are validated at the Bursar Desk. Students can verify clearances online.
                  </p>
                </div>

                <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', borderTop: '3.5px solid #2563eb' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#2563eb', textTransform: 'uppercase', marginBottom: '5px' }}>
                    Academic Faculty
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                    Study Guides &amp; Digital Lesson Materials
                  </div>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5 }}>
                    Subject instructors have uploaded downloadable lesson notes and past papers. Log in to the Student Portal to download.
                  </p>
                </div>
              </div>
            </div>

            {/* The 4 Dedicated Portal Workspaces */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.25rem', letterSpacing: '-0.01em' }}>
                  School Portals &amp; Specialized Desks
                </h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
                  Role-governed workspaces equipped with real-time SIS &amp; LMS continuous management modules:
                </p>
              </div>
              <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700 }}>
                4 Authorized Desks Configured
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.5rem', marginBottom: '3.5rem' }}>
              {/* 1. Student Portal Card */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '22px',
                  padding: '1.85rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#2563eb' }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        background: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)',
                      }}
                    >
                      <GraduationCapIcon size={26} color="#2563eb" />
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#2563eb', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                      Learner Portal
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem' }}>
                    Student Learning Portal
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.55, margin: '0 0 1.25rem' }}>
                    Access personalized academic report cards, continuous assessment test (CAT) results, class timetables, fee clearance balance, and study guides.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.5rem', fontSize: '0.78rem', color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#16a34a' }}>✓</span> <span>Continuous Assessment &amp; CAT Records</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#16a34a' }}>✓</span> <span>Downloadable Report Cards with QR Seal</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#16a34a' }}>✓</span> <span>Class Lecture Timetables &amp; Study Notes</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.1rem', display: 'flex', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('student')
                      navigate(getDeskRoute('student'))
                    }}
                    style={{
                      flex: 1,
                      background: '#2563eb',
                      color: '#ffffff',
                      fontWeight: 800,
                      padding: '0.75rem',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                    }}
                  >
                    <span>Enter Student Portal</span>
                    <ArrowRightIcon size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(domainLinks.portals.student.subdomain, 'Student Portal Link')}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '0.75rem 0.85rem',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                    title="Copy Student Portal Link"
                  >
                    📋
                  </button>
                </div>
              </div>

              {/* 2. Teacher Portal Card */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '22px',
                  padding: '1.85rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#059669' }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        background: '#ecfdf5',
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(5, 150, 105, 0.15)',
                      }}
                    >
                      <UserIcon size={26} />
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                      Faculty Desk
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem' }}>
                    Teacher &amp; Faculty Desk
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.55, margin: '0 0 1.25rem' }}>
                    Dedicated instructor workstation to record daily roll-call attendance, submit marks to continuous gradebooks, and distribute lesson materials.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.5rem', fontSize: '0.78rem', color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#16a34a' }}>✓</span> <span>Instant Attendance Register</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#16a34a' }}>✓</span> <span>CAT 1, CAT 2 &amp; Exam Gradebook</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#16a34a' }}>✓</span> <span>Upload Subject Handouts &amp; Study Notes</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.1rem', display: 'flex', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('teacher')
                      navigate(getDeskRoute('teacher'))
                    }}
                    style={{
                      flex: 1,
                      background: '#059669',
                      color: '#ffffff',
                      fontWeight: 800,
                      padding: '0.75rem',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
                    }}
                  >
                    <span>Enter Teacher Desk</span>
                    <ArrowRightIcon size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(domainLinks.portals.teacher.subdomain, 'Teacher Desk Link')}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '0.75rem 0.85rem',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                    title="Copy Teacher Portal Link"
                  >
                    📋
                  </button>
                </div>
              </div>

              {/* 3. Bursar Desk Card */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '22px',
                  padding: '1.85rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#b45309' }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        background: '#fefce8',
                        color: '#b45309',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(180, 83, 9, 0.15)',
                      }}
                    >
                      <CreditCardIcon size={26} color="#b45309" />
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#b45309', background: '#fefce8', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                      Treasury Office
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem' }}>
                    Bursar &amp; Finance Office
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.55, margin: '0 0 1.25rem' }}>
                    Financial reconciliation desk for student tuition collection, verifiable digital receipts, fee invoices, balance clearance tracking, and monthly payroll registers.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.5rem', fontSize: '0.78rem', color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#16a34a' }}>✓</span> <span>Verifiable Receipting with QR Code</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#16a34a' }}>✓</span> <span>Automatic Student Fee Balance Clearance</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#16a34a' }}>✓</span> <span>Staff Compensation &amp; Payroll Register</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.1rem', display: 'flex', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('bursar')
                      navigate(getDeskRoute('bursar'))
                    }}
                    style={{
                      flex: 1,
                      background: '#b45309',
                      color: '#ffffff',
                      fontWeight: 800,
                      padding: '0.75rem',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(180, 83, 9, 0.3)',
                    }}
                  >
                    <span>Enter Bursar Desk</span>
                    <ArrowRightIcon size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(domainLinks.portals.bursar.subdomain, 'Bursar Desk Link')}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '0.75rem 0.85rem',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                    title="Copy Bursar Desk Link"
                  >
                    📋
                  </button>
                </div>
              </div>

              {/* 4. Principal Office Card */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '22px',
                  padding: '1.85rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: primaryColor }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        background: `${primaryColor}14`,
                        color: primaryColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 4px 12px ${primaryColor}20`,
                      }}
                    >
                      <ShieldCheckIcon size={26} color={primaryColor} />
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 900, color: primaryColor, background: `${primaryColor}14`, padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                      Executive Office
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem' }}>
                    Principal &amp; Executive Office
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.55, margin: '0 0 1.25rem' }}>
                    Executive governance suite to onboard faculty, admit candidates, issue credentials &amp; admission letters, manage schedules, and disburse payroll.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.5rem', fontSize: '0.78rem', color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#16a34a' }}>✓</span> <span>Admissions &amp; Official Letter Generation</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#16a34a' }}>✓</span> <span>Staff HR, Credential Slips &amp; Payroll Approval</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#16a34a' }}>✓</span> <span>Master Period Timetable Scheduling</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.1rem', display: 'flex', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('principal')
                      navigate(getDeskRoute('principal'))
                    }}
                    style={{
                      flex: 1,
                      background: primaryColor,
                      color: '#ffffff',
                      fontWeight: 800,
                      padding: '0.75rem',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: `0 4px 14px ${primaryColor}35`,
                    }}
                  >
                    <span>Enter Principal Office</span>
                    <ArrowRightIcon size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(domainLinks.portals.admin.subdomain, 'Principal Office Link')}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '0.75rem 0.85rem',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                    title="Copy Principal Desk Link"
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: PROGRAMS & COURSES CATALOG (ADMIN CONTROLLED) */}
        {activeTab === 'programs' && (
          <TenantProgramsPage
            school={school}
            isAdmin={activeRole === 'admin'}
            onOpenAdmissions={() => {
              setActiveTab('principal')
              navigate(getDeskRoute('principal'))
            }}
          />
        )}

        {/* VIEW 2: ACADEMIC CALENDAR */}
        {activeTab === 'calendar' && (
          <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0', marginBottom: '2rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {school.name} ACADEMIC GOVERNANCE
                </span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '4px 0 0', color: '#0f172a' }}>
                  Official Academic Calendar &amp; Period Cycles
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                  Operating System: <strong>{school.academic_system.toUpperCase()}-BASED CALENDAR</strong> ({school.academic_system === 'semester' ? '2 Semesters / Year' : '3 Terms / Year'})
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {school.academic_calendar.map((period) => (
                  <div
                    key={period.id}
                    style={{
                      background: period.status === 'Active' ? '#f0fdf4' : '#f8fafc',
                      borderRadius: '16px',
                      padding: '1.5rem',
                      border: period.status === 'Active' ? '2px solid #86efac' : '1px solid #e2e8f0',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', background: '#ffffff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        {period.code}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: '6px',
                          background: period.status === 'Active' ? '#dcfce7' : period.status === 'Upcoming' ? '#eff6ff' : '#f1f5f9',
                          color: period.status === 'Active' ? '#15803d' : period.status === 'Upcoming' ? '#1d4ed8' : '#64748b',
                        }}
                      >
                        ● {period.status} Period
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem' }}>
                      {period.name}
                    </h3>

                    <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.7 }}>
                      <div>📅 <strong>Period Dates:</strong> {period.start_date} to {period.end_date}</div>
                      {period.exam_start_date && (
                        <div>📝 <strong>Examinations:</strong> {period.exam_start_date} to {period.exam_end_date}</div>
                      )}
                      {period.fee_deadline && (
                        <div>💳 <strong>Tuition Deadline:</strong> {period.fee_deadline}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: STUDENT DESK */}
        {activeTab === 'student' && (
          !isLicenseActive ? (
            renderLicenseRequiredCard('Student Learning Portal')
          ) : activeRole !== 'admin' && activeRole !== 'student' ? (
            renderRestrictedCard(
              'Student Learning Portal',
              'This workspace contains personalized course modules, lecture notes, timetable periods, attendance tracking, and individual report card results. Access is strictly scoped to enrolled students and executive administrators.',
              'Executive Admin, Enrolled Student'
            )
          ) : (
            <TenantStudentDesk
              school={school}
              studentList={studentList}
              gradeList={gradeList}
              lessonNotesList={lessonNotesList}
              feePaymentsList={feePaymentsList}
              activeStudent={activeStudent || studentList[0]}
              onSelectStudent={(s) => setActiveStudent(s)}
              onOpenReceipt={(r) => setSelectedReceipt(r)}
            />
          )
        )}

        {/* VIEW 4: TEACHER DESK */}
        {activeTab === 'teacher' && (
          !isLicenseActive ? (
            renderLicenseRequiredCard('Teacher & Faculty Workspace')
          ) : activeRole !== 'admin' && activeRole !== 'teacher' ? (
            renderRestrictedCard(
              'Teacher & Faculty Workspace',
              'This workspace contains attendance registers, continuous assessment test (CAT) gradebooks, student examination marks entry, and curriculum materials. Only teaching faculty and executive administrators may enter.',
              'Executive Admin, Teacher'
            )
          ) : (
            <TenantTeacherDesk
              school={school}
              studentList={studentList}
              gradeList={gradeList}
              lessonNotesList={lessonNotesList}
              onReloadData={() => reloadSchoolData(school.slug)}
            />
          )
        )}

        {/* VIEW 5: BURSAR DESK */}
        {activeTab === 'bursar' && (
          !isLicenseActive ? (
            renderLicenseRequiredCard('Bursar & Finance Office')
          ) : activeRole !== 'admin' && activeRole !== 'bursar' ? (
            renderRestrictedCard(
              'Bursar & Finance Office',
              'This finance desk contains confidential institution revenue ledgers, student fee balances, tuition invoices, and receipt printing. Only bursars and executive administrators may enter.',
              'Executive Admin, Bursar'
            )
          ) : (
            <TenantBursarDesk
              school={school}
              staffList={staffList}
              studentList={studentList}
              payrollList={payrollList}
              feePaymentsList={feePaymentsList}
              onReloadData={() => reloadSchoolData(school.slug)}
              onOpenPayslip={(p) => setSelectedPayslip(p)}
              onOpenReceipt={(r) => setSelectedReceipt(r)}
            />
          )
        )}

        {/* VIEW 6: PRINCIPAL DESK */}
        {activeTab === 'principal' && (
          !isLicenseActive ? (
            renderLicenseRequiredCard(`${school.principal_title} Executive Office`)
          ) : activeRole !== 'admin' ? (
            renderRestrictedCard(
              `${school.principal_title} Executive Office`,
              'Executive leadership tools, staff hiring, student admissions, login credential issuance, calendar system setup, and cloud LMS subscription management require Executive Administrator credentials.',
              'Executive Admin Only'
            )
          ) : (
            <TenantPrincipalDesk
              school={school}
              staffList={staffList}
              studentList={studentList}
              payrollList={payrollList}
              onReloadData={() => reloadSchoolData(school.slug)}
              onOpenStaffSlip={(stf) => setSelectedStaffSlip(stf)}
              onOpenAdmissionSlip={(stu) => setSelectedAdmissionSlip(stu)}
              onOpenDomainSettings={() => setShowDomainModal(true)}
            />
          )
        )}

        {/* VIEW 7: BILLING & LICENSING PORTAL */}
        {/* VIEW: MY PROFILE */}
        {activeTab === 'profile' && (
          <TenantProfilePage
            school={school}
            currentSession={currentSession}
            primaryColor={primaryColor}
            accentColor={accentColor}
            onSessionUpdate={(s) => setCurrentSession(s)}
            onOpenLogin={() => setShowLoginModal(true)}
          />
        )}

        {activeTab === 'billing' && (
          <div style={{ maxWidth: '980px', margin: '0 auto' }}>
            <div style={{ background: '#ffffff', borderRadius: '24px', padding: '2.5rem', border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {school.name} SUBSCRIPTION GOVERNANCE
                  </span>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 0' }}>
                    Institutional Campus Billing &amp; Licensing Portal
                  </h2>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '3px' }}>
                    Multi-Campus Management, Active License Key Status &amp; Subscription Renewal
                  </div>
                </div>

                <span
                  style={{
                    padding: '6px 14px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    background: isLicenseActive ? '#dcfce7' : '#fef3c7',
                    color: isLicenseActive ? '#15803d' : '#b45309',
                    border: isLicenseActive ? '1px solid #86efac' : '1px solid #fde68a',
                  }}
                >
                  {isLicenseActive ? '✓ LICENSE ACTIVE & VERIFIED' : '⚠️ PENDING ACTIVATION KEY'}
                </span>
              </div>

              {/* Status & Pricing Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Registered Campuses</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                    {school.campus_count || (school.campuses_list ? school.campuses_list.length : 1)} Campus(es)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                    Standard Rate: <strong>KES 2,500 / campus / month</strong>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Monthly Billing Total</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1e3a8a', marginTop: '4px' }}>
                    KES {((school.campus_count || (school.campuses_list ? school.campuses_list.length : 1)) * 2500).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                    Billed Monthly • Unlimited Users
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Active Product Key</div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, fontFamily: 'monospace', color: isLicenseActive ? '#15803d' : '#b45309', marginTop: '6px' }}>
                    {school.active_license_key || 'No Key Activated'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                    {school.license_valid_until ? `Valid Through: ${new Date(school.license_valid_until).toLocaleDateString()}` : 'Activation Required'}
                  </div>
                </div>
              </div>

              {/* M-Pesa Instructions Card */}
              <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '1.5rem' }}>📲</span>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#065f46' }}>
                    M-Pesa Subscription Payment Channel
                  </h3>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: '0.84rem', color: '#047857' }}>
                  Send your institution's monthly subscription fee (<strong>KES 2,500 per campus</strong>) to:
                </p>
                <div style={{ background: '#ffffff', border: '1px solid #6ee7b7', padding: '0.75rem 1.25rem', borderRadius: '10px', display: 'inline-block', fontSize: '1.25rem', fontWeight: 900, color: '#047857', letterSpacing: '0.04em' }}>
                  M-Pesa: 0740027346
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: '#059669' }}>
                  Once transaction is confirmed, your 19-character Product Key will be issued to activate access below.
                </p>
              </div>

              {/* Activation Key Entry Form */}
              <div style={{ background: '#f8fafc', padding: '1.75rem', borderRadius: '18px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem' }}>
                  🔑 Enter Product Key to Activate or Renew
                </h3>
                <p style={{ margin: '0 0 1.25rem', fontSize: '0.84rem', color: '#64748b' }}>
                  Paste the 19-character Product Key issued for {school.name} to activate full digital campus access:
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="GC-LIC-XXXX-XXXX-XXXX-XXXX"
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
                    style={{
                      flex: 1,
                      minWidth: '260px',
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
                  <button
                    type="button"
                    onClick={async () => {
                      if (!licenseKeyInput.trim()) {
                        setLicenseFeedback({ type: 'error', message: 'Please enter a valid product key.' })
                        return
                      }
                      const res = await licensingStore.redeemProductKey(licenseKeyInput.trim(), school.slug)
                      if (res.success) {
                        setLicenseFeedback({ type: 'success', message: res.message })
                        const updated = tenantSchoolStore.getSchoolBySlug(school.slug)
                        if (updated) setSchool(updated)
                      } else {
                        setLicenseFeedback({ type: 'error', message: res.message })
                      }
                    }}
                    style={{
                      padding: '0.75rem 1.75rem',
                      borderRadius: '12px',
                      border: 'none',
                      background: primaryColor,
                      color: '#ffffff',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    Activate Subscription
                  </button>
                </div>

                {licenseFeedback && (
                  <div
                    style={{
                      marginTop: '1rem',
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      background: licenseFeedback.type === 'success' ? '#dcfce7' : '#fee2e2',
                      color: licenseFeedback.type === 'success' ? '#166534' : '#991b1b',
                      border: licenseFeedback.type === 'success' ? '1px solid #86efac' : '1px solid #fca5a5',
                    }}
                  >
                    {licenseFeedback.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Official Institutional Contact Footer */}
      <footer style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '2.5rem 1rem 3rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 900,
                border: `2px solid ${accentColor}`,
              }}
            >
              {school.name.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{school.name}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {school.address} • {school.contact_email} • {school.contact_phone}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', color: '#16a34a', background: '#dcfce7', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }}>
              ✓ Verified Digital SIS Institution
            </span>
          </div>
        </div>
      </footer>

      {/* MODAL: AUTHENTICATION LOGIN DIALOG */}
      {showLoginModal && (
        <TenantSchoolLoginModal
          school={school}
          staffList={staffList}
          studentList={studentList}
          currentSession={currentSession}
          onLoginSuccess={(user) => {
            setCurrentSession(user)
            setShowLoginModal(false)
            if (user.role === 'admin') setActiveTab('principal')
            else if (user.role === 'teacher') setActiveTab('teacher')
            else if (user.role === 'bursar') setActiveTab('bursar')
            else if (user.role === 'student') setActiveTab('student')
          }}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {/* MODAL: STUDENT ADMISSION LETTER */}
      {selectedAdmissionSlip && (
        <StudentAdmissionLetterModal
          school={school}
          student={selectedAdmissionSlip}
          onClose={() => setSelectedAdmissionSlip(null)}
        />
      )}

      {/* MODAL: STAFF LOGIN SLIP */}
      {selectedStaffSlip && (
        <StaffLoginSlipModal
          school={school}
          staff={selectedStaffSlip}
          onClose={() => setSelectedStaffSlip(null)}
        />
      )}

      {/* MODAL: STAFF PAYSLIP */}
      {selectedPayslip && (
        <StaffPayslipModal
          school={school}
          payslip={selectedPayslip}
          onClose={() => setSelectedPayslip(null)}
        />
      )}

      {/* MODAL: TUITION FEE RECEIPT */}
      {selectedReceipt && (
        <FeeReceiptModal
          school={school}
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* MODAL: DOMAIN & DNS CONFIGURATION */}
      {showDomainModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '580px', width: '100%', maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto', padding: 'clamp(1.1rem, 4vw, 2rem)', border: `2px solid ${primaryColor}`, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                Custom Domain &amp; DNS Management
              </h3>
              <button
                type="button"
                onClick={() => setShowDomainModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
              Connect your school's private custom domain (e.g. <code>portal.{school.slug}.ac.ke</code> or <code>{school.slug}.school</code>) to this SIS portal.
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
                style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>

            {customDomainMessage && (
              <div style={{ padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1rem', background: customDomainMessage.type === 'success' ? '#dcfce7' : '#fee2e2', color: customDomainMessage.type === 'success' ? '#166534' : '#991b1b' }}>
                {customDomainMessage.text}
              </div>
            )}

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#475569', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              <strong>DNS Verification Instructions:</strong>
              <div>Type: <strong>CNAME</strong></div>
              <div>Host: <strong>@ / portal</strong></div>
              <div>Target: <strong>{typeof window !== 'undefined' ? window.location.host : 'cloud-host'}</strong></div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowDomainModal(false)}
                style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  if (school) {
                    tenantSchoolStore.updateSchoolCustomDomain(school.id, customDomainInput)
                    setCustomDomainMessage({ type: 'success', text: `Saved custom domain: ${customDomainInput}!` })
                    setTimeout(() => setShowDomainModal(false), 1500)
                  }
                }}
                style={{ padding: '0.65rem 1.5rem', borderRadius: '10px', border: 'none', background: primaryColor, color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Save Domain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRODUCT KEY LICENSE ACTIVATION */}
      {showLicenseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '580px', width: '100%', maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto', padding: 'clamp(1.1rem, 4vw, 2rem)', border: `2px solid ${primaryColor}`, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', boxSizing: 'border-box' }}>
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
                onClick={() => setShowLicenseModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Campus Pricing & Status Card */}
            <div style={{ background: '#f8fafc', padding: '1.15rem', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', fontSize: '0.84rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#64748b' }}>Institution:</span>
                <strong>{school.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#64748b' }}>Registered Campuses:</span>
                <strong>{school.campus_count || (school.campuses_list ? school.campuses_list.length : 1)} Campus(es)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#64748b' }}>Monthly Subscription Rate:</span>
                <span style={{ color: '#1e3a8a', fontWeight: 800 }}>
                  KES {((school.campus_count || (school.campuses_list ? school.campuses_list.length : 1)) * 2500).toLocaleString()} / month (KES 2,500/campus)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#64748b' }}>License Status:</span>
                <span style={{
                  fontWeight: 800,
                  color: isLicenseActive ? '#15803d' : '#b45309',
                  background: isLicenseActive ? '#dcfce7' : '#fef3c7',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                }}>
                  {isLicenseActive ? (school.subscription_status || 'LICENSED').toUpperCase() : 'PENDING ACTIVATION'}
                </span>
              </div>
              {school.license_valid_until && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Valid Through:</span>
                  <strong>{new Date(school.license_valid_until).toLocaleDateString()}</strong>
                </div>
              )}
            </div>

            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#065f46' }}>
              <div style={{ fontWeight: 800, marginBottom: '2px' }}>📲 M-Pesa Subscription Payment:</div>
              <div>Send monthly subscription (<strong>KES 2,500 / campus</strong>) to:</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#047857', marginTop: '4px', letterSpacing: '0.04em' }}>
                M-Pesa: 0740027346
              </div>
              <div style={{ fontSize: '0.74rem', color: '#059669', marginTop: '3px' }}>
                Once processed, your 19-character Product Key will be issued to activate access below.
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                Product Activation Key
              </label>
              <input
                type="text"
                placeholder="GC-LIC-XXXX-XXXX-XXXX-XXXX"
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
                  onClick={() => setShowLicenseModal(false)}
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
                  onClick={async () => {
                    if (!licenseKeyInput.trim()) {
                      setLicenseFeedback({ type: 'error', message: 'Please enter a valid product key.' })
                      return
                    }
                    const res = await licensingStore.redeemProductKey(licenseKeyInput.trim(), school.slug)
                    if (res.success) {
                      setLicenseFeedback({ type: 'success', message: res.message })
                      const updated = tenantSchoolStore.getSchoolBySlug(school.slug)
                      if (updated) setSchool(updated)
                    } else {
                      setLicenseFeedback({ type: 'error', message: res.message })
                    }
                  }}
                  style={{
                    padding: '0.65rem 1.35rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: primaryColor,
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  Activate License
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
