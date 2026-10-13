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
    return 'admin' // Default to executive admin for full management access
  })()

  // Active Tab: Hub, Programs, Calendar, Student, Teacher, Bursar, Principal
  const [activeTab, setActiveTab] = useState<'hub' | 'programs' | 'calendar' | 'student' | 'teacher' | 'bursar' | 'principal' | 'billing'>(() => {
    const s = forcedSubview || subview
    if (s === 'programs' || s === 'courses') return 'programs'
    if (s === 'student' || s === 'parent') return 'student'
    if (s === 'teacher') return 'teacher'
    if (s === 'bursar') return 'bursar'
    if (s === 'principal' || s === 'admin') return 'principal'
    if (s === 'calendar') return 'calendar'
    if (s === 'billing' || s === 'license' || s === 'subscription') return 'billing'
    return 'hub'
  })

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

  // Load School on Mount
  useEffect(() => {
    setLoading(true)
    let targetSlug = (schoolSlug || 'hillcrest').toLowerCase()

    // Host detection for subdomains or custom domains
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
      } else if (typeof window !== 'undefined' && hostname.split('.').length > 2) {
        const parts = hostname.split('.')
        const sub = parts[0]
        if (sub && sub !== 'www' && sub !== 'cloud' && sub !== 'app') {
          targetSlug = sub
        }
      }
    }

    const foundSchool = tenantSchoolStore.getSchoolBySlug(targetSlug)
    if (foundSchool) {
      setSchool(foundSchool)
      setCustomDomainInput(foundSchool.custom_domain || '')
      reloadSchoolData(foundSchool.slug)

      // Initialize session if present
      const savedSession = tenantSchoolStore.getActiveSession(foundSchool.slug)
      if (savedSession) {
        setCurrentSession(savedSession)
      } else {
        // Default to Principal session for immediate working capabilities
        const defaultAdmin: TenantSessionUser = {
          id: 'principal_session',
          school_slug: foundSchool.slug,
          name: foundSchool.principal_name,
          role: 'admin',
          username: foundSchool.principal_email || `${foundSchool.slug}.admin`,
          title: foundSchool.principal_title,
          department: 'Executive Administration',
        }
        setCurrentSession(defaultAdmin)
      }
    }
    setLoading(false)
  }, [schoolSlug])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedLink(label)
    setTimeout(() => setCopiedLink(null), 2500)
  }

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

  const isLicenseActive = Boolean(school.active_license_key && school.subscription_status === 'active')

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
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Official Institutional Brand Navigation Header */}
      <header style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 40, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Institution Monogram & Title */}
          <Link to={`/s/${school.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none', color: 'inherit' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                fontWeight: 900,
                border: `2px solid ${accentColor}`,
                flexShrink: 0,
              }}
            >
              {school.name.charAt(0)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  {school.name}
                </span>
                <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                  ✓ Official Portal
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                {school.motto} • {school.curriculum_type}
              </div>
            </div>
          </Link>

          {/* Session & Role Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {/* Authenticated User Status Pill */}
            {currentSession && (
              <div
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }} />
                <span>
                  <strong>{currentSession.name}</strong> ({currentSession.role.toUpperCase()})
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    marginLeft: '4px',
                  }}
                  title="Sign Out of Session"
                >
                  [Sign Out]
                </button>
              </div>
            )}

            {/* Quick Switch / Sign In Trigger */}
            <button
              type="button"
              onClick={() => setShowLoginModal(true)}
              style={{
                background: '#ffffff',
                border: `1.5px solid ${primaryColor}`,
                color: primaryColor,
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <LockIcon size={12} color={primaryColor} />
              <span>Switch / Sign In</span>
            </button>

            {/* Active Calendar Pill */}
            <div
              style={{
                background: `${primaryColor}12`,
                color: primaryColor,
                border: `1px solid ${primaryColor}30`,
                borderRadius: '999px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.76rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <CalendarIcon size={13} color={primaryColor} />
              <span>{systemTermLabel}: <strong>{school.active_period_name}</strong></span>
            </div>

            {/* Product Key License Button */}
            <button
              type="button"
              onClick={() => {
                setLicenseFeedback(null)
                setShowLicenseModal(true)
              }}
              style={{
                background: school.subscription_status === 'active' ? '#f0fdf4' : '#fffbeb',
                color: school.subscription_status === 'active' ? '#15803d' : '#b45309',
                border: school.subscription_status === 'active' ? '1px solid #86efac' : '1px solid #fde68a',
                borderRadius: '8px',
                padding: '0.35rem 0.65rem',
                fontSize: '0.74rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
              }}
              title="Activate / View Institutional Product License"
            >
              <AwardIcon size={13} color={school.subscription_status === 'active' ? '#15803d' : '#b45309'} />
              <span>{school.subscription_status === 'active' ? '🔑 License Active' : '🔑 Enter Product Key'}</span>
            </button>

            {/* Admin-Only Domain Setup Button */}
            {activeRole === 'admin' && (
              <button
                type="button"
                onClick={() => setShowDomainModal(true)}
                style={{
                  background: '#f8fafc',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                }}
              >
                <GlobeIcon size={13} color="#475569" />
                <span>Domain &amp; DNS</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '0 1rem' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', gap: '0.25rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
            <button
              type="button"
              onClick={() => { setActiveTab('hub'); navigate(getDeskRoute('hub')) }}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.65rem 0.9rem',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'hub' ? 800 : 600,
                color: activeTab === 'hub' ? primaryColor : '#64748b',
                borderBottom: activeTab === 'hub' ? `2.5px solid ${primaryColor}` : '2.5px solid transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <BuildingIcon size={15} />
              <span>School Campus Hub</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('programs'); navigate(getDeskRoute('programs')) }}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.65rem 0.9rem',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'programs' ? 800 : 600,
                color: activeTab === 'programs' ? primaryColor : '#64748b',
                borderBottom: activeTab === 'programs' ? `2.5px solid ${primaryColor}` : '2.5px solid transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <AwardIcon size={15} />
              <span>Programs &amp; Courses</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('calendar'); navigate(getDeskRoute('calendar')) }}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.65rem 0.9rem',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'calendar' ? 800 : 600,
                color: activeTab === 'calendar' ? primaryColor : '#64748b',
                borderBottom: activeTab === 'calendar' ? `2.5px solid ${primaryColor}` : '2.5px solid transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <CalendarIcon size={15} />
              <span>Academic Calendar</span>
            </button>

            {/* Principal Office Tab */}
            <button
              type="button"
              onClick={() => { setActiveTab('principal'); navigate(getDeskRoute('principal')) }}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.65rem 0.9rem',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'principal' ? 800 : 600,
                color: activeTab === 'principal' ? primaryColor : '#64748b',
                borderBottom: activeTab === 'principal' ? `2.5px solid ${primaryColor}` : '2.5px solid transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <ShieldCheckIcon size={15} />
              <span>Principal Office</span>
            </button>

            {/* Bursar Desk Tab */}
            <button
              type="button"
              onClick={() => { setActiveTab('bursar'); navigate(getDeskRoute('bursar')) }}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.65rem 0.9rem',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'bursar' ? 800 : 600,
                color: activeTab === 'bursar' ? primaryColor : '#64748b',
                borderBottom: activeTab === 'bursar' ? `2.5px solid ${primaryColor}` : '2.5px solid transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <CreditCardIcon size={15} />
              <span>Bursar Desk</span>
            </button>

            {/* Teacher Portal Tab */}
            <button
              type="button"
              onClick={() => { setActiveTab('teacher'); navigate(getDeskRoute('teacher')) }}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.65rem 0.9rem',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'teacher' ? 800 : 600,
                color: activeTab === 'teacher' ? primaryColor : '#64748b',
                borderBottom: activeTab === 'teacher' ? `2.5px solid ${primaryColor}` : '2.5px solid transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <UserIcon size={15} />
              <span>Teacher Portal</span>
            </button>

            {/* Student Portal Tab */}
            <button
              type="button"
              onClick={() => { setActiveTab('student'); navigate(getDeskRoute('student')) }}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.65rem 0.9rem',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'student' ? 800 : 600,
                color: activeTab === 'student' ? primaryColor : '#64748b',
                borderBottom: activeTab === 'student' ? `2.5px solid ${primaryColor}` : '2.5px solid transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <GraduationCapIcon size={15} />
              <span>Student Portal</span>
            </button>

            {/* Billing & Subscription Tab */}
            <button
              type="button"
              onClick={() => { setActiveTab('billing'); navigate(getDeskRoute('billing')) }}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.65rem 0.9rem',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'billing' ? 800 : 600,
                color: activeTab === 'billing' ? primaryColor : isLicenseActive ? '#64748b' : '#b45309',
                borderBottom: activeTab === 'billing' ? `2.5px solid ${primaryColor}` : '2.5px solid transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <CreditCardIcon size={15} />
              <span>Billing &amp; Subscription</span>
              {!isLicenseActive && (
                <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                  Key Req.
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Body */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
        {/* VIEW 1: MAIN HUB */}
        {activeTab === 'hub' && (
          <div>
            {/* Subscription Activation Required Banner */}
            {!isLicenseActive && (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1.5px solid #fde68a',
                  borderRadius: '16px',
                  padding: '1.25rem 1.5rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontSize: '2rem' }}>🔑</div>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#92400e' }}>
                      Subscription Product Key Required
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#b45309', marginTop: '2px' }}>
                      This digital campus is awaiting Product Key activation. Rate: KES {((school.campus_count || 1) * 2500).toLocaleString()}/month. Enter your activation key to unlock all portal desks.
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
                      background: '#b45309',
                      color: '#ffffff',
                      fontWeight: 800,
                      padding: '0.6rem 1.25rem',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>🔑 Enter Product Key</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('billing')
                      navigate(getDeskRoute('billing'))
                    }}
                    style={{
                      background: '#ffffff',
                      color: '#0f172a',
                      fontWeight: 800,
                      padding: '0.6rem 1rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                    }}
                  >
                    View Billing Details &rarr;
                  </button>
                </div>
              </div>
            )}
            {/* School Hero Banner */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                border: '1.5px solid #e2e8f0',
                padding: 'clamp(1.5rem, 3.5vw, 2.5rem)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.5rem',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})` }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '18px',
                    background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: 900,
                    boxShadow: `0 8px 20px ${primaryColor}30`,
                    border: `2px solid ${accentColor}`,
                    flexShrink: 0,
                  }}
                >
                  {school.name.charAt(0)}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: primaryColor, background: `${primaryColor}14`, padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {school.curriculum_type}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '6px' }}>
                      ● {systemTermLabel} Active: {school.active_period_name}
                    </span>
                  </div>

                  <h1 style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.2rem)', fontWeight: 900, color: '#0f172a', margin: '0 0 0.35rem', lineHeight: 1.2 }}>
                    {school.name}
                  </h1>

                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5, maxWidth: '640px' }}>
                    {school.motto} • Official Online Campus &amp; Student Information System.
                  </p>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  style={{
                    background: primaryColor,
                    color: '#ffffff',
                    fontWeight: 800,
                    padding: '0.7rem 1.25rem',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    boxShadow: `0 4px 14px ${primaryColor}40`,
                  }}
                >
                  <LockIcon size={15} color="#ffffff" />
                  <span>Authenticate / Switch Portal Desk</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Academic Structure</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: primaryColor, marginTop: '4px' }}>
                  {school.academic_system === 'semester' ? '2 Semesters' : '3 Terms'} / Year
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>{school.curriculum_type}</div>
              </div>

              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Enrolled Students</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                  {studentList.length > 0 ? studentList.length : school.stats.students} Active
                </div>
                <div style={{ fontSize: '0.76rem', color: '#16a34a', marginTop: '2px', fontWeight: 700 }}>✓ Live Biometric Attendance</div>
              </div>

              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Faculty &amp; Teachers</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                  {staffList.length > 0 ? staffList.length : school.stats.teachers} Certified Staff
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Across {school.stats.departments} Departments</div>
              </div>

              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Head of Institution</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                  {school.principal_name}
                </div>
                <div style={{ fontSize: '0.76rem', color: primaryColor, marginTop: '2px', fontWeight: 700 }}>{school.principal_title}</div>
              </div>
            </div>

            {/* Campus Noticeboard */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                border: '1.5px solid #e2e8f0',
                padding: '1.5rem 1.75rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                marginBottom: '2.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.25rem' }}>📢</span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Campus Noticeboard &amp; Official Announcements
                  </h3>
                </div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>
                  Session: {school.active_period_name}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '1.1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Examination Registry
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                    {systemTermLabel} Continuous Assessment Schedule
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                    Mid-term CAT examination timetables and practical assessment rosters have been published in the Student and Teacher portals.
                  </p>
                </div>

                <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '1.1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Bursar's Office
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                    Tuition Fee Statements &amp; Clearance
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                    Fee payment receipts and official bank deposit slips are validated at the Bursar Desk. Students can verify clearances online.
                  </p>
                </div>

                <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '1.1rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Academic Faculty
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                    Study Guides &amp; Digital Lesson Materials
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                    Subject instructors have uploaded downloadable lesson notes and past papers. Log in to the Student Portal to download.
                  </p>
                </div>
              </div>
            </div>

            {/* The 4 Dedicated Portal Desks Cards */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.25rem' }}>
                School Portals &amp; Role Workspaces
              </h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.86rem' }}>
                Select your assigned desk to access your personalized learning or administrative workspace:
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
              {/* 1. Student Portal Card */}
              <div style={{ background: '#ffffff', borderRadius: '20px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                    <GraduationCapIcon size={24} color="#1d4ed8" />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.75rem' }}>
                    Student Learning Portal
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
                    Enrolled candidates log in to access virtual lectures, class timetables, continuous assessments, submitted homework, and stamped report cards.
                  </p>
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('student'); navigate(getDeskRoute('student')) }}
                    style={{
                      flex: 1,
                      background: '#1d4ed8',
                      color: '#ffffff',
                      fontWeight: 700,
                      padding: '0.65rem',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>Enter Student Portal</span>
                    <ArrowRightIcon size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(domainLinks.portals.student.subdomain, 'Student Portal Link')}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.65rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' }}
                    title="Copy Student Portal Link"
                  >
                    📋
                  </button>
                </div>
              </div>

              {/* 2. Teacher Portal Card */}
              <div style={{ background: '#ffffff', borderRadius: '20px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                    <UserIcon size={24} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.75rem' }}>
                    Teacher &amp; Faculty Desk
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
                    Subject tutors and class teachers take morning/afternoon attendance, enter CAT and exam marks into continuous gradebooks, and upload lesson study materials.
                  </p>
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('teacher'); navigate(getDeskRoute('teacher')) }}
                    style={{
                      flex: 1,
                      background: '#059669',
                      color: '#ffffff',
                      fontWeight: 700,
                      padding: '0.65rem',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>Enter Teacher Desk</span>
                    <ArrowRightIcon size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(domainLinks.portals.teacher.subdomain, 'Teacher Desk Link')}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.65rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' }}
                    title="Copy Teacher Portal Link"
                  >
                    📋
                  </button>
                </div>
              </div>

              {/* 3. Bursar Desk Card */}
              <div style={{ background: '#ffffff', borderRadius: '20px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fefce8', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                    <CreditCardIcon size={24} color="#b45309" />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.75rem' }}>
                    Bursar &amp; Finance Office
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
                    Finance staff track tuition payments, reconcile bank wire deposits, manage student arrears, and process monthly staff salary payroll registers.
                  </p>
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('bursar'); navigate(getDeskRoute('bursar')) }}
                    style={{
                      flex: 1,
                      background: '#b45309',
                      color: '#ffffff',
                      fontWeight: 700,
                      padding: '0.65rem',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>Enter Bursar Desk</span>
                    <ArrowRightIcon size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(domainLinks.portals.bursar.subdomain, 'Bursar Desk Link')}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.65rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' }}
                    title="Copy Bursar Desk Link"
                  >
                    📋
                  </button>
                </div>
              </div>

              {/* 4. Principal Office Card */}
              <div style={{ background: '#ffffff', borderRadius: '20px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${primaryColor}14`, color: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                    <ShieldCheckIcon size={24} color={primaryColor} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.75rem' }}>
                    Principal &amp; Executive Office
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
                    Executive leadership desk to hire faculty, admit students, issue credentials, manage timetables, authorize payroll disbursements, and manage cloud subscription.
                  </p>
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('principal'); navigate(getDeskRoute('principal')) }}
                    style={{
                      flex: 1,
                      background: primaryColor,
                      color: '#ffffff',
                      fontWeight: 700,
                      padding: '0.65rem',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>Enter Principal Office</span>
                    <ArrowRightIcon size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(domainLinks.portals.admin.subdomain, 'Principal Office Link')}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.65rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' }}
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
                    onClick={() => {
                      if (!licenseKeyInput.trim()) {
                        setLicenseFeedback({ type: 'error', message: 'Please enter a valid product key.' })
                        return
                      }
                      const res = licensingStore.redeemProductKey(licenseKeyInput.trim(), school.slug)
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

              {/* Master Platform Link */}
              <div style={{ textAlign: 'right' }}>
                <Link
                  to="/saas-admin"
                  target="_blank"
                  style={{ fontSize: '0.82rem', color: '#1d4ed8', fontWeight: 800, textDecoration: 'none' }}
                >
                  Platform Owner Master SaaS Portal &rarr;
                </Link>
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
          <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '580px', width: '100%', padding: '2rem', border: `2px solid ${primaryColor}` }}>
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
          <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '580px', width: '100%', padding: '2rem', border: `2px solid ${primaryColor}`, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
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
                  color: school.subscription_status === 'active' ? '#15803d' : '#b45309',
                  background: school.subscription_status === 'active' ? '#dcfce7' : '#fef3c7',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                }}>
                  {school.subscription_status ? school.subscription_status.toUpperCase() : 'ACTIVE TRIAL'}
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

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center' }}>
              <Link
                to="/saas-admin"
                target="_blank"
                style={{ fontSize: '0.78rem', color: '#1d4ed8', fontWeight: 700, textDecoration: 'none' }}
              >
                Platform Owner Master Portal &rarr;
              </Link>

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
                  onClick={() => {
                    if (!licenseKeyInput.trim()) {
                      setLicenseFeedback({ type: 'error', message: 'Please enter a valid product key.' })
                      return
                    }
                    const res = licensingStore.redeemProductKey(licenseKeyInput.trim(), school.slug)
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