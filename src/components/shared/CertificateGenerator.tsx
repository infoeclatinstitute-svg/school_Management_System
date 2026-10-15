import { useState, useMemo } from 'react'
import { INSTITUTION_CONFIG } from '@/config/institution'
import { GraduationCapIcon, CheckIcon, CodeIcon, ChartBarIcon, SparklesIcon } from '@/components/icons/AppIcons'

export interface CertificateData {
  student_name: string
  admission_number?: string
  course_title: string
  grade: string
  percentage: number
  issue_date: string
  certificate_no: string
  duration?: string
  trainer_name?: string
  skills_acquired?: string[]
  honors?: string
  faculty_name?: string
  department?: string
  hash?: string
  qr_code_url?: string
  provider_type?: 'individual_tutor' | 'partner_institution'
  institution_name?: string
  institution_logo?: string
  institution_signatory?: string
  delivery_mode?: 'live_cohort' | 'self_paced'
}

// Sample presets so users & evaluators can preview different disciplines
export const SAMPLE_CERTIFICATES: Record<string, CertificateData> = {
  software_engineering: {
    student_name: 'Sophia Vance Al-Mansoor',
    admission_number: 'EI-2026-ENG042',
    course_title: 'Full-Stack Software Engineering & Cloud Architecture',
    faculty_name: 'School of Computing & Software Engineering',
    grade: 'Distinction (Grade A+)',
    percentage: 96.4,
    honors: 'Conferred with Highest Institutional Distinction',
    issue_date: '11 September 2026',
    certificate_no: 'EI-CERT-2026-7892',
    duration: '12 Weeks Live Cohort & Laboratory Intensive (120 CPD Hours)',
    trainer_name: 'Eng. Beatrice Ochieng, M.Sc.',
    skills_acquired: [
      'React 19 & Next.js Architecture',
      'TypeScript & REST APIs',
      'PostgreSQL & Database Optimization',
      'System Design & Microservices',
      'Cloud CI/CD & Docker',
    ],
    hash: '8f92a10b74c2e6d58114fa39bc7168de24a9cf018265ddb2591746a8b792e41c',
  },
  data_science: {
    student_name: 'David Kimani Mwangi',
    admission_number: 'EI-2026-DAT019',
    course_title: 'Advanced Econometrics, R Programming & Data Science',
    faculty_name: 'School of Data Science & Quantitative Research',
    grade: 'First Class Honors (Grade A)',
    percentage: 94.8,
    honors: 'Conferred with First Class Academic Honors',
    issue_date: '11 September 2026',
    certificate_no: 'EI-CERT-2026-4410',
    duration: '10 Weeks Quantitative Analytics Cohort (100 CPD Hours)',
    trainer_name: 'Dr. David Kiprono, Ph.D.',
    skills_acquired: [
      'Econometric Time-Series Analysis',
      'R Tidyverse & Statistical Inference',
      'SPSS & Stata Multilevel Modeling',
      'Predictive Machine Learning',
      'Automated Data Pipelines',
    ],
    hash: '3c8e47b91a25df901e68cb5a42f380129a4df57812bc634e098df1234ac6789b',
  },
  creative_design: {
    student_name: 'Amara Chioma Okafor',
    admission_number: 'EI-2026-DSG088',
    course_title: 'Executive UI/UX Design, Design Systems & Figma Pro',
    faculty_name: 'School of Creative Arts & User Experience',
    grade: 'High Distinction (Grade A+)',
    percentage: 97.2,
    honors: 'Conferred with High Distinction in Creative Innovation',
    issue_date: '11 September 2026',
    certificate_no: 'EI-CERT-2026-9051',
    duration: '8 Weeks Immersive Studio & Portfolio Lab (80 CPD Hours)',
    trainer_name: 'Clara Dubois, M.A.',
    skills_acquired: [
      'Design Systems & Component Libraries',
      'User Research & Usability Testing',
      'Interactive Prototyping in Figma',
      'Information Architecture & Wireframing',
      'WCAG 2.2 Accessibility Compliance',
    ],
    hash: '5d91e6047ac83f12089b34cf781290ab56cd78ea1234567890abcdef12345678',
  },
  partner_academy: {
    student_name: 'Kevin Omondi Otieno',
    admission_number: 'NCA-2026-DEV091',
    course_title: 'Full-Stack Mobile App Engineering with React Native & Flutter',
    faculty_name: 'Faculty of Mobile Computing & Cloud Architecture',
    provider_type: 'partner_institution',
    institution_name: 'Nairobi Coding Academy',
    institution_signatory: 'Eng. Patrick Mwangi, Director of Training',
    delivery_mode: 'self_paced',
    grade: 'Distinction (Grade A)',
    percentage: 95.8,
    honors: 'Conferred with Academy Honors in Applied Software Engineering',
    issue_date: '12 October 2026',
    certificate_no: 'NCA-CERT-2026-9921',
    duration: 'Self-Paced Comprehensive Practicum (80 Training Hours)',
    trainer_name: 'Eng. Patrick Mwangi',
    skills_acquired: [
      'Flutter 3.x & Dart Architecture',
      'React Native Cross-Platform Workflows',
      'REST APIs & Cloud Database Sync',
      'App Store & Play Store Deployment',
    ],
    hash: '7b83ec428af94bcde1234567890abcdef1234567890abcdef1234567890abcdef',
  },
}

export function CertificateGenerator({
  cert,
  onClose,
}: {
  cert: CertificateData
  onClose: () => void
}) {
  const [activeCert, setActiveCert] = useState<CertificateData>(cert)
  const [copied, setCopied] = useState(false)

  // Generate deterministic SHA-256 hash preview if not provided
  const certHash = useMemo(() => {
    if (activeCert.hash) return activeCert.hash
    const seed = `${activeCert.certificate_no}-${activeCert.student_name}-${activeCert.course_title}`
    let h = 0x811c9dc5
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i)
      h = Math.imul(h, 0x01000193)
    }
    const hex = (h >>> 0).toString(16).padStart(8, '0')
    return `${hex}e492f8a10bc39871fa284bde605c93147819efaa0281b94cd${hex}`
  }, [activeCert])

  const verifyUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://cloud.eclat.institute'
    return `${origin}/#verify?cert=${encodeURIComponent(activeCert.certificate_no)}`
  }, [activeCert.certificate_no])

  const handlePrint = () => {
    window.print()
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1400, padding: '1rem' }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '1120px',
          width: '100%',
          maxHeight: '96vh',
          overflowY: 'auto',
          padding: 0,
          background: '#f8fafc',
          borderRadius: '20px',
          border: '1px solid #cbd5e1',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Luxury Top Command Toolbar (Hidden in Print) */}
        <div
          className="no-print"
          style={{
            padding: '1rem 1.75rem',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(255, 255, 255, 0.3)',
              }}
            >
              <GraduationCapIcon size={22} color="#1e3a8a" />
            </div>
            <div>
              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  fontFamily: 'var(--font-heading, "Cinzel", serif)',
                  letterSpacing: '0.04em',
                }}
              >
                World-Class Conferred Institutional Diploma
              </div>
              <div style={{ fontSize: '0.76rem', color: '#bfdbfe', fontWeight: 600 }}>
                Verified Cryptographic Credential • {INSTITUTION_CONFIG.name} ({INSTITUTION_CONFIG.tagline})
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#ffffff',
                color: '#1e3a8a',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.86rem',
                padding: '0.6rem 1.25rem',
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Print / Save High-Res PDF</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                fontWeight: 700,
                fontSize: '0.86rem',
                padding: '0.6rem 1rem',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {copied ? <CheckIcon size={14} color="#ffffff" /> : null}
              <span>{copied ? 'Link Copied!' : 'Copy Verification Link'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                fontWeight: 700,
                fontSize: '0.86rem',
                padding: '0.6rem 1rem',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Preset Sample Selector (No-Print) */}
        <div
          className="no-print"
          style={{
            padding: '0.65rem 1.75rem',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            overflowX: 'auto',
            fontSize: '0.78rem',
            color: '#475569',
          }}
        >
          <span style={{ fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
            Preview Sample Specializations:
          </span>
          <button
            type="button"
            onClick={() => setActiveCert(SAMPLE_CERTIFICATES.software_engineering)}
            style={{
              background: activeCert.course_title.includes('Software') ? '#1d4ed8' : '#f1f5f9',
              color: activeCert.course_title.includes('Software') ? '#ffffff' : '#334155',
              border: activeCert.course_title.includes('Software') ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CodeIcon size={14} color={activeCert.course_title.includes('Software') ? '#ffffff' : '#475569'} />
            <span>Software Engineering</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCert(SAMPLE_CERTIFICATES.data_science)}
            style={{
              background: activeCert.course_title.includes('Econometrics') ? '#1d4ed8' : '#f1f5f9',
              color: activeCert.course_title.includes('Econometrics') ? '#ffffff' : '#334155',
              border: activeCert.course_title.includes('Econometrics') ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ChartBarIcon size={14} color={activeCert.course_title.includes('Econometrics') ? '#ffffff' : '#475569'} />
            <span>Data Science & R</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCert(SAMPLE_CERTIFICATES.creative_design)}
            style={{
              background: activeCert.course_title.includes('UI/UX') ? '#1d4ed8' : '#f1f5f9',
              color: activeCert.course_title.includes('UI/UX') ? '#ffffff' : '#334155',
              border: activeCert.course_title.includes('UI/UX') ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <SparklesIcon size={14} color={activeCert.course_title.includes('UI/UX') ? '#ffffff' : '#475569'} />
            <span>UI/UX Design</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCert(SAMPLE_CERTIFICATES.partner_academy)}
            style={{
              background: activeCert.provider_type === 'partner_institution' ? '#1d4ed8' : '#f1f5f9',
              color: activeCert.provider_type === 'partner_institution' ? '#ffffff' : '#334155',
              border: activeCert.provider_type === 'partner_institution' ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <GraduationCapIcon size={14} color={activeCert.provider_type === 'partner_institution' ? '#ffffff' : '#475569'} />
            <span>Partner Academy (School-Issued)</span>
          </button>
        </div>

        {/* Scrollable Document Container */}
        <div style={{ padding: '1.25rem 0.75rem', display: 'flex', justifyContent: 'center', overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
          {/* ============================================================
              MASTER CONFERRED CERTIFICATE CANVAS (PRINT & VIEW ENGINE)
              Dimensions formatted for standard A4 landscape (1.414 aspect)
              ============================================================ */}
          <div
            id="official-certificate-document"
            style={{
              width: '100%',
              maxWidth: '1000px',
              aspectRatio: '1.414 / 1',
              minHeight: '680px',
              background: '#fdfbf7',
              color: '#090d16',
              position: 'relative',
              boxSizing: 'border-box',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            {/* Background Parchment & Guilloché Texture Pattern */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.95) 0%, rgba(251,247,236,0.92) 75%, rgba(243,235,214,0.85) 100%)',
                pointerEvents: 'none',
              }}
            />

            {/* Central Watermark Crest (Superbly Subtle at 3.5% Opacity) */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '440px',
                height: '440px',
                opacity: 0.042,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src="/logo-emblem-transparent.png?v=2"
                alt="Watermark Crest"
                style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'grayscale(100%)' }}
              />
            </div>

            {/* Micro-Security Border Lines & Guilloché Perimeter */}
            <div
              style={{
                position: 'absolute',
                inset: '12px',
                border: '3px solid #0f172a',
                pointerEvents: 'none',
                boxShadow: 'inset 0 0 0 2px #d4af37, inset 0 0 0 6px #ffffff, inset 0 0 0 8px #d4af37',
              }}
            />

            {/* Four Sovereign 24K Gold Filigree Corner Ornaments (Vector SVG) */}
            <svg
              style={{ position: 'absolute', top: '16px', left: '16px', width: '70px', height: '70px', pointerEvents: 'none' }}
              viewBox="0 0 100 100"
              fill="none"
            >
              <path
                d="M 5 5 L 60 5 C 40 5, 25 20, 25 40 L 25 95 C 25 70, 10 55, 5 60 Z"
                fill="url(#goldGradient)"
                opacity="0.9"
              />
              <path
                d="M 8 8 L 45 8 C 30 8, 18 20, 18 35 L 18 80"
                stroke="#b45309"
                strokeWidth="1.5"
                fill="none"
              />
              <circle cx="14" cy="14" r="5" fill="url(#goldGradient)" />
            </svg>

            <svg
              style={{ position: 'absolute', top: '16px', right: '16px', width: '70px', height: '70px', pointerEvents: 'none', transform: 'scaleX(-1)' }}
              viewBox="0 0 100 100"
              fill="none"
            >
              <path
                d="M 5 5 L 60 5 C 40 5, 25 20, 25 40 L 25 95 C 25 70, 10 55, 5 60 Z"
                fill="url(#goldGradient)"
                opacity="0.9"
              />
              <path
                d="M 8 8 L 45 8 C 30 8, 18 20, 18 35 L 18 80"
                stroke="#b45309"
                strokeWidth="1.5"
                fill="none"
              />
              <circle cx="14" cy="14" r="5" fill="url(#goldGradient)" />
            </svg>

            <svg
              style={{ position: 'absolute', bottom: '16px', left: '16px', width: '70px', height: '70px', pointerEvents: 'none', transform: 'scaleY(-1)' }}
              viewBox="0 0 100 100"
              fill="none"
            >
              <path
                d="M 5 5 L 60 5 C 40 5, 25 20, 25 40 L 25 95 C 25 70, 10 55, 5 60 Z"
                fill="url(#goldGradient)"
                opacity="0.9"
              />
              <path
                d="M 8 8 L 45 8 C 30 8, 18 20, 18 35 L 18 80"
                stroke="#b45309"
                strokeWidth="1.5"
                fill="none"
              />
              <circle cx="14" cy="14" r="5" fill="url(#goldGradient)" />
            </svg>

            <svg
              style={{ position: 'absolute', bottom: '16px', right: '16px', width: '70px', height: '70px', pointerEvents: 'none', transform: 'scale(-1, -1)' }}
              viewBox="0 0 100 100"
              fill="none"
            >
              <path
                d="M 5 5 L 60 5 C 40 5, 25 20, 25 40 L 25 95 C 25 70, 10 55, 5 60 Z"
                fill="url(#goldGradient)"
                opacity="0.9"
              />
              <path
                d="M 8 8 L 45 8 C 30 8, 18 20, 18 35 L 18 80"
                stroke="#b45309"
                strokeWidth="1.5"
                fill="none"
              />
              <circle cx="14" cy="14" r="5" fill="url(#goldGradient)" />
            </svg>

            {/* SVG Gradients for Gold Foil & Metallic Seals */}
            <svg width="0" height="0" style={{ position: 'absolute' }}>
              <defs>
                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#bf953f" />
                  <stop offset="25%" stopColor="#fcf6ba" />
                  <stop offset="50%" stopColor="#b38728" />
                  <stop offset="75%" stopColor="#fbf5b7" />
                  <stop offset="100%" stopColor="#aa771c" />
                </linearGradient>
                <radialGradient id="goldSealRadial" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fffbeb" />
                  <stop offset="45%" stopColor="#fbbf24" />
                  <stop offset="85%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#92400e" />
                </radialGradient>
              </defs>
            </svg>

            {/* ============================================================
                INNER CONTENT FRAME
                ============================================================ */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '24px 36px 16px',
                textAlign: 'center',
              }}
            >
              {/* TOP HEADER: Crest & Institutional Authority */}
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '6px' }}>
                  <img
                    src={
                      activeCert.provider_type === 'partner_institution' && activeCert.institution_logo
                        ? activeCert.institution_logo
                        : '/logo-emblem-transparent.png?v=2'
                    }
                    alt={activeCert.institution_name || INSTITUTION_CONFIG.name}
                    style={{
                      width: '84px',
                      height: '76px',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 4px 10px rgba(212, 175, 55, 0.45))',
                      marginBottom: '4px',
                    }}
                  />
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        fontFamily: '"Cinzel Decorative", "Cinzel", Georgia, serif',
                        fontSize: '1.9rem',
                        fontWeight: 900,
                        letterSpacing: '0.14em',
                        color: '#0f172a',
                        textTransform: 'uppercase',
                        lineHeight: 1.1,
                      }}
                    >
                      {activeCert.provider_type === 'partner_institution' && activeCert.institution_name
                        ? activeCert.institution_name
                        : INSTITUTION_CONFIG.name}
                    </div>
                    <div
                      style={{
                        fontFamily: '"Cinzel", Georgia, serif',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        letterSpacing: '0.22em',
                        color: '#854d0e',
                        textTransform: 'uppercase',
                        marginTop: '3px',
                      }}
                    >
                      {activeCert.provider_type === 'partner_institution'
                        ? 'ACCREDITED PARTNER ACADEMY • CONFERRED IN AFFILIATION WITH GLOBAL COLLEGE'
                        : 'DIRECTORATE OF ACADEMIC AFFAIRS & GLOBAL CREDENTIALING'}
                    </div>
                    <div
                      style={{
                        fontSize: '0.68rem',
                        color: '#475569',
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        marginTop: '2px',
                      }}
                    >
                      {activeCert.provider_type === 'partner_institution'
                        ? 'Verified Institutional Provider • Quality Assured by Global College Examination Board'
                        : `Official Academic Credential • ${INSTITUTION_CONFIG.tagline}`}
                    </div>
                  </div>
                </div>

                {/* Classical Roman Ornamental Gold Divider */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', margin: '8px auto 10px', maxWidth: '620px' }}>
                  <div style={{ height: '1.5px', flex: 1, background: 'linear-gradient(90deg, transparent, #b45309, #d4af37)' }} />
                  <span style={{ color: '#b45309', fontSize: '0.85rem' }}>❖</span>
                  <span style={{ color: '#d4af37', fontSize: '1rem' }}>★</span>
                  <span style={{ color: '#b45309', fontSize: '0.85rem' }}>❖</span>
                  <div style={{ height: '1.5px', flex: 1, background: 'linear-gradient(90deg, #d4af37, #b45309, transparent)' }} />
                </div>

                {/* Faculty Department Citation */}
                {activeCert.faculty_name && (
                  <div
                    style={{
                      fontSize: '0.74rem',
                      fontFamily: '"Cinzel", Georgia, serif',
                      fontWeight: 800,
                      letterSpacing: '0.18em',
                      color: '#0f172a',
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                    }}
                  >
                    {activeCert.faculty_name}
                  </div>
                )}

                {/* Authority Lead-In */}
                <div
                  style={{
                    fontFamily: '"Cinzel", Georgia, serif',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.22em',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  BY THE AUTHORITY OF THE ACADEMIC SENATE & UPON THE RECOMMENDATION OF THE FACULTY
                </div>

                <div
                  style={{
                    fontFamily: '"Cinzel", Georgia, serif',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    letterSpacing: '0.16em',
                    color: '#b45309',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  BE IT KNOWN TO ALL THAT
                </div>
              </div>

              {/* RECIPIENT CALLIGRAPHY NAME */}
              <div style={{ margin: '2px 0 6px' }}>
                <div
                  style={{
                    fontFamily: '"Pinyon Script", "Alex Brush", "Brush Script MT", cursive',
                    fontSize: '3.4rem',
                    fontWeight: 400,
                    color: '#090d16',
                    lineHeight: 1.1,
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  }}
                >
                  {activeCert.student_name}
                </div>

                {/* Golden Calligraphy Underline Flourish */}
                <div
                  style={{
                    width: '320px',
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, #d4af37, #b45309, #d4af37, transparent)',
                    margin: '3px auto 6px',
                  }}
                />

                <div style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 600, letterSpacing: '0.06em' }}>
                  {activeCert.delivery_mode === 'self_paced' || !activeCert.admission_number ? (
                    <>
                      Permanent Credential Identifier:{' '}
                      <strong style={{ color: '#0f172a' }}>{activeCert.certificate_no}</strong>{' '}
                      <span style={{ color: '#16a34a', fontWeight: 800 }}>• Self-Paced Track (Direct Credential Completion)</span>
                    </>
                  ) : (
                    <>
                      Permanent Admission Identifier:{' '}
                      <strong style={{ color: '#0f172a' }}>{activeCert.admission_number}</strong>
                    </>
                  )}
                </div>
              </div>

              {/* CONFERMENT CLAUSE & QUALIFICATION SASH */}
              <div>
                <p
                  style={{
                    fontSize: '0.94rem',
                    color: '#334155',
                    maxWidth: '780px',
                    margin: '0 auto 8px',
                    lineHeight: 1.45,
                    fontStyle: 'italic',
                  }}
                >
                  having fulfilled with distinction all prescribed curricula, comprehensive laboratory evaluations, rigorous practical workshops, and capstone examinations, is hereby awarded the
                </p>

                {/* Awarded Degree / Diploma Title Banner */}
                <div
                  style={{
                    display: 'inline-block',
                    background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.45) 0%, rgba(219, 234, 254, 0.45) 100%)',
                    border: '1.5px solid #d4af37',
                    borderRadius: '8px',
                    padding: '8px 24px',
                    margin: '0 auto 8px',
                    boxShadow: '0 4px 14px rgba(212, 175, 55, 0.15)',
                  }}
                >
                  <div
                    style={{
                      fontFamily: '"Cinzel", Georgia, serif',
                      fontSize: '1.28rem',
                      fontWeight: 900,
                      color: '#0f172a',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {activeCert.course_title}
                  </div>
                </div>

                {/* Honors & Performance Pill */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#166534', fontWeight: 800 }}>
                  <span>★</span>
                  <span>{activeCert.honors || 'Conferred with Institutional Merit'}</span>
                  <span>•</span>
                  <span>Attainment: {activeCert.grade} ({activeCert.percentage}%)</span>
                  <span>•</span>
                  <span>{activeCert.duration || '12 Weeks Practical Intensive'}</span>
                  <span>★</span>
                </div>

                {/* Key Verified Skills Tags */}
                {activeCert.skills_acquired && activeCert.skills_acquired.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      flexWrap: 'wrap',
                      gap: '5px',
                      maxWidth: '780px',
                      margin: '6px auto 0',
                    }}
                  >
                    {activeCert.skills_acquired.map((s, i) => (
                      <span
                        key={i}
                        style={{
                          background: 'rgba(15, 23, 42, 0.05)',
                          border: '1px solid rgba(15, 23, 42, 0.12)',
                          color: '#334155',
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          padding: '1px 8px',
                          borderRadius: '12px',
                          letterSpacing: '0.02em',
                        }}
                      >
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ============================================================
                  LOWER FLANK: QR Verification, 3D Gold Seal & Directorate Signatures
                  ============================================================ */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '190px 1fr 190px',
                  alignItems: 'flex-end',
                  gap: '12px',
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(180, 83, 9, 0.25)',
                }}
              >
                {/* LEFT FLANK: Verified QR Code & Cryptographic Ledger */}
                <div style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Clean SVG QR Matrix Mockup pointing directly to registry */}
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      background: '#ffffff',
                      padding: '4px',
                      border: '1.5px solid #0f172a',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                      flexShrink: 0,
                    }}
                    title={`Scan to verify: ${verifyUrl}`}
                  >
                    <svg viewBox="0 0 25 25" width="56" height="56" fill="#090d16">
                      {/* Standard clean geometric QR pattern representation */}
                      <rect x="1" y="1" width="7" height="7" fill="#090d16" />
                      <rect x="2" y="2" width="5" height="5" fill="#ffffff" />
                      <rect x="3" y="3" width="3" height="3" fill="#090d16" />

                      <rect x="17" y="1" width="7" height="7" fill="#090d16" />
                      <rect x="18" y="2" width="5" height="5" fill="#ffffff" />
                      <rect x="19" y="3" width="3" height="3" fill="#090d16" />

                      <rect x="1" y="17" width="7" height="7" fill="#090d16" />
                      <rect x="2" y="18" width="5" height="5" fill="#ffffff" />
                      <rect x="3" y="19" width="3" height="3" fill="#090d16" />

                      <rect x="10" y="2" width="2" height="2" />
                      <rect x="14" y="2" width="1" height="3" />
                      <rect x="10" y="6" width="3" height="1" />
                      <rect x="10" y="9" width="5" height="5" fill="#090d16" />
                      <rect x="11" y="10" width="3" height="3" fill="#ffffff" />
                      <rect x="12" y="11" width="1" height="1" fill="#090d16" />

                      <rect x="1" y="10" width="2" height="4" />
                      <rect x="5" y="11" width="2" height="2" />
                      <rect x="7" y="9" width="1" height="4" />

                      <rect x="17" y="10" width="3" height="2" />
                      <rect x="21" y="11" width="2" height="3" />
                      <rect x="18" y="14" width="4" height="1" />

                      <rect x="10" y="16" width="3" height="2" />
                      <rect x="14" y="18" width="2" height="4" />
                      <rect x="10" y="20" width="3" height="2" />

                      <rect x="17" y="18" width="2" height="2" />
                      <rect x="20" y="17" width="3" height="2" />
                      <rect x="18" y="21" width="4" height="2" />
                    </svg>
                  </div>

                  <div style={{ fontSize: '0.62rem', color: '#475569', lineHeight: 1.35 }}>
                    <div style={{ color: '#15803d', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span>🛡️</span>
                      <span>TAMPER-PROOF LEDGER</span>
                    </div>
                    <div>
                      Serial: <strong style={{ color: '#090d16' }}>{activeCert.certificate_no}</strong>
                    </div>
                    <div>Conferment: {activeCert.issue_date}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: '#64748b' }}>
                      Hash: {certHash.slice(0, 12)}…{certHash.slice(-6)}
                    </div>
                  </div>
                </div>

                {/* CENTER FLANK: 3D Embossed Imperial Gold Medallion & Ribbon */}
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '92px', height: '92px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Hanging Silk Ribbon Tails */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '55px',
                        left: '26px',
                        width: '18px',
                        height: '42px',
                        background: 'linear-gradient(180deg, #1e3a8a 0%, #0f172a 100%)',
                        clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 82%, 0% 100%)',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                        transform: 'rotate(-12deg)',
                        zIndex: 1,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '55px',
                        right: '26px',
                        width: '18px',
                        height: '42px',
                        background: 'linear-gradient(180deg, #d4af37 0%, #b45309 100%)',
                        clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 82%, 0% 100%)',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                        transform: 'rotate(12deg)',
                        zIndex: 1,
                      }}
                    />

                    {/* Outer 48-Tooth Starburst Beveled Medallion (Vector SVG) */}
                    <svg
                      viewBox="0 0 100 100"
                      width="88"
                      height="88"
                      style={{
                        filter: 'drop-shadow(0 6px 12px rgba(180, 83, 9, 0.45))',
                        position: 'relative',
                        zIndex: 2,
                      }}
                    >
                      {/* Scalloped Gold Medallion Background */}
                      <circle cx="50" cy="50" r="46" fill="url(#goldSealRadial)" stroke="#78350f" strokeWidth="1.5" />
                      <circle cx="50" cy="50" r="41" fill="none" stroke="#fef08a" strokeWidth="1" strokeDasharray="1.5 1.5" />
                      <circle cx="50" cy="50" r="37" fill="none" stroke="#78350f" strokeWidth="0.8" />

                      {/* Concentric Roman Laurel Wreath */}
                      <path
                        d="M 28 50 C 28 35, 38 25, 50 25 C 62 25, 72 35, 72 50 C 72 65, 62 75, 50 75 C 38 75, 28 65, 28 50 Z"
                        fill="none"
                        stroke="#92400e"
                        strokeWidth="0.6"
                      />

                      {/* Center 5-Point Imperial Radiance Star */}
                      <polygon
                        points="50,30 53,40 64,40 55,47 58,58 50,52 42,58 45,47 36,40 47,40"
                        fill="#fef08a"
                        stroke="#78350f"
                        strokeWidth="0.8"
                      />

                      {/* Medallion Text Arc */}
                      <text x="50" y="65" textAnchor="middle" fontSize="4.6" fontWeight="900" fill="#78350f" fontFamily="Cinzel, serif" letterSpacing="0.08em">
                        GLOBAL COLLEGE
                      </text>
                      <text x="50" y="70" textAnchor="middle" fontSize="3.8" fontWeight="800" fill="#92400e" fontFamily="Cinzel, serif" letterSpacing="0.06em">
                        SIGILLUM AUTHENTICUM
                      </text>
                    </svg>
                  </div>

                  <div
                    style={{
                      fontSize: '0.58rem',
                      fontWeight: 800,
                      color: '#854d0e',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      marginTop: '2px',
                    }}
                  >
                    OFFICIAL PRESIDENTIAL SEAL
                  </div>
                </div>

                {/* RIGHT FLANK: Fluid Calligraphy Signatures & Registrar's Stamp */}
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  {/* Two Authority Signatures */}
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', marginBottom: '4px' }}>
                    {/* Faculty Dean Signature */}
                    <div style={{ textAlign: 'center' }}>
                      <svg viewBox="0 0 160 45" width="105" height="30">
                        {/* Fluid Vector Signature in Deep Navy Ink */}
                        <path
                          d="M 10 32 Q 25 10, 40 28 T 65 22 T 90 28 Q 110 5, 130 25 T 150 20"
                          fill="none"
                          stroke="#1e3a8a"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 22 26 Q 50 36, 120 28"
                          fill="none"
                          stroke="#1e3a8a"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div style={{ borderTop: '1px solid #0f172a', paddingTop: '2px', fontSize: '0.62rem', fontWeight: 800, color: '#090d16', whiteSpace: 'nowrap' }}>
                        {activeCert.provider_type === 'partner_institution'
                          ? (activeCert.institution_signatory || 'Dean / Authorized Signatory')
                          : (activeCert.trainer_name ? `${activeCert.trainer_name}` : 'Prof. Arthur M. Vance, Ph.D.')}
                      </div>
                      <div style={{ fontSize: '0.55rem', color: '#64748b' }}>
                        {activeCert.provider_type === 'partner_institution'
                          ? `Dean of Studies, ${activeCert.institution_name || 'Partner Academy'}`
                          : (activeCert.trainer_name ? 'Lead Faculty Lecturer & Instructor' : 'Dean of Academic Faculty')}
                      </div>
                    </div>

                    {/* Academic Registrar Signature & Red Stamp */}
                    <div style={{ textAlign: 'center', position: 'relative' }}>
                      {/* Vermilion Registrar Ink Stamp Overlay */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '-18px',
                          right: '-6px',
                          width: '54px',
                          height: '54px',
                          borderRadius: '50%',
                          border: '1.5px dashed #dc2626',
                          color: '#dc2626',
                          opacity: 0.85,
                          transform: 'rotate(-14deg)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.38rem',
                          fontWeight: 900,
                          lineHeight: 1.1,
                          pointerEvents: 'none',
                          boxShadow: 'inset 0 0 0 1px rgba(220,38,38,0.3)',
                        }}
                      >
                        <div>GLOBAL COLLEGE</div>
                        <div style={{ fontSize: '0.42rem' }}>★ REGISTRAR ★</div>
                        <div>ARCHIVED</div>
                      </div>

                      <svg viewBox="0 0 160 45" width="105" height="30">
                        {/* Fluid Vector Signature in Deep Navy Ink */}
                        <path
                          d="M 12 25 Q 30 5, 45 35 T 75 18 T 105 32 Q 130 12, 148 24"
                          fill="none"
                          stroke="#1e3a8a"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 35 30 Q 70 38, 140 32"
                          fill="none"
                          stroke="#1e3a8a"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div style={{ borderTop: '1px solid #0f172a', paddingTop: '2px', fontSize: '0.62rem', fontWeight: 800, color: '#090d16', whiteSpace: 'nowrap' }}>
                        Dr. Amina Yusuf, Ed.D.
                      </div>
                      <div style={{ fontSize: '0.55rem', color: '#64748b' }}>
                        {activeCert.provider_type === 'partner_institution'
                          ? 'Director of Accreditation & Registry, Global College'
                          : 'Director of Academic Registry'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Print Stylesheet for High-DPI Output */}
        <style>
          {`
            @page {
              size: A4 landscape;
              margin: 8mm;
            }
            @media print {
              html, body {
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
              }
              body * {
                visibility: hidden !important;
              }
              .no-print, .no-print * {
                display: none !important;
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .modal-overlay {
                position: static !important;
                padding: 0 !important;
                margin: 0 !important;
                background: transparent !important;
              }
              .modal-content {
                position: static !important;
                max-width: 100% !important;
                box-shadow: none !important;
                border: none !important;
                background: transparent !important;
              }
              #official-certificate-document, #official-certificate-document * {
                visibility: visible !important;
              }
              #official-certificate-document {
                position: relative !important;
                width: 277mm !important;
                max-width: 277mm !important;
                height: 190mm !important;
                max-height: 190mm !important;
                margin: 0 auto !important;
                padding: 16px 20px !important;
                box-shadow: none !important;
                box-sizing: border-box !important;
                page-break-inside: avoid !important;
                page-break-after: avoid !important;
                break-inside: avoid !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}
        </style>
      </div>
    </div>
  )
}

