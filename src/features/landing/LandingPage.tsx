import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { SafariInstallModal } from '@/components/shared/SafariInstallModal'
import { AppLogo } from '@/components/common/AppLogo'
import { isNativeApp, isElectronApp } from '@/utils/platform'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import type { PartnerSchoolTenant } from '@/types/tenantSchool'

export function LandingPage() {
  const navigate = useNavigate()
  const { isInstalled, isIOS, showInstallGuide, setShowInstallGuide, promptInstall, promptNativeInstall, hasNativePrompt } = usePWAInstall()
  const [schools, setSchools] = useState<PartnerSchoolTenant[]>(() => tenantSchoolStore.getSchools())
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const handleUpdate = () => {
      setSchools(tenantSchoolStore.getSchools())
    }
    window.addEventListener('gc-tenant-schools-updated', handleUpdate)
    return () => window.removeEventListener('gc-tenant-schools-updated', handleUpdate)
  }, [])

  const filteredSchools = schools.filter((s) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return false
    return s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q)
  })

  const features = [
    {
      icon: '🏛️',
      title: 'Multi-Campus Architecture',
      desc: 'Each institution receives an independent, branded campus hub and portal — e.g. prime.globalcollege.cloud or /s/prime.',
    },
    {
      icon: '👨‍🎓',
      title: 'Full Student Lifecycle',
      desc: 'Online admissions, course registrations, timetables, continuous assessments, and automated transcript generation.',
    },
    {
      icon: '💳',
      title: 'Automated Finance & Bursar Desk',
      desc: 'Direct M-Pesa automated reconciliation, instant digital fee receipts, fee balances, and institutional payroll.',
    },
    {
      icon: '📊',
      title: 'Principal & Executive Desk',
      desc: 'Live enrollment metrics, campus-wide audit logs, faculty oversight, and official Ministry compliance reporting.',
    },
    {
      icon: '👨‍👩‍👧',
      title: 'Parent & Sponsor Portal',
      desc: 'Guardians monitor daily attendance, continuous assessment test (CAT) marks, and fee clearances from any smartphone.',
    },
    {
      icon: '📜',
      title: 'QR-Verifiable Digital Transcripts',
      desc: 'Auto-generated, tamper-proof academic report cards and graduation certificates embossed with your official digital seal.',
    },
  ]

  const steps = [
    {
      n: '1',
      label: 'Register Institution Profile',
      desc: 'Enter institution name, academic calendar (Semester, Term, Trimester), campus branches, and admin credentials.',
    },
    {
      n: '2',
      label: 'Instant Cloud Provisioning',
      desc: 'Your institutional database, role portals, departments, and class gradebooks are configured automatically in seconds.',
    },
    {
      n: '3',
      label: 'Launch Official Campus Portal',
      desc: 'Share your dedicated portal link with staff, teachers, bursars, and students to begin operations immediately.',
    },
  ]

  return (
    <div style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#0f172a', overflowX: 'hidden', background: '#f8fafc', minHeight: '100vh' }}>
      <style>{`
        .landing-nav-btn {
          transition: all 0.15s ease;
        }
        .landing-nav-btn:hover {
          transform: translateY(-1px);
        }
        .landing-hero-cta {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .landing-hero-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25) !important;
        }
        .landing-feature-card {
          transition: all 0.2s ease;
        }
        .landing-feature-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08) !important;
          border-color: #93c5fd !important;
        }
        @media (max-width: 640px) {
          .nav-hide-mobile {
            display: none !important;
          }
          .landing-nav-wrap {
            padding-left: 0.85rem !important;
            padding-right: 0.85rem !important;
          }
          .landing-nav-brand {
            max-width: 150px;
            overflow: hidden;
          }
          .landing-btn-text {
            font-size: 0.78rem !important;
            padding: 0.45rem 0.65rem !important;
          }
          .mobile-text {
            display: inline !important;
          }
          .desktop-text {
            display: none !important;
          }
          .landing-hero-gradient-text {
            color: #93c5fd !important;
            -webkit-text-fill-color: #93c5fd !important;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5) !important;
          }
        }
        @media (min-width: 641px) {
          .mobile-text {
            display: none !important;
          }
          .desktop-text {
            display: inline !important;
          }
        }
      `}</style>

      {/* TOP NAVIGATION */}
      <nav
        className="landing-nav-wrap"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid #e2e8f0',
          paddingTop: 'max(0.75rem, env(safe-area-inset-top, 10px))',
          paddingBottom: '0.75rem',
          paddingLeft: '1.25rem',
          paddingRight: '1.25rem',
          minHeight: 'calc(62px + env(safe-area-inset-top, 10px))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
        }}
      >
        <div
          onClick={() => navigate('/')}
          className="landing-nav-brand"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          title="Global College — School Management System & Portals"
        >
          <AppLogo size="sm" showTagline={false} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
          {!isInstalled && !isNativeApp() && !isElectronApp() && (
            <button
              type="button"
              onClick={() => promptInstall()}
              className="landing-nav-btn nav-hide-mobile"
              style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Install Global College App"
            >
              <span>📲</span>
              <span>Install App</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="landing-nav-btn landing-btn-text"
            style={{
              background: '#f8fafc',
              color: '#1e293b',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.45rem 0.75rem',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => navigate('/register-school')}
            className="landing-nav-btn landing-btn-text"
            style={{
              background: '#1d4ed8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.45rem 0.95rem',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(29, 78, 216, 0.25)',
            }}
          >
            <span className="desktop-text">Register School ➔</span>
            <span className="mobile-text">Register ➔</span>
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section
        style={{
          background: 'radial-gradient(ellipse at top, #1e3a8a 0%, #0f172a 65%, #030712 100%)',
          color: '#ffffff',
          padding: 'clamp(2.5rem, 6vw, 5rem) 1.25rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '840px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '999px',
              padding: '0.35rem 1.1rem',
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: '#f8fafc',
              marginBottom: '1.5rem',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            }}
          >
            <span>🚀</span>
            <span>CLOUD SCHOOL MANAGEMENT PLATFORM</span>
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: 'clamp(2rem, 5.5vw, 3.6rem)',
              fontWeight: 900,
              lineHeight: 1.15,
              margin: '0 0 1.25rem',
              letterSpacing: '-0.03em',
              color: '#ffffff',
            }}
          >
            Give Your School Its Own<br />
            <span
              className="landing-hero-gradient-text"
              style={{
                color: '#93c5fd',
                backgroundImage: 'linear-gradient(135deg, #bfdbfe 0%, #60a5fa 45%, #fde68a 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block',
              }}
            >
              Professional Digital Campus
            </span>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 'clamp(0.95rem, 2.2vw, 1.18rem)',
              color: '#e2e8f0',
              lineHeight: 1.65,
              margin: '0 0 2rem',
              maxWidth: '640px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Manage students, faculty, fees, exams, and transcripts from your school&apos;s own dedicated cloud portal. Live in under 5 minutes.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate('/register-school')}
              className="landing-hero-cta"
              style={{
                background: '#ffffff',
                color: '#0f172a',
                border: 'none',
                borderRadius: '12px',
                padding: '0.85rem 2rem',
                fontWeight: 900,
                fontSize: '0.98rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
              }}
            >
              <span>🏫</span>
              <span>Register Your School</span>
            </button>

            {!isInstalled && !isNativeApp() && !isElectronApp() && (
              <button
                type="button"
                onClick={() => promptInstall()}
                className="landing-hero-cta"
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  border: '1.5px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  padding: '0.85rem 1.6rem',
                  fontWeight: 800,
                  fontSize: '0.98rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span>📲</span>
                <span>Install Mobile App</span>
              </button>
            )}
          </div>

          {/* ── Instant Campus Portal Access / Switcher Widget ── */}
          <div
            style={{
              marginTop: '2.5rem',
              background: 'rgba(15, 23, 42, 0.82)',
              border: '1.5px solid rgba(147, 197, 253, 0.3)',
              borderRadius: '16px',
              padding: '1.25rem 1.35rem',
              backdropFilter: 'blur(16px)',
              maxWidth: '580px',
              margin: '2.5rem auto 0',
              textAlign: 'left',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.45)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', fontWeight: 800, fontSize: '0.92rem' }}>
                <span style={{ fontSize: '1.15rem' }}>🏛️</span>
                <span>Find & Enter Your Campus Portal</span>
              </div>
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#93c5fd',
                  background: 'rgba(59, 130, 246, 0.25)',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontWeight: 700,
                  border: '1px solid rgba(147, 197, 253, 0.3)',
                }}
              >
                Students • Teachers • Staff
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Enter school name or portal code (e.g. prime)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const q = searchQuery.trim().toLowerCase()
                    if (!q) return
                    const match = schools.find(
                      (s) => s.slug.toLowerCase() === q || s.name.toLowerCase().includes(q)
                    )
                    if (match) {
                      navigate(`/s/${match.slug}`)
                    } else {
                      navigate(`/s/${q}`)
                    }
                  }
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: '#ffffff',
                  border: '1.5px solid #93c5fd',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const q = searchQuery.trim().toLowerCase()
                  if (!q) {
                    if (schools.length > 0) {
                      navigate(`/s/${schools[0].slug}`)
                    } else {
                      navigate('/login')
                    }
                    return
                  }
                  const match = schools.find(
                    (s) => s.slug.toLowerCase() === q || s.name.toLowerCase().includes(q)
                  )
                  if (match) {
                    navigate(`/s/${match.slug}`)
                  } else {
                    navigate(`/s/${q}`)
                  }
                }}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.65rem 1.1rem',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
                }}
              >
                <span>Enter</span>
                <span>➔</span>
              </button>
            </div>

            {/* Live Search Results or Registered Schools List */}
            {searchQuery.trim() ? (
              <div
                style={{
                  marginTop: '0.75rem',
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #bfdbfe',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
                }}
              >
                {filteredSchools.length > 0 ? (
                  filteredSchools.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => navigate(`/s/${s.slug}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') navigate(`/s/${s.slug}`)
                      }}
                      style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        color: '#0f172a',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>🏛️</span>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          /s/{s.slug} {s.motto ? `• ${s.motto}` : ''}
                        </div>
                      </div>
                      <span
                        style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          flexShrink: 0,
                          marginLeft: '8px',
                        }}
                      >
                        Enter ➔
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '10px', textAlign: 'center', fontSize: '0.78rem', color: '#64748b' }}>
                    No school campus found matching &quot;{searchQuery}&quot;. Press &quot;Enter ➔&quot; to open direct slug <code>/s/{searchQuery.trim().toLowerCase()}</code>.
                  </div>
                )}
              </div>
            ) : schools.length > 0 ? (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Active Campuses:</span>
                {schools.slice(0, 4).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => navigate(`/s/${s.slug}`)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.12)',
                      border: '1px solid rgba(255, 255, 255, 0.22)',
                      color: '#ffffff',
                      borderRadius: '999px',
                      padding: '3px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>🏛️</span>
                    <span>{s.name}</span>
                    <span style={{ color: '#93c5fd' }}>➔</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: '0.65rem', fontSize: '0.74rem', color: '#94a3b8' }}>
                💡 New to the platform?{' '}
                <span
                  onClick={() => navigate('/register-school')}
                  style={{ color: '#93c5fd', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}
                >
                  Register your school profile
                </span>{' '}
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              color: '#94a3b8',
              fontSize: '0.82rem',
              fontWeight: 600,
              marginTop: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            <span>⚡ Instant Cloud Provisioning</span>
            <span>&bull;</span>
            <span>🌐 Custom Subdomains</span>
            <span>&bull;</span>
            <span>🏛️ Multi-Campus Portals</span>
          </div>
        </div>
      </section>

      {/* URL DEMO / BROWSER BAR MOCKUP */}
      <section style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '2.5rem 1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Your School Gets Its Own Dedicated Cloud URL
        </p>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#ffffff',
            border: '2px solid #2563eb',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.12)',
            fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
            fontWeight: 800,
            maxWidth: '100%',
          }}
        >
          <span style={{ padding: '0.65rem 1rem', background: '#dbeafe', color: '#1d4ed8', borderRight: '1px solid #bfdbfe' }}>
            🔒 yourschool
          </span>
          <span style={{ padding: '0.65rem 1.25rem', color: '#475569' }}>
            .globalcollege.cloud
          </span>
        </div>

        <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.75rem' }}>
          Or connect your official registered domain (e.g. <code>portal.yourcollege.ac.ke</code>)
        </p>
      </section>

      {/* CORE FEATURES GRID */}
      <section style={{ padding: 'clamp(3rem, 6vw, 5rem) 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ display: 'inline-block', background: '#e0e7ff', color: '#3730a3', padding: '3px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            INSTITUTIONAL CAPABILITIES
          </div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.4rem)', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem' }}>
            Everything Your School Needs to Run
          </h2>
          <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>
            Unified governance across all departments, roles, and branch campuses.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {features.map((f) => (
            <div
              key={f.title}
              className="landing-feature-card"
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  marginBottom: '1rem',
                  border: '1px solid #bfdbfe',
                }}
              >
                {f.icon}
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.45rem' }}>
                {f.title}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.55 }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS / 3 STEPS */}
      <section style={{ background: '#0f172a', color: '#ffffff', padding: 'clamp(3rem, 6vw, 5rem) 1.5rem' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', padding: '3px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ONBOARDING WORKFLOW
          </div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.4rem)', fontWeight: 900, margin: '0 0 0.5rem', color: '#ffffff' }}>
            Live in 3 Simple Steps
          </h2>
          <p style={{ color: '#94a3b8', margin: '0 0 2.5rem', fontSize: '1rem' }}>
            Zero server installation or complicated IT configuration required.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
            {steps.map((s) => (
              <div
                key={s.n}
                style={{
                  display: 'flex',
                  gap: '1.25rem',
                  alignItems: 'flex-start',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '1.25rem 1.5rem',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#1d4ed8',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1.15rem',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(29, 78, 216, 0.4)',
                  }}
                >
                  {s.n}
                </div>
                <div>
                  <div style={{ fontWeight: 800, marginBottom: '4px', fontSize: '1.05rem', color: '#ffffff' }}>
                    {s.label}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.5 }}>
                    {s.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section style={{ padding: 'clamp(3rem, 6vw, 5rem) 1.5rem', textAlign: 'center', background: '#eff6ff' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.4rem)', fontWeight: 900, color: '#0f172a', margin: '0 0 0.75rem' }}>
            Ready to Digitise Your Campus?
          </h2>
          <p style={{ color: '#475569', margin: '0 0 2rem', fontSize: '1rem', lineHeight: 1.6 }}>
            Join partner schools already managing admissions, gradebooks, fees, and digital certificates on Global College Cloud.
          </p>
          <button
            type="button"
            onClick={() => navigate('/register-school')}
            className="landing-hero-cta"
            style={{
              background: '#1d4ed8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '1rem 2.5rem',
              fontWeight: 900,
              fontSize: '1.05rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(29, 78, 216, 0.35)',
            }}
          >
            <span>🏫</span>
            <span>Register Your Institution ➔</span>
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#0a0f1d', color: '#64748b', padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.82rem', borderTop: '1px solid #1e293b' }}>
        <div style={{ marginBottom: '0.5rem', fontWeight: 700, color: '#94a3b8' }}>
          Global College &bull; Cloud School Management System & Educational Infrastructure &bull;{' '}
          <button
            type="button"
            onClick={() => navigate('/faq')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38bdf8',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: 'inherit',
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            FAQ &amp; Help Desk
          </button>
        </div>
        <div>
          &copy; {new Date().getFullYear()} Global College SMS. 256-Bit SSL Encrypted Campus Network.
        </div>
      </footer>

      <SafariInstallModal
        isOpen={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
        isIOS={isIOS}
        hasNativePrompt={hasNativePrompt}
        onNativeInstallPrompt={promptNativeInstall}
      />
    </div>
  )
}
