// ============================================================
// Centralized Institutional & Platform Configuration
// Single source of truth driven by environment variables
// ============================================================

export interface InstitutionConfig {
  name: string
  shortName: string
  tagline: string
  description: string
  websiteUrl: string
  portalUrl: string
  domain: string
  
  contact: {
    phone: string
    phoneRaw: string
    phoneFormatted: string
    whatsappNumber: string
    email: string
    admissionsEmail: string
  }

  bank: {
    name: string
    accountNumber: string
    paybillNumber: string
    accountName: string
    branch: string
  }

  paystack: {
    publicKey: string
    currency: string
  }

  pricing: {
    currencySymbol: string
    currencyCode: string
    defaultTuitionFee: number
  }

  auth: {
    adminUsername?: string
    adminDefaultPassword?: string
    internalEmailDomain: string
  }
}

export const INSTITUTION_CONFIG: InstitutionConfig = {
  name: (import.meta.env.VITE_INSTITUTION_NAME as string) || 'Global College',
  shortName: (import.meta.env.VITE_INSTITUTION_SHORT_NAME as string) || 'Global College',
  tagline: (import.meta.env.VITE_INSTITUTION_TAGLINE as string) || 'School Management System & Portals',
  description:
    (import.meta.env.VITE_INSTITUTION_DESC as string) ||
    'Unified School Management System (SIMS, LMS, Bursar, Examinations & Multi-Portal ERP) for Global College.',
  websiteUrl: (import.meta.env.VITE_WEBSITE_URL as string) || 'https://cloud.eclat.institute',
  portalUrl: (import.meta.env.VITE_PORTAL_URL as string) || 'https://cloud.eclat.institute/login',
  domain: (import.meta.env.VITE_INSTITUTION_DOMAIN as string) || 'cloud.eclat.institute',

  contact: {
    phone: (import.meta.env.VITE_INSTITUTION_PHONE as string) || '+254 712 345 678',
    phoneRaw: (import.meta.env.VITE_INSTITUTION_PHONE_RAW as string) || '254712345678',
    phoneFormatted: (import.meta.env.VITE_INSTITUTION_PHONE as string) || '+254 712 345 678',
    whatsappNumber: (import.meta.env.VITE_WHATSAPP_NUMBER as string) || '254712345678',
    email: (import.meta.env.VITE_INSTITUTION_EMAIL as string) || 'info.eclatinstitute@gmail.com',
    admissionsEmail: (import.meta.env.VITE_ADMISSIONS_EMAIL as string) || 'info.eclatinstitute@gmail.com',
  },

  bank: {
    name: (import.meta.env.VITE_BANK_NAME as string) || 'KCB Bank',
    accountNumber: (import.meta.env.VITE_BANK_ACCOUNT as string) || '1344329268',
    paybillNumber: (import.meta.env.VITE_PAYBILL_NUMBER as string) || '522522',
    accountName: (import.meta.env.VITE_BANK_ACCOUNT_NAME as string) || 'Global College',
    branch: (import.meta.env.VITE_BANK_BRANCH as string) || 'Nairobi Central',
  },

  paystack: {
    publicKey: (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string) || 'pk_test_9fb570106b515b91f8b6cc1ce225ace3dd12a54a',
    currency: (import.meta.env.VITE_PAYSTACK_CURRENCY as string) || 'KES',
  },

  pricing: {
    currencySymbol: (import.meta.env.VITE_CURRENCY_SYMBOL as string) || '$',
    currencyCode: (import.meta.env.VITE_CURRENCY_CODE as string) || 'USD',
    defaultTuitionFee: Number(import.meta.env.VITE_DEFAULT_TUITION_FEE) || 60,
  },

  auth: {
    adminUsername: (import.meta.env.VITE_ADMIN_USERNAME as string) || 'Global@admin',
    adminDefaultPassword: (import.meta.env.VITE_ADMIN_PASSWORD as string) || (import.meta.env.ADMIN_PASSWORD as string) || 'Global@2026#!',
    internalEmailDomain: (import.meta.env.VITE_INTERNAL_EMAIL_DOMAIN as string) || 'globalcollege.internal',
  },
}

/**
 * Institutional Schools & Specialized Academic Departments Registry
 */
export const INSTITUTIONAL_SCHOOLS = [
  {
    id: 'school-business',
    code: 'SCH-BIZ',
    name: 'School of Business',
    shortName: 'Business',
    category: 'School of Business',
    description: 'Premier executive business school delivering high-paying global professional credentials: Project Management Professional (PMP®), Financial Modeling & Valuation (FMVA®), Corporate FP&A (CMA®), Lean Six Sigma Green Belt (LSSGB®), Business Analysis (CBAP®), Supply Chain & Logistics (CSCP®), Strategic HR (SHRM-CP®), and Computerized Accounting.',
    icon: '💼',
    color: '#f59e0b',
    dean_name: 'Office of the Dean — School of Business',
    dean_email: 'business.faculty@cloud.eclat.institute',
    departments: [
      {
        id: 'dept-biztech',
        code: 'DEPT-BIZTECH',
        name: 'Department of Business Tech & Computerized Accounting',
        description: 'Computerized accounting, QuickBooks Online & Desktop, KRA iTax VAT & PAYE statutory filing, dynamic 3-statement financial modeling, valuation, and corporate FP&A.',
        hod_name: 'Head of Department — Business Tech & Accounting',
        programs: [
          'Professional Forex Trading, Currency Markets & Technical Analysis (FX Mastery)',
          'Algorithmic Forex Trading & Quantitative Bot Strategies (Python & MT5)',
          'Computerized Accounting (QuickBooks & iTax)',
          'Financial Modeling & Valuation Analyst (FMVA®)',
          'Strategic Corporate FP&A & Management Accounting (CMA® Track)',
          'Corporate Financial Modeling & Budgeting',
        ],
      },
      {
        id: 'dept-commerce-mgmt',
        code: 'DEPT-COMM',
        name: 'Department of Commerce, Economics & Enterprise Management',
        description: 'Executive project management, Lean Six Sigma operational excellence, enterprise business analysis, global supply chain procurement, strategic human resources, and performance marketing.',
        hod_name: 'Head of Department — Commerce & Management',
        programs: [
          'Executive Project Management Professional (PMP®) & Agile Leadership',
          'Lean Six Sigma Green Belt (LSSGB®) & Process Optimization',
          'Enterprise Business Analysis & Digital Transformation (CBAP® & PMI-PBA®)',
          'Global Supply Chain Strategy, Logistics & Procurement (CSCP® & APICS)',
          'Strategic HR Leadership, Talent Acquisition & People Analytics (SHRM-CP®)',
          'Digital Marketing Strategy, Performance Growth & MarTech Leadership',
          'Executive Leadership & Business Administration',
        ],
      },
    ],
  },
  {
    id: 'school-it-data',
    code: 'SCH-ITDS',
    name: 'School of IT and Data Science',
    shortName: 'IT & Data Science',
    category: 'School of IT and Data Science',
    description: 'Premier computing faculty combining Full-Stack Web & Software Engineering (React 19 & Node.js), Python AI & Machine Learning, Big Data Analytics, Econometrics (R, SPSS, Stata), Cybersecurity, and Creative UI/UX Design.',
    icon: '💻',
    color: '#6366f1',
    dean_name: 'Office of the Dean — School of IT & Data Science',
    dean_email: 'tech.faculty@cloud.eclat.institute',
    departments: [
      {
        id: 'dept-swe',
        code: 'DEPT-SWE',
        name: 'Department of Full-Stack Software Engineering & Cloud Technologies',
        description: '100% Online full-stack engineering, React 19, TypeScript, Node.js REST APIs, and cloud deployment.',
        hod_name: 'Head of Department — Software Engineering',
        programs: ['Full-Stack Web Development (React 19 & Node.js)', 'JavaScript & Cloud Deployment Masterclass', 'Mobile Application Development with Capacitor'],
      },
      {
        id: 'dept-data',
        code: 'DEPT-DATA',
        name: 'Department of Python Programming, Machine Learning & AI',
        description: 'Python programming, predictive machine learning models, neural networks, and automated data pipelines.',
        hod_name: 'Head of Department — Data Science & AI',
        programs: ['Python for Data Science & Analytics', 'Predictive Machine Learning & AI Pipelines', 'SQL Database Engineering & Power BI'],
      },
      {
        id: 'dept-cyber',
        code: 'DEPT-CYBER',
        name: 'Department of Cybersecurity, Networking & Server Security',
        description: 'Network defense, server administration, penetration testing principles, and cloud architecture defense.',
        hod_name: 'Head of Department — Cybersecurity & Defense',
        programs: ['Cybersecurity Fundamentals & Threat Defense', 'Network Administration & Server Security', 'Cloud Security & DevOps Infrastructure'],
      },
      {
        id: 'dept-econometrics',
        code: 'DEPT-ECON',
        name: 'Department of Econometrics, Statistics & Research Analytics',
        description: 'Advanced statistical inference, econometric time-series modeling in R, SPSS, Stata, and dissertation research.',
        hod_name: 'Head of Department — Econometrics & Research',
        programs: ['Advanced Econometrics & Time-Series in R', 'SPSS & Stata Multilevel Research Modeling', 'Quantitative Data Analysis for Academia & Industry'],
      },
      {
        id: 'dept-uiux',
        code: 'DEPT-UIUX',
        name: 'Department of UI/UX Design, Creative Media & Digital Skills',
        description: 'Figma UI/UX design systems, user research, Canva Pro visual branding, and essential computer packages.',
        hod_name: 'Head of Department — UI/UX & Digital Skills',
        programs: ['Executive UI/UX Design & Design Systems in Figma', 'Canva Pro Graphics & Social Media Animation', 'Comprehensive Computer Packages & Digital Office Skills'],
      },
    ],
  },
  {
    id: 'school-languages',
    code: 'SCH-LANG',
    name: 'School of Language',
    shortName: 'Language',
    category: 'School of Language',
    description: 'International language mastery: IELTS Academic & General Training (Band 7.5-9.0), corporate English communication, modern foreign languages (Arabic, French, German), and Kiswahili Sanifu discourse.',
    icon: '🗣️',
    color: '#10b981',
    dean_name: 'Office of the Dean — School of Language',
    dean_email: 'languages.faculty@cloud.eclat.institute',
    departments: [
      {
        id: 'dept-ielts',
        code: 'DEPT-IELTS',
        name: 'Department of IELTS & International Examination Prep',
        description: 'High-yield IELTS Academic and General Training preparation for global migration and university admissions.',
        hod_name: 'Head of Department — IELTS & Exam Prep',
        programs: ['IELTS Academic Intensive (Band 7.5+ Target)', 'IELTS General Training for Global Migration', 'OET & Professional Language Certifications'],
      },
      {
        id: 'dept-foreign-lang',
        code: 'DEPT-LANG',
        name: 'Department of Modern Foreign Languages (Arabic, French, German)',
        description: 'CEFR-aligned foreign language instruction for diplomacy, multinational careers, and international commerce.',
        hod_name: 'Head of Department — Modern Foreign Languages',
        programs: ['French Language Certificate (A1-C1 DELF)', 'German Language Proficiency (Goethe-Zertifikat)', 'Modern Standard Arabic for Professionals'],
      },
      {
        id: 'dept-english-fluency',
        code: 'DEPT-ENG',
        name: 'Department of English Fluency & Executive Public Speaking',
        description: 'Executive speaking, pitch deck presentations, speech crafting, and professional business correspondence.',
        hod_name: 'Head of Department — English & Communication',
        programs: ['English Language Fluency & Public Speaking', 'Corporate Business Writing & Rhetoric', 'Pronunciation & Cross-Cultural Discourse'],
      },
      {
        id: 'dept-kisw',
        code: 'DEPT-KISW',
        name: 'Department of Kiswahili Sanifu & African Dialects',
        description: 'Structured Swahili immersion for beginners, diaspora learners, researchers, and professional translators.',
        hod_name: 'Head of Department — Kiswahili & African Studies',
        programs: ['Kiswahili Sanifu for Beginners & Expatriates', 'Advanced Swahili Translation & Cultural Studies'],
      },
    ],
  },
]

/**
 * Helper to construct WhatsApp inquiry link
 */
export function getWhatsAppInquiryUrl(message?: string): string {
  const defaultMsg = `Hello ${INSTITUTION_CONFIG.name} Admissions! I would like to inquire about online courses and upcoming intakes.`
  const text = encodeURIComponent(message || defaultMsg)
  return `https://wa.me/${INSTITUTION_CONFIG.contact.whatsappNumber}?text=${text}`
}

/**
 * Helper to format Paybill text
 */
export function getPaybillSummary(): string {
  return `Paybill: ${INSTITUTION_CONFIG.bank.paybillNumber} • Acc: ${INSTITUTION_CONFIG.bank.accountNumber}`
}

