import React, { useState, useEffect } from 'react'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import type {
  PartnerSchoolTenant,
  AcademicCalendarPeriod,
  AcademicCalendarSystem,
} from '@/types/tenantSchool'
import { PlusIcon } from '@/components/icons/AppIcons'

interface TenantAcademicCalendarViewProps {
  school: PartnerSchoolTenant
  isAdmin?: boolean
  primaryColor?: string
  accentColor?: string
  onSchoolUpdate?: (updatedSchool: PartnerSchoolTenant) => void
}

export function TenantAcademicCalendarView({
  school,
  isAdmin = false,
  primaryColor = '#1e3a8a',
  accentColor: _accentColor = '#0284c7',
  onSchoolUpdate,
}: TenantAcademicCalendarViewProps) {
  const [calendarPeriods, setCalendarPeriods] = useState<AcademicCalendarPeriod[]>(
    () => school.academic_calendar || []
  )
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Upcoming' | 'Past'>('All')

  // Add / Edit Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<AcademicCalendarPeriod | null>(null)
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formStatus, setFormStatus] = useState<'Active' | 'Upcoming' | 'Past'>('Upcoming')
  const [formExamStartDate, setFormExamStartDate] = useState('')
  const [formExamEndDate, setFormExamEndDate] = useState('')
  const [formFeeDeadline, setFormFeeDeadline] = useState('')
  const [editorError, setEditorError] = useState<string | null>(null)

  // Operating System & Template Modal State
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false)
  const [selectedSystem, setSelectedSystem] = useState<AcademicCalendarSystem>(
    school.academic_system || 'semester'
  )
  const [templateYear, setTemplateYear] = useState<number>(new Date().getFullYear())
  const [populateTemplate, setPopulateTemplate] = useState(false)

  // Feedback Toast
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ type, text })
    setTimeout(() => setFeedbackMessage(null), 3000)
  }

  // Real-time synchronization
  useEffect(() => {
    const handleSync = () => {
      const refreshed = tenantSchoolStore.getSchoolBySlug(school.slug)
      if (refreshed) {
        setCalendarPeriods(refreshed.academic_calendar || [])
        if (onSchoolUpdate) onSchoolUpdate(refreshed)
      }
    }
    window.addEventListener('gc-tenant-school-updated', handleSync)
    return () => window.removeEventListener('gc-tenant-school-updated', handleSync)
  }, [school.slug, onSchoolUpdate])

  // Open Add Modal
  const openAddModal = () => {
    setEditingPeriod(null)
    const currentYear = new Date().getFullYear()
    const sysLabel = school.academic_system === 'semester' ? 'Semester' : 'Term'
    const nextIndex = (calendarPeriods.length % (school.academic_system === 'semester' ? 2 : 3)) + 1
    setFormName(`${sysLabel} ${nextIndex} (${currentYear})`)
    setFormCode(`${school.academic_system === 'semester' ? 'SEM' : 'TERM'}-${nextIndex}`)
    setFormStartDate(`${currentYear}-01-15`)
    setFormEndDate(`${currentYear}-05-20`)
    setFormStatus(calendarPeriods.length === 0 ? 'Active' : 'Upcoming')
    setFormExamStartDate(`${currentYear}-05-01`)
    setFormExamEndDate(`${currentYear}-05-15`)
    setFormFeeDeadline(`${currentYear}-01-31`)
    setEditorError(null)
    setIsEditorOpen(true)
  }

  // Open Edit Modal
  const openEditModal = (period: AcademicCalendarPeriod) => {
    setEditingPeriod(period)
    setFormName(period.name)
    setFormCode(period.code)
    setFormStartDate(period.start_date)
    setFormEndDate(period.end_date)
    setFormStatus(period.status)
    setFormExamStartDate(period.exam_start_date || '')
    setFormExamEndDate(period.exam_end_date || '')
    setFormFeeDeadline(period.fee_deadline || '')
    setEditorError(null)
    setIsEditorOpen(true)
  }

  // Save Period (Add or Edit)
  const handleSavePeriod = (e: React.FormEvent) => {
    e.preventDefault()
    setEditorError(null)

    if (!formName.trim()) {
      setEditorError('Please provide a descriptive period name.')
      return
    }
    if (!formCode.trim()) {
      setEditorError('Please provide a unique period code (e.g. SEM-1 or TERM-2).')
      return
    }
    if (!formStartDate || !formEndDate) {
      setEditorError('Both start date and end date are required.')
      return
    }
    if (new Date(formStartDate) > new Date(formEndDate)) {
      setEditorError('Start date cannot be after end date.')
      return
    }

    const payload = {
      name: formName.trim(),
      code: formCode.trim().toUpperCase(),
      start_date: formStartDate,
      end_date: formEndDate,
      status: formStatus,
      exam_start_date: formExamStartDate || undefined,
      exam_end_date: formExamEndDate || undefined,
      fee_deadline: formFeeDeadline || undefined,
    }

    let updatedSchool: PartnerSchoolTenant | null = null
    if (editingPeriod) {
      updatedSchool = tenantSchoolStore.updateCalendarPeriod(school.slug, editingPeriod.id, payload)
      showToast(`Updated period: ${payload.name}`)
    } else {
      updatedSchool = tenantSchoolStore.addCalendarPeriod(school.slug, payload)
      showToast(`Added new period: ${payload.name}`)
    }

    if (updatedSchool) {
      setCalendarPeriods(updatedSchool.academic_calendar || [])
      if (onSchoolUpdate) onSchoolUpdate(updatedSchool)
    }
    setIsEditorOpen(false)
  }

  // Delete Period
  const handleDeletePeriod = (period: AcademicCalendarPeriod) => {
    if (!window.confirm(`Are you sure you want to delete "${period.name}"? This action cannot be undone.`)) {
      return
    }
    const updated = tenantSchoolStore.deleteCalendarPeriod(school.slug, period.id)
    if (updated) {
      setCalendarPeriods(updated.academic_calendar || [])
      if (onSchoolUpdate) onSchoolUpdate(updated)
      showToast(`Deleted ${period.name}`, 'success')
    }
  }

  // One-click Set as Active
  const handleSetActive = (period: AcademicCalendarPeriod) => {
    const updated = tenantSchoolStore.setActiveCalendarPeriod(school.slug, period.id)
    if (updated) {
      setCalendarPeriods(updated.academic_calendar || [])
      if (onSchoolUpdate) onSchoolUpdate(updated)
      showToast(`Active session switched to: ${period.name}`)
    }
  }

  // Save System & Template Switch
  const handleSaveSystem = (e: React.FormEvent) => {
    e.preventDefault()
    const updated = tenantSchoolStore.updateAcademicSystem(
      school.slug,
      selectedSystem,
      populateTemplate,
      templateYear
    )
    if (updated) {
      setCalendarPeriods(updated.academic_calendar || [])
      if (onSchoolUpdate) onSchoolUpdate(updated)
      showToast(`Academic cycle updated to ${selectedSystem.toUpperCase()}!`)
    }
    setIsSystemModalOpen(false)
  }

  // Filtered Periods
  const filteredPeriods = calendarPeriods.filter((p) => {
    if (filterStatus === 'All') return true
    return p.status === filterStatus
  })

  const activePeriod = calendarPeriods.find((p) => p.status === 'Active')

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Toast Notification */}
      {feedbackMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 99999,
            background: feedbackMessage.type === 'success' ? '#059669' : '#dc2626',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            fontWeight: 800,
            fontSize: '0.86rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{feedbackMessage.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Main Governance Header Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '2.25rem',
          border: '1px solid #e2e8f0',
          marginBottom: '2rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1.25rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  color: primaryColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  background: `${primaryColor}14`,
                  padding: '3px 9px',
                  borderRadius: '6px',
                }}
              >
                {school.name} ACADEMIC GOVERNANCE
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#475569',
                  background: '#f1f5f9',
                  padding: '3px 8px',
                  borderRadius: '6px',
                }}
              >
                ⚙️ {school.academic_system.toUpperCase()}-BASED SYSTEM
              </span>
            </div>

            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '6px 0 4px', color: '#0f172a', letterSpacing: '-0.02em' }}>
              Academic Calendar &amp; Session Management
            </h2>
            <div style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5, maxWidth: '640px' }}>
              Define examination schedules, lecture terms, and tuition clearance milestones. Changes synchronize dynamically across Teacher Gradebooks, Student Attendance, and Bursar desks.
            </div>
          </div>

          {/* Admin Header Action Controls */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIsSystemModalOpen(true)}
                style={{
                  background: '#f8fafc',
                  color: '#334155',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '0.7rem 1.1rem',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>⚙️ System Settings</span>
              </button>
              <button
                type="button"
                onClick={openAddModal}
                style={{
                  background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.7rem 1.35rem',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  boxShadow: `0 4px 14px ${primaryColor}35`,
                }}
              >
                <PlusIcon size={16} color="#ffffff" />
                <span>+ Add Academic Period</span>
              </button>
            </div>
          )}
        </div>

        {/* Current Active Period Highlight Banner */}
        {activePeriod ? (
          <div
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
              border: '2px solid #86efac',
              borderRadius: '18px',
              padding: '1.25rem 1.5rem',
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
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: '#dcfce7',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                }}
              >
                📅
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                    Active Institutional Session
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b' }}>
                    Code: <strong>{activePeriod.code}</strong>
                  </span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 2px' }}>
                  {activePeriod.name}
                </h3>
                <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                  Session Dates: <strong>{activePeriod.start_date}</strong> to <strong>{activePeriod.end_date}</strong>
                  {activePeriod.fee_deadline && (
                    <span> • Fee Clearance Deadline: <strong>{activePeriod.fee_deadline}</strong></span>
                  )}
                </div>
              </div>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => openEditModal(activePeriod)}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #86efac',
                  color: '#166534',
                  fontWeight: 800,
                  padding: '0.55rem 1rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                ✏️ Edit Active Period
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              background: '#fefce8',
              border: '1.5px dashed #facc15',
              borderRadius: '16px',
              padding: '1.1rem 1.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div>
              <strong style={{ color: '#854d0e', fontSize: '0.88rem' }}>⚠️ No Active Academic Session Designated</strong>
              <div style={{ fontSize: '0.8rem', color: '#a16207', marginTop: '2px' }}>
                Please set one of your academic periods below as the "Active Period" so report cards and timetables can align.
              </div>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={openAddModal}
                style={{
                  background: '#854d0e',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                + Define Active Period
              </button>
            )}
          </div>
        )}
      </div>

      {/* Period Filter Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', background: '#e2e8f0', padding: '4px', borderRadius: '12px' }}>
          {(['All', 'Active', 'Upcoming', 'Past'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              style={{
                background: filterStatus === st ? '#ffffff' : 'transparent',
                color: filterStatus === st ? '#0f172a' : '#64748b',
                fontWeight: 800,
                fontSize: '0.82rem',
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: filterStatus === st ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {st} Periods {st === 'All' ? `(${calendarPeriods.length})` : ''}
            </button>
          ))}
        </div>

        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
          Showing {filteredPeriods.length} of {calendarPeriods.length} configured periods
        </span>
      </div>

      {/* Periods Cards Grid */}
      {filteredPeriods.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            border: '1.5px dashed #cbd5e1',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📅</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem' }}>
            No Academic Periods Found
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
            {isAdmin
              ? 'Your institution does not have any periods matching this filter. You can add custom periods or generate a standard calendar template.'
              : 'The official institutional calendar is currently being scheduled by the Executive Academic Office.'}
          </p>
          {isAdmin && (
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={openAddModal}
                style={{
                  background: primaryColor,
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                }}
              >
                + Add Academic Period
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedSystem(school.academic_system || 'semester')
                  setPopulateTemplate(true)
                  setIsSystemModalOpen(true)
                }}
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  fontWeight: 800,
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                }}
              >
                ⚡ Generate Standard Template
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.25rem' }}>
          {filteredPeriods.map((period) => {
            const isActive = period.status === 'Active'
            return (
              <div
                key={period.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  padding: '1.6rem',
                  border: isActive ? `2px solid #86efac` : '1px solid #e2e8f0',
                  boxShadow: isActive ? '0 8px 24px rgba(34, 197, 94, 0.12)' : '0 4px 16px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: '#16a34a',
                    }}
                  />
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                    <span
                      style={{
                        fontSize: '0.76rem',
                        fontWeight: 900,
                        color: '#0f172a',
                        background: '#f1f5f9',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {period.code}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '3px 9px',
                        borderRadius: '6px',
                        background:
                          period.status === 'Active'
                            ? '#dcfce7'
                            : period.status === 'Upcoming'
                            ? '#eff6ff'
                            : '#f1f5f9',
                        color:
                          period.status === 'Active'
                            ? '#15803d'
                            : period.status === 'Upcoming'
                            ? '#1d4ed8'
                            : '#64748b',
                      }}
                    >
                      ● {period.status} Period
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.85rem' }}>
                    {period.name}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: '#475569', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ fontSize: '0.95rem' }}>📅</span>
                      <div>
                        <strong style={{ color: '#0f172a' }}>Period Term:</strong>
                        <div>{period.start_date} to {period.end_date}</div>
                      </div>
                    </div>

                    {period.exam_start_date && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ fontSize: '0.95rem' }}>📝</span>
                        <div>
                          <strong style={{ color: '#0f172a' }}>Examination Window:</strong>
                          <div>{period.exam_start_date} to {period.exam_end_date || period.end_date}</div>
                        </div>
                      </div>
                    )}

                    {period.fee_deadline && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ fontSize: '0.95rem' }}>💳</span>
                        <div>
                          <strong style={{ color: '#0f172a' }}>Tuition Fee Deadline:</strong>
                          <div>{period.fee_deadline}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Action Footers */}
                {isAdmin && (
                  <div
                    style={{
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    {!isActive ? (
                      <button
                        type="button"
                        onClick={() => handleSetActive(period)}
                        style={{
                          background: '#dcfce7',
                          color: '#166534',
                          border: '1px solid #86efac',
                          borderRadius: '8px',
                          padding: '0.45rem 0.8rem',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Set Active
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 800 }}>
                        ● Active Session
                      </span>
                    )}

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => openEditModal(period)}
                        style={{
                          background: '#f8fafc',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '0.45rem 0.75rem',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                        title="Edit Period Details"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePeriod(period)}
                        style={{
                          background: '#fff1f2',
                          color: '#e11d48',
                          border: '1px solid #fecdd3',
                          borderRadius: '8px',
                          padding: '0.45rem 0.75rem',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                        title="Delete Period"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL: ADD / EDIT ACADEMIC PERIOD */}
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
              maxHeight: 'calc(100dvh - 2rem)',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              border: `2px solid ${primaryColor}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Academic Period Editor
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '2px 0 0' }}>
                  {editingPeriod ? 'Edit Academic Period' : 'Add New Academic Period'}
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
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#991b1b',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '1.25rem',
                }}
              >
                ⚠️ {editorError}
              </div>
            )}

            <form onSubmit={handleSavePeriod} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '5px' }}>
                    Period Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Semester 1 (2026/2027)"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '5px' }}>
                    Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="SEM-1"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '5px' }}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '5px' }}>
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '5px' }}>
                  Period Lifecycle Status
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  {(['Active', 'Upcoming', 'Past'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFormStatus(st)}
                      style={{
                        padding: '0.6rem',
                        borderRadius: '10px',
                        border: formStatus === st ? `2px solid ${primaryColor}` : '1.5px solid #cbd5e1',
                        background: formStatus === st ? `${primaryColor}14` : '#f8fafc',
                        color: formStatus === st ? primaryColor : '#475569',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '5px' }}>
                    Examination Start (Optional)
                  </label>
                  <input
                    type="date"
                    value={formExamStartDate}
                    onChange={(e) => setFormExamStartDate(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '5px' }}>
                    Examination End (Optional)
                  </label>
                  <input
                    type="date"
                    value={formExamEndDate}
                    onChange={(e) => setFormExamEndDate(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '5px' }}>
                  Tuition Fee Payment Deadline (Optional)
                </label>
                <input
                  type="date"
                  value={formFeeDeadline}
                  onChange={(e) => setFormFeeDeadline(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  style={{
                    padding: '0.7rem 1.25rem',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.7rem 1.6rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: primaryColor,
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    boxShadow: `0 4px 14px ${primaryColor}40`,
                  }}
                >
                  {editingPeriod ? 'Update Period' : 'Create Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: OPERATING SYSTEM & STANDARD TEMPLATES */}
      {isSystemModalOpen && (
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
          onClick={() => setIsSystemModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '540px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              border: `2px solid ${primaryColor}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Institutional Architecture
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '2px 0 0' }}>
                  Academic Cycle &amp; Templates
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSystemModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSystem} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                  Select Institutional Academic Cycle *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                  {[
                    { id: 'semester', title: 'Semester System (2 Semesters / Year)', desc: 'Colleges, TVET Institutes & Universities' },
                    { id: 'term', title: 'Term System (3 Terms / Year)', desc: 'Primary & High Schools (Term 1, 2, 3)' },
                    { id: 'trimester', title: 'Trimester System (3 Intakes / Year)', desc: 'Fast-Track Professional Colleges & Tech Institutes' },
                    { id: 'quarter', title: 'Quarter System (4 Modular Quarters / Year)', desc: 'Modular Certification & Executive Programs' },
                  ].map((sys) => (
                    <label
                      key={sys.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        border: selectedSystem === sys.id ? `2px solid ${primaryColor}` : '1.5px solid #cbd5e1',
                        background: selectedSystem === sys.id ? `${primaryColor}10` : '#f8fafc',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="systemRadio"
                        checked={selectedSystem === sys.id}
                        onChange={() => setSelectedSystem(sys.id as AcademicCalendarSystem)}
                      />
                      <div>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>{sys.title}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{sys.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontWeight: 800, fontSize: '0.84rem', color: '#0f172a' }}>
                  <input
                    type="checkbox"
                    checked={populateTemplate}
                    onChange={(e) => setPopulateTemplate(e.target.checked)}
                  />
                  <span>Generate Standard Periods for Academic Year:</span>
                </label>
                {populateTemplate && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Academic Year:</span>
                    <input
                      type="number"
                      min={2024}
                      max={2035}
                      value={templateYear}
                      onChange={(e) => setTemplateYear(Number(e.target.value))}
                      style={{ width: '100px', padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsSystemModalOpen(false)}
                  style={{
                    padding: '0.7rem 1.25rem',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.7rem 1.6rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: primaryColor,
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    boxShadow: `0 4px 14px ${primaryColor}40`,
                  }}
                >
                  Apply System Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
