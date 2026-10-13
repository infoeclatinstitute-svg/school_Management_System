import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { schoolStore } from '@/lib/schoolData'
import { getCoursePhoto } from '@/config/courseImages'
import type { CourseUnit } from '@/types/school'

export function MyCourses() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const navigate = useNavigate()
  const [courseUnits, setCourseUnits] = useState<CourseUnit[]>(() => schoolStore.getCourseUnits())
  const [selectedUnit, setSelectedUnit] = useState<CourseUnit | null>(null)

  // Realtime synchronization on store updates
  useEffect(() => {
    const refresh = () => setCourseUnits(schoolStore.getCourseUnits())
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    window.addEventListener('gc-courses-updated', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('gc-courses-updated', refresh)
    }
  }, [])

  const handleDelete = async (id: string, code: string) => {
    if (!isAdmin) {
      alert('Access Restricted: Only Administrators are authorized to delete course units.')
      return
    }
    if (window.confirm(`Are you sure you want to remove Course Unit "${code}" from the curriculum?`)) {
      await schoolStore.deleteCourseUnit(id)
      setCourseUnits(schoolStore.getCourseUnits())
      setSelectedUnit(null)
    }
  }

  const handleTogglePublish = async (unit: CourseUnit) => {
    if (!isAdmin) {
      alert('Access Restricted: Only Administrators are authorized to change course publication status.')
      return
    }
    const currentPub = unit.is_published !== false
    await schoolStore.updateCourseUnit(unit.id, { is_published: !currentPub })
    setCourseUnits(schoolStore.getCourseUnits())
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new CustomEvent('gc-courses-updated'))
  }

  return (
    <PageWrapper
      title={isAdmin ? "Curriculum & Course Units Management" : "Faculty Course Units Directory"}
      subtitle={isAdmin ? "Administrator Console: Build, publish, and manage certified vocational short courses, modules, and lessons." : "Explore certified college course units, syllabus breakdowns, contact hours, and instructional modules."}
      action={
        isAdmin ? (
          <Button variant="primary" onClick={() => navigate('/teacher/courses/new')}>
            + Build New Course Unit
          </Button>
        ) : undefined
      }
    >
      {courseUnits.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center', maxWidth: '640px', margin: '2rem auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📖</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>No Course Units Created Yet</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', margin: '0 0 1.5rem' }}>
            {isAdmin
              ? "Get started by creating your department's certified course units with modular syllabus breakdowns, contact hours, and video lectures."
              : "No curriculum course units have been published yet by the administration."}
          </p>
          {isAdmin && (
            <Button variant="primary" onClick={() => navigate('/teacher/courses/new')}>
              + Build First Course Unit
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courseUnits.map((unit) => {
            const isPub = unit.is_published !== false
            return (
            <div key={unit.id} className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
              {/* Unit Photo Banner */}
              <div style={{ position: 'relative', width: '100%', height: '140px', background: '#0f172a', overflow: 'hidden' }}>
                <img
                  src={getCoursePhoto(unit.id, unit.department, unit.title)}
                  alt={unit.title}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.65) 0%, transparent 60%)' }} />
                <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}>
                  <span className="badge badge-primary" style={{ fontWeight: 800, background: 'rgba(30, 58, 138, 0.9)', backdropFilter: 'blur(4px)', color: '#ffffff' }}>
                    {unit.code}
                  </span>
                  <span className="badge badge-info" style={{ background: 'rgba(255, 255, 255, 0.9)', color: '#0f172a', fontWeight: 700 }}>
                    {unit.credit_hours} Credits
                  </span>
                </div>
                <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <span className={`badge ${isPub ? 'badge-success' : 'badge-warning'}`} style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                    {isPub ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>

              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '0.5rem' }}>
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                        onClick={() => handleTogglePublish(unit)}
                        title={isPub ? 'Click to set as Draft' : 'Click to Publish to Website & LMS'}
                      >
                        {isPub ? '🟢' : '⚪'}
                      </button>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#ef4444' }}
                        onClick={() => handleDelete(unit.id, unit.code)}
                        title="Delete Unit"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--color-text-primary)' }}>
                  {unit.title}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: '0 0 0.5rem' }}>
                  {unit.program} • <strong style={{ color: 'var(--color-primary)' }}>{unit.course_duration || unit.semester || 'Short Course'}</strong> • {unit.department}
                </p>

                {/* Assigned Faculty Lecturer Badge */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', color: '#1e3a8a', fontWeight: 600, marginBottom: '0.75rem' }}>
                  <span>👨‍🏫 Assigned Lecturer:</span>
                  <strong>{unit.teacher_name || 'Faculty Lecturer'}</strong>
                </div>

                {unit.description && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: '1.5', margin: '0 0 1rem' }}>
                    {unit.description}
                  </p>
                )}

                {/* Syllabus Modules Outline */}
                <div style={{ background: 'var(--color-bg-secondary)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.35rem' }}>
                    Syllabus Modules ({unit.syllabus_modules?.length || 0})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem' }}>
                    {unit.syllabus_modules?.slice(0, 3).map((m) => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>• {m.title}</span>
                        <strong style={{ color: 'var(--color-text-secondary)' }}>{m.hours} hrs</strong>
                      </div>
                    ))}
                    {(unit.syllabus_modules?.length || 0) > 3 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                        + {unit.syllabus_modules.length - 3} more modules...
                      </span>
                    )}
                  </div>
                </div>
              </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    🎥 {unit.lessons?.length || 0} Video Lessons
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedUnit(unit)}
                    >
                      👁️ View Syllabus
                    </button>
                    <Link to={`/teacher/lesson/new?courseId=${unit.id}`} className="btn btn-primary btn-sm">
                      + Add Lesson
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* View Syllabus Detail Modal */}
      {selectedUnit && (
        <div className="modal-overlay" onClick={() => setSelectedUnit(null)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="badge badge-primary">{selectedUnit.code}</span>
                <h3 className="modal-title" style={{ marginTop: '0.25rem' }}>{selectedUnit.title}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  {selectedUnit.program} • {selectedUnit.credit_hours} Credit Hours • {selectedUnit.department}
                </p>
              </div>
              <button type="button" className="modal-close" onClick={() => setSelectedUnit(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                  Course Syllabus & Modular Breakdown
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedUnit.syllabus_modules?.map((m) => (
                    <div key={m.id} style={{ background: 'var(--color-bg-secondary)', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <strong>Module {m.module_number}: {m.title}</strong>
                        <span className="badge badge-info">{m.hours} Contact Hours</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                        <strong>Topics:</strong> {m.topics?.join(', ') || 'Practical lab exercises'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                  Video Lessons & Lab Exercises ({selectedUnit.lessons?.length || 0})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedUnit.lessons?.map((l, idx) => (
                    <div
                      key={l.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        padding: '0.75rem 0.85rem',
                        background: 'var(--color-bg-secondary)',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          Lesson {idx + 1}: {l.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          ⏱️ {l.duration_minutes} mins {l.video_url ? '• 🎥 Video Uploaded' : '• 📝 Lecture Notes'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {l.video_url ? (
                          <Link
                            to={`/student/lesson/${l.id}`}
                            className="btn btn-xs btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          >
                            ▶️ Play Video in LMS
                          </Link>
                        ) : (
                          <Link
                            to={`/student/lesson/${l.id}`}
                            className="btn btn-xs btn-secondary"
                          >
                            📖 View Lesson
                          </Link>
                        )}
                        <Link
                          to={`/teacher/lesson/${l.id}/edit?courseId=${selectedUnit.id}`}
                          className="btn btn-xs btn-outline"
                          title="Edit Lesson & Video URL"
                        >
                          ✏️
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedUnit(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
