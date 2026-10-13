import { useState, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { schoolStore } from '@/lib/schoolData'
import type { TimetablePeriod } from '@/types/school'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const

export function TimetableView() {
  const { profile } = useAuth()
  const isStudent = profile?.role === 'student'
  const [subjects] = useState(() => schoolStore.getSubjects())
  const [selectedDay, setSelectedDay] = useState<string>('Monday')
  const [selectedClass, setSelectedClass] = useState<string>('All')
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week')
  const [timetablePeriods, setTimetablePeriods] = useState<TimetablePeriod[]>(() =>
    schoolStore.getTimetable()
  )

  // Edit / Add Period States
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<TimetablePeriod | null>(null)
  const [newPeriod, setNewPeriod] = useState<Partial<TimetablePeriod>>({
    period_number: 1,
    start_time: '08:30',
    end_time: '10:00',
    subject_name: subjects[0]?.name || 'Computer Packages & Digital Literacy',
    subject_code: subjects[0]?.code || 'COMP-101',
    color_hex: subjects[0]?.color_hex || '#1e3a8a',
    teacher_name: '',
    room: 'Lab Suite 1',
    day_of_week: 'Monday',
    class_name: subjects[0]?.name || 'Short Course Cohort',
    class_id: 'cls-cohort',
  })

  const filteredPeriods = useMemo(() => {
    return timetablePeriods.filter(
      (p) =>
        (selectedClass === 'All' || p.class_name.includes(selectedClass)) &&
        (viewMode === 'week' || p.day_of_week === selectedDay)
    )
  }, [timetablePeriods, selectedClass, viewMode, selectedDay])

  const currentDayName = useMemo(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    return (DAYS_OF_WEEK as readonly string[]).includes(today) ? today : 'Monday'
  }, [])

  const currentPeriod = useMemo(() => {
    const todayPeriods = timetablePeriods.filter((p) => p.day_of_week === currentDayName)
    if (todayPeriods.length === 0) return timetablePeriods[0] || null

    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()

    const active = todayPeriods.find((p) => {
      const [startH, startM] = (p.start_time || '00:00').split(':').map(Number)
      const [endH, endM] = (p.end_time || '23:59').split(':').map(Number)
      const startMin = startH * 60 + (startM || 0)
      const endMin = endH * 60 + (endM || 0)
      return nowMinutes >= startMin && nowMinutes <= endMin
    })

    return active || todayPeriods[0] || null
  }, [timetablePeriods, currentDayName])

  // Handle Add Period
  const handleAddPeriod = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPeriod.subject_name || !newPeriod.teacher_name) return

    const matchedSub = schoolStore.getSubjects().find((s) => s.name.toLowerCase() === newPeriod.subject_name?.toLowerCase()) || schoolStore.getCourseUnits().find((u) => u.title.toLowerCase() === newPeriod.subject_name?.toLowerCase())
    const matchedTeacher = schoolStore.getTeachers().find((t) => t.name.toLowerCase() === newPeriod.teacher_name?.toLowerCase())

    const period: TimetablePeriod = {
      id: `tt-${Date.now()}`,
      period_number: Number(newPeriod.period_number) || 1,
      start_time: newPeriod.start_time || '08:30',
      end_time: newPeriod.end_time || '10:00',
      subject_id: matchedSub?.id || `sub-${Date.now()}`,
      subject_name: newPeriod.subject_name,
      subject_code: newPeriod.subject_code || (matchedSub as any)?.code || 'CRS-101',
      color_hex: newPeriod.color_hex || (matchedSub as any)?.color_hex || '#2563eb',
      teacher_id: matchedTeacher?.id || `tch-${Date.now()}`,
      teacher_name: newPeriod.teacher_name,
      room: newPeriod.room || 'Online Virtual Lab',
      day_of_week: (newPeriod.day_of_week as any) || 'Monday',
      class_id: `cls-${Date.now()}`,
      class_name: newPeriod.class_name || newPeriod.subject_name,
    }

    schoolStore.addPeriod(period)
    setTimetablePeriods(schoolStore.getTimetable())
    setShowAddModal(false)
  }

  // Handle Edit Period
  const handleSaveEditPeriod = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPeriod) return

    schoolStore.updatePeriod(editingPeriod.id, editingPeriod)
    setTimetablePeriods(schoolStore.getTimetable())
    setEditingPeriod(null)
  }

  // Handle Delete Period
  const handleDeletePeriod = (id: string) => {
    if (window.confirm('Are you sure you want to remove this lecture period from the schedule?')) {
      schoolStore.deletePeriod(id)
      setTimetablePeriods(schoolStore.getTimetable())
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Master College Timetable & Lecture Schedule</h1>
          <p className="page-subtitle">
            Departmental lecture schedules, lab allocations, and faculty timetables.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.print()}
          >
            🖨️ Print Master Timetable
          </button>
          {!isStudent && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              + Add Lecture Period
            </button>
          )}
          <div style={{ display: 'inline-flex', background: 'var(--color-bg-secondary)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'week' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('week')}
            >
              Weekly Grid
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'day' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('day')}
            >
              Day View
            </button>
          </div>
        </div>
      </div>

      {/* Live "Happening Now" banner */}
      {currentPeriod && (
        <div
          className="card mb-6"
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
            color: '#fff',
            padding: '1.25rem 1.5rem',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 12px #22c55e',
                animation: 'pulse 2s infinite',
              }}
            />
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#93c5fd', fontWeight: 600 }}>
                Live Period in Session • {currentPeriod.day_of_week} (Period {currentPeriod.period_number})
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.15rem' }}>
                {currentPeriod.subject_name} ({currentPeriod.subject_code})
              </div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                📍 {currentPeriod.room} • 👨‍🏫 {currentPeriod.teacher_name} • ⏱️ {currentPeriod.start_time} - {currentPeriod.end_time}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
              Cohort: {currentPeriod.class_name}
            </span>
          </div>
        </div>
      )}

      {/* Controls & Filter */}
      <div className="card mb-6" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <div>
              <label className="label" style={{ fontSize: '0.75rem' }}>Select Program / Cohort</label>
              <select
                className="input"
                style={{ width: '100%', maxWidth: '320px' }}
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="All">All College Short Courses</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.name}>{sub.name}</option>
                ))}
              </select>
            </div>

            {viewMode === 'day' && (
              <div>
                <label className="label" style={{ fontSize: '0.75rem' }}>Select Day</label>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {DAYS_OF_WEEK.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`btn btn-sm ${selectedDay === d ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSelectedDay(d)}
                    >
                      {d.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timetable Weekly Display */}
      {viewMode === 'week' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {DAYS_OF_WEEK.map((day) => {
            const dayPeriods = filteredPeriods
              .filter((p) => p.day_of_week === day)
              .sort((a, b) => a.period_number - b.period_number)

            return (
              <div key={day} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ borderBottom: '2px solid var(--color-primary)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '1rem', color: 'var(--color-primary)' }}>{day}</strong>
                  <span className="badge badge-info">{dayPeriods.length} Units</span>
                </div>

                {dayPeriods.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', padding: '2rem 0', textAlign: 'center' }}>
                    No lectures scheduled.
                  </div>
                ) : (
                  dayPeriods.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '6px',
                        background: 'var(--color-bg-secondary)',
                        borderLeft: `4px solid ${p.color_hex || '#2563eb'}`,
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: p.color_hex || '#2563eb' }}>
                          {p.subject_code} • P{p.period_number}
                        </span>
                        {!isStudent && (
                          <div style={{ display: 'inline-flex', gap: '2px' }}>
                            <button
                              type="button"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                              onClick={() => setEditingPeriod(p)}
                              title="Edit Period"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                              onClick={() => handleDeletePeriod(p.id)}
                              title="Delete Period"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: '0.2rem' }}>{p.subject_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                        ⏱️ {p.start_time} - {p.end_time}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        📍 {p.room} • 👨‍🏫 {p.teacher_name}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* Day View */
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-primary)' }}>
            📅 {selectedDay} Lecture Schedule — {selectedClass}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredPeriods.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  borderRadius: '8px',
                  background: 'var(--color-bg-secondary)',
                  borderLeft: `5px solid ${p.color_hex || '#2563eb'}`,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-primary">{p.subject_code}</span>
                    <strong style={{ fontSize: '1rem' }}>{p.subject_name}</strong>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem' }}>
                    ⏱️ {p.start_time} - {p.end_time} • 📍 {p.room} • 👨‍🏫 Lecturer: {p.teacher_name}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingPeriod(p)}>
                    ✏️ Edit
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDeletePeriod(p.id)}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Period Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Timetable Lecture Period</h3>
              <button type="button" className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddPeriod}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Day of Week</label>
                    <select
                      className="input"
                      value={newPeriod.day_of_week}
                      onChange={(e) => setNewPeriod({ ...newPeriod, day_of_week: e.target.value as any })}
                    >
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Period Number</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="input"
                      value={newPeriod.period_number}
                      onChange={(e) => setNewPeriod({ ...newPeriod, period_number: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Start Time</label>
                    <input
                      type="time"
                      className="input"
                      value={newPeriod.start_time}
                      onChange={(e) => setNewPeriod({ ...newPeriod, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">End Time</label>
                    <input
                      type="time"
                      className="input"
                      value={newPeriod.end_time}
                      onChange={(e) => setNewPeriod({ ...newPeriod, end_time: e.target.value })}
                    />
                  </div>
                </div>

                {subjects.length > 0 && (
                  <div>
                    <label className="label">Quick Select Short Course (Optional)</label>
                    <select
                      className="input"
                      value={newPeriod.subject_name}
                      onChange={(e) => {
                        const sub = subjects.find((s) => s.name === e.target.value)
                        if (sub) {
                          setNewPeriod({
                            ...newPeriod,
                            subject_name: sub.name,
                            subject_code: sub.code,
                            color_hex: sub.color_hex,
                            class_name: sub.name,
                          })
                        }
                      }}
                    >
                      <option value="">-- Choose from College Short Courses or Type Below --</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.name}>{s.code} — {s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Course Unit Name *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      placeholder="e.g. Professional Barista Mastery"
                      value={newPeriod.subject_name}
                      onChange={(e) => setNewPeriod({ ...newPeriod, subject_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Unit Code</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. BAR-101"
                      value={newPeriod.subject_code}
                      onChange={(e) => setNewPeriod({ ...newPeriod, subject_code: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Lecturer / Instructor *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      placeholder="Enter lecturer or instructor name"
                      value={newPeriod.teacher_name}
                      onChange={(e) => setNewPeriod({ ...newPeriod, teacher_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Room / Lab Suite</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Lab Suite 4"
                      value={newPeriod.room}
                      onChange={(e) => setNewPeriod({ ...newPeriod, room: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save to Master Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Period Modal */}
      {editingPeriod && (
        <div className="modal-overlay" onClick={() => setEditingPeriod(null)}>
          <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Lecture Period: {editingPeriod.subject_code}</h3>
              <button type="button" className="modal-close" onClick={() => setEditingPeriod(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveEditPeriod}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Day of Week</label>
                    <select
                      className="input"
                      value={editingPeriod.day_of_week}
                      onChange={(e) => setEditingPeriod({ ...editingPeriod, day_of_week: e.target.value as any })}
                    >
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Period Number</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="input"
                      value={editingPeriod.period_number}
                      onChange={(e) => setEditingPeriod({ ...editingPeriod, period_number: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Start Time</label>
                    <input
                      type="time"
                      className="input"
                      value={editingPeriod.start_time}
                      onChange={(e) => setEditingPeriod({ ...editingPeriod, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">End Time</label>
                    <input
                      type="time"
                      className="input"
                      value={editingPeriod.end_time}
                      onChange={(e) => setEditingPeriod({ ...editingPeriod, end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Course Unit Name *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={editingPeriod.subject_name}
                      onChange={(e) => setEditingPeriod({ ...editingPeriod, subject_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Unit Code</label>
                    <input
                      type="text"
                      className="input"
                      value={editingPeriod.subject_code}
                      onChange={(e) => setEditingPeriod({ ...editingPeriod, subject_code: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Lecturer *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={editingPeriod.teacher_name}
                      onChange={(e) => setEditingPeriod({ ...editingPeriod, teacher_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Room / Lab Suite</label>
                    <input
                      type="text"
                      className="input"
                      value={editingPeriod.room}
                      onChange={(e) => setEditingPeriod({ ...editingPeriod, room: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingPeriod(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Lecture Period</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
