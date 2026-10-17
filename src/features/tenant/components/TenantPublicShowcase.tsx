import React, { useState, useMemo } from 'react'
import type { PartnerSchoolTenant, InstitutionProgram, TenantSessionUser } from '@/types/tenantSchool'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import {
  GraduationCapIcon,
  ArrowRightIcon,
  SearchIcon,
  CalendarIcon,
  ClockIcon,
  CreditCardIcon,
  ShieldCheckIcon,
} from '@/components/icons/AppIcons'
import { getContrastColor } from '@/utils/colorContrast'

interface TenantPublicShowcaseProps {
  school: PartnerSchoolTenant
  primaryColor: string
  accentColor: string
  onOpenAdmissions: (programTitle?: string) => void
  onOpenLogin: () => void
  onOpenLicense?: () => void
  currentSession: TenantSessionUser | null
}

export function TenantPublicShowcase({
  school,
  primaryColor,
  accentColor,
  onOpenAdmissions,
  onOpenLogin,
  onOpenLicense,
  currentSession: _currentSession,
}: TenantPublicShowcaseProps) {
  // Gold Tier Authorization
  const isGoldTier =
    school.subscription_tier === 'gold' ||
    school.subscription_tier === 'platinum' ||
    school.subscription_tier === 'enterprise'

  const isPrincipalOrAdmin =
    _currentSession?.role === 'admin' || _currentSession?.role === 'principal'

  const [previewMode, setPreviewMode] = useState(false)

  // Programs Catalog State
  const [programs] = useState<InstitutionProgram[]>(() =>
    tenantSchoolStore.getProgramsBySchool(school.slug)
  )
  const [selectedLevel, setSelectedLevel] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')

  // Level Options for Catalog Filter
  const availableLevels = useMemo(() => {
    const levels = new Set<string>()
    programs.forEach((p) => {
      if (p.level) levels.add(p.level)
    })
    return ['All', ...Array.from(levels)]
  }, [programs])

  // Filtered Programs
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      const matchesLevel = selectedLevel === 'All' || p.level === selectedLevel
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesLevel && matchesSearch
    })
  }, [programs, selectedLevel, searchQuery])

  // Dynamic Fallback Content based on School Category
  const defaultAboutUs = useMemo(() => {
    const cat = school.institution_category || 'college'
    if (cat === 'university') {
      return `${school.name} is a premier higher-education university institution dedicated to academic excellence, groundbreaking research, and societal transformation. Offering accredited undergraduate degree and postgraduate programs across diverse faculties, our campus equips scholars with rigorous intellectual disciplines, state-of-the-art technological resources, and leadership ethics to compete and innovate globally.`
    }
    if (cat === 'school') {
      return `${school.name} is a distinguished primary and secondary academy committed to providing holistic, competency-based foundational and college-preparatory education. We foster an enriching learning environment where every learner thrives academically, morally, and socially through personalized faculty mentorship and modern educational resources.`
    }
    return `${school.name} is a forward-thinking tertiary vocational and technical college providing industry-aligned diplomas, certified skill qualifications, and continuous professional programs. With modern practical laboratories, experienced faculty, and strong corporate linkages, we empower our graduates to lead with competence, integrity, and career-ready practical mastery.`
  }, [school.name, school.institution_category])

  const defaultMission = useMemo(() => {
    return (
      school.mission_statement ||
      `To provide accessible, high-caliber education and practical training that fosters intellectual inquiry, ethical leadership, and transformative technological competencies for global advancement.`
    )
  }, [school.mission_statement])

  const defaultVision = useMemo(() => {
    return (
      school.vision_statement ||
      `To stand as a beacon of academic distinction, vocational excellence, and community innovation, nurturing world-class talent and future-ready professionals.`
    )
  }, [school.vision_statement])

  const defaultWelcome = useMemo(() => {
    return (
      school.principal_welcome_message ||
      `Welcome to ${school.name}. As ${school.principal_title || 'Principal'}, it is my privilege to invite you to explore our vibrant academic community. We take tremendous pride in our dedicated instructors, modern learning facilities, and our steadfast commitment to student success. Whether you are an aspiring scholar or a prospective partner, we invite you to embark on an exceptional educational journey with us.`
    )
  }, [school.name, school.principal_title, school.principal_welcome_message])

  const coreValues = useMemo(() => {
    if (school.core_values && school.core_values.length > 0) return school.core_values
    return [
      { title: 'Academic Excellence', desc: 'Upholding rigorous standards in instruction, continuous assessment, and scholarly inquiry.' },
      { title: 'Integrity & Ethics', desc: 'Fostering moral responsibility, transparency, and accountability across all campus endeavors.' },
      { title: 'Practical Innovation', desc: 'Bridging classroom theory with hands-on technological experience and market relevance.' },
      { title: 'Student-Centric Growth', desc: 'Nurturing the individual potential, career aspirations, and holistic wellbeing of every learner.' },
      { title: 'Community Impact', desc: 'Contributing meaningfully to local and regional development through research and service.' },
    ]
  }, [school.core_values])

  const facilitiesList = useMemo(() => {
    if (school.campus_facilities && school.campus_facilities.length > 0) return school.campus_facilities
    return [
      {
        icon: '💻',
        title: 'Modern Computing & ICT Labs',
        desc: 'Fully networked computer suites with high-speed fiber internet and current industry software.',
      },
      {
        icon: '📚',
        title: 'Digital E-Library & Study Suites',
        desc: 'Extensive repository of academic textbooks, e-journals, research papers, and quiet revision zones.',
      },
      {
        icon: '🔬',
        title: 'Specialized Labs & Workshops',
        desc: 'State-of-the-art practical workshops and science laboratories supporting real-world experiments.',
      },
      {
        icon: '🏛️',
        title: 'Lecture Theaters & Seminar Rooms',
        desc: 'Acoustically treated multi-media lecture halls equipped with digital presentation displays.',
      },
      {
        icon: '⚽',
        title: 'Sports & Student Activity Centers',
        desc: 'Recreational grounds, student clubs, and extracurricular facilities fostering vibrant campus life.',
      },
      {
        icon: '🛡️',
        title: 'Safe & Secure Campus Infrastructure',
        desc: '24/7 security monitoring, biometric attendance verification, and dedicated learner support desks.',
      },
    ]
  }, [school.campus_facilities])

  // Gold Tier Gating: Only Gold Tier (or preview by Principal) activates the dedicated public showcase
  if (!isGoldTier && !previewMode) {
    return (
      <div
        id="about"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fffdf5 100%)',
          borderRadius: '24px',
          border: '2px solid #fde047',
          padding: 'clamp(1.5rem, 3.5vw, 2.5rem)',
          boxShadow: '0 12px 32px rgba(245, 158, 11, 0.08)',
          marginBottom: '2.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#b45309', background: '#fef3c7', padding: '3px 10px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                👑 Gold Tier Feature
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '3px 10px', borderRadius: '6px' }}>
                KES 3,000 / Campus / Month
              </span>
            </div>
            <h2 style={{ fontSize: 'clamp(1.35rem, 2.3vw, 1.75rem)', fontWeight: 900, color: '#0f172a', margin: '0 0 0.4rem', letterSpacing: '-0.01em' }}>
              Dedicated Public Showcase &amp; Academic Programs Catalog
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', lineHeight: 1.55, maxWidth: '720px' }}>
              Publish {school.name}’s interactive academic programs catalog, institutional story, mission, vision, principal welcome address, and campus facilities directly to prospective students and guardians on this landing page.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {isPrincipalOrAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setPreviewMode(true)}
                  style={{
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '0.75rem 1.15rem',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>👁️ Preview Showcase</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenLicense) onOpenLicense()
                    else onOpenLogin()
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '0.75rem 1.4rem',
                    fontWeight: 900,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    boxShadow: '0 6px 18px rgba(217, 119, 6, 0.28)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>👑 Activate Gold Tier Key (KES 3,000/mo) ➔</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 4 Feature Highlights Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '1rem', marginTop: '1.25rem', borderTop: '1px solid #fef08a', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🏛️</span>
            <div>
              <strong style={{ fontSize: '0.84rem', color: '#0f172a', display: 'block' }}>About Us, Mission &amp; Vision</strong>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Custom narrative, founding history, and institutional pillars published publicly.</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>📚</span>
            <div>
              <strong style={{ fontSize: '0.84rem', color: '#0f172a', display: 'block' }}>Interactive Programs Catalog</strong>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Searchable courses, qualification filters, durations, tuition and requirements.</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🎓</span>
            <div>
              <strong style={{ fontSize: '0.84rem', color: '#0f172a', display: 'block' }}>Direct "Apply for Course"</strong>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>One-click admission links routing applicants directly into your SIS register.</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🔬</span>
            <div>
              <strong style={{ fontSize: '0.84rem', color: '#0f172a', display: 'block' }}>Campus Facilities &amp; Amenities</strong>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Showcase IT suites, libraries, laboratories, athletics, and accommodation.</span>
            </div>
          </div>
        </div>

        {!isPrincipalOrAdmin && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Enrolled scholars, faculty, and administrative staff can authenticate into their designated portal desks below:
            </span>
            <a
              href="#portals"
              onClick={(e) => {
                e.preventDefault()
                const el = document.getElementById('portals')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              style={{ fontSize: '0.82rem', fontWeight: 800, color: primaryColor, textDecoration: 'none' }}
            >
              Access School Portals &amp; Desks ↓
            </a>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', marginBottom: '3rem' }}>
      {/* Executive Preview Mode Banner */}
      {previewMode && (
        <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', padding: '0.85rem 1.25rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>👁️</span>
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 900, color: '#1e3a8a' }}>
                Executive Preview Mode (Gold Tier Required for Public View)
              </div>
              <div style={{ fontSize: '0.76rem', color: '#3b82f6' }}>
                This is how your dedicated public showcase appears once the Gold Tier license (KES 3,000/mo) is activated.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                if (onOpenLicense) onOpenLicense()
                else onOpenLogin()
              }}
              style={{ background: '#d97706', color: '#ffffff', border: 'none', padding: '0.45rem 0.9rem', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer' }}
            >
              👑 Activate Gold License Key
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode(false)}
              style={{ background: '#ffffff', color: '#1e3a8a', border: '1px solid #93c5fd', padding: '0.45rem 0.9rem', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer' }}
            >
              Exit Preview ✕
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* QUICK SECTION ANCHOR NAVIGATOR                           */}
      {/* ======================================================== */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '0.65rem 1rem',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#b45309', background: '#fef3c7', border: '1px solid #fde047', padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap', marginRight: '0.25rem' }}>
          👑 Gold Campus Showcase
        </span>
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', marginRight: '0.25rem' }}>
          Explore Campus:
        </span>
        {[
          { id: '#about', label: 'About Us', icon: 'ℹ️' },
          { id: '#programs', label: `Programs Offered (${programs.length})`, icon: '📚' },
          { id: '#admissions', label: 'How to Apply', icon: '📝' },
          { id: '#facilities', label: 'Campus Facilities', icon: '🏛️' },
          { id: '#contact', label: 'Location & Contact', icon: '📍' },
        ].map((item) => (
          <a
            key={item.id}
            href={item.id}
            onClick={(e) => {
              e.preventDefault()
              const el = document.querySelector(item.id)
              if (el) el.scrollIntoView({ behavior: 'smooth' })
            }}
            style={{
              padding: '0.42rem 0.85rem',
              borderRadius: '999px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#334155',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </div>

      {/* ======================================================== */}
      {/* 1. ABOUT US & INSTITUTIONAL PROFILE                      */}
      {/* ======================================================== */}
      <section id="about" style={{ scrollMarginTop: '100px' }}>
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            padding: 'clamp(1.5rem, 3.5vw, 2.75rem)',
            boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.05)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: primaryColor }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 900,
                  color: primaryColor,
                  background: `${primaryColor}14`,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  display: 'inline-block',
                  marginBottom: '8px',
                }}
              >
                Institutional Overview
              </span>
              <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                About {school.name}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '5px 12px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                ✓ Official Accredited Institution
              </span>
              {school.registration_number && (
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1e3a8a', background: '#eff6ff', padding: '5px 12px', borderRadius: '8px' }}>
                  Reg: {school.registration_number}
                </span>
              )}
            </div>
          </div>

          <p style={{ fontSize: '1rem', color: '#334155', lineHeight: 1.7, margin: '0 0 2rem' }}>
            {school.about_us || defaultAboutUs}
          </p>

          {/* Mission & Vision Twin Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: '18px',
                padding: '1.5rem',
                border: '1px solid #e2e8f0',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🎯</span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Our Mission
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
                {defaultMission}
              </p>
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: '18px',
                padding: '1.5rem',
                border: '1px solid #e2e8f0',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🔭</span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Our Vision
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
                {defaultVision}
              </p>
            </div>
          </div>

          {/* Executive Welcome Card */}
          <div
            style={{
              background: '#faf5ff',
              border: `1.5px solid ${primaryColor}30`,
              borderRadius: '20px',
              padding: '1.5rem',
              display: 'flex',
              gap: '1.25rem',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              marginBottom: '2rem',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: primaryColor,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 900,
                flexShrink: 0,
                boxShadow: `0 6px 16px ${primaryColor}40`,
              }}
            >
              {school.principal_name ? school.principal_name.charAt(0) : 'E'}
            </div>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 900, color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Executive Leadership Message
              </div>
              <h4 style={{ margin: '4px 0 8px', fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                Welcome from the {school.principal_title || 'Principal'}
              </h4>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, fontStyle: 'italic' }}>
                "{defaultWelcome}"
              </p>
              <div style={{ marginTop: '10px', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                — {school.principal_name || 'Executive Directorate'}, <span style={{ color: '#64748b' }}>{school.principal_title || 'Principal & CEO'}</span>
              </div>
            </div>
          </div>

          {/* Core Values Strip */}
          <div>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🌟 Guiding Institutional Values
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
              {(typeof coreValues[0] === 'string'
                ? (coreValues as unknown as string[]).map((val) => ({ title: val, desc: '' }))
                : (coreValues as { title: string; desc: string }[])
              ).map((val, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#f8fafc',
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0f172a' }}>
                    {val.title}
                  </div>
                  {val.desc && (
                    <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>
                      {val.desc}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. ACADEMIC PROGRAMS & COURSES OFFERED                   */}
      {/* ======================================================== */}
      <section id="programs" style={{ scrollMarginTop: '100px' }}>
        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 900,
                color: '#2563eb',
                background: '#eff6ff',
                padding: '4px 10px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'inline-block',
                marginBottom: '6px',
              }}
            >
              Academic Catalog
            </span>
            <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              Programs &amp; Courses Offered
            </h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
              Accredited qualifications, practical skill diplomas, certificate programs &amp; career-focused curricula:
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenAdmissions()}
            style={{
              background: accentColor || '#d4af37',
              color: getContrastColor(accentColor || '#d4af37'),
              fontWeight: 900,
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            }}
          >
            <span>Apply Online Now</span>
            <ArrowRightIcon size={14} />
          </button>
        </div>

        {/* Level Filters & Search Toolbar */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '0.85rem 1.15rem',
            border: '1px solid #e2e8f0',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Level Filter Buttons */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {availableLevels.map((lvl) => {
              const active = selectedLevel === lvl
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  style={{
                    background: active ? primaryColor : '#f8fafc',
                    color: active ? '#ffffff' : '#475569',
                    border: active ? `1px solid ${primaryColor}` : '1px solid #e2e8f0',
                    padding: '0.4rem 0.95rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: active ? 800 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {lvl === 'All' ? 'All Qualifications' : lvl}
                </button>
              )
            })}
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative', minWidth: '240px', flex: '1', maxWidth: '340px' }}>
            <SearchIcon
              size={15}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            <input
              type="text"
              placeholder="Search by course name or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.85rem 0.5rem 2.2rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Programs Grid */}
        {filteredPrograms.length === 0 ? (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '3rem 1.5rem',
              textAlign: 'center',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: '2.4rem', marginBottom: '0.75rem' }}>📚</div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.4rem' }}>
              {searchQuery || selectedLevel !== 'All'
                ? 'No matching programs found'
                : 'Academic Programs Currently Under Active Admission'}
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#64748b', maxWidth: '520px', margin: '0 auto 1.5rem' }}>
              {searchQuery || selectedLevel !== 'All'
                ? 'Try adjusting your search criteria or resetting the level filter to see all courses.'
                : `${school.name} is accepting admissions across diverse departments. Inquire directly with the admissions office or submit an open application below.`}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              {(searchQuery || selectedLevel !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLevel('All')
                    setSearchQuery('')
                  }}
                  style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700, cursor: 'pointer', fontSize: '0.84rem' }}
                >
                  Clear Filters
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenAdmissions()}
                style={{ padding: '0.55rem 1.4rem', borderRadius: '8px', border: 'none', background: primaryColor, color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.84rem' }}
              >
                Submit General Application
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.35rem' }}>
            {filteredPrograms.map((prog) => {
              const isDiploma = prog.level === 'Diploma' || prog.level === 'Higher Diploma'
              const isDegree = prog.level === 'Degree' || prog.level === 'Postgraduate'
              const badgeColor = isDegree ? '#7c3aed' : isDiploma ? '#0284c7' : '#059669'

              return (
                <div
                  key={prog.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    padding: '1.6rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: badgeColor }} />

                  <div>
                    {/* Level & Dept Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 900,
                          color: badgeColor,
                          background: `${badgeColor}14`,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {prog.level}
                      </span>
                      {prog.code && (
                        <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 800, color: '#64748b' }}>
                          {prog.code}
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem', lineHeight: 1.35 }}>
                      {prog.title}
                    </h3>

                    {prog.department && (
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>🏛️</span>
                        <span>{prog.department}</span>
                      </div>
                    )}

                    <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.55, margin: '0 0 1.25rem' }}>
                      {prog.description}
                    </p>

                    {/* Metadata Pill Strip */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.25rem', fontSize: '0.78rem', color: '#475569' }}>
                      {prog.duration && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ClockIcon size={14} color="#64748b" />
                          <span><strong>Duration:</strong> {prog.duration}</span>
                        </div>
                      )}
                      {prog.intake_period && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CalendarIcon size={14} color="#64748b" />
                          <span><strong>Intakes:</strong> {prog.intake_period}</span>
                        </div>
                      )}
                      {((prog.tuition_fee !== undefined && prog.tuition_fee > 0) || (prog.fee_per_term !== undefined && prog.fee_per_term > 0)) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CreditCardIcon size={14} color="#64748b" />
                          <span>
                            <strong>Tuition Rate:</strong> {school.currency || 'KES'} {(prog.tuition_fee || prog.fee_per_term || 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Entry Requirements Notice */}
                    {prog.requirements && (
                      <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.76rem', color: '#475569', marginBottom: '1.25rem', lineHeight: 1.45 }}>
                        <strong style={{ color: '#0f172a' }}>Entry Criteria:</strong> {prog.requirements}
                      </div>
                    )}
                  </div>

                  {/* Apply Action Button */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => onOpenAdmissions(prog.title)}
                      style={{
                        width: '100%',
                        background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 120%)`,
                        color: '#ffffff',
                        fontWeight: 800,
                        padding: '0.75rem',
                        borderRadius: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.86rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: `0 4px 14px ${primaryColor}30`,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <GraduationCapIcon size={16} />
                      <span>Apply for this Program ➔</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 3. ADMISSIONS & HOW TO APPLY (3-STEP GUIDE)              */}
      {/* ======================================================== */}
      <section id="admissions" style={{ scrollMarginTop: '100px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: '24px',
            padding: 'clamp(1.75rem, 4vw, 3rem)',
            color: '#ffffff',
            boxShadow: '0 12px 36px -8px rgba(15, 23, 42, 0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: accentColor || '#d4af37' }} />

          <div style={{ maxWidth: '720px', marginBottom: '2.5rem' }}>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 900,
                color: accentColor || '#d4af37',
                background: 'rgba(255,255,255,0.1)',
                padding: '4px 12px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'inline-block',
                marginBottom: '8px',
              }}
            >
              Admissions Pathway
            </span>
            <h2 style={{ fontSize: 'clamp(1.6rem, 2.8vw, 2.2rem)', fontWeight: 900, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
              How to Apply for Admission
            </h2>
            <p style={{ margin: 0, fontSize: '0.95rem', color: '#94a3b8', lineHeight: 1.6 }}>
              Joining {school.name} is straightforward. Follow our streamlined 3-step digital enrollment process to secure your placement:
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            {/* Step 1 */}
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '18px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '10px' }}>1️⃣</div>
              <h3 style={{ fontSize: '1.08rem', fontWeight: 900, margin: '0 0 6px', color: '#ffffff' }}>
                Select Your Program
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                Explore accredited certificates, diplomas or degrees and confirm you meet the stated entry qualifications.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '18px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '10px' }}>2️⃣</div>
              <h3 style={{ fontSize: '1.08rem', fontWeight: 900, margin: '0 0 6px', color: '#ffffff' }}>
                Submit Online Application
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                Fill out the quick candidate admission form with your personal details, guardian contact, and prior schooling.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '18px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '10px' }}>3️⃣</div>
              <h3 style={{ fontSize: '1.08rem', fontWeight: 900, margin: '0 0 6px', color: '#ffffff' }}>
                Receive Official Letter
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                Once verified by the admissions office, receive your official Letter of Admission and portal access credentials.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => onOpenAdmissions()}
              style={{
                background: accentColor || '#d4af37',
                color: getContrastColor(accentColor || '#d4af37'),
                fontWeight: 900,
                padding: '0.85rem 1.75rem',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.92rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
              }}
            >
              <span>Begin Online Application Now</span>
              <ArrowRightIcon size={16} />
            </button>
            <button
              type="button"
              onClick={onOpenLogin}
              style={{
                background: 'transparent',
                color: '#cbd5e1',
                fontWeight: 700,
                padding: '0.85rem 1.4rem',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer',
                fontSize: '0.88rem',
              }}
            >
              Already Registered? Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. CAMPUS FACILITIES & LEARNING INFRASTRUCTURE           */}
      {/* ======================================================== */}
      <section id="facilities" style={{ scrollMarginTop: '100px' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 900,
              color: '#059669',
              background: '#ecfdf5',
              padding: '4px 10px',
              borderRadius: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'inline-block',
              marginBottom: '6px',
            }}
          >
            Campus Infrastructure
          </span>
          <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 900, color: '#0f172a', margin: 0 }}>
            Modern Campus Facilities &amp; Amenities
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Equipped with modern learning environments designed to foster practical competence and scholarly success:
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
          {facilitiesList.map((fac, idx) => (
            <div
              key={idx}
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '1.5rem',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 14px -2px rgba(15, 23, 42, 0.03)',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: `${primaryColor}10`,
                  color: primaryColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  flexShrink: 0,
                }}
              >
                {fac.icon || '🏛️'}
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>
                  {fac.title}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                  {fac.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. CAMPUS DIRECTORY, LOCATION & CONTACT                  */}
      {/* ======================================================== */}
      <section id="contact" style={{ scrollMarginTop: '100px' }}>
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            padding: 'clamp(1.5rem, 3.5vw, 2.5rem)',
            boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.05)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: '2rem',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 900,
                color: primaryColor,
                background: `${primaryColor}14`,
                padding: '4px 10px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'inline-block',
                marginBottom: '8px',
              }}
            >
              Official Directory
            </span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem' }}>
              Campus Contact &amp; Location
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
              Connect with our administrative office, admissions registrar, or visit our primary campus:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.86rem' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.1rem' }}>📍</span>
                <div>
                  <strong style={{ color: '#0f172a' }}>Campus Address:</strong>
                  <div style={{ color: '#64748b', marginTop: '2px' }}>
                    {school.address || 'Main Campus Plaza'} • {school.city}, {school.country}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.1rem' }}>📞</span>
                <div>
                  <strong style={{ color: '#0f172a' }}>Admissions Phone:</strong>
                  <div style={{ color: '#64748b', marginTop: '2px' }}>
                    {school.contact_phone || '+254 700 000 000'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.1rem' }}>✉️</span>
                <div>
                  <strong style={{ color: '#0f172a' }}>Registrar Email:</strong>
                  <div style={{ color: '#64748b', marginTop: '2px' }}>
                    {school.contact_email || `admissions@${school.slug}.ac.ke`}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.1rem' }}>🕒</span>
                <div>
                  <strong style={{ color: '#0f172a' }}>Campus Working Hours:</strong>
                  <div style={{ color: '#64748b', marginTop: '2px' }}>
                    Monday – Friday: 8:00 AM – 5:00 PM • Saturday: 9:00 AM – 1:00 PM
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: '#f8fafc',
              borderRadius: '20px',
              padding: '1.75rem',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                <ShieldCheckIcon size={22} color="#16a34a" />
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                  Institutional Accreditation
                </h4>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.55, margin: '0 0 1rem' }}>
                {school.name} is an authorized and registered institution operating on the Global College Cloud Student Information System. Official documents and transcripts issued carry verified tamper-proof biometric barcodes.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 700 }}>
                <div>✓ Ministry / TVETA Accreditation Registered</div>
                <div>✓ Multi-Campus SIS Cloud Synchronized</div>
                <div>✓ Standard Automated Grading &amp; Transcripts</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => onOpenAdmissions()}
                style={{
                  flex: 1,
                  background: primaryColor,
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                Inquire / Apply Online
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
