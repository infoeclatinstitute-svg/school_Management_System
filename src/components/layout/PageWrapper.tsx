import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageWrapperProps {
  title: string
  subtitle?: string
  action?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  children: ReactNode
}

export function PageWrapper({ title, subtitle, action, breadcrumbs, children }: PageWrapperProps) {
  useEffect(() => {
    document.title = `${title} | Global College`
    // Ensure any cached browser tab icon is replaced with a blank transparent icon
    const blankIcon = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    const existingIcons = document.querySelectorAll("link[rel*='icon']")
    if (existingIcons.length > 0) {
      existingIcons.forEach((el) => {
        ;(el as HTMLLinkElement).href = blankIcon
      })
    } else {
      const link = document.createElement('link')
      link.rel = 'icon'
      link.href = blankIcon
      document.head.appendChild(link)
    }
  }, [title])

  return (
    <div className="page-container animate-fade-in">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumbs"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            color: '#64748b',
            marginBottom: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {idx > 0 && <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>/</span>}
              {crumb.href ? (
                <Link
                  to={crumb.href}
                  style={{
                    color: '#2563eb',
                    textDecoration: 'none',
                    fontWeight: 500,
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  )
}
