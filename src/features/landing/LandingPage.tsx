import { useNavigate } from 'react-router-dom'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { SafariInstallModal } from '@/components/shared/SafariInstallModal'

export function LandingPage() {
  const navigate = useNavigate()
  const { isInstalled, isIOS, showInstallGuide, setShowInstallGuide, promptInstall } = usePWAInstall()

  const features = [
    { icon: '🏫', title: 'Multi-Campus Management', desc: 'Each school gets its own branded URL and isolated portal — e.g. prime.cloud.eclat.institute' },
    { icon: '👨‍🎓', title: 'Full Student Lifecycle', desc: 'Admissions, timetables, exams, grades, transcripts, certificates — all in one place.' },
    { icon: '💳', title: 'Fee & Finance Module', desc: 'Bursar desk, M-Pesa & card payments, fee ledgers, instalment tracking.' },
    { icon: '📊', title: 'Principal Dashboard', desc: 'Real-time enrolment stats, staff management, credential provisioning and school reports.' },
    { icon: '👨‍👩‍👧', title: 'Parent & Sponsor Portal', desc: 'Parents track attendance, fee clearance and academic reports from any device.' },
    { icon: '📜', title: 'Digital Certificates', desc: 'Auto-generated, verifiable PDF certificates issued under your school seal.' },
  ]

  const steps = [
    { n: '1', label: 'Fill in your school details', desc: 'Name, type, country, currency, and admin credentials.' },
    { n: '2', label: 'Instant provisioning', desc: 'Your school hub is created immediately on our cloud.' },
    { n: '3', label: 'Go live on your URL', desc: 'Share schoolname.cloud.eclat.institute with staff and students.' },
  ]

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#0f172a', overflowX: 'hidden' }}>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e2e8f0', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#0f172a', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🏛️ SchoolCloud
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {!isInstalled && (
            <button
              onClick={() => promptInstall()}
              style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.45rem 0.85rem', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              title="Install SchoolCloud Web App"
            >
              <span>📲</span>
              <span>Install App</span>
            </button>
          )}
          <button
            onClick={() => navigate('/login')}
            style={{ background: 'transparent', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.45rem 0.85rem', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            Admin Sign In
          </button>
          <button
            onClick={() => navigate('/register-school')}
            style={{ background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.45rem 1.1rem', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            Register Your School →
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%)', color: '#fff', padding: 'clamp(3rem, 8vw, 6rem) 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.12)', borderRadius: '20px', padding: '0.35rem 1rem', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '1.5rem' }}>
            🚀 CLOUD SCHOOL MANAGEMENT PLATFORM
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, margin: '0 0 1.25rem', letterSpacing: '-0.02em' }}>
            Give Your School Its Own<br />
            <span style={{ color: '#93c5fd' }}>Professional Digital Campus</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#cbd5e1', lineHeight: 1.65, margin: '0 0 2.5rem', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
            Manage students, staff, fees, exams, and certificates — all from your school's own branded URL. Set up in minutes.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/register-school')}
              style={{ background: '#fff', color: '#1e3a8a', border: 'none', borderRadius: '12px', padding: '0.9rem 2rem', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}
            >
              🏫 Register Your School
            </button>
            {!isInstalled && (
              <button
                onClick={() => promptInstall()}
                style={{ background: 'rgba(255, 255, 255, 0.12)', color: '#fff', border: '1.5px solid rgba(255, 255, 255, 0.3)', borderRadius: '12px', padding: '0.9rem 1.8rem', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <span>📲</span> Install Web App
              </button>
            )}
          </div>
          <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '1rem' }}>
            Instant Setup · Custom Domain · Multi-Campus Portals
          </p>
        </div>
      </section>

      {/* URL DEMO */}
      <section style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.75rem', fontWeight: 600 }}>YOUR SCHOOL GETS ITS OWN DEDICATED URL</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0, background: '#fff', border: '2px solid #1e3a8a', borderRadius: '10px', overflow: 'hidden', fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)', fontWeight: 700 }}>
          <span style={{ padding: '0.6rem 1rem', background: '#eff6ff', color: '#1e3a8a' }}>yourschool</span>
          <span style={{ padding: '0.6rem 1rem', color: '#64748b' }}>.cloud.eclat.institute</span>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: 'clamp(3rem, 6vw, 5rem) 1.5rem' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', fontWeight: 900, margin: '0 0 0.75rem' }}>Everything your school needs</h2>
          <p style={{ textAlign: 'center', color: '#64748b', margin: '0 0 3rem', fontSize: '1rem' }}>One platform. Every role. Any device.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {features.map((f) => (
              <div key={f.title} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.4rem' }}>{f.title}</div>
                <div style={{ color: '#64748b', fontSize: '0.87rem', lineHeight: 1.55 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background: '#0f172a', color: '#fff', padding: 'clamp(3rem, 6vw, 5rem) 1.5rem' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', fontWeight: 900, margin: '0 0 0.75rem' }}>Live in 3 steps</h2>
          <p style={{ color: '#94a3b8', margin: '0 0 3rem', fontSize: '0.95rem' }}>No technical knowledge required.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
            {steps.map((s) => (
              <div key={s.n} style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '1.25rem 1.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem', flexShrink: 0 }}>{s.n}</div>
                <div>
                  <div style={{ fontWeight: 800, marginBottom: '4px', fontSize: '1rem' }}>{s.label}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.87rem', lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: 'clamp(3rem, 6vw, 5rem) 1.5rem', textAlign: 'center', background: '#eff6ff' }}>
        <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', fontWeight: 900, margin: '0 0 1rem' }}>Ready to onboard your school?</h2>
        <p style={{ color: '#475569', margin: '0 0 2rem', fontSize: '1rem' }}>Join schools already running on the platform.</p>
        <button
          onClick={() => navigate('/register-school')}
          style={{ background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: '12px', padding: '1rem 2.5rem', fontWeight: 900, fontSize: '1.05rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(30,58,138,0.3)' }}
        >
          🏫 Register Your Institution →
        </button>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#0f172a', color: '#475569', padding: '1.5rem', textAlign: 'center', fontSize: '0.78rem' }}>
        © {new Date().getFullYear()} cloud.eclat.institute · School Management Platform
      </footer>

      <SafariInstallModal
        isOpen={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
        isIOS={isIOS}
      />
    </div>
  )
}
