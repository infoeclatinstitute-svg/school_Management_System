import { useState, useEffect, useId } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import { getTenantDomainLinks } from '@/lib/tenantDomain'
import type {
  AcademicCalendarSystem,
  InstitutionCategory,
  InstitutionGradingScale,
  PartnerSchoolTenant,
} from '@/types/tenantSchool'
import {
  CheckCircleIcon,
  ArrowRightIcon,
  CalendarIcon,
  SparklesIcon,
} from '@/components/icons/AppIcons'
import {
  SUBSCRIPTION_TIER_RATES,
  SUBSCRIPTION_TIER_DETAILS,
  type SubscriptionTierType,
} from '@/types/licensing'

const PRESET_COLORS = [
  { name: 'Burgundy & Gold', primary: '#881337', accent: '#d4af37' },
  { name: 'Royal Navy & Cyan', primary: '#1e3a8a', accent: '#0284c7' },
  { name: 'Emerald & Gold', primary: '#047857', accent: '#d97706' },
  { name: 'Deep Purple & Amber', primary: '#581c87', accent: '#f59e0b' },
  { name: 'Crimson & Slate', primary: '#991b1b', accent: '#64748b' },
  { name: 'Midnight & Teal', primary: '#0f172a', accent: '#0d9488' },
]

const INSTITUTION_CATEGORIES: {
  id: InstitutionCategory
  label: string
  badge: string
  icon: string
  desc: string
  defaultCalendar: AcademicCalendarSystem
  defaultGrading: InstitutionGradingScale
  defaultTitle: string
  defaultCurriculum: string
  suggestedDepts: string[]
  suggestedClasses: string[]
}[] = [
  {
    id: 'college',
    label: 'College / TVET / Polytechnic',
    badge: 'Diplomas & Certificates',
    icon: '🏛️',
    desc: 'Technical colleges, TVET institutes, medical training colleges, and business polytechnics.',
    defaultCalendar: 'semester',
    defaultGrading: 'tvet_competency',
    defaultTitle: 'College Principal / Provost',
    defaultCurriculum: 'TVET / Diploma & Certificate Modular Framework',
    suggestedDepts: [
      'School of Computing & Informatics',
      'Department of Business & Accounting',
      'Department of Electrical & Civil Engineering',
      'School of Hospitality & Health Sciences',
    ],
    suggestedClasses: [
      'Diploma in ICT — Year 1',
      'Diploma in Business Management — Year 1',
      'Certificate in Software Development',
      'Artisan & Craft Technical Cohort',
    ],
  },
  {
    id: 'school',
    label: 'Primary / High School (K-12)',
    badge: 'CBC / National / International',
    icon: '🏫',
    desc: 'Primary schools, junior & senior secondary schools, high schools, and K-12 academies.',
    defaultCalendar: 'term',
    defaultGrading: 'standard_percentage',
    defaultTitle: 'Principal / Head of School',
    defaultCurriculum: 'National / Competency-Based Curriculum (K-12)',
    suggestedDepts: [
      'Department of Mathematics & Sciences',
      'Department of Languages & Humanities',
      'Department of Creative Arts & Sports',
      'Department of Guidance & Boarding',
    ],
    suggestedClasses: [
      'Grade 7 / Form 1 East',
      'Grade 8 / Form 2 East',
      'Grade 9 / Form 3 Science',
      'Grade 10 / Candidate Class',
    ],
  },
  {
    id: 'university',
    label: 'University / Higher Education',
    badge: 'Undergraduate & Postgrad',
    icon: '🎓',
    desc: 'Degree-awarding universities, constituent university colleges, and graduate schools.',
    defaultCalendar: 'semester',
    defaultGrading: 'letter_gpa',
    defaultTitle: 'Vice-Chancellor / Academic Registrar',
    defaultCurriculum: 'University Credit-Hour & GPA Degree Framework',
    suggestedDepts: [
      'Faculty of Science & Technology',
      'Faculty of Commerce & Economics',
      'Faculty of Law & Governance',
      'Faculty of Education & Social Sciences',
    ],
    suggestedClasses: [
      'B.Sc. Computer Science — Year 1',
      'Bachelor of Commerce (B.Com) — Year 1',
      'B.Ed. Arts & Sciences — Year 2',
      'Postgraduate Diploma Cohort',
    ],
  },
  {
    id: 'academy',
    label: 'Professional & Tech Academy',
    badge: 'Bootcamps & Executive',
    icon: '💻',
    desc: 'Coding bootcamps, professional certification centers, language institutes, and aviation/driving schools.',
    defaultCalendar: 'trimester',
    defaultGrading: 'letter_gpa',
    defaultTitle: 'Academy Director',
    defaultCurriculum: 'Industry Certification & Accelerated Bootcamp Track',
    suggestedDepts: [
      'Full-Stack & Cloud Engineering Track',
      'Data Science & Cybersecurity Track',
      'Digital Marketing & Product Design',
      'Corporate Executive Training',
    ],
    suggestedClasses: [
      'Cohort Alpha — Full-Stack Engineering',
      'Cohort Beta — Cybersecurity & Cloud',
      'Weekend Executive Cohort',
      'Evening Virtual Track',
    ],
  },
]

const MODULE_OPTIONS: {
  key: keyof PartnerSchoolTenant['features_enabled']
  title: string
  icon: string
  desc: string
  recommended: boolean
}[] = [
  {
    key: 'principal_portal',
    title: 'Executive Principal / Provost & HR Payroll Desk',
    icon: '🛡️',
    desc: 'Staff onboarding, monthly payroll generation, compensation vouchers, and institutional governance.',
    recommended: true,
  },
  {
    key: 'teacher_portal',
    title: 'Faculty / Teacher Gradebook & Study Notes Desk',
    icon: '👨‍🏫',
    desc: 'CAT 1, CAT 2 & final exam score entry, automatic grading, and digital study material publishing.',
    recommended: true,
  },
  {
    key: 'bursar_portal',
    title: 'Bursar, Fee Invoicing & M-Pesa / Bank Receipting',
    icon: '💳',
    desc: 'Automated tuition balances, serialized fee receipts, student admission billing, and arrears tracking.',
    recommended: true,
  },
  {
    key: 'student_portal',
    title: 'Student Learning & Transcript Self-Service Portal',
    icon: '🎓',
    desc: 'Personal timetable, downloadable study notes, live fee statement, and verified academic transcripts.',
    recommended: true,
  },
  {
    key: 'online_admissions',
    title: 'Digital Student Admissions & Enrollment Numbers',
    icon: '📝',
    desc: 'Instant student admission numbering, guardian contact registry, and automatic class placement.',
    recommended: true,
  },
  {
    key: 'report_cards',
    title: 'Official Report Cards & QR-Verified Transcripts',
    icon: '📊',
    desc: 'One-click printable academic transcripts and termly/semester report cards with Principal seal.',
    recommended: true,
  },
  {
    key: 'biometric_attendance',
    title: 'Biometric Fingerprint & Shift Attendance Tracking',
    icon: '🖐️',
    desc: 'Track daily student and staff attendance percentages and examination gate clearance.',
    recommended: true,
  },
  {
    key: 'e_library',
    title: 'Campus Digital E-Library & Curriculum Repository',
    icon: '📚',
    desc: '24/7 student access to uploaded lecture notes, past papers, syllabi, and reference books.',
    recommended: true,
  },
]

export function SchoolRegistrationPage() {
  const formId = useId()
  const { profile: _profile } = useAuth()

  // Mode: Dedicated 5-step registration wizard
  const [existingSchools, setExistingSchools] = useState<PartnerSchoolTenant[]>(() =>
    tenantSchoolStore.getSchools()
  )

  useEffect(() => {
    const refresh = () => setExistingSchools(tenantSchoolStore.getSchools())
    window.addEventListener('gc-tenant-schools-updated', refresh)
    return () => window.removeEventListener('gc-tenant-schools-updated', refresh)
  }, [])

  // Wizard Step (1 to 5)
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registeredSchool, setRegisteredSchool] = useState<PartnerSchoolTenant | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Step 1: Institution Category, Identity & Domain
  const [institutionCategory, setInstitutionCategory] = useState<InstitutionCategory>('college')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [isSlugManual, setIsSlugManual] = useState(false)
  const [motto, setMotto] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [currency, setCurrency] = useState('KES')
  const [curriculumType, setCurriculumType] = useState<string>(
    INSTITUTION_CATEGORIES[0].defaultCurriculum
  )
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [customDomain, setCustomDomain] = useState('')

  // Step 2: Academic Calendar, Grading Scale & Initial Departments / Classes
  const [academicSystem, setAcademicSystem] = useState<AcademicCalendarSystem>('semester')
  const [gradingScale, setGradingScale] = useState<InstitutionGradingScale>('tvet_competency')
  const [departmentsList, setDepartmentsList] = useState<string[]>(
    INSTITUTION_CATEGORIES[0].suggestedDepts
  )
  const [newDeptInput, setNewDeptInput] = useState('')
  const [classesList, setClassesList] = useState<string[]>(
    INSTITUTION_CATEGORIES[0].suggestedClasses
  )
  const [newClassInput, setNewClassInput] = useState('')

  // Step 3: Campus Modules
  const [featuresEnabled, setFeaturesEnabled] = useState<PartnerSchoolTenant['features_enabled']>({
    student_portal: true,
    teacher_portal: true,
    bursar_portal: true,
    principal_portal: true,
    online_admissions: true,
    biometric_attendance: true,
    report_cards: true,
    e_library: true,
  })

  // Step 4: Branding, Leadership & Dynamic Admin Credentials
  const generateDynamicPassword = (prefix = 'GC') => {
    const cleanPrefix = (prefix || 'GC').slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, 'G')
    const randDigits = Math.floor(1000 + Math.random() * 9000)
    const specials = ['#', '!', '$', '@', '&']
    const sym = specials[Math.floor(Math.random() * specials.length)]
    const token = Math.random().toString(36).substring(2, 5).toUpperCase()
    return `${cleanPrefix}@${randDigits}${sym}${token}`
  }

  const [primaryColor, setPrimaryColor] = useState('#1e3a8a')
  const [accentColor, setAccentColor] = useState('#0284c7')
  const [logoUrl, setLogoUrl] = useState('')
  const [principalName, setPrincipalName] = useState('')
  const [principalTitle, setPrincipalTitle] = useState('College Principal / Provost')
  const [principalEmail, setPrincipalEmail] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [isUsernameManual, setIsUsernameManual] = useState(false)
  const [adminPassword, setAdminPassword] = useState(() => generateDynamicPassword('GC'))
  const [isPasswordManual, setIsPasswordManual] = useState(false)

  // Step 5: Campuses & Subscription Tier Selection (Silver KES 2,500, Gold KES 3,000, Platinum KES 5,000)
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTierType>('gold')
  const [campusCount, setCampusCount] = useState<number>(1)
  const [campusesList, setCampusesList] = useState<string[]>(['Main Campus'])
  const [newCampusInput, setNewCampusInput] = useState('')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly')

  // Validation error
  const [error, setError] = useState<string | null>(null)

  const handleCategoryChange = (catId: InstitutionCategory) => {
    setInstitutionCategory(catId)
    const found = INSTITUTION_CATEGORIES.find((c) => c.id === catId)
    if (found) {
      setAcademicSystem(found.defaultCalendar)
      setGradingScale(found.defaultGrading)
      setPrincipalTitle(found.defaultTitle)
      setCurriculumType(found.defaultCurriculum)

      // Only overwrite suggested departments if current list is empty or matches another default category template
      const isTemplateDepts = departmentsList.length === 0 || INSTITUTION_CATEGORIES.some(
        (c) => c.suggestedDepts.length === departmentsList.length && c.suggestedDepts.every((d, i) => d === departmentsList[i])
      )
      if (isTemplateDepts) {
        setDepartmentsList([...found.suggestedDepts])
      }

      // Only overwrite suggested classes if current list is empty or matches another default category template
      const isTemplateClasses = classesList.length === 0 || INSTITUTION_CATEGORIES.some(
        (c) => c.suggestedClasses.length === classesList.length && c.suggestedClasses.every((cls, i) => cls === classesList[i])
      )
      if (isTemplateClasses) {
        setClassesList([...found.suggestedClasses])
      }
    }
  }

  const handleNameChange = (val: string) => {
    setName(val)
    if (!isSlugManual) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
      setSlug(generatedSlug)
      if (!isUsernameManual && generatedSlug) {
        setAdminUsername(`admin.${generatedSlug}`)
      }
      if (!isPasswordManual && generatedSlug) {
        setAdminPassword(generateDynamicPassword(generatedSlug))
      }
    }
  }

  const handleSlugChange = (val: string) => {
    setIsSlugManual(true)
    const clean = val
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
    setSlug(clean)
    if (!isUsernameManual && clean) {
      setAdminUsername(`admin.${clean}`)
    }
    if (!isPasswordManual && clean) {
      setAdminPassword(generateDynamicPassword(clean))
    }
  }

  const generateStrongPassword = () => {
    setIsPasswordManual(true)
    setAdminPassword(generateDynamicPassword(slug || 'GC'))
  }

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2200)
    }
  }

  const slugAlreadyExists = Boolean(
    slug.trim() && existingSchools.some((s) => s.slug.toLowerCase() === slug.trim().toLowerCase())
  )

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Please enter the official name of your school or college.')
      return
    }
    if (!slug.trim()) {
      setError('Please specify a dedicated URL slug for your institution.')
      return
    }
    if (!city.trim() || !country.trim()) {
      setError('Please provide both the campus city/town and country.')
      return
    }
    setStep(2)
  }

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setStep(3)
  }

  const handleNextStep3 = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setStep(4)
  }

  const handleNextStep4 = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!principalName.trim()) {
      setError('Please provide the full name of the Principal, Provost, or Head of Institution.')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!contactEmail.trim() || !emailRegex.test(contactEmail.trim())) {
      setError('Please provide a valid official administrative email address (e.g. registrar@school.ac.ke).')
      return
    }
    if (!contactPhone.trim() || contactPhone.trim().length < 9) {
      setError('Please provide a valid official phone or WhatsApp contact number (at least 9 digits).')
      return
    }
    if (!adminUsername.trim()) {
      setError('Please configure the Executive Admin login username.')
      return
    }
    if (!adminPassword.trim() || adminPassword.trim().length < 6) {
      setError('Admin password must be at least 6 characters. Use "Generate Secure Password" for high security.')
      return
    }
    setStep(5)
  }

  const currentTierRate = SUBSCRIPTION_TIER_RATES[subscriptionTier] || 3000
  const computedSubscriptionRate =
    billingCycle === 'monthly'
      ? campusCount * currentTierRate
      : campusCount * currentTierRate * 10

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const newSchool = tenantSchoolStore.registerSchool({
        name: name.trim(),
        slug: slug.trim(),
        institution_category: institutionCategory,
        motto: motto.trim() || undefined,
        logo_url: logoUrl.trim() || undefined,
        primary_color: primaryColor,
        accent_color: accentColor,
        academic_system: academicSystem,
        grading_scale: gradingScale,
        curriculum_type: curriculumType.trim() || 'General Academic Framework',
        registration_number: registrationNumber.trim() || undefined,
        currency: currency.trim() || 'KES',
        country: country.trim(),
        city: city.trim(),
        address: address.trim() || `${city.trim()}, ${country.trim()}`,
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        principal_name: principalName.trim(),
        principal_title: principalTitle.trim() || 'Principal',
        principal_email: principalEmail.trim() || contactEmail.trim(),
        admin_username: adminUsername.trim(),
        admin_password: adminPassword.trim(),
        custom_domain: customDomain.trim() || undefined,
        campus_count: campusCount,
        campuses_list: campusesList.map((c, i) => ({
          id: `cmp_${Date.now()}_${i}`,
          name: c,
          is_main: i === 0,
        })),
        subscription_tier: subscriptionTier,
        subscription_monthly_rate: computedSubscriptionRate,
        subscription_billing_cycle: billingCycle,
        departments_list: departmentsList,
        classes_list: classesList,
        features_enabled: featuresEnabled,
      })

      setRegisteredSchool(newSchool)
      setExistingSchools(tenantSchoolStore.getSchools())
    } catch (err: any) {
      setError(err?.message || 'Failed to provision institution. Please verify your inputs.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================================================
  // POST-ONBOARDING LAUNCH PAD & CREDENTIALS CERTIFICATE
  // ============================================================================
  if (registeredSchool) {
    const hubUrl = `/s/${registeredSchool.slug}`
    const domainLinks = getTenantDomainLinks(registeredSchool)
    const credentialsSlipText = [
      `====================================================`,
      `${registeredSchool.name.toUpperCase()} — CLOUD CAMPUS CREDENTIALS`,
      `====================================================`,
      `Category: ${(registeredSchool.institution_category || 'college').toUpperCase()}`,
      `Academic System: ${registeredSchool.academic_system.toUpperCase()}`,
      `Official Subdomain: ${domainLinks.subdomainUrl}`,
      `Direct Campus Hub: ${domainLinks.pathUrl}`,
      `----------------------------------------------------`,
      `EXECUTIVE PRINCIPAL / PROVOST LOGIN:`,
      `Portal URL: ${domainLinks.portals.principal.path}`,
      `Head of Institution: ${registeredSchool.principal_name} (${registeredSchool.principal_title})`,
      `Username: ${registeredSchool.admin_username || `admin.${registeredSchool.slug}`}`,
      `Password: ${registeredSchool.admin_password || ''}`,
      `Subscription Tier: ${(registeredSchool.subscription_tier || 'silver').toUpperCase()} (KES ${(registeredSchool.subscription_monthly_rate || 2500).toLocaleString()})`,
      `====================================================`,
    ].join('\n')

    const downloadCredentialsTxt = () => {
      const element = document.createElement('a')
      const file = new Blob([credentialsSlipText], { type: 'text/plain;charset=utf-8' })
      element.href = URL.createObjectURL(file)
      element.download = `${registeredSchool.slug}-cloud-credentials.txt`
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
    }

    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2.5rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '880px', width: '100%', background: '#ffffff', borderRadius: '28px', padding: '2.5rem', boxShadow: '0 24px 48px rgba(15, 23, 42, 0.08)', border: '1px solid #e2e8f0' }}>
          {/* Top Celebration Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#059669',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                boxShadow: '0 8px 20px rgba(5, 150, 105, 0.15)',
              }}
            >
              <CheckCircleIcon size={44} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <span
                style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  padding: '0.35rem 0.9rem',
                  borderRadius: '999px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                ✓ Multi-Tenant Cloud Provisioned
              </span>
              <span
                style={{
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  padding: '0.35rem 0.9rem',
                  borderRadius: '999px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                💎 {(registeredSchool.subscription_tier || 'silver').toUpperCase()} PLAN • ACTIVATION KEY REQUIRED
              </span>
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
              {registeredSchool.name} is Live!
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.98rem', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
              Your dedicated digital campus, academic calendar, faculties, and executive login credentials have been provisioned and pre-authenticated.
            </p>
          </div>

          {/* Dedicated Subdomain & Executive Credentials Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            {/* Card 1: Subdomain & Identity */}
            <div
              style={{
                background: `linear-gradient(135deg, ${registeredSchool.primary_color} 0%, #0f172a 100%)`,
                borderRadius: '20px',
                color: '#ffffff',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: `0 12px 28px ${registeredSchool.primary_color}30`,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: registeredSchool.accent_color }}>
                    ⚡ Dedicated Campus Domain
                  </span>
                  <span style={{ fontSize: '0.68rem', background: '#22c55e', color: '#052e16', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                    ● SSL ACTIVE
                  </span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, wordBreak: 'break-all', marginBottom: '0.4rem' }}>
                  {domainLinks.subdomainUrl}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '1rem' }}>
                  Direct Route: <strong style={{ color: '#ffffff' }}>{domainLinks.pathUrl}</strong>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem' }}>
                <span style={{ background: 'rgba(255,255,255,0.12)', padding: '4px 10px', borderRadius: '8px' }}>
                  🏛️ {(registeredSchool.departments_list || []).length} Faculties
                </span>
                <span style={{ background: 'rgba(255,255,255,0.12)', padding: '4px 10px', borderRadius: '8px' }}>
                  🎓 {(registeredSchool.classes_list || []).length} Programs/Classes
                </span>
                <span style={{ background: 'rgba(255,255,255,0.12)', padding: '4px 10px', borderRadius: '8px' }}>
                  💱 {registeredSchool.currency || 'KES'} Billing
                </span>
              </div>
            </div>

            {/* Card 2: Executive Principal / Provost Credentials */}
            <div
              style={{
                background: '#fffbeb',
                border: '2px solid #fde68a',
                borderRadius: '20px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.73rem', fontWeight: 900, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🔑 Executive Admin Credentials
                  </span>
                  <span style={{ fontSize: '0.68rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                    Pre-Signed In
                  </span>
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.65rem' }}>
                  {registeredSchool.principal_name} — <span style={{ color: '#64748b' }}>{registeredSchool.principal_title}</span>
                </div>
                <div style={{ background: '#ffffff', borderRadius: '12px', padding: '0.75rem 1rem', border: '1px solid #fde68a', fontFamily: 'monospace', fontSize: '0.84rem' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Username: </span>
                    <strong style={{ color: '#0f172a' }}>{registeredSchool.admin_username}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Password: </span>
                    <strong style={{ color: '#b45309' }}>{registeredSchool.admin_password}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => copyToClipboard(credentialsSlipText, 'creds')}
                  style={{
                    flex: '1 1 120px',
                    background: '#f59e0b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.55rem 0.65rem',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  {copiedKey === 'creds' ? '✓ Copied' : '📋 Copy Slip'}
                </button>
                <button
                  type="button"
                  onClick={downloadCredentialsTxt}
                  style={{
                    flex: '1 1 120px',
                    background: '#ffffff',
                    color: '#1e3a8a',
                    border: '1px solid #bfdbfe',
                    borderRadius: '10px',
                    padding: '0.55rem 0.65rem',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                  title="Save institutional credentials as text file"
                >
                  📥 Download (.txt)
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    background: '#ffffff',
                    color: '#92400e',
                    border: '1px solid #fcd34d',
                    borderRadius: '10px',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  🖨️ Print
                </button>
              </div>
            </div>
          </div>

          {/* Direct Role Portals Matrix */}
          <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '1.35rem', border: '1px solid #e2e8f0', marginBottom: '1.75rem' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.9rem' }}>
              🌐 Direct Role-Based Campus Portals (Click to Open or Copy Link)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.75rem' }}>
              {[
                { key: 'hub', label: '🏫 Main Campus Hub', path: `/s/${registeredSchool.slug}`, sub: domainLinks.portals.hub.subdomain },
                { key: 'principal', label: '🛡️ Principal / Provost Desk', path: `/s/${registeredSchool.slug}/principal`, sub: domainLinks.portals.principal.subdomain },
                { key: 'teacher', label: '👨‍🏫 Faculty & Gradebook Desk', path: `/s/${registeredSchool.slug}/teacher`, sub: domainLinks.portals.teacher.subdomain },
                { key: 'bursar', label: '💳 Bursar & Tuition Billing', path: `/s/${registeredSchool.slug}/bursar`, sub: domainLinks.portals.bursar.subdomain },
                { key: 'student', label: '🎓 Student Learning Portal', path: `/s/${registeredSchool.slug}/student`, sub: domainLinks.portals.student.subdomain },
                { key: 'calendar', label: `📅 Academic Calendar (${registeredSchool.academic_system.toUpperCase()})`, path: `/s/${registeredSchool.slug}/calendar`, sub: domainLinks.portals.calendar.subdomain },
              ].map((item) => (
                <div
                  key={item.key}
                  style={{
                    background: '#ffffff',
                    padding: '0.85rem 1rem',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', wordBreak: 'break-all', marginTop: '2px' }}>
                      {item.sub}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <Link
                      to={item.path}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        textDecoration: 'none',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                      }}
                    >
                      Open Portal →
                    </Link>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(window.location.origin + item.path, item.key)}
                      style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        border: 'none',
                        padding: '0.35rem 0.6rem',
                        borderRadius: '8px',
                        fontSize: '0.73rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {copiedKey === item.key ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5-Point First-Day Post-Onboarding Interactive Launchpad */}
          <div style={{ background: '#f0fdf4', borderRadius: '20px', padding: '1.35rem', border: '1px solid #bbf7d0', marginBottom: '1.75rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 900, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.75rem' }}>
              🚀 Recommended First-Day Campus Setup Workflow
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.65rem' }}>
              <Link
                to={`/s/${registeredSchool.slug}/principal`}
                style={{ background: '#ffffff', padding: '0.75rem 0.9rem', borderRadius: '12px', border: '1px solid #bbf7d0', textDecoration: 'none', color: '#0f172a' }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d' }}>STEP 1 • EXECUTIVE DESK</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, marginTop: '2px' }}>Hire & Provision Faculty Logins →</div>
              </Link>
              <Link
                to={`/s/${registeredSchool.slug}/bursar`}
                style={{ background: '#ffffff', padding: '0.75rem 0.9rem', borderRadius: '12px', border: '1px solid #bbf7d0', textDecoration: 'none', color: '#0f172a' }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d' }}>STEP 2 • ADMISSIONS & BURSAR</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, marginTop: '2px' }}>Admit Students & Issue Receipts →</div>
              </Link>
              <Link
                to={`/s/${registeredSchool.slug}/teacher`}
                style={{ background: '#ffffff', padding: '0.75rem 0.9rem', borderRadius: '12px', border: '1px solid #bbf7d0', textDecoration: 'none', color: '#0f172a' }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d' }}>STEP 3 • FACULTY DESK</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, marginTop: '2px' }}>Publish Study Notes & Grades →</div>
              </Link>
            </div>
          </div>

          {/* Primary Launch CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', width: '100%', justifyContent: 'center' }}>
              <Link
                to={`/s/${registeredSchool.slug}/principal`}
                style={{
                  flex: '1 1 280px',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '1rem',
                  padding: '1.05rem 1.75rem',
                  borderRadius: '16px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.55rem',
                  boxShadow: '0 10px 24px rgba(30, 58, 138, 0.25)',
                }}
              >
                <span>🛡️</span> Enter Principal Desk (Pre-Signed In) <ArrowRightIcon size={18} />
              </Link>
              <Link
                to={hubUrl}
                style={{
                  flex: '1 1 240px',
                  background: registeredSchool.primary_color,
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.96rem',
                  padding: '1rem 1.5rem',
                  borderRadius: '16px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)',
                }}
              >
                <span>🏫</span> View Public Campus Hub
              </Link>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', width: '100%' }}>
              <button
                type="button"
                onClick={() => {
                  setRegisteredSchool(null)
                  setStep(1)
                }}
                style={{
                  background: '#f8fafc',
                  color: '#334155',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                }}
              >
                + Onboard Another Institution
              </button>
              <Link
                to="/saas-admin"
                style={{
                  background: '#ffffff',
                  color: '#1d4ed8',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '12px',
                  border: '1px solid #bfdbfe',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ← Return to SaaS Admin Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const activeCategoryObj =
    INSTITUTION_CATEGORIES.find((c) => c.id === institutionCategory) || INSTITUTION_CATEGORIES[0]

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      {/* Top Banner Navigation */}
      <header
        style={{
          borderBottom: '1px solid #e2e8f0',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '0.9rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.95rem',
                letterSpacing: '-0.03em',
              }}
            >
              GC
            </div>
            <div>
              <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Global College Cloud Provisioning
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.7rem',
                  color: '#64748b',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Multi-Tenant Schools, Colleges &amp; Universities Onboarding
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <Link
              to="/"
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#475569',
                textDecoration: 'none',
                padding: '0.5rem 0.9rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
              }}
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* ============================================================================
          5-STEP INTERACTIVE ONBOARDING WIZARD FOR SCHOOLS & COLLEGES
      ============================================================================ */}
      <main style={{ maxWidth: '1220px', margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>
          {/* Hero Title */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#eff6ff',
                color: '#1d4ed8',
                padding: '0.35rem 0.95rem',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.75rem',
              }}
            >
              <SparklesIcon size={15} /> Complete Digital Campus Onboarding
            </div>
            <h1
              style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                color: '#0f172a',
                lineHeight: 1.2,
                marginBottom: '0.6rem',
              }}
            >
              Onboard Your School, College, or University
            </h1>
            <p style={{ maxWidth: '720px', margin: '0 auto', fontSize: '0.98rem', color: '#64748b', lineHeight: 1.55 }}>
              Configure your institution category, academic calendar, faculties, modules, and executive credentials in 5 guided steps.
            </p>
          </div>

          {/* 5-Step Progress Stepper */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginBottom: '2.25rem',
            }}
          >
            {[
              { num: 1, title: 'Identity & Domain' },
              { num: 2, title: 'Calendar & Faculties' },
              { num: 3, title: 'Portals & Modules' },
              { num: 4, title: 'Branding & Admin Login' },
              { num: 5, title: 'Plan & Provision' },
            ].map((item, idx) => {
              const isActive = step === item.num
              const isDone = step > item.num
              return (
                <div key={item.num} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.num < step) setStep(item.num as 1 | 2 | 3 | 4 | 5)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      background: isActive ? '#eff6ff' : '#ffffff',
                      border: isActive ? '2px solid #1d4ed8' : '1px solid #e2e8f0',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '999px',
                      cursor: item.num < step ? 'pointer' : 'default',
                    }}
                  >
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: isDone ? '#059669' : isActive ? '#1d4ed8' : '#e2e8f0',
                        color: isDone || isActive ? '#ffffff' : '#64748b',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                      }}
                    >
                      {isDone ? '✓' : item.num}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isActive ? '#1e3a8a' : '#475569' }}>
                      {item.title}
                    </span>
                  </button>
                  {idx < 4 && <div style={{ width: '18px', height: '2px', background: step > item.num ? '#059669' : '#cbd5e1' }} />}
                </div>
              )
            })}
          </div>

          {/* Error Banner */}
          {error && (
            <div
              style={{
                maxWidth: '900px',
                margin: '0 auto 1.5rem',
                background: '#fef2f2',
                color: '#991b1b',
                padding: '0.95rem 1.25rem',
                borderRadius: '14px',
                border: '1px solid #fecaca',
                fontSize: '0.88rem',
                fontWeight: 700,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
            {/* LEFT COLUMN: WIZARD STEPS */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                padding: '2rem',
                border: '1px solid #e2e8f0',
                boxShadow: '0 12px 32px rgba(0,0,0,0.04)',
              }}
            >
              {/* ============================================================
                  STEP 1: INSTITUTION CATEGORY, IDENTITY & DEDICATED DOMAIN
              ============================================================ */}
              {step === 1 && (
                <form onSubmit={handleNextStep1} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.25rem' }}>
                      1. Institution Type, Identity &amp; Domain
                    </h3>
                    <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
                      Select your institution category so we can tailor your default academic calendar, grading system, and faculties.
                    </p>
                  </div>

                  {/* Institution Category Selector Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem' }}>
                    {INSTITUTION_CATEGORIES.map((cat) => {
                      const selected = institutionCategory === cat.id
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategoryChange(cat.id)}
                          style={{
                            textAlign: 'left',
                            padding: '0.9rem',
                            borderRadius: '14px',
                            border: selected ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
                            background: selected ? '#eff6ff' : '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                            <span style={{ fontSize: '1.35rem' }}>{cat.icon}</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, background: selected ? '#1d4ed8' : '#f1f5f9', color: selected ? '#ffffff' : '#475569', padding: '2px 7px', borderRadius: '999px' }}>
                              {cat.badge}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{cat.label}</div>
                          <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>{cat.desc}</div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Official Name */}
                  <div>
                    <label htmlFor={`${formId}-name`} style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Official {institutionCategory === 'school' ? 'School' : institutionCategory === 'university' ? 'University' : 'College / Institution'} Name *
                    </label>
                    <input
                      id={`${formId}-name`}
                      type="text"
                      required
                      placeholder={
                        institutionCategory === 'school'
                          ? 'e.g. Rift Valley Senior High School'
                          : institutionCategory === 'university'
                            ? 'e.g. East African Metropolitan University'
                            : 'e.g. Nairobi Technical & Business College'
                      }
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                    />
                  </div>

                  {/* Dedicated URL Slug + Real-Time Availability Check */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '4px' }}>
                      <label htmlFor={`${formId}-slug`} style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
                        Dedicated Campus URL Handle *
                      </label>
                      {slug.trim() && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: slugAlreadyExists ? '#d97706' : '#059669',
                            }}
                          >
                            {slugAlreadyExists
                              ? `⚠️ /s/${slug} is in use`
                              : `✓ /s/${slug} is available`}
                          </span>
                          {slugAlreadyExists && (
                            <button
                              type="button"
                              onClick={() => {
                                const newSlug = `${slug}-${new Date().getFullYear()}`
                                handleSlugChange(newSlug)
                              }}
                              style={{
                                background: '#fef3c7',
                                border: '1px solid #fcd34d',
                                color: '#92400e',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              ⚡ Use {slug}-{new Date().getFullYear()}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
                      <span style={{ padding: '0.8rem 0.75rem 0.8rem 1rem', color: '#64748b', fontSize: '0.84rem', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>
                        /s/
                      </span>
                      <input
                        id={`${formId}-slug`}
                        type="text"
                        required
                        placeholder="nairobi-tech-college"
                        value={slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        style={{ flex: 1, padding: '0.8rem 1rem', border: 'none', background: 'transparent', fontSize: '0.95rem', fontWeight: 800, outline: 'none' }}
                      />
                    </div>
                  </div>

                  {/* Accreditation / Registration Number & Official Currency */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1rem' }}>
                    <div>
                      <label htmlFor={`${formId}-reg-no`} style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                        Ministry / TVETA / CUE Registration No.
                      </label>
                      <input
                        id={`${formId}-reg-no`}
                        type="text"
                        placeholder="e.g. MOE/TVETA/REG/2026/084"
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div>
                      <label htmlFor={`${formId}-currency`} style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                        Fee &amp; Payroll Currency *
                      </label>
                      <select
                        id={`${formId}-currency`}
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem 0.85rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700, background: '#ffffff' }}
                      >
                        <option value="KES">KES — Kenyan Shilling</option>
                        <option value="USD">USD — US Dollar ($)</option>
                        <option value="UGX">UGX — Ugandan Shilling</option>
                        <option value="TZS">TZS — Tanzanian Shilling</option>
                        <option value="RWF">RWF — Rwandan Franc</option>
                        <option value="NGN">NGN — Nigerian Naira</option>
                        <option value="ZAR">ZAR — South African Rand</option>
                        <option value="GBP">GBP — British Pound (£)</option>
                        <option value="EUR">EUR — Euro (€)</option>
                      </select>
                    </div>
                  </div>

                  {/* Motto & Curriculum */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label htmlFor={`${formId}-motto`} style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                        Institution Motto / Vision
                      </label>
                      <input
                        id={`${formId}-motto`}
                        type="text"
                        placeholder="Skills, Integrity and Excellence"
                        value={motto}
                        onChange={(e) => setMotto(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div>
                      <label htmlFor={`${formId}-curriculum`} style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                        Curriculum / Accreditation Track
                      </label>
                      <input
                        id={`${formId}-curriculum`}
                        type="text"
                        value={curriculumType}
                        onChange={(e) => setCurriculumType(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  {/* Location & Custom Domain */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label htmlFor={`${formId}-country`} style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                        Country *
                      </label>
                      <input
                        id={`${formId}-country`}
                        type="text"
                        required
                        placeholder="e.g. Kenya, Uganda, Tanzania, Rwanda, UK, USA..."
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div>
                      <label htmlFor={`${formId}-city`} style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                        City / Campus Town *
                      </label>
                      <input
                        id={`${formId}-city`}
                        type="text"
                        required
                        placeholder="e.g. Nairobi, Mombasa, Kampala, Kigali, London..."
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  {/* Quick-select region chips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Quick Fill:</span>
                    {[
                      { city: 'Nairobi', country: 'Kenya', currency: 'KES' },
                      { city: 'Mombasa', country: 'Kenya', currency: 'KES' },
                      { city: 'Kampala', country: 'Uganda', currency: 'UGX' },
                      { city: 'Dar es Salaam', country: 'Tanzania', currency: 'TZS' },
                      { city: 'Kigali', country: 'Rwanda', currency: 'RWF' },
                    ].map((loc) => (
                      <button
                        key={loc.city}
                        type="button"
                        onClick={() => {
                          setCity(loc.city)
                          setCountry(loc.country)
                          setCurrency(loc.currency)
                        }}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '0.72rem',
                          color: '#334155',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        {loc.city}, {loc.country}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label htmlFor={`${formId}-address`} style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                        Physical Address / P.O. Box
                      </label>
                      <input
                        id={`${formId}-address`}
                        type="text"
                        placeholder="e.g. Thika Superhighway, Exit 8, Nairobi"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div>
                      <label htmlFor={`${formId}-custom-domain`} style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                        Custom Domain (Optional BYOD)
                      </label>
                      <input
                        id={`${formId}-custom-domain`}
                        type="text"
                        placeholder={`portal.${slug || 'yourcollege'}.ac.ke`}
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    style={{
                      background: '#1d4ed8',
                      color: '#ffffff',
                      fontWeight: 800,
                      padding: '0.95rem',
                      borderRadius: '14px',
                      border: 'none',
                      fontSize: '0.98rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    Step 2: Academic Calendar &amp; Initial Faculties <ArrowRightIcon size={18} />
                  </button>
                </form>
              )}

              {/* ============================================================
                  STEP 2: ACADEMIC CALENDAR, GRADING SCALE & INITIAL FACULTIES
              ============================================================ */}
              {step === 2 && (
                <form onSubmit={handleNextStep2} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.25rem' }}>
                      2. Academic Calendar, Grading &amp; Initial Structure
                    </h3>
                    <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
                      Configure your academic year cycle, grading scale, and seed your initial faculties/departments and classes.
                    </p>
                  </div>

                  {/* 4 Academic Calendar Systems */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#334155', marginBottom: '0.5rem' }}>
                      Academic Year Cycle *
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem' }}>
                      {[
                        { id: 'semester', title: 'Semester System (2 Semesters)', sub: 'Ideal for Colleges, TVET & Universities (Fall / Spring cohorts)' },
                        { id: 'term', title: 'Term System (3 Terms)', sub: 'Ideal for Primary, Junior & Senior High Schools (Term 1, 2, 3)' },
                        { id: 'trimester', title: 'Trimester System (3 Cycles)', sub: 'Ideal for Accelerated Universities & Tech Academies (Jan/May/Sep)' },
                        { id: 'quarter', title: 'Quarter System (4 Quarters)', sub: 'Ideal for Modular Vocational & Executive Certification Intakes' },
                      ].map((cal) => (
                        <button
                          key={cal.id}
                          type="button"
                          onClick={() => setAcademicSystem(cal.id as AcademicCalendarSystem)}
                          style={{
                            textAlign: 'left',
                            padding: '0.85rem',
                            borderRadius: '12px',
                            border: academicSystem === cal.id ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
                            background: academicSystem === cal.id ? '#eff6ff' : '#ffffff',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>{cal.title}</div>
                          <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>{cal.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grading Scale Selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#334155', marginBottom: '0.5rem' }}>
                      Transcript &amp; Examination Grading Scale *
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
                      {[
                        { id: 'letter_gpa', title: 'GPA & Letter Grade (A–F / 4.0)', desc: 'University & College standard cumulative GPA & Distinction/Credit.' },
                        { id: 'tvet_competency', title: 'TVET / CBET Competency', desc: 'Mastery (80%+), Proficient (65%+), Competent (50%+), NYC.' },
                        { id: 'standard_percentage', title: 'Standard Marks & Mean Grade', desc: 'CAT 1 (20%) + CAT 2 (20%) + Exam (60%) = 100% Report Card.' },
                      ].map((grd) => (
                        <button
                          key={grd.id}
                          type="button"
                          onClick={() => setGradingScale(grd.id as InstitutionGradingScale)}
                          style={{
                            textAlign: 'left',
                            padding: '0.8rem',
                            borderRadius: '12px',
                            border: gradingScale === grd.id ? '2px solid #047857' : '1px solid #cbd5e1',
                            background: gradingScale === grd.id ? '#ecfdf5' : '#ffffff',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>{grd.title}</div>
                          <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '3px', lineHeight: 1.35 }}>{grd.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interactive Faculties / Departments Chip Builder */}
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                        🏛️ Initial Faculties / Academic Departments ({departmentsList.length})
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setDepartmentsList([...activeCategoryObj.suggestedDepts])}
                          style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: '0.74rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          ⚡ Load Template
                        </button>
                        {departmentsList.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setDepartmentsList([])}
                            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                    </div>
                    {departmentsList.length === 0 ? (
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', padding: '0.4rem 0' }}>
                        No initial faculties added. Add custom names below or tap suggestions.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.65rem' }}>
                        {departmentsList.map((dept) => (
                          <span
                            key={dept}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              padding: '0.3rem 0.65rem',
                              borderRadius: '999px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              color: '#1e293b',
                            }}
                          >
                            {dept}
                            <button
                              type="button"
                              onClick={() => setDepartmentsList(departmentsList.filter((d) => d !== dept))}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 900, padding: 0 }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Add custom faculty or department (e.g. School of Nursing)..."
                        value={newDeptInput}
                        onChange={(e) => setNewDeptInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newDeptInput.trim()) {
                            e.preventDefault()
                            if (!departmentsList.includes(newDeptInput.trim())) {
                              setDepartmentsList([...departmentsList, newDeptInput.trim()])
                            }
                            setNewDeptInput('')
                          }
                        }}
                        style={{ flex: 1, padding: '0.55rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newDeptInput.trim() && !departmentsList.includes(newDeptInput.trim())) {
                            setDepartmentsList([...departmentsList, newDeptInput.trim()])
                            setNewDeptInput('')
                          }
                        }}
                        style={{ background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '0.55rem 0.95rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        + Add
                      </button>
                    </div>
                    {/* Suggested clickable chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Suggestions:</span>
                      {activeCategoryObj.suggestedDepts
                        .filter((d) => !departmentsList.includes(d))
                        .map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setDepartmentsList([...departmentsList, sug])}
                            style={{
                              background: '#f1f5f9',
                              border: '1px dashed #cbd5e1',
                              borderRadius: '999px',
                              padding: '2px 8px',
                              fontSize: '0.7rem',
                              color: '#334155',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            + {sug}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Interactive Classes / Programs / Cohorts Chip Builder */}
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                        🎓 Initial Classes, Programs or Intakes ({classesList.length})
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setClassesList([...activeCategoryObj.suggestedClasses])}
                          style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: '0.74rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          ⚡ Load Template
                        </button>
                        {classesList.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setClassesList([])}
                            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                    </div>
                    {classesList.length === 0 ? (
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', padding: '0.4rem 0' }}>
                        No initial cohorts or classes added. Add custom names below or tap suggestions.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.65rem' }}>
                        {classesList.map((cls) => (
                          <span
                            key={cls}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              padding: '0.3rem 0.65rem',
                              borderRadius: '999px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              color: '#1e293b',
                            }}
                          >
                            {cls}
                            <button
                              type="button"
                              onClick={() => setClassesList(classesList.filter((c) => c !== cls))}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 900, padding: 0 }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Add class, diploma cohort, or grade (e.g. Diploma in Civil Eng Year 1)..."
                        value={newClassInput}
                        onChange={(e) => setNewClassInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newClassInput.trim()) {
                            e.preventDefault()
                            if (!classesList.includes(newClassInput.trim())) {
                              setClassesList([...classesList, newClassInput.trim()])
                            }
                            setNewClassInput('')
                          }
                        }}
                        style={{ flex: 1, padding: '0.55rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newClassInput.trim() && !classesList.includes(newClassInput.trim())) {
                            setClassesList([...classesList, newClassInput.trim()])
                            setNewClassInput('')
                          }
                        }}
                        style={{ background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '0.55rem 0.95rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        + Add
                      </button>
                    </div>
                    {/* Suggested clickable chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Suggestions:</span>
                      {activeCategoryObj.suggestedClasses
                        .filter((c) => !classesList.includes(c))
                        .map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setClassesList([...classesList, sug])}
                            style={{
                              background: '#f1f5f9',
                              border: '1px dashed #cbd5e1',
                              borderRadius: '999px',
                              padding: '2px 8px',
                              fontSize: '0.7rem',
                              color: '#334155',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            + {sug}
                          </button>
                        ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.85rem' }}>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700, padding: '0.85rem 1.25rem', borderRadius: '14px', border: 'none', cursor: 'pointer' }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      style={{
                        flex: 1,
                        background: '#1d4ed8',
                        color: '#ffffff',
                        fontWeight: 800,
                        padding: '0.85rem',
                        borderRadius: '14px',
                        border: 'none',
                        fontSize: '0.98rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      Step 3: Campus Modules &amp; Portals <ArrowRightIcon size={18} />
                    </button>
                  </div>
                </form>
              )}

              {/* ============================================================
                  STEP 3: CAMPUS PORTALS & DIGITAL MODULES CONFIGURATION
              ============================================================ */}
              {step === 3 && (
                <form onSubmit={handleNextStep3} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.25rem' }}>
                      3. Campus Portals &amp; Digital Modules
                    </h3>
                    <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
                      Select the administrative desks and digital learning modules to activate on your campus cloud.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                    {MODULE_OPTIONS.map((mod) => {
                      const active = featuresEnabled[mod.key]
                      return (
                        <div
                          key={mod.key}
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            setFeaturesEnabled((prev) => ({
                              ...prev,
                              [mod.key]: !prev[mod.key],
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setFeaturesEnabled((prev) => ({
                                ...prev,
                                [mod.key]: !prev[mod.key],
                              }))
                            }
                          }}
                          style={{
                            padding: '0.95rem',
                            borderRadius: '14px',
                            border: active ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
                            background: active ? '#eff6ff' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                              <span style={{ fontSize: '1.3rem' }}>{mod.icon}</span>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  background: active ? '#1d4ed8' : '#e2e8f0',
                                  color: active ? '#ffffff' : '#64748b',
                                }}
                              >
                                {active ? '✓ ENABLED' : 'DISABLED'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', marginBottom: '3px' }}>
                              {mod.title}
                            </div>
                            <div style={{ fontSize: '0.73rem', color: '#475569', lineHeight: 1.4 }}>{mod.desc}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700, padding: '0.85rem 1.25rem', borderRadius: '14px', border: 'none', cursor: 'pointer' }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      style={{
                        flex: 1,
                        background: '#1d4ed8',
                        color: '#ffffff',
                        fontWeight: 800,
                        padding: '0.85rem',
                        borderRadius: '14px',
                        border: 'none',
                        fontSize: '0.98rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      Step 4: Branding &amp; Executive Credentials <ArrowRightIcon size={18} />
                    </button>
                  </div>
                </form>
              )}

              {/* ============================================================
                  STEP 4: BRANDING, LEADERSHIP & EXECUTIVE CREDENTIALS
              ============================================================ */}
              {step === 4 && (
                <form onSubmit={handleNextStep4} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.25rem' }}>
                      4. Institutional Colors, Leadership &amp; Admin Login
                    </h3>
                    <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
                      Customize your brand colors and set up the Principal / Provost executive login credentials.
                    </p>
                  </div>

                  {/* Color Palettes */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.45rem' }}>
                      Brand Color Palette
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      {PRESET_COLORS.map((palette) => (
                        <button
                          key={palette.name}
                          type="button"
                          onClick={() => {
                            setPrimaryColor(palette.primary)
                            setAccentColor(palette.accent)
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            padding: '0.5rem 0.65rem',
                            borderRadius: '10px',
                            border: primaryColor === palette.primary ? '2px solid #0f172a' : '1px solid #e2e8f0',
                            background: '#ffffff',
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: palette.primary }} />
                          <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: palette.accent }} />
                          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {palette.name}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          style={{ width: '38px', height: '38px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                        />
                        <input
                          type="text"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          style={{ flex: 1, padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', fontWeight: 700 }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          style={{ width: '38px', height: '38px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                        />
                        <input
                          type="text"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          style={{ flex: 1, padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', fontWeight: 700 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* School Logo Upload */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.45rem' }}>
                      School / College Logo
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      {/* Preview */}
                      <div
                        style={{
                          width: '80px', height: '80px', borderRadius: '12px',
                          border: '2px dashed #cbd5e1', background: '#f8fafc',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden', flexShrink: 0,
                        }}
                      >
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '2rem' }}>{activeCategoryObj.icon || '🏫'}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label
                          style={{
                            display: 'inline-block', background: primaryColor || '#1e3a8a', color: '#fff',
                            borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.82rem',
                            fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          📁 Choose Logo File
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              if (file.size > 2 * 1024 * 1024) {
                                setError('Institutional logo image must be under 2 MB.')
                                return
                              }
                              const reader = new FileReader()
                              reader.onload = (ev) => {
                                const result = ev.target?.result as string
                                if (result) setLogoUrl(result)
                              }
                              reader.readAsDataURL(file)
                            }}
                          />
                        </label>
                        {logoUrl && (
                          <button
                            type="button"
                            onClick={() => setLogoUrl('')}
                            style={{ background: 'none', border: '1px solid #f87171', color: '#ef4444', borderRadius: '8px', padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            ✕ Remove
                          </button>
                        )}
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>PNG, JPG, SVG or WebP · Max 2 MB</span>
                      </div>
                    </div>
                  </div>

                  {/* Head of Institution Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1rem' }}>
                    <div>
                      <label htmlFor={`${formId}-principal-name`} style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                        Head of Institution Full Name *
                      </label>
                      <input
                        id={`${formId}-principal-name`}
                        type="text"
                        required
                        placeholder="e.g. Prof. Margaret Wanjiku"
                        value={principalName}
                        onChange={(e) => setPrincipalName(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.92rem' }}
                      />
                    </div>
                    <div>
                      <label htmlFor={`${formId}-principal-title`} style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                        Official Title *
                      </label>
                      <input
                        id={`${formId}-principal-title`}
                        type="text"
                        value={principalTitle}
                        onChange={(e) => setPrincipalTitle(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.92rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label htmlFor={`${formId}-contact-email`} style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                        Official Institutional Email *
                      </label>
                      <input
                        id={`${formId}-contact-email`}
                        type="email"
                        required
                        placeholder={`registrar@${slug || 'college'}.ac.ke`}
                        value={contactEmail}
                        onChange={(e) => {
                          setContactEmail(e.target.value)
                          if (!principalEmail) setPrincipalEmail(e.target.value)
                        }}
                        style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.92rem' }}
                      />
                    </div>
                    <div>
                      <label htmlFor={`${formId}-contact-phone`} style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                        Official Phone / WhatsApp *
                      </label>
                      <input
                        id={`${formId}-contact-phone`}
                        type="tel"
                        required
                        placeholder="+254 712 345 678"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.92rem' }}
                      />
                    </div>
                  </div>

                  {/* Executive Admin Login Provisioning Box */}
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '16px', padding: '1.1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#b45309', textTransform: 'uppercase' }}>
                        🔑 Executive Principal / Provost Portal Credentials
                      </span>
                      <button
                        type="button"
                        onClick={generateStrongPassword}
                        style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: '8px', padding: '3px 9px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        ⚡ Generate Secure Password
                      </button>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: '#78350f', margin: '0 0 0.75rem' }}>
                      These credentials grant immediate executive access to your Principal/Provost Desk and HR Payroll system.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#78350f', marginBottom: '3px' }}>
                          Admin Username / Login ID *
                        </label>
                        <input
                          type="text"
                          required
                          value={adminUsername}
                          onChange={(e) => {
                            setIsUsernameManual(true)
                            setAdminUsername(e.target.value)
                          }}
                          style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid #fcd34d', fontSize: '0.86rem', fontWeight: 700, background: '#ffffff' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#78350f', marginBottom: '3px' }}>
                          Admin Password *
                        </label>
                        <input
                          type="text"
                          required
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid #fcd34d', fontSize: '0.86rem', fontWeight: 700, background: '#ffffff' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700, padding: '0.85rem 1.25rem', borderRadius: '14px', border: 'none', cursor: 'pointer' }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      style={{
                        flex: 1,
                        background: '#1d4ed8',
                        color: '#ffffff',
                        fontWeight: 800,
                        padding: '0.85rem',
                        borderRadius: '14px',
                        border: 'none',
                        fontSize: '0.98rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      Step 5: Review &amp; Select Cloud Plan <ArrowRightIcon size={18} />
                    </button>
                  </div>
                </form>
              )}

              {/* ============================================================
                  STEP 5: CLOUD SUBSCRIPTION PLAN & PROVISIONING LAUNCH
              ============================================================ */}
              {step === 5 && (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.25rem' }}>
                        5. Select Institutional Cloud Plan &amp; Deploy
                      </h3>
                      <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
                        Platform Rate: <strong>KES {currentTierRate.toLocaleString()} / campus / month</strong> ({SUBSCRIPTION_TIER_DETAILS[subscriptionTier].name}). Activated via official Product Key.
                      </p>
                    </div>

                    <div style={{ display: 'inline-flex', background: '#e2e8f0', padding: '3px', borderRadius: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('monthly')}
                        style={{
                          background: billingCycle === 'monthly' ? '#ffffff' : 'transparent',
                          color: billingCycle === 'monthly' ? '#0f172a' : '#64748b',
                          border: 'none',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('annually')}
                        style={{
                          background: billingCycle === 'annually' ? '#ffffff' : 'transparent',
                          color: billingCycle === 'annually' ? '#0f172a' : '#64748b',
                          border: 'none',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        Annually (Save 17%)
                      </button>
                    </div>
                  </div>

                  {/* Institutional Campuses & Multi-Branch Setup */}
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                          🏢 Campuses &amp; Satellite Branches
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          Each registered campus is billed independently at <strong>KES {currentTierRate.toLocaleString()} / month</strong>.
                        </div>
                      </div>
                      <span style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, fontSize: '0.8rem', padding: '4px 10px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                        {campusesList.length} {campusesList.length === 1 ? 'Campus' : 'Campuses'} Configured
                      </span>
                    </div>

                    {/* Campuses Tag List */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                      {campusesList.map((cName, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            background: idx === 0 ? '#1e3a8a' : '#f1f5f9',
                            color: idx === 0 ? '#ffffff' : '#1e293b',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '10px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            border: idx === 0 ? 'none' : '1px solid #cbd5e1',
                          }}
                        >
                          <span>{cName}</span>
                          {idx === 0 ? (
                            <span style={{ fontSize: '0.65rem', background: '#3b82f6', color: '#ffffff', padding: '1px 6px', borderRadius: '4px' }}>MAIN</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = campusesList.filter((_, i) => i !== idx)
                                setCampusesList(updated)
                                setCampusCount(updated.length)
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontWeight: 900,
                                fontSize: '0.9rem',
                                padding: 0,
                                marginLeft: '2px',
                              }}
                              title="Remove campus"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add Campus Branch Input */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="e.g. Town Campus, CBD Branch, Westlands Centre..."
                        value={newCampusInput}
                        onChange={(e) => setNewCampusInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const trimmed = newCampusInput.trim()
                            if (trimmed) {
                              if (campusesList.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
                                setError(`A campus named "${trimmed}" has already been added.`)
                                return
                              }
                              setError(null)
                              const updated = [...campusesList, trimmed]
                              setCampusesList(updated)
                              setCampusCount(updated.length)
                              setNewCampusInput('')
                            }
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '0.6rem 0.85rem',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = newCampusInput.trim()
                          if (trimmed) {
                            if (campusesList.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
                              setError(`A campus named "${trimmed}" has already been added.`)
                              return
                            }
                            setError(null)
                            const updated = [...campusesList, trimmed]
                            setCampusesList(updated)
                            setCampusCount(updated.length)
                            setNewCampusInput('')
                          }
                        }}
                        style={{
                          background: '#0284c7',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          padding: '0.6rem 1rem',
                          borderRadius: '10px',
                          border: 'none',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        + Add Campus
                      </button>
                    </div>
                  </div>

                  {/* Subscription Tier Selection Grid */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 800, color: '#334155', marginBottom: '0.5rem' }}>
                      Institutional Subscription Tier *
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                      {(['silver', 'gold', 'platinum'] as SubscriptionTierType[]).map((tierKey) => {
                        const tierInfo = SUBSCRIPTION_TIER_DETAILS[tierKey]
                        const isSelected = subscriptionTier === tierKey
                        return (
                          <div
                            key={tierKey}
                            onClick={() => setSubscriptionTier(tierKey)}
                            style={{
                              border: isSelected ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
                              background: isSelected ? '#eff6ff' : '#ffffff',
                              borderRadius: '14px',
                              padding: '1rem',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              boxShadow: isSelected ? '0 4px 12px rgba(29, 78, 216, 0.12)' : 'none',
                              position: 'relative',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                <span style={{ fontSize: '0.74rem', fontWeight: 900, color: isSelected ? '#1d4ed8' : '#475569' }}>
                                  {tierInfo.badge}
                                </span>
                                {tierKey === 'gold' && (
                                  <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                    RECOMMENDED
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.2rem' }}>
                                {currency} {tierInfo.rateKes.toLocaleString()} <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>/ mo</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.6rem' }}>
                                {tierInfo.tagline}
                              </div>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#334155', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {tierInfo.features.slice(0, 2).map((feat, fi) => (
                                <div key={fi}>✓ {feat}</div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Pricing Calculation Summary Card */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                      border: '2px solid #3b82f6',
                      borderRadius: '18px',
                      padding: '1.35rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dbeafe', color: '#1e40af', padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.4rem' }}>
                          <span>🇰🇪 OFFICIAL INSTITUTIONAL PRICING</span>
                        </div>
                        <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                          {currency} {currentTierRate.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>/ month per campus ({SUBSCRIPTION_TIER_DETAILS[subscriptionTier].name})</span>
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                          Multi-campus institutions pay separately per branch: <strong>{campusesList.length} {campusesList.length === 1 ? 'campus' : 'campuses'} &times; {currency} {currentTierRate.toLocaleString()}/mo</strong>.
                        </p>
                      </div>

                      <div style={{ background: '#ffffff', borderRadius: '14px', padding: '0.85rem 1.25rem', textAlign: 'right', border: '1px solid #bfdbfe', boxShadow: '0 4px 12px rgba(30, 58, 138, 0.06)' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                          Total {billingCycle === 'monthly' ? 'Monthly' : 'Annual'} Subscription
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#1e3a8a' }}>
                          {currency} {computedSubscriptionRate.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
                          {billingCycle === 'monthly' ? `${currency} ${currentTierRate.toLocaleString()} × ${campusesList.length} campus${campusesList.length > 1 ? 'es' : ''}` : `Save 2 Months Free (10 mo rate)`}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem', fontSize: '0.78rem', color: '#334155', borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem' }}>
                      <div>✅ Full Access to all 4 Role Portals (Admin, Teacher, Student, Bursar)</div>
                      <div>✅ {subscriptionTier === 'gold' || subscriptionTier === 'platinum' ? 'Dedicated Public Programs & Courses Showcase Page' : 'Core SIS & Academic Gradebooks'}</div>
                      <div>✅ M-Pesa automated fee reconciliation &amp; digital receipts</div>
                      <div>✅ Official printable report cards &amp; QR transcripts with digital seal</div>
                      <div>✅ Product activation key unlocking via Master SaaS Billing Portal</div>
                      <div>✅ Independent student directories &amp; gradebooks per campus</div>
                    </div>

                    <div style={{ background: '#ffffff', borderRadius: '12px', padding: '0.75rem 1rem', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>📲</span>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>Direct M-Pesa Subscription Payment Line</div>
                          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Send {currency} {currentTierRate.toLocaleString()} per campus to receive instant Product Activation Key</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.1rem', color: '#047857', background: '#dcfce7', padding: '3px 12px', borderRadius: '8px', letterSpacing: '0.04em' }}>
                          0740027346
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('0740027346', 'mpesa_line')}
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            padding: '4px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: '#334155',
                            cursor: 'pointer',
                          }}
                        >
                          {copiedKey === 'mpesa_line' ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>


                  {/* Pre-Launch Configuration Summary */}
                  <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1rem 1.15rem', border: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.45rem' }}>
                      📋 Ready-to-Deploy Institutional Summary
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.4rem', color: '#475569' }}>
                      <div>• <strong>Institution:</strong> {name || '—'}</div>
                      <div>• <strong>Category:</strong> {activeCategoryObj.label}</div>
                      <div>• <strong>Tier:</strong> {SUBSCRIPTION_TIER_DETAILS[subscriptionTier].name}</div>
                      <div>• <strong>Calendar:</strong> {academicSystem.toUpperCase()} ({gradingScale.replace('_', ' ')})</div>
                      <div>• <strong>Faculties &amp; Cohorts:</strong> {departmentsList.length} Depts / {classesList.length} Classes</div>
                      <div>• <strong>Executive Login:</strong> <code>{adminUsername}</code></div>
                      <div>• <strong>Currency:</strong> {currency}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.85rem' }}>
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700, padding: '0.85rem 1.25rem', borderRadius: '14px', border: 'none', cursor: 'pointer' }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{
                        flex: 1,
                        background: primaryColor || '#1d4ed8',
                        color: '#ffffff',
                        fontWeight: 900,
                        padding: '0.95rem',
                        borderRadius: '14px',
                        border: 'none',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.16)',
                      }}
                    >
                      {isSubmitting ? 'Provisioning Digital Campus...' : '🚀 Complete Onboarding & Launch Campus Portals'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* RIGHT COLUMN: REAL-TIME INTERACTIVE PREVIEW */}
            <div style={{ position: 'sticky', top: '90px', alignSelf: 'start' }}>
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '24px',
                  border: '1px solid #e2e8f0',
                  padding: '1.65rem',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.73rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                    Live Campus Preview
                  </span>
                  <span
                    style={{
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                    }}
                  >
                    {activeCategoryObj.icon} {institutionCategory.toUpperCase()} • {academicSystem.toUpperCase()}
                  </span>
                </div>

                {/* Branded Campus Card */}
                <div
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                    borderRadius: '18px',
                    padding: '1.4rem',
                    color: '#ffffff',
                    marginBottom: '1.15rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.15)',
                        border: `1.5px solid ${accentColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.3rem',
                        overflow: 'hidden',
                      }}
                    >
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        activeCategoryObj.icon
                      )}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, lineHeight: 1.2 }}>
                        {name || 'Your Institution Name'}
                      </h4>
                      <span style={{ fontSize: '0.74rem', color: accentColor, fontWeight: 700 }}>
                        {curriculumType || activeCategoryObj.defaultCurriculum}
                      </span>
                    </div>
                  </div>

                  {motto && (
                    <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.9, fontStyle: 'italic' }}>
                      "{motto}"
                    </p>
                  )}

                  <div style={{ marginTop: '0.9rem', paddingTop: '0.7rem', borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', opacity: 0.9 }}>
                    <span>📍 {city || 'City'}, {country || 'Country'}</span>
                    <span>💱 {currency}</span>
                  </div>
                </div>

                {/* Seeded Structure Summary */}
                <div style={{ background: '#f8fafc', padding: '0.95rem', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
                    Provisioned Campus Architecture
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.78rem' }}>
                    <div style={{ background: '#ffffff', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <strong>{departmentsList.length}</strong> Faculties / Depts
                    </div>
                    <div style={{ background: '#ffffff', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <strong>{classesList.length}</strong> Classes / Cohorts
                    </div>
                  </div>
                </div>

                {/* Dedicated Role Portals List */}
                <div style={{ background: '#f8fafc', padding: '0.95rem', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                  <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Dedicated Role Portal Endpoints:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                    <div style={{ color: '#1d4ed8' }}>🔗 /s/{slug || 'institution-slug'}</div>
                    <div style={{ color: '#dc2626' }}>🛡️ /s/{slug || 'institution-slug'}/principal</div>
                    <div style={{ color: '#d97706' }}>👨‍🏫 /s/{slug || 'institution-slug'}/teacher</div>
                    <div style={{ color: '#7c3aed' }}>💳 /s/{slug || 'institution-slug'}/bursar</div>
                    <div style={{ color: '#047857' }}>🎓 /s/{slug || 'institution-slug'}/student</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.7rem 0.85rem', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                  <CalendarIcon size={18} color="#15803d" />
                  <div style={{ fontSize: '0.76rem', color: '#166534' }}>
                    <strong>Auto-Configured:</strong> {academicSystem.toUpperCase()} calendar &amp; pre-authenticated Principal session.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
    </div>
  )
}
