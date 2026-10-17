import { useNavigate } from 'react-router-dom'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { SafariInstallModal } from '@/components/shared/SafariInstallModal'
import { AppLogo } from '@/components/common/AppLogo'
import { isNativeApp, isElectronApp } from '@/utils/platform'

export function LandingPage() {
  const navigate = useNavigate()
  const { isInstalled, isIOS, showInstallGuide, setShowInstallGuide, promptInstall, promptNativeInstall, hasNativePrompt } = usePWAInstall()

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
    <div style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#0f172a', overflowX: 'hidden', background: '#f8fafc' }}>
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
            padding: 0 0.85rem !important;
          }
          .landing-nav-brand {
            max-width: 170px;
            overflow: hidden;
          }
          .landing-btn-text {
            font-size: 0.78rem !important;
            padding: 0.4rem 0.75rem !important;
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
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
              padding: '0.45rem 0.85rem',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Admin Sign In
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
              padding: '0.45rem 1rem',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(29, 78, 216, 0.25)',
            }}
          >
            Register School ➔
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section
        style={{
          background: 'radial-gradient(ellipse at top, #1e3a8a 0%, #0f172a 60%, #030712 100%)',
          color: '#ffffff',
          padding: 'clamp(3rem, 7vw, 5.5rem) 1.5rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '820px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
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
              fontSize: 'clamp(2.1rem, 5.5vw, 3.6rem)',
              fontWeight: 900,
              lineHeight: 1.15,
              margin: '0 0 1.25rem',
              letterSpacing: '-0.03em',
              color: '#ffffff',
            }}
          >
            Give Your School Its Own<br />
            <span
              style={{
                background: 'linear-gradient(135deg, #93c5fd 0%, #60a5fa 45%, #fde68a 100%)',
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
              fontSize: 'clamp(1rem, 2.2vw, 1.2rem)',
              color: '#cbd5e1',
              lineHeight: 1.65,
              margin: '0 0 2.25rem',
              maxWidth: '620px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Manage students, faculty, fees, exams, and transcripts from your school's own dedicated cloud portal. Live in under 5 minutes.
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
                padding: '0.9rem 2.2rem',
                fontWeight: 900,
                fontSize: '1rem',
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
                  padding: '0.9rem 1.8rem',
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span>📲</span>
                <span>Install Web App</span>
              </button>
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
