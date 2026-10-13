import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  hoverable?: boolean
  onClick?: () => void
  className?: string
}

function Card({ children, hoverable, onClick, className = '' }: CardProps) {
  return (
    <div
      className={`card ${hoverable ? 'card-hoverable' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="card-header">
      <div>
        <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontFamily: 'var(--font-heading)', color: 'var(--color-primary)' }}>{title}</h3>
        {subtitle && <p style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-muted)' }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card-body ${className}`}>{children}</div>
}

function CardFooter({ children }: { children: ReactNode }) {
  return <div className="card-footer">{children}</div>
}

Card.Header = CardHeader
Card.Body = CardBody
Card.Footer = CardFooter

export { Card }
