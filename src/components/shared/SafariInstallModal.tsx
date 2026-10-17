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
  primaryColor: _primaryColor = '#1e3a8a',
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
      role="dialog"
      aria-modal="true"
      aria-label="Download and install application"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          color: '#0f172a',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 70px rgba(15, 23, 42, 0.35)',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            background: '#ffffff',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt={schoolName}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  objectFit: 'contain',
                  background: '#f8fafc',
                  padding: '4px',
                  border: '1px solid #e2e8f0',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  color: '#ffffff',
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                🎓
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  Verified Release
                </span>
              </div>
              <h3
                style={{
                  margin: '3px 0 0',
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  color: '#0f172a',
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Download {schoolName} App
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Install directly on your Phone or Laptop Workstation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close download dialog"
            style={{
              background: '#f1f5f9',
              border: 'none',
              color: '#64748b',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e2e8f0'
              e.currentTarget.style.color = '#0f172a'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f1f5f9'
              e.currentTarget.style.color = '#64748b'
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Platform Segmented Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedTab('phone')}
              style={{
                background: selectedTab === 'phone' ? '#ffffff' : 'transparent',
                color: selectedTab === 'phone' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '9px',
                padding: '0.55rem 0.75rem',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: selectedTab === 'phone' ? '0 2px 6px rgba(15, 23, 42, 0.08)' : 'none',
              }}
            >
              <span>📱</span> Phone (Android / iOS)
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('desktop')}
              style={{
                background: selectedTab === 'desktop' ? '#ffffff' : 'transparent',
                color: selectedTab === 'desktop' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '9px',
                padding: '0.55rem 0.75rem',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: selectedTab === 'desktop' ? '0 2px 6px rgba(15, 23, 42, 0.08)' : 'none',
              }}
            >
              <span>💻</span> Laptop &amp; Computer
            </button>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: PHONE (ANDROID & iOS)                            */}
          {/* ======================================================== */}
          {selectedTab === 'phone' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Android Card */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
                  borderRadius: '16px',
                  padding: '1.15rem',
                  border: '1.5px solid #bbf7d0',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '1.25rem' }}>🤖</span>
                      <strong style={{ fontSize: '0.96rem', color: '#064e3b', fontWeight: 900 }}>
                        Android Mobile App (.APK)
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: '3px' }}>
                      Package: <code>com.globalcollege.sms</code> • Samsung, Tecno, Infinix, Xiaomi, Oppo &amp; all Android
                    </div>
                  </div>
                  <span
                    style={{
                      background: '#dcfce7',
                      color: '#15803d',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid #86efac',
                    }}
                  >
                    APK 26 MB
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <a
                    href={LOCAL_APK_URL}
                    download="global-college.apk"
                    onClick={() => handleDownloadFeedback('apk')}
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      color: '#ffffff',
                      padding: '0.7rem 1.15rem',
                      borderRadius: '10px',
                      fontSize: '0.86rem',
                      fontWeight: 800,
                      textDecoration: 'none',
                      textAlign: 'center',
                      boxShadow: '0 3px 10px rgba(5, 150, 105, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>⬇️</span> Download Android APK
                  </a>
                  <a
                    href={OFFICIAL_APK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#ffffff',
                      color: '#475569',
                      border: '1.5px solid #cbd5e1',
                      padding: '0.7rem 0.9rem',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    title="Official GitHub Release Mirror"
                  >
                    <span>🐙</span> GitHub Mirror
                  </a>
                </div>

                {downloadInitiated === 'apk' && (
                  <div
                    style={{
                      background: '#ecfdf5',
                      color: '#065f46',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      border: '1px solid #6ee7b7',
                    }}
                  >
                    ✓ Download initiated! Tap <strong>Open</strong> when finished and select <em>&ldquo;Install&rdquo;</em>.
                  </div>
                )}

                <div style={{ background: '#ffffff', borderRadius: '10px', padding: '0.75rem', fontSize: '0.78rem', color: '#334155', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, color: '#047857', marginBottom: '4px' }}>Quick Installation Instructions:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', lineHeight: 1.45 }}>
                    <div><strong>1.</strong> Click <strong>Download Android APK</strong> above.</div>
                    <div><strong>2.</strong> Open the downloaded <code>global-college.apk</code> file in your notifications or Downloads.</div>
                    <div><strong>3.</strong> If prompted, tap <strong>Settings &rarr; Allow from this source</strong>, then confirm <strong>Install</strong>.</div>
                  </div>
                </div>
              </div>

              {/* iOS Card */}
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '14px',
                  padding: '1rem 1.15rem',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#0f172a',
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
                <div style={{ fontSize: '0.82rem', lineHeight: 1.5, flex: 1, color: '#334155' }}>
                  <strong style={{ color: '#0f172a' }}>iPhone &amp; iPad (Apple iOS):</strong> Tap the <strong>Share icon (↑)</strong> on your Safari bottom bar, scroll down, and tap{' '}
                  <strong style={{ color: '#2563eb' }}>&ldquo;Add to Home Screen (➕)&rdquo;</strong> to launch as a standalone app.
                </div>
              </div>

              {/* 1-Click PWA for Mobile */}
              {hasNativePrompt && onNativeInstallPrompt && (
                <div
                  style={{
                    background: '#eff6ff',
                    borderRadius: '14px',
                    padding: '0.9rem 1.15rem',
                    border: '1px solid #bfdbfe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ fontSize: '0.8rem', color: '#1e40af', flex: 1 }}>
                    <strong style={{ color: '#1d4ed8' }}>Direct Web Install:</strong> Add this portal directly to your home screen instantly without downloading a package file.
                  </div>
                  <button
                    type="button"
                    onClick={() => onNativeInstallPrompt()}
                    style={{
                      background: '#1d4ed8',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.55rem 1.1rem',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 6px rgba(29, 78, 216, 0.3)',
                    }}
                  >
                    ⚡ Add to Home Screen
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ======================================================== */
            /* TAB 2: LAPTOP & COMPUTER (WINDOWS / MAC / LINUX)         */
            /* ======================================================== */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Primary Windows Desktop (.EXE) Card */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  border: '1.5px solid #bfdbfe',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.3rem' }}>🪟</span>
                      <strong style={{ fontSize: '0.98rem', color: '#1e3a8a', fontWeight: 900 }}>
                        Windows PC Desktop Workstation (.EXE)
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '3px' }}>
                      Compatible with Windows 11 &amp; Windows 10 (64-bit) • Dedicated Window &amp; Offline Cache
                    </div>
                  </div>
                  <span
                    style={{
                      background: '#dbeafe',
                      color: '#1d4ed8',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid #93c5fd',
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
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
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
                      background: '#ffffff',
                      color: '#475569',
                      border: '1.5px solid #cbd5e1',
                      padding: '0.75rem 0.95rem',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    title="Direct server download mirror"
                  >
                    <span>🌐</span> Server Link
                  </a>
                </div>

                {downloadInitiated === 'exe' && (
                  <div
                    style={{
                      background: '#eff6ff',
                      color: '#1e40af',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      border: '1px solid #93c5fd',
                    }}
                  >
                    ✓ Setup executable download initiated! Run <code>global-college-setup.exe</code> to launch your desktop terminal.
                  </div>
                )}
              </div>

              {/* Browser Web App Alternative */}
              {hasNativePrompt && onNativeInstallPrompt && (
                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: '14px',
                    padding: '0.85rem 1.15rem',
                    border: '1px dashed #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ fontSize: '0.8rem', color: '#475569', flex: 1 }}>
                    <strong style={{ color: '#0f172a' }}>Alternative (Browser Web App):</strong> Run inside Chrome or Microsoft Edge without installing separate software.
                  </div>
                  <button
                    type="button"
                    onClick={() => onNativeInstallPrompt()}
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.55rem 1rem',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Install Web App
                  </button>
                </div>
              )}

              {/* Chrome / Edge Guide Card */}
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '12px',
                  padding: '0.85rem 1.15rem',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                  color: '#334155',
                }}
              >
                <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '3px' }}>
                  Chrome / Microsoft Edge (Windows, Mac, Linux):
                </div>
                Click the <strong style={{ color: '#1d4ed8' }}>Install icon (⊕ / 💻)</strong> on the right side of your browser address bar, or open menu <strong>(⋮) → Cast, save, and share → Install Global College</strong>.
              </div>

              {/* Mac Safari Guide Card */}
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '12px',
                  padding: '0.85rem 1.15rem',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                  color: '#334155',
                }}
              >
                <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '3px' }}>
                  Safari on macOS (MacBook / iMac):
                </div>
                Click <strong>File → Add to Dock…</strong> in your top macOS menu bar to install {schoolName} as a native desktop dock app.
              </div>
            </div>
          )}

          {/* Institutional Benefits Badge */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              fontSize: '0.76rem',
              color: '#475569',
              lineHeight: 1.6,
            }}
          >
            <div style={{ color: '#0f172a', fontWeight: 800, marginBottom: '3px' }}>Institutional App Advantages:</div>
            <div>✓ <strong>Offline Verification:</strong> Instant fee verification, exam entry passes, and schedules without network lag.</div>
            <div>✓ <strong>Dedicated Workstation:</strong> Distraction-free native window for Students, Teachers, Bursars &amp; Principals.</div>
            <div>✓ <strong>Clean Multi-Page Printing:</strong> High-performance official PDF transcripts and report cards without page clipping.</div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #f1f5f9',
            background: '#ffffff',
            display: 'flex',
            justifyContent: 'flex-end',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '0.65rem 1.5rem',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1e293b'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#0f172a'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
