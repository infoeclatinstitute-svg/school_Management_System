import type { Announcement } from '@/lib/database.types'
import { formatDate } from '@/lib/utils'

export function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  return (
    <div className={`announcement-card ${announcement.pinned ? 'pinned' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="announcement-title">
          {announcement.pinned && <span style={{ marginRight: 6 }}>📌</span>}
          {announcement.title}
        </div>
        <span className="text-xs text-muted">{formatDate(announcement.created_at)}</span>
      </div>
      <div className="announcement-body">{announcement.body}</div>
      <div className="announcement-meta">
        <span>By: {announcement.author?.full_name || 'School Admin'}</span>
        <span>Target: {announcement.target}</span>
      </div>
    </div>
  )
}
