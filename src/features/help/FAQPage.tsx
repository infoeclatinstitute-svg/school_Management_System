import React, { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AppLogo } from '@/components/common/AppLogo'

interface FAQItem {
  id: string
  category: 'Getting Started' | 'Workstation & Offline' | 'Admissions & Students' | 'Fees & Bursar' | 'Academics & Grading' | 'Security & Sync'
  question: string
  answer: string
  bullets?: string[]
}

const FAQ_DATA: FAQItem[] = [
  // Getting Started
  {
    id: 'what-is-global-college',
    category: 'Getting Started',
    question: 'What is Global College School Management System?',
    answer: 'Global College SMS is an institutional-grade, multi-campus platform designed for colleges, institutes, and schools. It powers student admissions, continuous assessment (CATs), academic grading, timetable generation, fee reconciliation, official transcripts, and staff payroll under an independent branded portal for each institution.',
    bullets: [
      'Multi-tenant architecture: Each institution operates with its own custom branding, logos, colors, and portal URLs.',
      'Comprehensive roles: Dedicated desks for Principals/Admins, Bursars, Teachers, Students, and Parents.',
      'Hybrid operation: Seamless execution across local offline workstations, desktop applications, mobile devices, and cloud portal hubs.',
    ],
  },
  {
    id: 'how-to-register-school',
    category: 'Getting Started',
    question: 'How do I register a new school or college campus?',
    answer: 'Any institution can be set up in under two minutes via the 5-Step Institution Onboarding Wizard.',
    bullets: [
      'Navigate to "Register Your School" on the landing page or visit /register-school.',
      'Step 1: Fill in institutional identity (Campus Name, Slug, Logo, Motto, Curriculum).',
      'Step 2: Provide contact and physical location details (County, City/Town, Postal Code, Phone, Official Email).',
      'Step 3: Define academic configuration (Term/Semester structure, grading model, currency, departments).',
      'Step 4: Provision the Principal / Root Administrator account with encrypted credentials.',
      'Step 5: Review summary and confirm instant database provisioning and campus activation.',
    ],
  },
  {
    id: 'supported-curricula',
    category: 'Getting Started',
    question: 'Which educational curricula and academic frameworks are supported?',
    answer: 'Global College natively supports Tertiary & Higher Education, TVET/Vocational programs, National Curricula (8-4-4, CBC / Competency-Based Education), Diploma and Certificate pathways, and Modular Semester systems with flexible grading scales.',
  },

  // Workstation & Offline
  {
    id: 'offline-workstation-mode',
    category: 'Workstation & Offline',
    question: 'How does the Desktop App work offline without internet?',
    answer: 'The Global College PC Desktop Application features an embedded high-speed production engine running locally on 127.0.0.1:42888. It caches and stores data locally in persistent storage (IndexedDB and local database replication), allowing administrators and teachers to operate without interruption when internet connectivity is intermittent or unavailable.',
    bullets: [
      'Record student attendance, test scores, and bursar receipts completely offline.',
      'Instantaneous UI performance with zero cloud latency during peak campus hours.',
      'Dual Gateway Menu: Use Gateway > Live Cloud Hub (Ctrl+Shift+C) or Gateway > Local Offline Workstation (Ctrl+Shift+L) anytime.',
    ],
  },
  {
    id: 'ota-background-updates',
    category: 'Workstation & Offline',
    question: 'How do software updates (OTA) work on the desktop and mobile apps?',
    answer: 'Global College uses silent Over-The-Air (OTA) background updates. When a newer release is published, the application verifies the integrity hash and updates its assets silently in the background without interrupting your ongoing work, data entry, or examination grading.',
  },
  {
    id: 'desktop-system-requirements',
    category: 'Workstation & Offline',
    question: 'What are the system requirements for the Windows PC Desktop App?',
    answer: 'Global College is engineered for high efficiency and runs smoothly on standard modern computers:',
    bullets: [
      'Operating System: Windows 10 or Windows 11 (64-bit). Also compatible with macOS and Linux workstation builds.',
      'Processor: Intel Core i3 / AMD Ryzen 3 or higher.',
      'Memory (RAM): 4 GB minimum (8 GB recommended for large campuses with 5,000+ students).',
      'Disk Space: 500 MB free storage for local application and offline document caches.',
    ],
  },

  // Admissions & Students
  {
    id: 'student-admissions-process',
    category: 'Admissions & Students',
    question: 'How are new students admitted and enrolled into classes?',
    answer: 'Administrators can admit students individually or in bulk via the Student Directory and Admissions desk. Each admitted student receives an Admission Number, assigned class/stream, curriculum track, and an automated student portal profile with biometric or credential authentication.',
  },
  {
    id: 'student-id-cards-and-documents',
    category: 'Admissions & Students',
    question: 'Can I generate student ID cards and admission letters?',
    answer: 'Yes. With a single click, administrators can print standardized institutional documents formatted with the institution logo, official colors, principal signature line, and verification barcodes:',
    bullets: [
      'Official Admission Offer Letters with fee schedules and term dates.',
      'Student Identity Cards with photo, department, admission number, and validity period.',
      'Unit Registration Slips and Examination Clearance Permits.',
    ],
  },

  // Fees & Bursar
  {
    id: 'recording-fee-payments',
    category: 'Fees & Bursar',
    question: 'How does the Bursar Desk handle fee payments and balances?',
    answer: 'The Bursar Desk provides real-time fee tracking with automatic balance computation:',
    bullets: [
      'Fee Structure Configuration: Set term/semester fees per course or class, including tuition, lab, library, and activity fees.',
      'Payment Channels: Record cash, bank transfers, cheques, and automated M-Pesa mobile money reconciliations.',
      'Atomic Balance Updates: Payments immediately deduct from outstanding student balances with zero arithmetic discrepancies.',
      'Instant Digital Receipts: Print or export PDF receipts stamped with the institutional bursar seal.',
    ],
  },
  {
    id: 'fee-clearance-and-exam-permits',
    category: 'Fees & Bursar',
    question: 'Can students with fee arrears be barred from exam permit issuance?',
    answer: 'Yes. The system includes an automated Fee Clearance threshold. Only students who have cleared their required fee balance percentage can be issued official Examination Cards and Clearance Slips.',
  },

  // Academics & Grading
  {
    id: 'how-continuous-assessment-works',
    category: 'Academics & Grading',
    question: 'How do Continuous Assessments (CATs) and Final Exams calculate overall grades?',
    answer: 'The academic engine calculates composite marks combining Continuous Assessment Tests (e.g. CAT 1 + CAT 2 = 30%) and the Final Semester Exam (70%) based on your school’s configured weighting. Marks are automatically mapped to standard letter grades (A, B, C, D, F) with grade point averages (GPA).',
  },
  {
    id: 'generating-transcripts-and-report-cards',
    category: 'Academics & Grading',
    question: 'How are official academic transcripts and report cards generated?',
    answer: 'Transcripts are generated dynamically from verified gradebook entries. They include course codes, unit names, credit hours, marks scored, letter grades, cumulative grade points, class ranking, and principal remarks ready for high-resolution printing or digital verification.',
  },
  {
    id: 'timetable-scheduling',
    category: 'Academics & Grading',
    question: 'How does the Timetable and Class Scheduling system work?',
    answer: 'The Timetable module schedules weekly periods across classrooms, lecture halls, and laboratories, with conflict prevention to ensure no teacher or classroom is double-booked across overlapping sessions.',
  },

  // Security & Sync
  {
    id: 'data-privacy-and-encryption',
    category: 'Security & Sync',
    question: 'How is student and financial institutional data protected?',
    answer: 'Security and data protection are fundamental to the architecture:',
    bullets: [
      '256-bit SSL/TLS end-to-end encryption for all communications.',
      'SHA-256 salted password hashing and role-based access control (RBAC).',
      'Row Level Security (RLS) ensuring strict isolation between different schools and campuses.',
      'Master Passcode Gate protecting root SaaS platform administration.',
    ],
  },
  {
    id: 'data-backups-and-recovery',
    category: 'Security & Sync',
    question: 'How are campus data backups created and recovered?',
    answer: 'Global College maintains real-time cloud redundancy in PostgreSQL/Supabase. Additionally, administrators can perform instant local JSON/CSV data exports of student registers, fee transactions, and academic marks from the Admin Dashboard for institutional record keeping.',
  },
]

const CATEGORIES: Array<FAQItem['category'] | 'All'> = [
  'All',
  'Getting Started',
  'Workstation & Offline',
  'Admissions & Students',
  'Fees & Bursar',
  'Academics & Grading',
  'Security & Sync',
]

export function FAQPage() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [expandedId, setExpandedId] = useState<string | null>('what-is-global-college')

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return FAQ_DATA.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
      if (!matchesCategory) return false
      if (!q) return true
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.bullets?.some((b) => b.toLowerCase().includes(q))
      )
    })
  }, [searchQuery, selectedCategory])

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#090e1a', color: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* TOP HEADER */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(9, 14, 26, 0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1e293b',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <AppLogo size="sm" showTagline={false} />
          </Link>
          <span
            style={{
              background: '#1e293b',
              color: '#38bdf8',
              padding: '2px 10px',
              borderRadius: '999px',
              fontSize: '0.74rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Help &amp; Knowledge Base
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1)
              } else {
                navigate('/')
              }
            }}
            style={{
              background: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #334155',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>←</span>
            <span>Return to Portal</span>
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section
        style={{
          padding: '3rem 1.5rem 2rem',
          textAlign: 'center',
          maxWidth: '840px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            color: '#38bdf8',
            fontSize: '0.78rem',
            fontWeight: 800,
            padding: '4px 14px',
            borderRadius: '999px',
            marginBottom: '1rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Frequently Asked Questions
        </div>
        <h1
          style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
            fontWeight: 900,
            color: '#ffffff',
            margin: '0 0 1rem',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}
        >
          How can we help your institution?
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1rem', margin: '0 auto 2rem', maxWidth: '640px', lineHeight: 1.6 }}>
          Everything you need to know about setting up your campus, offline local workstations, fee payments, continuous assessment, and institutional administration.
        </p>

        {/* SEARCH BOX */}
        <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions, e.g. fees, offline workstation, M-Pesa, grading, CATs..."
            style={{
              width: '100%',
              background: '#0f172a',
              border: '1.5px solid #334155',
              borderRadius: '12px',
              padding: '0.85rem 1rem 0.85rem 2.8rem',
              color: '#ffffff',
              fontSize: '0.95rem',
              outline: 'none',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            }}
          />
          <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', opacity: 0.6 }}>
            🔍
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </section>

      {/* CATEGORY TABS */}
      <section style={{ maxWidth: '960px', margin: '0 auto 1.5rem', padding: '0 1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.5rem',
            scrollbarWidth: 'none',
          }}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  background: isSelected ? '#2563eb' : '#1e293b',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  border: isSelected ? '1px solid #3b82f6' : '1px solid #334155',
                  padding: '7px 14px',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </section>

      {/* FAQ ACCORDION LIST */}
      <section style={{ maxWidth: '960px', margin: '0 auto 4rem', padding: '0 1.5rem' }}>
        {filteredFaqs.length === 0 ? (
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '3rem 2rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔎</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem' }}>No answers found</h3>
            <p style={{ color: '#94a3b8', margin: '0 0 1.5rem', fontSize: '0.9rem' }}>
              We couldn't find any questions matching "{searchQuery}". Try using different terms or browse by category.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('All')
              }}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredFaqs.map((faq) => {
              const isExpanded = expandedId === faq.id
              return (
                <div
                  key={faq.id}
                  style={{
                    background: isExpanded ? '#0f172a' : '#0b1120',
                    border: isExpanded ? '1.5px solid #3b82f6' : '1px solid #1e293b',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(faq.id)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      padding: '1.1rem 1.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      cursor: 'pointer',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: '#38bdf8',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {faq.category}
                      </span>
                      <span
                        style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: isExpanded ? '#60a5fa' : '#f8fafc',
                        }}
                      >
                        {faq.question}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '1.2rem',
                        color: isExpanded ? '#60a5fa' : '#64748b',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0,
                      }}
                    >
                      ▾
                    </span>
                  </button>

                  {isExpanded && (
                    <div
                      style={{
                        padding: '0 1.4rem 1.4rem',
                        borderTop: '1px solid rgba(59, 130, 246, 0.15)',
                        marginTop: '0.25rem',
                        paddingTop: '1rem',
                        color: '#cbd5e1',
                        fontSize: '0.92rem',
                        lineHeight: 1.65,
                      }}
                    >
                      <p style={{ margin: '0 0 0.75rem' }}>{faq.answer}</p>
                      {faq.bullets && faq.bullets.length > 0 && (
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {faq.bullets.map((b, idx) => (
                            <li key={idx} style={{ color: '#94a3b8' }}>
                              <strong style={{ color: '#e2e8f0' }}>{b.split(':')[0]}:</strong>
                              {b.includes(':') ? b.substring(b.indexOf(':') + 1) : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer
        style={{
          background: '#060a12',
          borderTop: '1px solid #1e293b',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.82rem',
        }}
      >
        <div style={{ marginBottom: '0.5rem', fontWeight: 700, color: '#94a3b8' }}>
          Global College &bull; Cloud School Management System &amp; Educational Infrastructure
        </div>
        <div>&copy; {new Date().getFullYear()} Global College SMS. 256-Bit SSL Encrypted Campus Network.</div>
      </footer>
    </div>
  )
}
