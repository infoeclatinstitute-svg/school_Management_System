import React, { useState } from 'react'

interface SafariInstallModalProps {
  isOpen: boolean
  onClose: () => void
  isIOS: boolean
}

export function SafariInstallModal({ isOpen, onClose, isIOS }: SafariInstallModalProps) {
  const isMobileDefault =
    isIOS || (typeof navigator !== 'undefined' && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent))
  const [selectedTab, setSelectedTab] = useState<'desktop' | 'phone'>(isMobileDefault ? 'phone' : 'desktop')

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.78)',
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
          borderRadius: '20px',
          border: '1px solid #334155',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.65)',
          padding: '1.75rem',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.1rem' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#ffffff' }}>
              Install Global College App
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              Install directly on your Laptop / Computer or Mobile Phone
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
            borderRadius: '12px',
            marginBottom: '1.25rem',
            border: '1px solid #334155',
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedTab('desktop')}
            style={{
              background: selectedTab === 'desktop' ? '#2563eb' : 'transparent',
              color: selectedTab === 'desktop' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '8px',
              padding: '0.55rem 0.75rem',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            💻 Laptop &amp; Computer
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab('phone')}
            style={{
              background: selectedTab === 'phone' ? '#2563eb' : 'transparent',
              color: selectedTab === 'phone' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '8px',
              padding: '0.55rem 0.75rem',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            📱 Phone (Android / iOS)
          </button>
        </div>

        {selectedTab === 'desktop' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                background: '#1e293b',
                borderRadius: '12px',
                padding: '0.9rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                border: '1px solid #334155',
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: '#2563eb',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  flexShrink: 0,
                  fontWeight: 900,
                }}
              >
                1
              </div>
              <div style={{ fontSize: '0.85rem', lineHeight: 1.45 }}>
                <strong>Chrome / Microsoft Edge (Windows, Mac, Linux):</strong> Click the{' '}
                <strong style={{ color: '#93c5fd' }}>Install icon (⊕ / 💻)</strong> on the right side of your browser address bar, or open menu <strong>(⋮) → Cast, save, and share → Install Global College</strong>.
              </div>
            </div>

            <div
              style={{
                background: '#1e293b',
                borderRadius: '12px',
                padding: '0.9rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                border: '1px solid #334155',
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: '#2563eb',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  flexShrink: 0,
                  fontWeight: 900,
                }}
              >
                2
              </div>
              <div style={{ fontSize: '0.85rem', lineHeight: 1.45 }}>
                <strong>Safari on MacBook / iMac:</strong> Click <strong>File → Add to Dock…</strong> in the top menu bar to install Global College as a standalone desktop app.
              </div>
            </div>

            <div
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                borderRadius: '12px',
                padding: '0.9rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.85rem',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontSize: '0.82rem', lineHeight: 1.4, color: '#d1fae5', flex: 1 }}>
                <strong>Windows Desktop Installer (.exe):</strong> Prefer a direct Windows setup package?
              </div>
              <a
                href="/downloads/global-college-setup.exe"
                download
                style={{
                  background: '#10b981',
                  color: '#052e16',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                ⬇ Download .EXE
              </a>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                background: '#1e293b',
                borderRadius: '12px',
                padding: '0.9rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                border: '1px solid #334155',
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: '#2563eb',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  flexShrink: 0,
                  fontWeight: 900,
                }}
              >
                1
              </div>
              <div style={{ fontSize: '0.85rem', lineHeight: 1.45 }}>
                <strong>Android (Chrome / Samsung Internet):</strong> Tap the browser menu <strong>(⋮)</strong> in the top right and select{' '}
                <strong style={{ color: '#93c5fd' }}>&ldquo;Install App&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong>.
              </div>
            </div>

            <div
              style={{
                background: '#1e293b',
                borderRadius: '12px',
                padding: '0.9rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                border: '1px solid #334155',
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: '#2563eb',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  flexShrink: 0,
                  fontWeight: 900,
                }}
              >
                2
              </div>
              <div style={{ fontSize: '0.85rem', lineHeight: 1.45 }}>
                <strong>iPhone &amp; iPad (Safari):</strong> Tap the <strong>Share icon (↑)</strong> on the bottom bar, scroll down, and tap{' '}
                <strong style={{ color: '#93c5fd' }}>&ldquo;Add to Home Screen (➕)&rdquo;</strong>.
              </div>
            </div>

            <div
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                borderRadius: '12px',
                padding: '0.9rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.85rem',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontSize: '0.82rem', lineHeight: 1.4, color: '#d1fae5', flex: 1 }}>
                <strong>Android Native Package (.apk):</strong> Direct APK install for Android phones:
              </div>
              <a
                href="/downloads/global-college.apk"
                download
                style={{
                  background: '#10b981',
                  color: '#052e16',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                ⬇ Download .APK
              </a>
            </div>
          </div>
        )}

        {/* Benefits list */}
        <div
          style={{
            background: 'rgba(37, 99, 235, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '10px',
            padding: '0.75rem 0.9rem',
            fontSize: '0.78rem',
            color: '#93c5fd',
            marginBottom: '1.25rem',
            lineHeight: 1.6,
          }}
        >
          ✓ Launches in a dedicated Desktop window or Phone Home Screen icon<br />
          ✓ Offline access to timetables, fee statements, and cached study resources<br />
          ✓ Fast 1-click access for Students, Teachers, Bursars &amp; Administrators
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            background: '#2563eb',
            color: '#ffffff',
            border: 'none',
            padding: '0.75rem',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          Got It, Done!
        </button>
      </div>
    </div>
  )
}
