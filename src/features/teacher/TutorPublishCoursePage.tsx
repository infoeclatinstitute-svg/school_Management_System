import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { INSTITUTION_CONFIG, getWhatsAppInquiryUrl } from '@/config/institution'
import {
  SparklesIcon,
  VideoIcon,
  LaptopIcon,
  CheckCircleIcon,
  CheckIcon,
  MessageCircleIcon,
  RocketIcon,
  ArrowRightIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  FileTextIcon,
  BuildingIcon,
  GraduationCapIcon,
  ClockIcon,
  UserIcon,
} from '@/components/icons/AppIcons'
import { schoolStore } from '@/lib/schoolData'
import { cloudServicesStore } from '@/lib/cloudServicesStore'

export interface DepartmentOption {
  name: string
  sectorId: string
  suggestedPrograms: string[]
}

export const ACADEMIC_SECTORS = [
  { id: 'all', name: 'All Faculties & Programs', icon: '🏛️' },
  { id: 'health', name: 'Health & Medical Sciences', icon: '🩺' },
  { id: 'aviation', name: 'Aviation & Drone Tech', icon: '✈️' },
  { id: 'tech', name: 'Technology & Computing', icon: '💻' },
  { id: 'business', name: 'Business & Finance', icon: '💼' },
  { id: 'culinary', name: 'Culinary Arts & Hospitality', icon: '🍳' },
  { id: 'law', name: 'Law & Governance', icon: '⚖️' },
  { id: 'engineering', name: 'Engineering & Technical Trades', icon: '🛠️' },
  { id: 'secondary', name: 'Secondary Curricula (IB / AP)', icon: '🎓' },
  { id: 'arts', name: 'Media, Film & Graphic Design', icon: '🎨' },
  { id: 'languages', name: 'Languages & World Linguistics', icon: '🗣️' },
  { id: 'agriculture', name: 'Agriculture & Environment', icon: '🌾' },
  { id: 'music', name: 'Music & Audio Engineering', icon: '🎼' },
]

export const SECTOR_DEPARTMENTS: DepartmentOption[] = [
  // Health & Medical Sciences
  {
    name: 'School of Nursing & Midwifery',
    sectorId: 'health',
    suggestedPrograms: [
      'Diploma in Registered Nursing (KRCHN)',
      'Critical Care & Neonatal Nursing',
      'Midwifery & Maternal Health',
      'Patient Care Nursing Assistant',
    ],
  },
  {
    name: 'Department of Clinical Medicine & Surgery',
    sectorId: 'health',
    suggestedPrograms: [
      'Clinical Medicine & Community Health',
      'Emergency Medical Technician (EMT)',
      'Basic Surgical Skills Masterclass',
      'Health Services Administration',
    ],
  },
  {
    name: 'Pharmacy & Pharmacology',
    sectorId: 'health',
    suggestedPrograms: [
      'Pharmacy Assistant Certificate',
      'Clinical Pharmacology',
      'Pharmaceutical Inventory & Dispensing',
    ],
  },
  {
    name: 'Public Health, Biostatistics & Epidemiology',
    sectorId: 'health',
    suggestedPrograms: [
      'Public Health Surveillance',
      'Biostatistics with R in Health Sciences',
      'Infectious Disease Epidemiology & Control',
    ],
  },

  // Aviation, Aerospace & Drone Operations
  {
    name: 'Flight Academy & Pilot Ground School',
    sectorId: 'aviation',
    suggestedPrograms: [
      'Private Pilot License (PPL) Theory',
      'Commercial Pilot License (CPL) Navigation',
      'Instrument Rating (IR) & Aviation Meteorology',
      'Multi-Engine Flight Dynamics',
    ],
  },
  {
    name: 'Unmanned Aircraft Systems (Drone Academy)',
    sectorId: 'aviation',
    suggestedPrograms: [
      'Commercial Drone Pilot (KCAA / FAA Part 107)',
      'Drone Aerial Mapping & Surveying (GIS)',
      'Agricultural Drone Spraying & Crop Scouting',
      'Drone Thermal Inspection & Search & Rescue',
    ],
  },
  {
    name: 'Aviation Safety & Air Traffic Management',
    sectorId: 'aviation',
    suggestedPrograms: [
      'Aviation Safety Management Systems (SMS)',
      'Air Traffic Services (ATS) Fundamentals',
      'Airport Ground Operations & Ramp Safety',
    ],
  },

  // Technology, Computing & AI
  {
    name: 'Tech & Software Engineering',
    sectorId: 'tech',
    suggestedPrograms: [
      'Masterclass in React 19 & Next.js Full-Stack',
      'Python Backend & REST API Engineering',
      'Mobile App Development (Flutter & React Native)',
      'Go & Microservices Architecture',
    ],
  },
  {
    name: 'Data Science, Machine Learning & AI',
    sectorId: 'tech',
    suggestedPrograms: [
      'Advanced Data Science with Python & Pandas',
      'Machine Learning & Neural Networks',
      'Generative AI & LLM Engineering',
      'Applied Econometrics with Stata & RStudio',
    ],
  },
  {
    name: 'Cybersecurity & Cloud Defense',
    sectorId: 'tech',
    suggestedPrograms: [
      'Certified Ethical Hacking (CEH Track)',
      'SOC Analyst Level 1 Operations',
      'AWS & Cloud Security Architecture',
      'Penetration Testing & Network Defense',
    ],
  },
  {
    name: 'UI/UX Product Design & Wireframing',
    sectorId: 'tech',
    suggestedPrograms: [
      'Figma Design Systems & Interactive Prototypes',
      'Mobile App UI/UX Design',
      'User Research & Human-Centered Design',
    ],
  },

  // Business, Finance & Management
  {
    name: 'Business Tech, Accounting & FP&A',
    sectorId: 'business',
    suggestedPrograms: [
      'Financial Modeling & Valuation Analyst (FMVA®)',
      'Corporate FP&A & Management Accounting (CMA® Track)',
      'Computerized Accounting with QuickBooks Pro & iTax',
      'Corporate Financial Auditing & Taxation',
    ],
  },
  {
    name: 'Project Management & Agile Operations',
    sectorId: 'business',
    suggestedPrograms: [
      'Executive Project Management Professional (PMP®)',
      'Agile Scrum Master Certification',
      'Lean Six Sigma Green Belt (LSSGB®)',
      'Enterprise Business Analysis (CBAP®)',
    ],
  },
  {
    name: 'Forex & Quantitative Bots',
    sectorId: 'business',
    suggestedPrograms: [
      'Professional Forex Trading & Price Action (FX Mastery)',
      'Algorithmic Trading & MT5 Python Bots',
      'Institutional Order Blocks & Currency Risk Management',
    ],
  },
  {
    name: 'Supply Chain, Logistics & HR Leadership',
    sectorId: 'business',
    suggestedPrograms: [
      'Global Supply Chain Strategy (CSCP®)',
      'Strategic HR Leadership & People Analytics (SHRM-CP®)',
      'Procurement, Logistics & Contract Negotiations',
    ],
  },

  // Culinary Arts & Hospitality
  {
    name: 'Culinary Arts & Chef Academy',
    sectorId: 'culinary',
    suggestedPrograms: [
      'Diploma in Professional Culinary Arts',
      'Classical French & Continental Cooking',
      'Commercial Food Preparation & Knife Skills',
      'Modern Gourmet Plating & Menu Design',
    ],
  },
  {
    name: 'Pastry, Bakery & Cake Decorating',
    sectorId: 'culinary',
    suggestedPrograms: [
      'Artisan Bread & French Pastry Baking',
      'Wedding Cake Design & Sugarcraft',
      'Chocolate Confectionery & Dessert Plating',
    ],
  },
  {
    name: 'Hospitality & Hotel Operations',
    sectorId: 'culinary',
    suggestedPrograms: [
      'Hotel Front Office & Room Division Management',
      'HACCP Food Safety & Kitchen Hygiene Standards',
      'Food & Beverage Service & Mixology',
    ],
  },

  // Law & Governance
  {
    name: 'Commercial & Corporate Law',
    sectorId: 'law',
    suggestedPrograms: [
      'Corporate Contract Drafting & Negotiation',
      'Fintech & Cryptocurrency Regulatory Compliance',
      'Intellectual Property Law & Trademarks',
      'Company Law & Corporate Governance',
    ],
  },
  {
    name: 'Criminology & Forensic Investigation',
    sectorId: 'law',
    suggestedPrograms: [
      'Forensic Investigation & Evidence Analysis',
      'Criminal Law & Police Criminology',
      'Cybercrime Law & Digital Forensics',
    ],
  },
  {
    name: 'Paralegal Studies & Dispute Resolution',
    sectorId: 'law',
    suggestedPrograms: [
      'Certified Paralegal & Court Practice',
      'Alternative Dispute Resolution (ADR & Commercial Mediation)',
      'Human Rights Advocacy & Public Policy',
    ],
  },

  // Engineering & Technical Trades
  {
    name: 'Electrical Engineering & Solar Systems',
    sectorId: 'engineering',
    suggestedPrograms: [
      'Solar PV Design & Installation (T1/T2)',
      'Electrical Wireman & Industrial Wiring',
      'Power Systems & Substation Fundamentals',
      'PLC Automation & Industrial Controls',
    ],
  },
  {
    name: 'Mechanical & Automotive Technology',
    sectorId: 'engineering',
    suggestedPrograms: [
      'Auto Diagnostics, Engine ECU & Hybrid Tech',
      'AutoCAD 2D/3D & SolidWorks Mechanical CAD',
      'HVAC & Commercial Air Conditioning Repair',
    ],
  },
  {
    name: 'Civil Engineering & Construction',
    sectorId: 'engineering',
    suggestedPrograms: [
      'Architectural Drafting & Structural Detailing',
      'Quantity Surveying & Cost Estimation',
      'Plumbing Engineering & Pipe Systems',
    ],
  },

  // Secondary Curricula (IB / AP)
  {
    name: 'International Baccalaureate (IB) & AP',
    sectorId: 'secondary',
    suggestedPrograms: [
      'IB Chemistry & Physics HL/SL',
      'IB Mathematics Analysis & Approaches',
      'AP Computer Science Principles',
      'AP Calculus AB/BC',
    ],
  },

  // Arts, Design & Media
  {
    name: 'Film Production, Cinematography & Video',
    sectorId: 'arts',
    suggestedPrograms: [
      'Cinematography & Camera Techniques',
      'Video Editing & Davinci Resolve Color Grading',
      'Screenwriting & Storyboarding',
      'Documentary Film Production',
    ],
  },
  {
    name: 'Graphic Design, 3D & Digital Media',
    sectorId: 'arts',
    suggestedPrograms: [
      'Adobe Creative Suite (Photoshop & Illustrator)',
      'Brand Identity & Logo Design',
      'Blender 3D Modeling & Animation',
    ],
  },

  // Languages & Linguistics
  {
    name: 'English Fluency & Academic IELTS',
    sectorId: 'languages',
    suggestedPrograms: [
      'IELTS Academic Preparation (Band 8.0+)',
      'IELTS General Training for Immigration',
      'Business English & Executive Communication',
    ],
  },
  {
    name: 'World Languages (German, French, Arabic, Spanish)',
    sectorId: 'languages',
    suggestedPrograms: [
      'German Language Mastery (Goethe A1-B2)',
      'French Language (DELF A1-B2)',
      'Modern Standard Arabic for Professionals',
      'Swahili for Researchers & Diplomats',
    ],
  },

  // Agriculture & Environment
  {
    name: 'Agribusiness & Crop Science',
    sectorId: 'agriculture',
    suggestedPrograms: [
      'Commercial Agribusiness & Crop Production',
      'Greenhouse Farming & Modern Irrigation',
      'Poultry & Dairy Farm Management',
    ],
  },
  {
    name: 'Environmental Science & GIS',
    sectorId: 'agriculture',
    suggestedPrograms: [
      'GIS Mapping with ArcGIS & QGIS',
      'Environmental Impact Assessment (EIA)',
      'Climate Change & Carbon Credit Projects',
    ],
  },

  // Music & Audio
  {
    name: 'Music Production & Audio Engineering',
    sectorId: 'music',
    suggestedPrograms: [
      'Music Production with FL Studio & Logic Pro',
      'Audio Mixing & Studio Mastering',
      'Live Sound & Acoustic Engineering',
    ],
  },
]

interface SubmittedTutorCourse {
  id: string
  providerType: 'individual_tutor' | 'partner_institution'
  tutorName: string
  institutionName?: string
  institutionLogo?: string
  institutionSignatory?: string
  deliveryMode: 'live_cohort' | 'self_paced'
  email: string
  phone: string
  courseTitle: string
  category: string
  courseDescription: string
  videoUrl: string
  suggestedPriceUsd: number
  payoutSplitPct: number
  submittedAt: string
  status: 'Pending Review' | 'Approved & Live'
  downloadPath?: string
  payoutMethod?: string
  payoutSchedule?: string
  payoutDetails?: string
  payoutCurrency?: string
}

export function TutorPublishCoursePage() {
  const isMobile = useIsMobile(768)

  const [providerType, setProviderType] = useState<'individual_tutor' | 'partner_institution'>('individual_tutor')
  const [institutionName, setInstitutionName] = useState('')
  const [institutionLogo, setInstitutionLogo] = useState('')
  const [institutionSignatory, setInstitutionSignatory] = useState('')
  const [deliveryMode, setDeliveryMode] = useState<'live_cohort' | 'self_paced'>('self_paced')

  const [tutorName, setTutorName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [category, setCategory] = useState('Tech & Software Engineering')
  const [selectedSector, setSelectedSector] = useState<string>('all')
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false)
  const [customCategoryName, setCustomCategoryName] = useState<string>('')
  const [programName, setProgramName] = useState<string>('')
  const [storedDepartments, setStoredDepartments] = useState<string[]>([])
  const [suggestedPriceUsd, setSuggestedPriceUsd] = useState(19)
  const [videoUrl, setVideoUrl] = useState('')
  const [courseDescription, setCourseDescription] = useState('')
  const [revenueSplitPct, setRevenueSplitPct] = useState(50)
  const [payoutMethod, setPayoutMethod] = useState<'mpesa' | 'bank' | 'paypal' | 'payoneer' | 'crypto' | 'custom'>('mpesa')
  const [payoutSchedule, setPayoutSchedule] = useState<'realtime' | 'weekly' | 'biweekly' | 'monthly' | 'on_demand'>('on_demand')
  const [payoutCurrency, setPayoutCurrency] = useState('USD')
  const [payoutDetails, setPayoutDetails] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submittedCourse, setSubmittedCourse] = useState<SubmittedTutorCourse | null>(null)
  const [bridgeStatus, setBridgeStatus] = useState<{ online: boolean; dir?: string }>({ online: false })
  const [downloadStatusMsg, setDownloadStatusMsg] = useState<string | null>(null)

  // Check if local desktop bridge is running & read existing school departments
  useEffect(() => {
    fetch('http://127.0.0.1:5179/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'online') {
          setBridgeStatus({ online: true, dir: data.saveDirectory })
        }
      })
      .catch(() => {
        setBridgeStatus({ online: false })
      })

    try {
      const depts = schoolStore.getDepartments()
      if (depts && depts.length > 0) {
        setStoredDepartments(depts.map((d) => d.name))
      }
    } catch {}
  }, [])

  // Dynamically compute department options based on selected sector + stored custom departments
  const filteredDepartments = useMemo(() => {
    let list = SECTOR_DEPARTMENTS
    if (selectedSector !== 'all') {
      list = list.filter((d) => d.sectorId === selectedSector)
    }
    const sectorDeptNames = list.map((d) => d.name)
    const combined = Array.from(new Set([...sectorDeptNames, ...storedDepartments]))
    return combined
  }, [selectedSector, storedDepartments])

  // Look up currently selected department's suggested programs
  const currentSectorDept = useMemo(() => {
    return SECTOR_DEPARTMENTS.find((d) => d.name === category)
  }, [category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setDownloadStatusMsg('Initializing automated course registration & video ingestion pipeline...')

    const finalTutorOrSchoolName =
      providerType === 'partner_institution' ? (institutionName.trim() || tutorName) : tutorName

    const finalDepartmentName = (
      isCustomCategory ? customCategoryName.trim() : category.trim()
    ) || 'General Academic Studies'

    const finalProgramName = (
      programName.trim() || courseTitle.trim()
    ) || courseTitle.trim()

    // 0. Auto-register dynamic department into schoolStore if it doesn't already exist
    try {
      const existingDepts = schoolStore.getDepartments()
      const alreadyExists = existingDepts.some(
        (d) => d.name.toLowerCase() === finalDepartmentName.toLowerCase()
      )
      if (!alreadyExists) {
        await schoolStore.addDepartment({
          id: `dept-${Date.now()}`,
          name: finalDepartmentName,
          code: finalDepartmentName.split(/\s+/).map((w) => w[0]).join('').slice(0, 5).toUpperCase() || 'DEPT',
          description: `Dynamic department registered by ${providerType === 'partner_institution' ? (institutionName.trim() || 'Partner School') : finalTutorOrSchoolName}.`,
          hod_name: providerType === 'partner_institution' ? (institutionSignatory.trim() || 'Academic Dean') : finalTutorOrSchoolName,
          hod_email: email.trim() || 'info.eclatinstitute@gmail.com',
          programs: [finalProgramName],
          school_id: 'school-Global College',
          school_name: providerType === 'partner_institution' ? (institutionName.trim() || 'Partner School') : 'Global College',
          created_at: new Date().toISOString(),
        })
      }
    } catch (deptErr) {
      console.warn('Could not register dynamic department:', deptErr)
    }

    const newCourse: SubmittedTutorCourse = {
      id: `tc-${Date.now()}`,
      providerType,
      tutorName: finalTutorOrSchoolName,
      institutionName: providerType === 'partner_institution' ? institutionName.trim() : undefined,
      institutionLogo: providerType === 'partner_institution' ? institutionLogo.trim() : undefined,
      institutionSignatory: providerType === 'partner_institution' ? institutionSignatory.trim() : undefined,
      deliveryMode,
      email,
      phone,
      courseTitle,
      category: finalDepartmentName,
      courseDescription,
      videoUrl,
      suggestedPriceUsd,
      payoutSplitPct: providerType === 'partner_institution' ? revenueSplitPct : 50,
      payoutMethod,
      payoutSchedule,
      payoutDetails,
      payoutCurrency,
      submittedAt: new Date().toISOString(),
      status: 'Approved & Live',
    }

    // 1. Immediately register course into schoolStore
    const newUnitId = `unit-${Date.now()}`
    const courseCode = `PUB-${Math.floor(100 + Math.random() * 900)}`
    try {
      await schoolStore.addCourseUnit({
        id: newUnitId,
        code: courseCode,
        title: courseTitle,
        department: finalDepartmentName,
        program: finalProgramName,
        course_duration: deliveryMode === 'live_cohort' ? '12 Weeks Cohort' : 'Self-Paced (Lifetime Access)',
        credit_hours: 40,
        teacher_id: `tch-${Date.now()}`,
        teacher_name: finalTutorOrSchoolName,
        description: courseDescription,
        fee: suggestedPriceUsd,
        course_fee: suggestedPriceUsd * 130,
        live_meeting_url: deliveryMode === 'live_cohort' ? 'https://meet.google.com/new' : undefined,
        live_schedule_text: deliveryMode === 'live_cohort' ? 'Live Cohort Sessions • Mon & Wed 7:30 PM EAT' : undefined,
        provider_type: providerType,
        institution_name: providerType === 'partner_institution' ? institutionName.trim() : undefined,
        institution_logo: providerType === 'partner_institution' ? institutionLogo.trim() : undefined,
        institution_signatory: providerType === 'partner_institution' ? institutionSignatory.trim() : undefined,
        delivery_mode: deliveryMode,
        revenue_split_pct: providerType === 'partner_institution' ? revenueSplitPct : 50,
        syllabus_modules: [
          {
            id: `mod-${Date.now()}-1`,
            module_number: 1,
            title: 'Module 1: Foundations & Core Practical Implementation',
            topics: ['Introduction & Overview', 'Hands-On Demonstration', 'Applied Project Work'],
            learning_outcomes: ['Grasp core principles', 'Complete practical assignments'],
            hours: 20,
          },
        ],
        lessons: [
          {
            id: `les-${Date.now()}-1`,
            title: `${courseTitle} - Complete Practical Masterclass`,
            video_url: videoUrl,
            duration_minutes: 60,
            content: courseDescription,
          },
        ],
        is_published: true,
        created_at: new Date().toISOString(),
      })
    } catch (storeErr) {
      console.warn('Could not register into schoolStore immediately:', storeErr)
    }

    // 2. Trigger local desktop video downloader bridge quietly in background
    try {
      const bridgeRes = await fetch('http://127.0.0.1:5179/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl,
          title: courseTitle,
          tutorName: finalTutorOrSchoolName,
        }),
      })

      if (bridgeRes.ok) {
        const bridgeData = await bridgeRes.json()
        newCourse.status = 'Approved & Live'
        newCourse.downloadPath = bridgeData.savedPath
        setDownloadStatusMsg('✓ Course registered & video streaming connection active for enrolled students!')
      } else {
        setDownloadStatusMsg('✓ Course registered & published live! Video streaming connection active.')
      }
    } catch {
      // If web browser without desktop bridge daemon
      setDownloadStatusMsg('✓ Course registered & published live! Video stream connected.')
    }

    // 3. Persist in cloudServicesStore for Admin Portal & cloud sync
    try {
      cloudServicesStore.savePublishedTutorCourse(newCourse as any)
    } catch {}

    setSubmitting(false)
    setSubmittedCourse(newCourse)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'inherit', width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
      {/* Header Bar */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0.75rem 1rem',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          width: '100%',
          maxWidth: '100vw',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/logo.png?v=2" alt="Global College" style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid #d4af37' }} />
            <div>
              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e3a8a', letterSpacing: '-0.01em' }}>
                GLOBAL COLLEGE
              </span>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>
                Faculty & Course Creator Publishing Hub
              </div>
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              to="/courses"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#2563eb',
                textDecoration: 'none',
                display: isMobile ? 'none' : 'inline-block',
              }}
            >
              Browse Student Catalog →
            </Link>
            <a
              href={getWhatsAppInquiryUrl('Hello Global College Dean! I want to publish a course and earn 50% revenue share.')}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#22c55e',
                color: '#ffffff',
                padding: '0.45rem 0.95rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 800,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <MessageCircleIcon size={14} color="#ffffff" />
              <span>WhatsApp Dean</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section
        style={{
          background: 'linear-gradient(135deg, #091322 0%, #0f2347 50%, #08101e 100%)',
          color: '#ffffff',
          padding: isMobile ? '2.5rem 1rem' : '4rem 1.5rem',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              padding: '4px 14px',
              borderRadius: '999px',
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#fbbf24',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '1rem',
            }}
          >
            <SparklesIcon size={14} color="#fbbf24" />
            <span>Tutor & Partner School Course Publishing Network</span>
          </div>

          <h1
            style={{
              fontSize: isMobile ? '2rem' : '3.1rem',
              fontWeight: 900,
              lineHeight: 1.15,
              margin: '0 0 1rem',
              letterSpacing: '-0.02em',
            }}
          >
            Publish With Global College.{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #f97316 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              For Tutors & Partner Schools.
            </span>
          </h1>

          <p
            style={{
              fontSize: isMobile ? '0.95rem' : '1.12rem',
              lineHeight: 1.65,
              color: '#cbd5e1',
              maxWidth: '740px',
              margin: '0 auto 1.75rem',
            }}
          >
            Whether you are an independent tutor creating video courses (earning 50% revenue share) or an academic school publishing accredited programs with your own institutional credentials, our platform handles high-speed video streaming, Paystack student checkout, student portals, and flexible disbursements chosen by you.
          </p>

          {/* Quick Pillars */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: '1rem',
              textAlign: 'left',
              marginTop: '2rem',
            }}
          >
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '14px', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>💵</div>
              <strong style={{ fontSize: '0.95rem', color: '#f8fafc', display: 'block' }}>Disbursements on Your Terms</strong>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Payouts by choice of the tutor or school via M-Pesa, Bank Wire, PayPal, or Crypto (Real-time, Weekly, or On-Demand).</span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '14px', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>⚡</div>
              <strong style={{ fontSize: '0.95rem', color: '#f8fafc', display: 'block' }}>Seamless Cloud Video Integration</strong>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Simply provide your Google Drive, Dropbox, or direct video link; our high-speed streaming infrastructure powers buffer-free playback for your students.</span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '14px', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>🔒</div>
              <strong style={{ fontSize: '0.95rem', color: '#f8fafc', display: 'block' }}>Anti-Piracy Watermarking</strong>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Lectures are protected with Global College DRM watermarking and student admission IDs.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Publishing Form Container */}
      <main style={{ maxWidth: '920px', margin: '-2rem auto 4rem', padding: '0 1rem', position: 'relative', zIndex: 10 }}>
        {submittedCourse ? (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '2px solid #16a34a',
              padding: isMobile ? '1.5rem' : '2.5rem',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.08)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#166534', margin: '0 0 0.5rem' }}>
              Course Submitted & Live Stream Active!
            </h2>
            <p style={{ fontSize: '1rem', color: '#334155', maxWidth: '600px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
              Thank you, <strong>{submittedCourse.tutorName}</strong>! Your course <strong>"{submittedCourse.courseTitle}"</strong> has been successfully registered on the platform and connected to the student portal.
            </p>

            {downloadStatusMsg && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '12px',
                  padding: '1rem',
                  fontSize: '0.9rem',
                  color: '#15803d',
                  fontWeight: 700,
                  maxWidth: '650px',
                  margin: '0 auto 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircleIcon size={20} color="#16a34a" />
                <span>{downloadStatusMsg}</span>
              </div>
            )}

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '14px',
                padding: '1.25rem',
                textAlign: 'left',
                maxWidth: '650px',
                margin: '0 auto 2rem',
                fontSize: '0.88rem',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div><strong>Publisher:</strong> {submittedCourse.providerType === 'partner_institution' ? `🏫 ${submittedCourse.institutionName || submittedCourse.tutorName} (School)` : `👨‍🏫 ${submittedCourse.tutorName} (Tutor)`}</div>
                <div><strong>Category:</strong> {submittedCourse.category}</div>
                <div><strong>Delivery Track:</strong> <span style={{ color: submittedCourse.deliveryMode === 'live_cohort' ? '#7c3aed' : '#d97706', fontWeight: 800 }}>{submittedCourse.deliveryMode === 'live_cohort' ? '🎓 Live Cohort (Admissions Issued)' : '⚡ Self-Paced (Instant Streaming)'}</span></div>
                <div><strong>Tuition Price:</strong> ${submittedCourse.suggestedPriceUsd} USD</div>
                <div><strong>Revenue Split:</strong> <span style={{ color: '#16a34a', fontWeight: 900 }}>{submittedCourse.payoutSplitPct}% (${((submittedCourse.suggestedPriceUsd * submittedCourse.payoutSplitPct) / 100).toFixed(0)}/student)</span></div>
                <div><strong>Certification:</strong> <span style={{ color: '#0369a1', fontWeight: 700 }}>{submittedCourse.providerType === 'partner_institution' ? `Awarded by ${submittedCourse.institutionName || 'Partner School'}` : 'Awarded by Global College'}</span></div>
                <div><strong>Disbursement:</strong> <span style={{ color: '#15803d', fontWeight: 700 }}>{submittedCourse.payoutMethod?.toUpperCase() || 'M-PESA'} ({submittedCourse.payoutSchedule === 'realtime' ? 'Instant Real-time' : submittedCourse.payoutSchedule === 'weekly' ? 'Weekly' : submittedCourse.payoutSchedule === 'monthly' ? 'Monthly' : 'On-Demand Choice'})</span></div>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.65rem' }}>
                <strong>Connected Video Stream:</strong> <code style={{ fontSize: '0.78rem', wordBreak: 'break-all' }}>{submittedCourse.videoUrl}</code>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href={getWhatsAppInquiryUrl(`Hello Global College Dean! I just published my course "${submittedCourse.courseTitle}". My name is ${submittedCourse.tutorName} (${submittedCourse.phone}).`)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#22c55e',
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(34, 197, 94, 0.35)',
                }}
              >
                <MessageCircleIcon size={18} color="#ffffff" />
                <span>Notify Dean on WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setSubmittedCourse(null)
                  setCourseTitle('')
                  setVideoUrl('')
                  setCourseDescription('')
                }}
                className="btn btn-secondary"
                style={{ padding: '0.75rem 1.5rem', fontWeight: 700, borderRadius: '10px' }}
              >
                Publish Another Course
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #cbd5e1',
              padding: isMobile ? '1.5rem 1.25rem' : '2.5rem',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.08)',
            }}
          >
            <div style={{ marginBottom: '1.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.35rem' }}>
                Course Publication & Curriculum Registration Form
              </h2>
              <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
                Provide your course title, curriculum details, cloud video link, and payout preferences. Your course is published live for global student enrollment.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
              {/* Creator Type Selector: Individual Tutor vs Partner School */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1.5px solid #cbd5e1' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  Step 1: Select Publishing Entity Type:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setProviderType('individual_tutor')
                      setRevenueSplitPct(50)
                    }}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      border: providerType === 'individual_tutor' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: providerType === 'individual_tutor' ? '#eff6ff' : '#ffffff',
                      color: providerType === 'individual_tutor' ? '#1e40af' : '#475569',
                      fontWeight: 800,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', marginBottom: '4px' }}>
                      <UserIcon size={18} color={providerType === 'individual_tutor' ? '#2563eb' : '#64748b'} />
                      <span>Individual Tutor (50% Revenue Share)</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 500 }}>
                      Automatic Global College-issued certificate naming you as Lead Faculty Instructor.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProviderType('partner_institution')
                      setRevenueSplitPct(70)
                    }}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      border: providerType === 'partner_institution' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                      background: providerType === 'partner_institution' ? '#f0fdf4' : '#ffffff',
                      color: providerType === 'partner_institution' ? '#15803d' : '#475569',
                      fontWeight: 800,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', marginBottom: '4px' }}>
                      <BuildingIcon size={18} color={providerType === 'partner_institution' ? '#16a34a' : '#64748b'} />
                      <span>Partner School / Academic Institution</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 500 }}>
                      Certificates issued directly under your school's name & crest, in affiliation with Global College.
                    </div>
                  </button>
                </div>
              </div>

              {/* Course Delivery Mode: Live Cohort vs Self-Paced */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1.5px solid #cbd5e1' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  Step 2: Course Delivery & Admission Mode:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMode('self_paced')
                      if (suggestedPriceUsd >= 40) setSuggestedPriceUsd(19)
                    }}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      border: deliveryMode === 'self_paced' ? '2px solid #d97706' : '1px solid #cbd5e1',
                      background: deliveryMode === 'self_paced' ? '#fffbeb' : '#ffffff',
                      color: deliveryMode === 'self_paced' ? '#92400e' : '#475569',
                      fontWeight: 800,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', marginBottom: '4px' }}>
                      <VideoIcon size={18} color={deliveryMode === 'self_paced' ? '#d97706' : '#64748b'} />
                      <span>Self-Paced / On-Demand Video Course</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 500 }}>
                      Instant streaming unlock upon checkout. Standard accessible student pricing ($15 - $29). Verified certificate.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMode('live_cohort')
                      if (suggestedPriceUsd < 40) setSuggestedPriceUsd(55)
                    }}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      border: deliveryMode === 'live_cohort' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                      background: deliveryMode === 'live_cohort' ? '#f5f3ff' : '#ffffff',
                      color: deliveryMode === 'live_cohort' ? '#6d28d9' : '#475569',
                      fontWeight: 800,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', marginBottom: '4px' }}>
                      <GraduationCapIcon size={18} color={deliveryMode === 'live_cohort' ? '#7c3aed' : '#64748b'} />
                      <span>Live Cohort Classes</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 500 }}>
                      Formal Global College Admission Number generated, live Google Meet schedule, and timetable allocation.
                    </div>
                  </button>
                </div>
              </div>

              {/* Section 1: Instructor / Institution Identity */}
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {providerType === 'partner_institution' ? <BuildingIcon size={16} color="#1e3a8a" /> : <UserIcon size={16} color="#1e3a8a" />}
                  <span>3. {providerType === 'partner_institution' ? 'Institution Profile & Credential Settings' : 'Instructor & Revenue Details'}</span>
                </h3>

                {providerType === 'partner_institution' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '0.85rem', marginBottom: '0.85rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                        Institution / School Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Nairobi Coding Academy"
                        value={institutionName}
                        onChange={(e) => setInstitutionName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.88rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                        Certificate Signatory & Title *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dr. Patrick Mwangi, Principal"
                        value={institutionSignatory}
                        onChange={(e) => setInstitutionSignatory(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.88rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                        School Crest / Logo URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://yourschool.com/logo.png"
                        value={institutionLogo}
                        onChange={(e) => setInstitutionLogo(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.88rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                ) : null}

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                      {providerType === 'partner_institution' ? 'Administrator / Lead Contact Name *' : 'Tutor Full Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={providerType === 'partner_institution' ? 'e.g. Eng. Arthur Vance' : 'e.g. Samuel Karanja'}
                      value={tutorName}
                      onChange={(e) => setTutorName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                      Official Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder={providerType === 'partner_institution' ? 'dean@nairobiacademy.ac.ke' : 'samuel@example.com'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                      Official WhatsApp Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+254 712 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Course Information */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e3a8a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileTextIcon size={16} color="#1e3a8a" />
                    <span>2. Course Syllabus & Academic Program Track</span>
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategory(!isCustomCategory)
                        if (!isCustomCategory && !customCategoryName) {
                          setCustomCategoryName(category !== '__custom__' ? category : '')
                        }
                      }}
                      style={{
                        background: isCustomCategory ? '#eff6ff' : '#f8fafc',
                        border: isCustomCategory ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        color: isCustomCategory ? '#1e40af' : '#475569',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      {isCustomCategory ? '📋 Choose From Presets' : '✏️ Enter Custom School Program'}
                    </button>
                  </div>
                </div>

                {/* Academic Discipline / School Sector Filter Ribbon */}
                <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                    Select Academic Faculty Sector (Filters Programs Below):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {ACADEMIC_SECTORS.map((sec) => {
                      const isActive = selectedSector === sec.id
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => {
                            setSelectedSector(sec.id)
                            if (sec.id !== 'all') {
                              const match = SECTOR_DEPARTMENTS.find((d) => d.sectorId === sec.id)
                              if (match) {
                                setCategory(match.name)
                                setIsCustomCategory(false)
                              }
                            }
                          }}
                          style={{
                            background: isActive ? '#1e3a8a' : '#ffffff',
                            color: isActive ? '#ffffff' : '#334155',
                            border: isActive ? '1.5px solid #1e3a8a' : '1px solid #cbd5e1',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: isActive ? 800 : 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span>{sec.icon}</span>
                          <span>{sec.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1.5fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                      Course Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        isCustomCategory
                          ? 'e.g. Diploma in Registered Nursing, or Private Pilot Ground School'
                          : 'e.g. Masterclass in React 19 & Next.js Full-Stack'
                      }
                      value={courseTitle}
                      onChange={(e) => setCourseTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155' }}>
                        {isCustomCategory ? 'Custom School Department *' : 'Department Category *'}
                      </label>
                    </div>

                    {isCustomCategory ? (
                      <input
                        type="text"
                        required
                        placeholder="e.g. School of Nursing, or Aviation Academy"
                        value={customCategoryName}
                        onChange={(e) => setCustomCategoryName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: '2px solid #2563eb',
                          fontSize: '0.88rem',
                          outline: 'none',
                          background: '#ffffff',
                        }}
                      />
                    ) : (
                      <select
                        value={category}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setIsCustomCategory(true)
                          } else {
                            setCategory(e.target.value)
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.88rem',
                          outline: 'none',
                          background: '#ffffff',
                        }}
                      >
                        {filteredDepartments.map((deptName) => (
                          <option key={deptName} value={deptName}>
                            {deptName}
                          </option>
                        ))}
                        <option value="__custom__">✨ + Enter Custom Department / Program...</option>
                      </select>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                      Tuition Fee (USD) *
                    </label>
                    <input
                      type="number"
                      required
                      min={10}
                      max={1000}
                      value={suggestedPriceUsd}
                      onChange={(e) => setSuggestedPriceUsd(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.88rem',
                        outline: 'none',
                        fontWeight: 700,
                      }}
                    />
                  </div>
                </div>

                {/* Dynamic Program Suggestions / Track Name */}
                {isCustomCategory ? (
                  <div style={{ marginBottom: '0.85rem', background: '#eff6ff', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#1e40af', marginBottom: '4px' }}>
                      Specific Program Track / Awarding Qualification (Optional):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Diploma in Registered Community Health Nursing, or FAA Instrument Rating"
                      value={programName}
                      onChange={(e) => setProgramName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.85rem',
                        borderRadius: '6px',
                        border: '1px solid #93c5fd',
                        fontSize: '0.85rem',
                        background: '#ffffff',
                        outline: 'none',
                      }}
                    />
                  </div>
                ) : currentSectorDept?.suggestedPrograms && currentSectorDept.suggestedPrograms.length > 0 ? (
                  <div style={{ marginBottom: '0.85rem', background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>
                      Click any program below to quickly autofill:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {currentSectorDept.suggestedPrograms.map((prog, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setProgramName(prog)
                            if (!courseTitle || courseTitle === 'Masterclass in React 19 & Next.js Full-Stack') {
                              setCourseTitle(prog)
                            }
                          }}
                          style={{
                            background: programName === prog ? '#dbeafe' : '#ffffff',
                            color: programName === prog ? '#1e40af' : '#475569',
                            border: programName === prog ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          + {prog}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* 50% Share Calculator Preview Box */}
                <div
                  style={{
                    background: '#ecfdf5',
                    border: '1.5px solid #a7f3d0',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    fontSize: '0.84rem',
                    color: '#065f46',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '6px',
                  }}
                >
                  <div>
                    <strong>Your 50% Profit Share:</strong> You earn{' '}
                    <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#047857' }}>
                      ${(suggestedPriceUsd * 0.5).toFixed(0)} USD
                    </span>{' '}
                    (approx. KES {((suggestedPriceUsd * 0.5) * 130).toLocaleString()}) for every student enrolled!
                  </div>
                  <span style={{ fontSize: '0.72rem', background: '#d1fae5', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                    50/50 AUTOMATIC SPLIT
                  </span>
                </div>
              </div>

              {/* Section 3: Video Lecture Master Link */}
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <VideoIcon size={16} color="#1e3a8a" />
                  <span>3. Course Video Master Link & Curriculum Overview</span>
                </h3>

                <div style={{ marginBottom: '0.65rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                    Course Video Master Link (Google Drive, Dropbox, Vimeo, or direct .mp4) *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://drive.google.com/file/d/... or direct .mp4 link"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                    💡 <em>Tip: If using Google Drive or Dropbox, please ensure sharing permissions are set to "Anyone with the link can view".</em>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                    Course Description & Learning Outcomes *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="What skills will students gain? List the key modules and practical lab projects included in this video course..."
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>

              {/* Section 4: Disbursement & Payout Details */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e3a8a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CreditCardIcon size={16} color="#1e3a8a" />
                    <span>4. Revenue Disbursement Preferences (By Your Choice)</span>
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 700, background: '#f0fdf4', padding: '3px 8px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    ✓ Configured by Tutor / School
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                      Disbursement Channel (Your Choice) *
                    </label>
                    <select
                      value={payoutMethod}
                      onChange={(e) => setPayoutMethod(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.88rem',
                        outline: 'none',
                        background: '#ffffff',
                      }}
                    >
                      <option value="mpesa">📱 M-Pesa (Kenya & East Africa Mobile Money)</option>
                      <option value="bank">🏦 Direct Bank Wire Transfer (Local / Global KES/USD)</option>
                      <option value="paypal">💳 PayPal (International Global Transfer)</option>
                      <option value="payoneer">🌐 Payoneer / Wise Global Account</option>
                      <option value="crypto">🪙 Crypto USDT / Stablecoin (TRC20 / ERC20)</option>
                      <option value="custom">📜 Custom Institutional Settlement Account (Partner Schools)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                      Disbursement Frequency & Schedule (Your Choice) *
                    </label>
                    <select
                      value={payoutSchedule}
                      onChange={(e) => setPayoutSchedule(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.88rem',
                        outline: 'none',
                        background: '#ffffff',
                      }}
                    >
                      <option value="realtime">⚡ Instant / Real-Time per Student Checkout</option>
                      <option value="weekly">📅 Weekly Disbursements (Every Friday)</option>
                      <option value="biweekly">🗓️ Bi-Weekly Disbursements (15th & End of Month)</option>
                      <option value="monthly">📆 Monthly Disbursements (1st of Every Month)</option>
                      <option value="on_demand">🔔 On-Demand / Flexible (Disburse Whenever I Request)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                      Disbursement Account / Number / Address *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        payoutMethod === 'mpesa'
                          ? 'e.g. M-Pesa Registered Number: 0712 345 678 (Name: John Kamau)'
                          : payoutMethod === 'bank'
                          ? 'e.g. Bank Name, Branch, Account Name & Account Number'
                          : payoutMethod === 'paypal'
                          ? 'e.g. PayPal Registered Email Address'
                          : payoutMethod === 'crypto'
                          ? 'e.g. USDT TRC20 Wallet Address: T...'
                          : 'e.g. Payoneer Email or Institutional Wire Details'
                      }
                      value={payoutDetails}
                      onChange={(e) => setPayoutDetails(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                      Settlement Currency Preference
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. USD, KES, EUR, GBP"
                      value={payoutCurrency}
                      onChange={(e) => setPayoutCurrency(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '1.25rem',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheckIcon size={16} color="#16a34a" />
                  <span>Your Intellectual Property & Revenue Rights are Protected</span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 900,
                    padding: '0.85rem 2rem',
                    borderRadius: '10px',
                    fontSize: '0.96rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
                  }}
                >
                  <RocketIcon size={18} color="#ffffff" />
                  <span>{submitting ? 'Processing Course & Ingesting Video...' : 'Publish Course (50% Revenue Share) →'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
