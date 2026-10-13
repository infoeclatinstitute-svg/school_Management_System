import type { Role } from '@/lib/database.types'

type BadgeVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger' | 'muted'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'primary', children, className = '' }: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  )
}

export function RoleBadge({ role }: { role: Role }) {
  const labels: Record<Role, string> = {
    admin: '⚙️ Principal / Admin',
    bursar: '💼 Bursar & Admissions',
    teacher: '👩‍🏫 Faculty / HOD',
    student: '🎓 Student',
    parent: '👨‍👩‍👧 Parent / Sponsor',
  }
  return (
    <span className={`badge badge-role-${role}`}>
      {labels[role] || role}
    </span>
  )
}
