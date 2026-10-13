import { useEffect, type ReactNode } from 'react'

interface PageWrapperProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

export function PageWrapper({ title, subtitle, action, children }: PageWrapperProps) {
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
