import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { schoolStore } from '@/lib/schoolData'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import type { Announcement } from '@/lib/database.types'

export function AnnouncementsAdmin() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  const [showAddModal, setShowAddModal] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [target, setTarget] = useState<string>('all')
  const [pinned, setPinned] = useState(false)
  const [annToDelete, setAnnToDelete] = useState<Announcement | null>(null)

  // Fetch announcements from schoolStore
  const { data: announcements, isLoading } = useQuery({
    queryKey: ['admin-announcements-list'],
    queryFn: async () => {
      const notices = schoolStore.getNotices()
      return notices.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.content,
        target: n.target_audience.toLowerCase(),
        pinned: n.is_pinned,
        author_id: profile?.id || '',
        created_at: n.publish_date,
        author: { full_name: n.author_name },
      })) as unknown as Announcement[]
    },
  })

  // Create announcement mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !body.trim()) return
      const mappedTarget =
        target === 'students' ? 'Students' : target === 'teachers' ? 'Teachers' : target === 'parents' ? 'Parents' : 'All'
      await schoolStore.addNotice({
        id: `not-${Date.now()}`,
        title: title.trim(),
        category: 'General',
        target_audience: mappedTarget,
        content: body.trim(),
        author_name: profile?.full_name || 'College Administration',
        author_role: 'Administration',
        publish_date: new Date().toISOString().split('T')[0],
        is_pinned: pinned,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements-list'] })
      setShowAddModal(false)
      setTitle('')
      setBody('')
      setPinned(false)
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await schoolStore.deleteNotice(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements-list'] })
      setAnnToDelete(null)
    },
  })

  return (
    <PageWrapper
      title="School Announcements Broadcast"
      subtitle="Post school-wide notices, exam schedules, or urgent student updates."
      action={
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          + Post New Announcement
        </Button>
      }
    >
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
          <Spinner size="lg" />
        </div>
      ) : announcements && announcements.length > 0 ? (
        <div className="flex flex-col gap-4">
          {announcements.map((a) => (
            <div key={a.id} className="card">
              <div className="card-body">
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {a.pinned && <span className="badge badge-accent">📌 Pinned</span>}
                      <span className="badge badge-secondary">Target: {a.target}</span>
                      <span className="text-xs text-muted">{formatDate(a.created_at)}</span>
                    </div>
                    <h3 className="course-card-title">{a.title}</h3>
                    <p style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-2) 0 0', lineHeight: 1.5 }}>
                      {a.body}
                    </p>
                    <div className="text-xs text-muted mt-2">By: {a.author?.full_name || 'Admin'}</div>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => setAnnToDelete(a)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state card">
          <div className="empty-state-icon">📢</div>
          <div className="empty-state-title">No Announcements Posted</div>
          <div className="empty-state-desc">
            Post an announcement to notify students and teachers on their dashboards.
          </div>
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            + Post Announcement Now
          </Button>
        </div>
      )}

      {/* Add Announcement Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="📢 Post School Announcement"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createMutation.mutate()
          }}
        >
          <div className="form-group">
            <label className="form-label" htmlFor="annTitle">Announcement Title *</label>
            <input
              id="annTitle"
              type="text"
              placeholder="e.g. End of Term Exam Schedule"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="annBody">Notice Body & Details *</label>
            <textarea
              id="annBody"
              placeholder="Write the full announcement details here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="annTarget">Audience Target</label>
            <select
              id="annTarget"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="all">Everyone (All Students & Teachers)</option>
              <option value="students">Students Only</option>
              <option value="teachers">Teachers Only</option>
            </select>
          </div>

          <div className="form-group">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <span>Pin to top of dashboards 📌</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={createMutation.isPending}>
              Publish Announcement 🚀
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {annToDelete && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setAnnToDelete(null)}
          onConfirm={() => deleteMutation.mutate(annToDelete.id)}
          title="Delete Announcement?"
          message={`Are you sure you want to remove announcement "${annToDelete.title}"?`}
          confirmLabel="Delete Notice"
          loading={deleteMutation.isPending}
        />
      )}
    </PageWrapper>
  )
}
