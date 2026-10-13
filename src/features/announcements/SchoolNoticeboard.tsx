import { useState, useMemo, useEffect } from 'react'
import { schoolStore } from '@/lib/schoolData'
import { useAuthContext } from '@/features/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import type { SchoolNotice } from '@/types/school'

export function SchoolNoticeboard() {
  const { profile } = useAuthContext()
  const canManageNotices = profile?.role === 'admin' || profile?.role === 'bursar' || profile?.role === 'teacher'

  const [notices, setNotices] = useState<SchoolNotice[]>(() => schoolStore.getNotices())
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [audienceFilter, setAudienceFilter] = useState('All')

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingNotice, setEditingNotice] = useState<SchoolNotice | null>(null)
  const [newNotice, setNewNotice] = useState<Partial<SchoolNotice>>({
    title: '',
    category: 'General',
    target_audience: 'All',
    content: '',
    author_name: profile?.full_name || 'College Administration',
    author_role: profile?.role === 'admin' ? 'Principal & Head of Institution' : 'College Administration',
    is_pinned: false,
  })

  // Load from schoolStore & Subscribe to Realtime Updates
  useEffect(() => {
    const syncNotices = () => {
      setNotices(schoolStore.getNotices())
    }

    syncNotices()
    schoolStore.syncWithCloud(true).then(syncNotices).catch(() => {})

    window.addEventListener('gc-data-synced', syncNotices)
    window.addEventListener('storage', syncNotices)

    return () => {
      window.removeEventListener('gc-data-synced', syncNotices)
      window.removeEventListener('storage', syncNotices)
    }
  }, [])

  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      const matchCat = categoryFilter === 'All' || n.category === categoryFilter
      const matchAud = audienceFilter === 'All' || n.target_audience === audienceFilter || n.target_audience === 'All'
      return matchCat && matchAud
    })
  }, [notices, categoryFilter, audienceFilter])

  // Handle Add Notice
  const handleAddNotice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNotice.title || !newNotice.content) return

    const notice: SchoolNotice = {
      id: `not-${Date.now()}`,
      title: newNotice.title || '',
      category: (newNotice.category as any) || 'General',
      target_audience: (newNotice.target_audience as any) || 'All',
      content: newNotice.content || '',
      author_name: newNotice.author_name || 'College Administration',
      author_role: newNotice.author_role || 'Academic Affairs',
      publish_date: new Date().toISOString().split('T')[0],
      is_pinned: Boolean(newNotice.is_pinned),
    }

    schoolStore.addNotice(notice)

    // Save to Supabase Cloud Database
    try {
      if (profile?.id) {
        await supabase.from('announcements').insert({
          title: notice.title,
          body: notice.content,
          target: notice.target_audience.toLowerCase(),
          pinned: notice.is_pinned,
          author_id: profile.id,
        })
      }
    } catch {}

    setNotices(schoolStore.getNotices())
    setShowAddModal(false)
    setNewNotice({ title: '', category: 'General', target_audience: 'All', content: '', is_pinned: false })
  }

  // Handle Edit Notice
  const handleSaveEditNotice = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingNotice) return

    schoolStore.updateNotice(editingNotice.id, editingNotice)
    setNotices(schoolStore.getNotices())
    setEditingNotice(null)
  }

  // Handle Delete Notice
  const handleDeleteNotice = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this circular notice?')) {
      schoolStore.deleteNotice(id)
      try {
        await supabase.from('announcements').delete().eq('id', id)
      } catch {}
      setNotices((prev) => prev.filter((n) => n.id !== id))
    }
  }

  // Toggle Pin
  const handleTogglePin = (notice: SchoolNotice) => {
    schoolStore.updateNotice(notice.id, { is_pinned: !notice.is_pinned })
    setNotices(schoolStore.getNotices())
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">College Noticeboard & Official Circulars</h1>
          <p className="page-subtitle">
            Institution-wide bulletins, semester exam schedules, administrative directives, and announcements.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.print()}
          >
            🖨️ Print Noticeboard
          </button>
          {canManageNotices && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              + Post Official Circular
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card mb-6" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div>
            <label className="label" style={{ fontSize: '0.75rem' }}>Filter by Category</label>
            <select
              className="input"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              <option value="Urgent">🚨 Urgent Alerts</option>
              <option value="Academic">📚 Academic & Exams</option>
              <option value="Fees & Finance">💳 Fees & Finance</option>
              <option value="Events & Sports">🏆 Events & Sports</option>
              <option value="General">📢 General Notices</option>
            </select>
          </div>

          <div>
            <label className="label" style={{ fontSize: '0.75rem' }}>Target Audience</label>
            <select
              className="input"
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value)}
            >
              <option value="All">All Audiences</option>
              <option value="Students">Students Only</option>
              <option value="Parents">Parents & Guardians</option>
              <option value="Teachers">Faculty & Staff</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notices List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {filteredNotices.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No circular notices found. {canManageNotices ? 'Click "+ Post Official Circular" to publish an announcement.' : 'Official circulars published by the administration will appear here.'}
          </div>
        ) : (
          filteredNotices.map((notice) => (
            <div
              key={notice.id}
              className="card"
              style={{
                padding: '1.5rem',
                borderLeft: notice.is_pinned ? '5px solid #ea580c' : '5px solid var(--color-primary)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {notice.is_pinned && (
                    <span className="badge badge-warning" style={{ fontWeight: 700 }}>
                      📌 PINNED CIRCULAR
                    </span>
                  )}
                  <span className="badge badge-info">{notice.category}</span>
                  <span className="badge badge-neutral">Audience: {notice.target_audience}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    Published: <strong>{notice.publish_date}</strong>
                  </span>
                  {canManageNotices && (
                    <>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                        onClick={() => handleTogglePin(notice)}
                        title={notice.is_pinned ? 'Unpin Circular' : 'Pin to Top'}
                      >
                        {notice.is_pinned ? '📍 Unpin' : '📌 Pin'}
                      </button>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                        onClick={() => setEditingNotice(notice)}
                        title="Edit Notice"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                        onClick={() => handleDeleteNotice(notice.id)}
                        title="Delete Notice"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.75rem', color: 'var(--color-text-primary)' }}>
                {notice.title}
              </h2>

              <div style={{ fontSize: '0.9rem', lineHeight: '1.7', whiteSpace: 'pre-line', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
                {notice.content}
              </div>

              {notice.attachments && notice.attachments.length > 0 && (
                <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {notice.attachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={att.url}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.78rem' }}
                    >
                      📎 {att.name} ({att.size})
                    </a>
                  ))}
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                <div>
                  Signed: <strong>{notice.author_name}</strong> • <em>{notice.author_role}</em>
                </div>
                <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                  Global College
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Post Notice Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Publish Official College Circular</h3>
              <button type="button" className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddNotice}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label className="label">Circular Title *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="e.g. Semester 1 Final Examination Schedule"
                    value={newNotice.title}
                    onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Category</label>
                    <select
                      className="input"
                      value={newNotice.category}
                      onChange={(e) => setNewNotice({ ...newNotice, category: e.target.value as any })}
                    >
                      <option value="General">General</option>
                      <option value="Urgent">Urgent Alert</option>
                      <option value="Academic">Academic & Exams</option>
                      <option value="Fees & Finance">Fees & Finance</option>
                      <option value="Events & Sports">Events & Sports</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Target Audience</label>
                    <select
                      className="input"
                      value={newNotice.target_audience}
                      onChange={(e) => setNewNotice({ ...newNotice, target_audience: e.target.value as any })}
                    >
                      <option value="All">All Audiences</option>
                      <option value="Students">Students Only</option>
                      <option value="Parents">Parents & Guardians</option>
                      <option value="Teachers">Faculty & Staff</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Content / Body *</label>
                  <textarea
                    className="input"
                    rows={5}
                    required
                    placeholder="Type official circular content here..."
                    value={newNotice.content}
                    onChange={(e) => setNewNotice({ ...newNotice, content: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="pinNotice"
                    checked={newNotice.is_pinned}
                    onChange={(e) => setNewNotice({ ...newNotice, is_pinned: e.target.checked })}
                  />
                  <label htmlFor="pinNotice" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                    Pin this circular to the top of the noticeboard
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Publish Circular</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Notice Modal */}
      {editingNotice && (
        <div className="modal-overlay" onClick={() => setEditingNotice(null)}>
          <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Circular Notice</h3>
              <button type="button" className="modal-close" onClick={() => setEditingNotice(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveEditNotice}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label className="label">Circular Title *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={editingNotice.title}
                    onChange={(e) => setEditingNotice({ ...editingNotice, title: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Category</label>
                    <select
                      className="input"
                      value={editingNotice.category}
                      onChange={(e) => setEditingNotice({ ...editingNotice, category: e.target.value as any })}
                    >
                      <option value="General">General</option>
                      <option value="Urgent">Urgent Alert</option>
                      <option value="Academic">Academic & Exams</option>
                      <option value="Fees & Finance">Fees & Finance</option>
                      <option value="Events & Sports">Events & Sports</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Target Audience</label>
                    <select
                      className="input"
                      value={editingNotice.target_audience}
                      onChange={(e) => setEditingNotice({ ...editingNotice, target_audience: e.target.value as any })}
                    >
                      <option value="All">All Audiences</option>
                      <option value="Students">Students Only</option>
                      <option value="Parents">Parents & Guardians</option>
                      <option value="Teachers">Faculty & Staff</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Content / Body *</label>
                  <textarea
                    className="input"
                    rows={5}
                    required
                    value={editingNotice.content}
                    onChange={(e) => setEditingNotice({ ...editingNotice, content: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingNotice(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Circular</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
