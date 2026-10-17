import React from 'react'

export interface AppLogoProps {
  size?: number | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon'
  theme?: 'dark' | 'light' | 'auto'
  className?: string
  showTagline?: boolean
}

export function AppLogo({
  size = 'md',
  variant = 'full',
  theme = 'auto',
  className = '',
  showTagline = true,
}: AppLogoProps) {
  const pixelSize =
    typeof size === 'number'
      ? size
      : size === 'xs'
      ? 24
      : size === 'sm'
      ? 32
      : size === 'md'
      ? 42
      : size === 'lg'
      ? 54
      : 72

  // Emphasize contrast according to theme
  const titleColor =
    theme === 'dark' ? '#ffffff' : theme === 'light' ? '#0f172a' : 'var(--color-text, #0f172a)'
  const subtitleColor =
    theme === 'dark' ? '#94a3b8' : theme === 'light' ? '#64748b' : 'var(--color-text-secondary, #64748b)'

  return (
    <div
      className={`app-logo-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${Math.max(8, pixelSize * 0.25)}px`,
        textDecoration: 'none',
        userSelect: 'none',
      }}
    >
      {/* Scalable Vector Emblem */}
      <svg
        viewBox="0 0 512 512"
        width={pixelSize}
        height={pixelSize}
        style={{ flexShrink: 0, display: 'block', borderRadius: `${pixelSize * 0.24}px` }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="gcLogoBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="50%" stop-color="#1e293b" />
            <stop offset="100%" stop-color="#090d16" />
          </linearGradient>

          <linearGradient id="gcLogoBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.7" />
            <stop offset="50%" stop-color="#2563eb" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.5" />
          </linearGradient>

          <linearGradient id="gcLogoGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fde68a" />
            <stop offset="35%" stop-color="#f59e0b" />
            <stop offset="100%" stop-color="#d97706" />
          </linearGradient>

          <linearGradient id="gcLogoBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="60%" stop-color="#2563eb" />
            <stop offset="100%" stop-color="#1d4ed8" />
          </linearGradient>

          <radialGradient id="gcLogoGlow" cx="50%" cy="48%" r="48%">
            <stop offset="0%" stop-color="#2563eb" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#2563eb" stop-opacity="0" />
          </radialGradient>
        </defs>

        {/* Icon Base Squircle */}
        <rect width="512" height="512" rx="124" fill="url(#gcLogoBg)" />
        <rect x="4" y="4" width="504" height="504" rx="120" fill="none" stroke="url(#gcLogoBorder)" stroke-width="6" />
        <circle cx="256" cy="256" r="190" fill="url(#gcLogoGlow)" />

        {/* Outer Globe Arc: Swirling "G" */}
        <path
          d="M 256 96
             C 167.6 96 96 167.6 96 256
             C 96 344.4 167.6 416 256 416
             C 334.2 416 399.2 359.8 412.8 286
             L 358 286
             C 346.2 328.6 304.8 360 256 360
             C 198.6 360 152 313.4 152 256
             C 152 198.6 198.6 152 256 152
             C 289.4 152 318.8 167.8 337.4 192.4
             L 384 154
             C 352.8 118.2 307.2 96 256 96 Z"
          fill="url(#gcLogoBlue)"
        />

        {/* Inward Horizontal Gold Bar */}
        <path
          d="M 256 230
             L 396 230
             C 404.8 230 412 237.2 412 246
             L 412 280
             C 412 288.8 404.8 296 396 296
             L 256 296
             C 247.2 296 240 288.8 240 280
             L 240 246
             C 240 237.2 247.2 230 256 230 Z"
          fill="url(#gcLogoGold)"
        />

        {/* Academic Mortarboard Diamond at Upper Apex */}
        <g transform="translate(372, 148)">
          <polygon points="0,-42 42,0 0,42 -42,0" fill="url(#gcLogoGold)" />
          <polygon points="0,-30 30,0 0,30 -30,0" fill="#fef08a" opacity="0.65" />
          <path d="M 0 0 L 26 28 L 26 44" fill="none" stroke="#f59e0b" stroke-width="4.5" stroke-linecap="round" />
          <circle cx="26" cy="48" r="5" fill="#f59e0b" />
        </g>

        {/* Orbital Meridian Rings */}
        <ellipse
          cx="256"
          cy="256"
          rx="124"
          ry="38"
          fill="none"
          stroke="url(#gcLogoGold)"
          stroke-width="5"
          stroke-dasharray="8 8"
          opacity="0.45"
          transform="rotate(-15, 256, 256)"
        />

        {/* Center Star of Wisdom */}
        <circle cx="256" cy="256" r="10" fill="#ffffff" />
        <circle cx="256" cy="256" r="16" fill="none" stroke="#38bdf8" stroke-width="2.5" opacity="0.8" />
      </svg>

      {/* Typography for Full Variant */}
      {variant === 'full' && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <div
            style={{
              fontSize: `${Math.max(14, pixelSize * 0.44)}px`,
              fontWeight: 900,
              color: titleColor,
              letterSpacing: '0.04em',
              fontFamily: 'var(--font-heading, system-ui, sans-serif)',
              whiteSpace: 'nowrap',
            }}
          >
            GLOBAL COLLEGE
          </div>
          {showTagline && (
            <div
              style={{
                fontSize: `${Math.max(10, pixelSize * 0.24)}px`,
                fontWeight: 700,
                color: subtitleColor,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                marginTop: '2px',
                whiteSpace: 'nowrap',
              }}
            >
              School Management System
            </div>
          )}
        </div>
      )}
    </div>
  )
}
