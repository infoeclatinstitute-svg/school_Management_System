import React, { useState } from 'react'
import {
  OFFICIAL_DESKTOP_URL,
  OFFICIAL_APK_URL,
  LOCAL_DESKTOP_URL,
  LOCAL_APK_URL,
} from '@/utils/platform'

interface SafariInstallModalProps {
  isOpen: boolean
  onClose: () => void
  isIOS: boolean
  schoolName?: string
  schoolLogo?: string
  primaryColor?: string
  onNativeInstallPrompt?: () => void
  hasNativePrompt?: boolean
}

export function SafariInstallModal({
  isOpen,
  onClose,
  isIOS,
  schoolName = 'Global College',
  schoolLogo,
  primaryColor = '#2563eb',
  onNativeInstallPrompt,
  hasNativePrompt = false,
}: SafariInstallModalProps) {
  const isMobileDefault =
    isIOS || (typeof navigator !== 'undefined' && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent))
  const [selectedTab, setSelectedTab] = useState<'desktop' | 'phone'>(isMobileDefault ? 'phone' : 'desktop')
  const [downloadInitiated, setDownloadInitiated] = useState<'apk' | 'exe' | null>(null)

  if (!isOpen) return null

  const handleDownloadFeedback = (type: 'apk' | 'exe') => {
    setDownloadInitiated(type)
    setTimeout(() => {
      setDownloadInitiated(null)
    }, 4500)
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="modal-content modal-md"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0f172a',
          color: '#f8fafc',
          borderRadius: '24px',
          border: '1.5px solid #334155',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75)',
          padding: '1.75rem',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        {/* Header with dynamic institution branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
          {schoolLogo ? (
            <img
              src={schoolLogo}
              alt={schoolName}
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                objectFit: 'contain',
                background: '#ffffff',
                padding: '4px',
                border: '1px solid #334155',
              }}
            />
          ) : (
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${primaryColor} 0%, #1e293b 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                color: '#ffffff',
                fontWeight: 900,
              }}
            >
              📲
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  textTransform: 'uppercase',
                }}
              >
                Official Release
              </span>
            </div>
            <h3 style={{ margin: '3px 0 0', fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Download &amp; Install {schoolName} App
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              Install directly on your Phone (Android / iOS) or Laptop / Computer (Windows / Mac)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: 'none',
              color: '#94a3b8',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Platform Switcher Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
            background: '#1e293b',
            padding: '0.35rem',
            borderRadius: '14px',
            marginBottom: '1.25rem',
            border: '1px solid #334155',
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedTab('phone')}
            style={{
              background: selectedTab === 'phone' ? primaryColor : 'transparent',
              color: selectedTab === 'phone' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '10px',
              padding: '0.6rem 0.75rem',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>📱</span> Phone (Android / iOS)
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab('desktop')}
            style={{
              background: selectedTab === 'desktop' ? primaryColor : 'transparent',
              color: selectedTab === 'desktop' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '10px',
              padding: '0.6rem 0.75rem',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>💻</span> Laptop &amp; Computer
          </button>
        </div>

        {/* ======================================================== */}
        {/* PHONE (ANDROID & iOS) TAB CONTENT                        */}
        {/* ======================================================== */}
        {selectedTab === 'phone' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1.25rem' }}>
            {/* Primary Android Native APK Download Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)',
                borderRadius: '16px',
                padding: '1.15rem',
                border: '1.5px solid rgba(16, 185, 129, 0.45)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🤖</span>
                    <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>Android Mobile App (.APK)</strong>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#6ee7b7', marginTop: '3px' }}>
                    Package: com.globalcollege.sms • Direct Install for Samsung, Tecno, Infinix, Xiaomi &amp; all Android
                  </div>
                </div>
                <span
                  style={{
                    background: '#10b981',
                    color: '#022c22',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  APK 13.7 MB
                </span>
              </div>

              {/* Direct Download Action Button */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <a
                  href={LOCAL_APK_URL}
                  download="global-college.apk"
                  onClick={() => handleDownloadFeedback('apk')}
                  style={{
                    flex: 1,
                    minWidth: '180px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    padding: '0.65rem 1rem',
                    borderRadius: '10px',
                    fontSize: '0.86rem',
                    fontWeight: 900,
                    textDecoration: 'none',
                    textAlign: 'center',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>⬇️</span> Download Android APK
                </a>
                <a
                  href={OFFICIAL_APK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#1e293b',
                    color: '#94a3b8',
                    border: '1px solid #475569',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Alternative cloud download mirror"
                >
                  <span>🌐</span> Mirror
                </a>
              </div>

              {downloadInitiated === 'apk' && (
                <div
                  style={{
                    background: '#064e3b',
                    color: '#a7f3d0',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    border: '1px solid #059669',
                  }}
                >
                  ✓ APK download started! When completed, tap <strong>Open</strong> and allow <em>&ldquo;Install unknown apps&rdquo;</em> in your settings.
                </div>
              )}

              {/* 3 Step Android Install Guide */}
              <div style={{ background: 'rgba(15, 23, 42, 0.65)', borderRadius: '10px', padding: '0.75rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
                <div style={{ fontWeight: 800, color: '#34d399', marginBottom: '4px' }}>How to install APK on your phone:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div><strong>1.</strong> Click <strong>Download Android APK</strong> above.</div>
                  <div><strong>2.</strong> Open the downloaded <code>global-college.apk</code> file in your notifications or Downloads folder.</div>
                  <div><strong>3.</strong> If prompted, tap <strong>Settings &rarr; Allow from this source</strong>, then tap <strong>Install</strong>.</div>
                </div>
              </div>
            </div>

            {/* Apple iPhone & iPad (Safari Guide) */}
            <div
              style={{
                background: '#1e293b',
                borderRadius: '14px',
                padding: '0.9rem 1rem',
                border: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#000000',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  flexShrink: 0,
                }}
              >
                
              </div>
              <div style={{ fontSize: '0.82rem', lineHeight: 1.45, flex: 1 }}>
                <strong style={{ color: '#ffffff' }}>iPhone &amp; iPad (Apple iOS):</strong> Tap the <strong>Share icon (↑)</strong> on your Safari bottom bar, scroll down, and tap{' '}
                <strong style={{ color: '#93c5fd' }}>&ldquo;Add to Home Screen (➕)&rdquo;</strong> to launch like a native iOS app.
              </div>
            </div>

            {/* Instant Browser Install (PWA) on Mobile */}
            {hasNativePrompt && onNativeInstallPrompt && (
              <div
                style={{
                  background: 'rgba(37, 99, 235, 0.12)',
                  borderRadius: '14px',
                  padding: '0.9rem 1rem',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: '#bfdbfe', flex: 1 }}>
                  <strong>Instant Install (No Download Required):</strong> Add this portal directly to your phone screen instantly.
                </div>
                <button
                  type="button"
                  onClick={() => onNativeInstallPrompt()}
                  style={{
                    background: primaryColor,
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ⚡ 1-Click Install
                </button>
              </div>
            )}

            <div
              style={{
                fontSize: '0.76rem',
                color: '#64748b',
                padding: '0 0.25rem',
              }}
            >
              <strong>Android (Chrome / Samsung Internet):</strong> Tap browser menu <strong>(⋮)</strong> &rarr; select <strong style={{ color: '#93c5fd' }}>&ldquo;Install App&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong>.
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* LAPTOP & COMPUTER (WINDOWS / MAC / LINUX) TAB CONTENT    */
          /* ======================================================== */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1.25rem' }}>
            {/* Primary Windows Desktop Setup (.EXE) Download Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)',
                borderRadius: '16px',
                padding: '1.15rem',
                border: '1.5px solid rgba(59, 130, 246, 0.45)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🪟</span>
                    <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>Windows PC Desktop Workstation (.EXE)</strong>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#93c5fd', marginTop: '3px' }}>
                    Compatible with Windows 11 &amp; Windows 10 (64-bit) • Dedicated Window &amp; Offline Cache
                  </div>
                </div>
                <span
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  EXE Setup
                </span>
              </div>

              {/* Direct Download Action Button */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <a
                  href={OFFICIAL_DESKTOP_URL}
                  download="global-college-setup.exe"
                  onClick={() => handleDownloadFeedback('exe')}
                  style={{
                    flex: 1,
                    minWidth: '220px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: 900,
                    textDecoration: 'none',
                    textAlign: 'center',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <span>⬇️</span> Download Native Windows App (.exe)
                </a>
                <a
                  href={LOCAL_DESKTOP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#1e293b',
                    color: '#94a3b8',
                    border: '1px solid #475569',
                    padding: '0.75rem 0.85rem',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Direct server download mirror"
                >
                  <span>🌐</span> Server Link
                </a>
              </div>

              {downloadInitiated === 'exe' && (
                <div
                  style={{
                    background: '#172554',
                    color: '#bfdbfe',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: '1px solid #3b82f6',
                  }}
                >
                  ✓ Setup executable download initiated! Run <code>global-college-setup.exe</code> to install the full standalone desktop application.
                </div>
              )}
            </div>

            {/* Optional Browser Web App (PWA) on Laptop/Desktop */}
            {hasNativePrompt && onNativeInstallPrompt && (
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  borderRadius: '14px',
                  padding: '0.85rem 1rem',
                  border: '1px dashed #475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ fontSize: '0.78rem', color: '#cbd5e1', flex: 1 }}>
                  <strong style={{ color: '#93c5fd' }}>Alternative (Browser Web App):</strong> Run inside Chrome/Edge without installing the desktop software.
                </div>
                <button
                  type="button"
                  onClick={() => onNativeInstallPrompt()}
                  style={{
                    background: '#334155',
                    color: '#f8fafc',
                    border: '1px solid #64748b',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Install Browser Webapp
                </button>
              </div>
            )}

            {/* Browser Guide Cards */}
            <div
              style={{
                background: '#1e293b',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                border: '1px solid #334155',
                fontSize: '0.82rem',
                lineHeight: 1.45,
              }}
            >
              <div style={{ fontWeight: 800, color: '#93c5fd', marginBottom: '3px' }}>
                Chrome / Microsoft Edge (Windows, Mac, Linux):
              </div>
              Click the <strong style={{ color: '#93c5fd' }}>Install icon (⊕ / 💻)</strong> on the right side of your browser address bar, or open menu <strong>(⋮) → Cast, save, and share → Install Global College</strong>.
            </div>

            <div
              style={{
                background: '#1e293b',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                border: '1px solid #334155',
                fontSize: '0.82rem',
                lineHeight: 1.45,
              }}
            >
              <div style={{ fontWeight: 800, color: '#cbd5e1', marginBottom: '3px' }}>
                Safari on MacBook / iMac:
              </div>
              Click <strong>File → Add to Dock…</strong> in your top macOS menu bar to install {schoolName} as a standalone desktop app.
            </div>
          </div>
        )}

        {/* Institutional Benefits Badge */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '0.75rem 0.9rem',
            fontSize: '0.76rem',
            color: '#94a3b8',
            marginBottom: '1.25rem',
            lineHeight: 1.6,
          }}
        >
          <div style={{ color: '#e2e8f0', fontWeight: 800, marginBottom: '2px' }}>Institutional App Advantages:</div>
          <div>✓ Works offline for fee statement verification, exam entry passes, and timetables</div>
          <div>✓ Dedicated distraction-free terminal for Students, Lecturers, Bursars &amp; Principals</div>
          <div>✓ High-performance multi-page PDF generation without browser margin truncation</div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            background: primaryColor,
            color: '#ffffff',
            border: 'none',
            padding: '0.75rem',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: `0 4px 14px ${primaryColor}40`,
          }}
        >
          Close Download Center
        </button>
      </div>
    </div>
  )
}
