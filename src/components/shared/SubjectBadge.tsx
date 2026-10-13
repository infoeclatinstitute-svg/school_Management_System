import type { Subject } from '@/lib/database.types'

export function SubjectBadge({ subject }: { subject?: Subject | null }) {
  if (!subject) return null
  return (
    <span
      className="subject-badge"
      style={{ backgroundColor: subject.color_hex || 'var(--color-primary)' }}
    >
      📚 {subject.name}
    </span>
  )
}
