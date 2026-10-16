import React, { useState, useEffect, useMemo } from 'react'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import type { PartnerSchoolTenant, TenantSchoolNotice } from '@/types/tenantSchool'
import { PlusIcon } from '@/components/icons/AppIcons'

interface TenantCampusNoticeboardProps {
  school: PartnerSchoolTenant
  isAdmin?: boolean
  primaryColor?: string
  accentColor?: string
}

export function TenantCampusNoticeboard({
  school,
  isAdmin = false,
  primaryColor = '#1e3a8a',
  accentColor: _accentColor = '#0284c7',
}: TenantCampusNoticeboardProps) {
  const [notices, setNotices] = useState<TenantSchoolNotice[]>(() =>
    tenantSchoolStore.getNoticesBySchool(school.slug, school.active_period_name)
  )
  const [activeFilter, setActiveFilter] = useState<string>('All')

  // Add / Edit Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingNotice, setEditingNotice] = useState<TenantSchoolNotice | null>(null)
  const [formDepartment, setFormDepartment] = useState('Examination Registry')
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formCategory, setFormCategory] = useState<TenantSchoolNotice['category']>('Examination')
  const [formAccentColor, setFormAccentColor] = useState('#d97706')
  const [formAudience, setFormAudience] = useState<'All' | 'Students' | 'Teachers' | 'Parents'>('All')
  const [formIsPinned, setFormIsPinned] = useState(false)
  const [formAuthorName, setFormAuthorName] = useState(school.principal_name || 'Academic Senate')
  const [formAuthorRole, setFormAuthorRole] = useState('Executive Administration')
  const [editorError, setEditorError] = useState<string | null>(null)

  // Notice Read More Modal
  const [readingNotice, setReadingNotice] = useState<TenantSchoolNotice | null>(null)

  // Real-time synchronization
  useEffect(() => {
    const syncNotices = () => {
      setNotices(tenantSchoolStore.getNoticesBySchool(school.slug, school.active_period_name))
    }
    window.addEventListener('gc-tenant-notices-updated', syncNotices)
    window.addEventListener('gc-tenant-school-updated', syncNotices)
    return () => {
      window.removeEventListener('gc-tenant-notices-updated', syncNotices)
      window.removeEventListener('gc-tenant-school-updated', syncNotices)
    }
  }, [school.slug, school.active_period_name])

  // Open Add Modal
  const openAddModal = () => {
    setEditingNotice(null)
    setFormDepartment('Executive Office')
    setFormTitle('')
    setFormContent('')
    setFormCategory('General')
    setFormAccentColor('#1e3a8a')
    setFormAudience('All')
    setFormIsPinned(false)
    setFormAuthorName(school.principal_name || 'Academic Senate')
    setFormAuthorRole('Executive Administration')
    setEditorError(null)
    setIsEditorOpen(true)
  }

  // Open Edit Modal
  const openEditModal = (notice: TenantSchoolNotice) => {
    setEditingNotice(notice)
    setFormDepartment(notice.department)
    setFormTitle(notice.title)
    setFormContent(notice.content)
    setFormCategory(notice.category)
    setFormAccentColor(notice.accent_color || '#2563eb')
    setFormAudience((notice.target_audience as any) || 'All')
    setFormIsPinned(Boolean(notice.is_pinned))
    setFormAuthorName(notice.author_name || 'Academic Senate')
    setFormAuthorRole(notice.author_role || 'Executive Administration')
    setEditorError(null)
    setIsEditorOpen(true)
  }

  // Save Notice
  const handleSaveNotice = (e: React.FormEvent) => {
    e.preventDefault()
    setEditorError(null)

    if (!formTitle.trim()) {
      setEditorError('Please provide a circular title.')
      return
    }
    if (!formContent.trim()) {
      setEditorError('Please provide circular announcement details.')
      return
    }

    const payload = {
      school_slug: school.slug,
      department: formDepartment.trim() || 'Executive Administration',
      title: formTitle.trim(),
      content: formContent.trim(),
      category: formCategory,
      accent_color: formAccentColor,
      target_audience: formAudience,
      is_pinned: formIsPinned,
      author_name: formAuthorName.trim() || 'Academic Administration',
      author_role: formAuthorRole.trim() || 'Official Circular',
    }

    if (editingNotice) {
      tenantSchoolStore.updateNotice(editingNotice.id, payload)
    } else {
      tenantSchoolStore.addNotice(payload)
    }

    setNotices(tenantSchoolStore.getNoticesBySchool(school.slug, school.active_period_name))
    setIsEditorOpen(false)
  }

  // Delete Notice
  const handleDeleteNotice = (notice: TenantSchoolNotice) => {
    if (window.confirm(`Are you sure you want to remove the circular "${notice.title}"?`)) {
      tenantSchoolStore.deleteNotice(notice.id, school.slug)
      setNotices(tenantSchoolStore.getNoticesBySchool(school.slug, school.active_period_name))
    }
  }

  // Toggle Pin
  const handleTogglePin = (notice: TenantSchoolNotice) => {
    tenantSchoolStore.togglePinNotice(notice.id, school.slug)
    setNotices(tenantSchoolStore.getNoticesBySchool(school.slug, school.active_period_name))
  }

  // Filtered notices
  const filteredNotices = useMemo(() => {
    if (activeFilter === 'All') return notices
    return notices.filter((n) => {
      if (activeFilter === 'Pinned') return n.is_pinned
      if (activeFilter === 'Examination') return n.category === 'Examination'
      if (activeFilter === 'Finance') return n.category === 'Finance & Fees'
      if (activeFilter === 'Academics') return n.category === 'Academics'
      return n.category === activeFilter
    })
  }, [notices, activeFilter])

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '22px',
        border: '1px solid #e2e8f0',
        padding: '1.75rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        marginBottom: '2.75rem',
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '0.9rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.45rem' }}>📢</span>
          <div>
            <h3 style={{ fontSize: '1.18rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
              Campus Noticeboard &amp; Senate Announcements
            </h3>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
              Official circulars published by the Executive Office, Examinations Registry &amp; Bursar
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              color: primaryColor,
              background: `${primaryColor}14`,
              padding: '4px 10px',
              borderRadius: '6px',
            }}
          >
            Session: {school.active_period_name || 'Active Term'}
          </span>

          {isAdmin && (
            <button
              type="button"
              onClick={openAddModal}
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '5px 12px',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: `0 3px 10px ${primaryColor}30`,
              }}
            >
              <PlusIcon size={13} color="#ffffff" />
              <span>+ Post Circular</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {[
          { id: 'All', label: 'All Notices' },
          { id: 'Examination', label: 'Examinations' },
          { id: 'Finance', label: 'Bursar & Finance' },
          { id: 'Academics', label: 'Academic Faculty' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActiveFilter(f.id)}
            style={{
              background: activeFilter === f.id ? '#0f172a' : '#f8fafc',
              color: activeFilter === f.id ? '#ffffff' : '#64748b',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '4px 11px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notice Cards Grid */}
      {filteredNotices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>📯</div>
          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>No Circulars in this Category</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
            {isAdmin ? 'Click "+ Post Circular" above to publish an official announcement.' : 'New circulars will appear here as they are released.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.1rem' }}>
          {filteredNotices.map((notice) => {
            const topColor = notice.accent_color || '#2563eb'
            return (
              <div
                key={notice.id}
                style={{
                  background: '#f8fafc',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  border: '1px solid #e2e8f0',
                  borderTop: `3.5px solid ${topColor}`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 900, color: topColor, textTransform: 'uppercase' }}>
                      {notice.department}
                    </div>
                    {notice.is_pinned && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>
                        📌 Pinned
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px', lineHeight: 1.35 }}>
                    {notice.title}
                  </div>

                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {notice.content}
                  </p>
                </div>

                <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    onClick={() => setReadingNotice(notice)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: topColor,
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Read Circular ➔
                  </button>

                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => handleTogglePin(notice)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem' }}
                        title={notice.is_pinned ? 'Unpin Circular' : 'Pin Circular to Top'}
                      >
                        📌
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(notice)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem' }}
                        title="Edit Circular"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNotice(notice)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem' }}
                        title="Delete Circular"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL: READ FULL CIRCULAR */}
      {readingNotice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem',
          }}
          onClick={() => setReadingNotice(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              borderTop: `5px solid ${readingNotice.accent_color || '#2563eb'}`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, color: readingNotice.accent_color || '#2563eb', textTransform: 'uppercase' }}>
                  {readingNotice.department}
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 0' }}>
                  {readingNotice.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReadingNotice(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
              Published by: <strong>{readingNotice.author_name || 'Academic Senate'}</strong> ({readingNotice.author_role || 'Executive Office'})
            </div>

            <p style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.7, margin: '0 0 1.5rem', whiteSpace: 'pre-wrap' }}>
              {readingNotice.content}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setReadingNotice(null)}
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.6rem 1.4rem',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                Close Circular
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: POST / EDIT CIRCULAR */}
      {isEditorOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem',
          }}
          onClick={() => setIsEditorOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              border: `2px solid ${primaryColor}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, color: primaryColor, textTransform: 'uppercase' }}>
                  Senate Circular Management
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '2px 0 0' }}>
                  {editingNotice ? 'Edit Circular Notice' : 'Post New Official Circular'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {editorError && (
              <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700, marginBottom: '1rem' }}>
                ⚠️ {editorError}
              </div>
            )}

            <form onSubmit={handleSaveNotice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '5px' }}>
                    Publishing Department / Office *
                  </label>
                  <select
                    value={formDepartment}
                    onChange={(e) => {
                      setFormDepartment(e.target.value)
                      if (e.target.value === 'Examination Registry') {
                        setFormCategory('Examination')
                        setFormAccentColor('#d97706')
                      } else if (e.target.value === "Bursar's Treasury") {
                        setFormCategory('Finance & Fees')
                        setFormAccentColor('#16a34a')
                      } else if (e.target.value === 'Academic Faculty') {
                        setFormCategory('Academics')
                        setFormAccentColor('#2563eb')
                      } else {
                        setFormCategory('General')
                        setFormAccentColor('#1e3a8a')
                      }
                    }}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.86rem' }}
                  >
                    <option value="Examination Registry">Examination Registry</option>
                    <option value="Bursar's Treasury">Bursar's Treasury</option>
                    <option value="Academic Faculty">Academic Faculty</option>
                    <option value="Executive Office">Executive Office / Principal</option>
                    <option value="Dean of Students">Dean of Students</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '5px' }}>
                    Accent Highlight Color
                  </label>
                  <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
                    {[
                      { hex: '#d97706', name: 'Amber' },
                      { hex: '#16a34a', name: 'Green' },
                      { hex: '#2563eb', name: 'Blue' },
                      { hex: '#e11d48', name: 'Rose' },
                      { hex: '#1e3a8a', name: 'Navy' },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setFormAccentColor(c.hex)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: c.hex,
                          border: formAccentColor === c.hex ? '3px solid #0f172a' : '1px solid rgba(0,0,0,0.1)',
                          cursor: 'pointer',
                        }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '5px' }}>
                  Circular Headline / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End of Semester Examination Timetable Release"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '5px' }}>
                  Circular Content &amp; Instructions *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Full circular text, guidelines, or notice details..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.86rem', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '5px' }}>
                    Author / Office
                  </label>
                  <input
                    type="text"
                    value={formAuthorName}
                    onChange={(e) => setFormAuthorName(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formIsPinned}
                      onChange={(e) => setFormIsPinned(e.target.checked)}
                    />
                    <span>📌 Pin to top of board</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', background: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.65rem 1.5rem', borderRadius: '10px', border: 'none', background: primaryColor, color: '#ffffff', fontWeight: 800, cursor: 'pointer' }}
                >
                  {editingNotice ? 'Update Circular' : 'Publish Circular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
