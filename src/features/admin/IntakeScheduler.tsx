import { useState, useEffect, useMemo } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { intakeStore } from '@/lib/intakeStore'
import { OFFICIAL_COURSES } from '@/config/officialCourses'
import { INSTITUTION_CONFIG } from '@/config/institution'
import { extractYouTubeId, formatDate } from '@/lib/utils'
import { YouTubeEmbed } from '@/components/shared/YouTubeEmbed'
import type { IntakeSchedule, IntakeStatus, StudyMode } from '@/types/intake'

const STATUS_COLORS: Record<IntakeStatus, { bg: string; text: string; border: string }> = {
  Open: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  'Filling Fast': { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  Upcoming: { bg: '#e0e7ff', text: '#4338ca', border: '#a5b4fc' },
  Closed: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  Archived: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
}

const ALL_STUDY_MODES: StudyMode[] = [
  '100% Online (Live & Recorded)',
  'All Shifts (Early Morning to Night)',
  'Early Morning Batch (6:00 AM - 8:00 AM)',
  'Late Morning Batch (9:00 AM - 11:30 AM)',
  'Midday Batch (11:30 AM - 1:30 PM)',
  'Afternoon Batch (2:00 PM - 4:30 PM)',
  'Evening Batch (5:30 PM - 7:30 PM)',
  'Night Batch (8:00 PM - 10:00 PM)',
  'Weekend Executive Cohort',
  'Self-Paced Masterclass & 1-on-1 Labs',
]

export function IntakeScheduler() {
  const [intakes, setIntakes] = useState<IntakeSchedule[]>(() => intakeStore.getIntakes())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [isSyncing, setIsSyncing] = useState(false)

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIntake, setEditingIntake] = useState<IntakeSchedule | null>(null)
  const [activeVideoModalUrl, setActiveVideoModalUrl] = useState<string | null>(null)
  const [activePosterModalUrl, setActivePosterModalUrl] = useState<string | null>(null)

  // Form Fields
  const [formTitle, setFormTitle] = useState('')
  const [formYear, setFormYear] = useState('2027')
  const [formSession, setFormSession] = useState('Term 1 / First Quarter')
  const [formHeadline, setFormHeadline] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPosterUrl, setFormPosterUrl] = useState('')
  const [formVideoUrl, setFormVideoUrl] = useState('')
  const [formAppDeadline, setFormAppDeadline] = useState('')
  const [formOrientationDate, setFormOrientationDate] = useState('')
  const [formCommenceDate, setFormCommenceDate] = useState('')
  const [formStatus, setFormStatus] = useState<IntakeStatus>('Open')
  const [formSelectedCourses, setFormSelectedCourses] = useState<string[]>([])
  const [formEarlyBird, setFormEarlyBird] = useState('')
  const [formInstallment, setFormInstallment] = useState('Flexible 2-3 Monthly Installments')
  const [formStudyModes, setFormStudyModes] = useState<StudyMode[]>([
    '100% Online (Live & Recorded)',
    'All Shifts (Early Morning to Night)',
  ])
  const [formPhone, setFormPhone] = useState(INSTITUTION_CONFIG.contact.phone)
  const [formEmail, setFormEmail] = useState(INSTITUTION_CONFIG.contact.admissionsEmail)
  const [formRegistrationFee, setFormRegistrationFee] = useState('Free ($0 USD Application Fee)')
  const [formIsPublished, setFormIsPublished] = useState(true)
  const [formFeatured, setFormFeatured] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null)

  // Fetch live intakes from cloud database on mount
  useEffect(() => {
    let mounted = true
    async function syncData() {
      setIsSyncing(true)
      try {
        const cloudList = await intakeStore.fetchCloudIntakes()
        if (mounted) {
          setIntakes(cloudList)
        }
      } finally {
        if (mounted) setIsSyncing(false)
      }
    }
    syncData()

    const handleUpdated = (e: any) => {
      if (!mounted) return
      if (e?.detail && Array.isArray(e.detail)) {
        setIntakes(e.detail)
      } else {
        setIntakes(intakeStore.getIntakes())
      }
    }

    window.addEventListener('gc-intakes-updated', handleUpdated)
    window.addEventListener('gc-data-synced', syncData)
    window.addEventListener('focus', syncData)

    return () => {
      mounted = false
      window.removeEventListener('gc-intakes-updated', handleUpdated)
      window.removeEventListener('gc-data-synced', syncData)
      window.removeEventListener('focus', syncData)
    }
  }, [])

  const filteredIntakes = useMemo(() => {
    return intakes.filter((intake) => {
      const matchSearch =
        intake.title.toLowerCase().includes(search.toLowerCase()) ||
        intake.headline.toLowerCase().includes(search.toLowerCase()) ||
        intake.academic_year.includes(search) ||
        intake.target_courses.some((c) => c.toLowerCase().includes(search.toLowerCase()))

      const matchStatus = statusFilter === 'All' ? true : intake.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [intakes, search, statusFilter])

  // Stats calculation
  const totalCount = intakes.length
  const openCount = intakes.filter((i) => i.status === 'Open' || i.status === 'Filling Fast').length
  const publishedCount = intakes.filter((i) => i.is_published).length

  const openCreateModal = () => {
    setEditingIntake(null)
    setFormTitle('')
    setFormYear(new Date().getFullYear().toString())
    setFormSession('Term 1 / First Quarter')
    setFormHeadline('Admissions Open — 100% Online Classes Across Flexible Daily Shifts')
    setFormDescription(
      'Enroll in certified career-ready programs with live mentor code reviews, practical projects, and verifiable certifications.'
    )
    setFormPosterUrl('')
    setFormVideoUrl('')
    setFormAppDeadline('')
    setFormOrientationDate('')
    setFormCommenceDate('')
    setFormStatus('Open')
    setFormSelectedCourses(OFFICIAL_COURSES.slice(0, 4).map((c) => c.title))
    setFormEarlyBird('⭐ 15% Early Registration Scholarship (First 25 Students)')
    setFormInstallment('Flexible 2 to 3 Monthly Installments ($ USD & KES Paybill)')
    setFormStudyModes([
      '100% Online (Live & Recorded)',
      'All Shifts (Early Morning to Night)',
    ])
    setFormPhone(INSTITUTION_CONFIG.contact.phone)
    setFormEmail(INSTITUTION_CONFIG.contact.admissionsEmail)
    setFormRegistrationFee('Free ($0 USD Application Fee)')
    setFormIsPublished(true)
    setFormFeatured(false)
    setIsModalOpen(true)
  }

  const openEditModal = (intake: IntakeSchedule) => {
    setEditingIntake(intake)
    setFormTitle(intake.title)
    setFormYear(intake.academic_year)
    setFormSession(intake.term_session)
    setFormHeadline(intake.headline)
    setFormDescription(intake.description)
    setFormPosterUrl(intake.poster_image_url || '')
    setFormVideoUrl(intake.promo_video_url || '')
    setFormAppDeadline(intake.application_deadline)
    setFormOrientationDate(intake.orientation_date || '')
    setFormCommenceDate(intake.commencement_date)
    setFormStatus(intake.status)
    setFormSelectedCourses(intake.target_courses)
    setFormEarlyBird(intake.early_bird_discount || '')
    setFormInstallment(intake.installment_plan || '')
    setFormStudyModes(intake.study_modes)
    setFormPhone(intake.contact_phone || '')
    setFormEmail(intake.contact_email || '')
    setFormRegistrationFee(intake.registration_fee || '')
    setFormIsPublished(intake.is_published)
    setFormFeatured(Boolean(intake.featured))
    setIsModalOpen(true)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setFormPosterUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleToggleCourse = (title: string) => {
    setFormSelectedCourses((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    )
  }

  const handleSelectAllCourses = () => {
    if (formSelectedCourses.length === OFFICIAL_COURSES.length) {
      setFormSelectedCourses([])
    } else {
      setFormSelectedCourses(OFFICIAL_COURSES.map((c) => c.title))
    }
  }

  const handleToggleStudyMode = (mode: StudyMode) => {
    setFormStudyModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    )
  }

  const handleSaveIntake = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim() || !formCommenceDate || !formAppDeadline) {
      alert('Please fill in the Intake Title, Application Deadline, and Class Commencement Date.')
      return
    }

    setIsSaving(true)
    try {
      const payload: IntakeSchedule = {
        id: editingIntake?.id || `intake-${Date.now()}`,
        title: formTitle.trim(),
        academic_year: formYear.trim(),
        term_session: formSession.trim(),
        headline: formHeadline.trim(),
        description: formDescription.trim(),
        poster_image_url: formPosterUrl.trim() || undefined,
        promo_video_url: formVideoUrl.trim() || undefined,
        application_deadline: formAppDeadline,
        orientation_date: formOrientationDate || undefined,
        commencement_date: formCommenceDate,
        status: formStatus,
        target_courses: formSelectedCourses.length > 0 ? formSelectedCourses : ['All Certified Programs'],
        early_bird_discount: formEarlyBird.trim() || undefined,
        installment_plan: formInstallment.trim() || undefined,
        study_modes: formStudyModes.length > 0 ? formStudyModes : ['100% Online (Live & Recorded)'],
        contact_phone: formPhone.trim() || undefined,
        contact_email: formEmail.trim() || undefined,
        registration_fee: formRegistrationFee.trim() || undefined,
        is_published: formIsPublished,
        featured: formFeatured,
        created_at: editingIntake?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (editingIntake) {
        await intakeStore.updateIntake(editingIntake.id, payload)
        setSaveSuccessToast(`✓ Updated intake "${payload.title}" and saved to database!`)
      } else {
        await intakeStore.addIntake(payload)
        setSaveSuccessToast(`✓ Scheduled new intake "${payload.title}" and saved to database!`)
      }

      setIntakes(intakeStore.getIntakes())
      setIsModalOpen(false)
      setTimeout(() => setSaveSuccessToast(null), 4000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently remove the intake "${title}"?`)) return
    await intakeStore.deleteIntake(id)
    setIntakes(intakeStore.getIntakes())
    setSaveSuccessToast(`✓ Deleted intake from database.`)
    setTimeout(() => setSaveSuccessToast(null), 3500)
  }

  const handleTogglePublish = async (id: string) => {
    await intakeStore.togglePublishIntake(id)
    setIntakes(intakeStore.getIntakes())
  }

  return (
    <PageWrapper
      title="🗓️ Academic Intake Scheduler & Campaign Manager"
      subtitle="Curate, schedule, and publish upcoming student cohorts, marketing posters, video trailers, and early-bird scholarship offers across all platforms."
    >
      {/* Toast Notification */}
      {saveSuccessToast && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 999999,
            background: '#15803d',
            color: '#ffffff',
            padding: '0.85rem 1.4rem',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.9rem',
            boxShadow: '0 10px 25px rgba(21, 128, 61, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          <span>✨</span>
          <span>{saveSuccessToast}</span>
        </div>
      )}

      {/* Top Metric & Action Header Bar */}
      <div className="card mb-6" style={{ background: 'linear-gradient(135deg, #090e1f 0%, #172554 100%)', color: '#ffffff', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <div className="card-body" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.4rem' }}>📣</span>
              <h2 style={{ color: '#ffffff', margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>
                Intake Advertisement & Marketing Hub
              </h2>
              {isSyncing && <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>🔄 Syncing with DB...</span>}
            </div>
            <p style={{ color: '#93c5fd', margin: 0, fontSize: '0.85rem', maxWidth: '640px', lineHeight: 1.4 }}>
              Intakes published here are immediately displayed on the <strong>Official Home Page</strong>, <strong>Course Catalog</strong>, and <strong>Student Admissions Desk</strong> with your custom posters and videos.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Button
              variant="accent"
              size="md"
              onClick={openCreateModal}
              style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              + 📢 Schedule New Intake / Cohort
            </Button>
          </div>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-3 mb-6">
        <div className="stat-card">
          <div className="stat-icon stat-icon-primary">🗓️</div>
          <div>
            <div className="stat-value">{totalCount}</div>
            <div className="stat-label">Total Intakes Configured</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-success">🟢</div>
          <div>
            <div className="stat-value">{openCount}</div>
            <div className="stat-label">Active & Enrolling Intakes</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-accent">🚀</div>
          <div>
            <div className="stat-value">{publishedCount}</div>
            <div className="stat-label">Published Website Campaigns</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card mb-6" style={{ padding: '1rem 1.25rem', borderRadius: '14px', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>🔍</span>
            <input
              type="text"
              className="input"
              style={{ paddingLeft: '38px', fontSize: '0.9rem' }}
              placeholder="Filter intakes by title, program, year, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '2px' }}>
            {['All', 'Open', 'Filling Fast', 'Upcoming', 'Closed'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: statusFilter === st ? 800 : 600,
                  border: statusFilter === st ? '2px solid #2563eb' : '1px solid var(--color-border)',
                  background: statusFilter === st ? '#eff6ff' : 'var(--color-surface)',
                  color: statusFilter === st ? '#1e3a8a' : 'inherit',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {st === 'All' ? '🌐 All Intakes' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Intakes List / Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {filteredIntakes.length === 0 ? (
          <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🗓️</div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.5rem' }}>No Intake Campaigns Found</h3>
            <p style={{ fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 1.5rem' }}>
              Create your first scheduled intake cohort to advertise open admissions, promotional posters, and registration dates.
            </p>
            <Button variant="primary" size="sm" onClick={openCreateModal}>
              + Schedule First Intake Now
            </Button>
          </div>
        ) : (
          filteredIntakes.map((intake) => {
            const statusStyle = STATUS_COLORS[intake.status] || STATUS_COLORS.Open
            const ytId = intake.promo_video_url ? extractYouTubeId(intake.promo_video_url) : null

            return (
              <div
                key={intake.id}
                className="card"
                style={{
                  padding: '1.5rem',
                  borderRadius: '16px',
                  border: intake.is_published ? '1.5px solid rgba(37, 99, 235, 0.3)' : '1px dashed var(--color-border)',
                  background: 'var(--color-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  boxShadow: intake.featured ? '0 8px 30px rgba(37, 99, 235, 0.12)' : '0 4px 12px rgba(0,0,0,0.03)',
                  position: 'relative',
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: statusStyle.bg,
                        color: statusStyle.text,
                        border: `1px solid ${statusStyle.border}`,
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                      }}
                    >
                      ● {intake.status}
                    </span>

                    <span className="badge badge-neutral" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                      Year {intake.academic_year} • {intake.term_session}
                    </span>

                    {intake.featured && (
                      <span className="badge badge-accent" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                        ⭐ Featured Campaign
                      </span>
                    )}

                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: intake.is_published ? '#16a34a' : '#94a3b8',
                        background: intake.is_published ? '#ecfdf5' : '#f1f5f9',
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {intake.is_published ? '🌐 Live on Website' : '🔒 Draft / Admin Only'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(intake.id)}
                      className="btn btn-ghost btn-sm"
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: intake.is_published ? '#dc2626' : '#16a34a',
                      }}
                      title={intake.is_published ? 'Unpublish from Website' : 'Publish to Website'}
                    >
                      {intake.is_published ? '👁️‍🗨️ Unpublish' : '🚀 Publish Live'}
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEditModal(intake)}
                      style={{ fontWeight: 700, fontSize: '0.82rem' }}
                    >
                      ✏️ Edit
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDelete(intake.id, intake.title)}
                      style={{ color: '#dc2626', fontSize: '0.9rem' }}
                      title="Delete Intake"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Main Content Row: Title, Headline, Media Preview */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
                  {/* Left Column: Details & Dates */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-primary)', margin: '0 0 0.35rem', lineHeight: 1.3 }}>
                        {intake.title}
                      </h3>
                      {intake.headline && (
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-text)', opacity: 0.9 }}>
                          {intake.headline}
                        </div>
                      )}
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      {intake.description}
                    </p>

                    {/* Key Dates Badge Strip */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', marginTop: '0.25rem' }}>
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '0.6rem 0.75rem' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>
                          ⏰ App Deadline
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#b91c1c' }}>
                          {formatDate(intake.application_deadline)}
                        </div>
                      </div>

                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.6rem 0.75rem' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                          🚀 Classes Start
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#15803d' }}>
                          {formatDate(intake.commencement_date)}
                        </div>
                      </div>

                      {intake.orientation_date && (
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '0.6rem 0.75rem' }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>
                            🎯 Orientation
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#2563eb' }}>
                            {formatDate(intake.orientation_date)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Early Bird Offer Banner */}
                    {intake.early_bird_discount && (
                      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '0.5rem 0.85rem', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#92400e', fontWeight: 700 }}>
                        <span>🎁</span>
                        <span>{intake.early_bird_discount}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Poster Image & Video Previews */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {/* Poster Preview Card */}
                      {intake.poster_image_url ? (
                        <div
                          style={{
                            flex: '1 1 140px',
                            minHeight: '140px',
                            maxHeight: '180px',
                            position: 'relative',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: '1px solid var(--color-border)',
                            cursor: 'pointer',
                          }}
                          onClick={() => setActivePosterModalUrl(intake.poster_image_url || null)}
                          title="Click to view full promotional poster"
                        >
                          <img
                            src={intake.poster_image_url}
                            alt={`${intake.title} Poster`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            flex: '1 1 140px',
                            minHeight: '110px',
                            borderRadius: '12px',
                            border: '1.5px dashed var(--color-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1rem',
                            textAlign: 'center',
                            color: 'var(--color-text-secondary)',
                            background: 'var(--color-bg)',
                          }}
                        >
                          <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🖼️</span>
                          <span style={{ fontSize: '0.75rem' }}>No Poster Uploaded</span>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            style={{ color: '#2563eb', fontSize: '0.72rem', marginTop: '4px' }}
                            onClick={() => openEditModal(intake)}
                          >
                            + Add Poster
                          </button>
                        </div>
                      )}

                      {/* Video Preview Card */}
                      {intake.promo_video_url ? (
                        <div
                          style={{
                            flex: '1 1 140px',
                            minHeight: '140px',
                            maxHeight: '180px',
                            position: 'relative',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: '1px solid var(--color-border)',
                            background: '#090e1f',
                            cursor: 'pointer',
                          }}
                          onClick={() => setActiveVideoModalUrl(intake.promo_video_url || null)}
                          title="Click to play promotional video trailer"
                        >
                          {ytId ? (
                            <img
                              src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                              alt="Video Thumbnail"
                              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                            />
                          ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '2.5rem' }}>🎬</span>
                            </div>
                          )}
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'rgba(0, 0, 0, 0.35)',
                            }}
                          >
                            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#dc2626', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 4px 14px rgba(220, 38, 38, 0.5)' }}>
                              ▶
                            </div>
                          </div>
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              insetInline: 0,
                              background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
                              color: '#ffffff',
                              padding: '4px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                            }}
                          >
                            🎥 Promo Video Trailer
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            flex: '1 1 140px',
                            minHeight: '110px',
                            borderRadius: '12px',
                            border: '1.5px dashed var(--color-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1rem',
                            textAlign: 'center',
                            color: 'var(--color-text-secondary)',
                            background: 'var(--color-bg)',
                          }}
                        >
                          <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🎥</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>No Video (Optional)</span>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            style={{ color: '#2563eb', fontSize: '0.72rem', marginTop: '4px' }}
                            onClick={() => openEditModal(intake)}
                          >
                            + Add Video (Optional)
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Target Programs Tag Pill List */}
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                        Target Programs Included ({intake.target_courses.length}):
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {intake.target_courses.map((crs, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: 'var(--color-bg-secondary)',
                              border: '1px solid var(--color-border)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              color: 'var(--color-text)',
                            }}
                          >
                            📚 {crs}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* CREATE / EDIT INTAKE MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-content modal-lg"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '780px',
              width: '95%',
              maxHeight: '92vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '20px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ background: '#090e1f', color: '#ffffff', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🗓️</span>
                <h3 className="modal-title" style={{ color: '#ffffff', margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>
                  {editingIntake ? `Edit Intake Campaign: ${editingIntake.title}` : 'Schedule & Advertise New Intake Cohort'}
                </h3>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setIsModalOpen(false)}
                style={{ color: '#ffffff', background: 'rgba(255,255,255,0.15)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveIntake} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="modal-body" style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* 1. Basic Intake Title & Year */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="label" style={{ fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                      Intake Campaign Title *
                    </label>
                    <input
                      type="text"
                      required
                      className="input"
                      placeholder="e.g. January 2027 Global Professional Intake"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label" style={{ fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                      Academic Year *
                    </label>
                    <input
                      type="text"
                      required
                      className="input"
                      placeholder="e.g. 2027"
                      value={formYear}
                      onChange={(e) => setFormYear(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label" style={{ fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                      Term / Session Cohort
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Term 1 / First Quarter"
                      value={formSession}
                      onChange={(e) => setFormSession(e.target.value)}
                    />
                  </div>
                </div>

                {/* 2. Marketing Headline & Description */}
                <div>
                  <label className="label" style={{ fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                    Promotional Headline *
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="e.g. Admissions Open — 100% Online Classes Across Flexible Daily Shifts"
                    value={formHeadline}
                    onChange={(e) => setFormHeadline(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label" style={{ fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                    Intake Description & Value Proposition *
                  </label>
                  <textarea
                    required
                    className="input"
                    rows={3}
                    placeholder="Highlight the benefits of this cohort, syllabus coverage, live code reviews, and career outcomes..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>

                {/* 3. Promotional Media: Poster Image & Promo Video */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 900, color: '#1e3a8a' }}>
                    <span>🎨</span>
                    <span>Promotional Media (Posters & Video Trailers)</span>
                  </div>

                  {/* Poster Image */}
                  <div>
                    <label className="label" style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                      Intake Poster / Flyer Image URL or Device File
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input
                        type="url"
                        className="input"
                        style={{ flex: 1, minWidth: '220px', fontSize: '0.85rem' }}
                        placeholder="Paste image URL (https://...)"
                        value={formPosterUrl}
                        onChange={(e) => setFormPosterUrl(e.target.value)}
                      />
                      <label
                        className="btn btn-secondary btn-sm"
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                      >
                        📁 Choose File
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                      </label>
                    </div>

                    {formPosterUrl && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <img
                          src={formPosterUrl}
                          alt="Poster Preview"
                          style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        />
                        <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}>
                          ✓ Poster preview ready
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormPosterUrl('')}
                          style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                        >
                          ✕ Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Promo Video (Optional) */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label className="label" style={{ fontWeight: 700, fontSize: '0.8rem', margin: 0 }}>
                        Promotional Video Trailer URL (Optional)
                      </label>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Optional</span>
                    </div>
                    <input
                      type="url"
                      className="input"
                      style={{ fontSize: '0.85rem' }}
                      placeholder="Optional — e.g. https://.../video.mp4 or stream link (or leave blank)"
                      value={formVideoUrl}
                      onChange={(e) => setFormVideoUrl(e.target.value)}
                    />
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                      Optional video teaser stream link. You can leave this blank if you do not have a promotional video.
                    </div>
                    {formVideoUrl && extractYouTubeId(formVideoUrl) && (
                      <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700, marginTop: '4px' }}>
                        ✓ Secure video stream verified
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Critical Dates */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label className="label" style={{ fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.35rem', color: '#b91c1c' }}>
                      Application Deadline Date *
                    </label>
                    <input
                      type="date"
                      required
                      className="input"
                      value={formAppDeadline}
                      onChange={(e) => setFormAppDeadline(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label" style={{ fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.35rem', color: '#15803d' }}>
                      Classes Commencement Date *
                    </label>
                    <input
                      type="date"
                      required
                      className="input"
                      value={formCommenceDate}
                      onChange={(e) => setFormCommenceDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label" style={{ fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.35rem', color: '#2563eb' }}>
                      Orientation Date (Optional)
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={formOrientationDate}
                      onChange={(e) => setFormOrientationDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* 5. Status & Discount Offer */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label className="label" style={{ fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                      Intake Admission Status *
                    </label>
                    <select
                      className="input"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as IntakeStatus)}
                    >
                      <option value="Open">🟢 Open (Actively Enrolling)</option>
                      <option value="Filling Fast">🟡 Filling Fast (Limited Seats)</option>
                      <option value="Upcoming">🔵 Upcoming (Pre-Registration)</option>
                      <option value="Closed">🔴 Closed (Cohort Full)</option>
                      <option value="Archived">⚪ Archived</option>
                    </select>
                  </div>

                  <div>
                    <label className="label" style={{ fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                      Early Bird Scholarship / Offer
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. ⭐ 15% Early Bird Scholarship for first 25 applicants"
                      value={formEarlyBird}
                      onChange={(e) => setFormEarlyBird(e.target.value)}
                    />
                  </div>
                </div>

                {/* 6. Target Courses Multi-Selector */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label className="label" style={{ fontWeight: 800, fontSize: '0.82rem', margin: 0 }}>
                      Target Courses for this Intake ({formSelectedCourses.length} selected)
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllCourses}
                      style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      {formSelectedCourses.length === OFFICIAL_COURSES.length ? 'Deselect All' : 'Select All Courses'}
                    </button>
                  </div>

                  <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.5rem' }}>
                    {OFFICIAL_COURSES.map((course) => {
                      const isChecked = formSelectedCourses.includes(course.title)
                      return (
                        <label
                          key={course.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: isChecked ? '#eff6ff' : 'transparent',
                            border: isChecked ? '1px solid #bfdbfe' : '1px solid transparent',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: isChecked ? 700 : 500,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleCourse(course.title)}
                          />
                          <span>{course.icon} {course.title}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* 7. Study Modes */}
                <div>
                  <label className="label" style={{ fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.4rem' }}>
                    Available Study Modes
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {ALL_STUDY_MODES.map((mode) => {
                      const isSelected = formStudyModes.includes(mode)
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => handleToggleStudyMode(mode)}
                          style={{
                            padding: '0.4rem 0.85rem',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: isSelected ? 800 : 600,
                            border: isSelected ? '1.5px solid #2563eb' : '1px solid var(--color-border)',
                            background: isSelected ? '#eff6ff' : 'var(--color-surface)',
                            color: isSelected ? '#1e3a8a' : 'inherit',
                            cursor: 'pointer',
                          }}
                        >
                          {isSelected ? '✓ ' : '+ '} {mode}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 8. Publication and Featured Controls */}
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '0.88rem', color: '#065f46' }}>
                    <input
                      type="checkbox"
                      checked={formIsPublished}
                      onChange={(e) => setFormIsPublished(e.target.checked)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span>🚀 Publish Immediately to Website Home Page & Student Admissions Desk</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', color: '#065f46' }}>
                    <input
                      type="checkbox"
                      checked={formFeatured}
                      onChange={(e) => setFormFeatured(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>⭐ Mark as Featured Hero Campaign (Highlighted at top of homepage)</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer" style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  style={{ fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                  style={{ fontWeight: 800, padding: '0.75rem 1.75rem' }}
                >
                  {isSaving ? '⏳ Saving Intake...' : editingIntake ? '✓ Update Intake Schedule' : '✓ Save & Publish Intake'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL POSTER MODAL VIEWER */}
      {activePosterModalUrl && (
        <div className="modal-overlay" onClick={() => setActivePosterModalUrl(null)}>
          <div
            className="modal-content modal-lg"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '800px', width: '95%', textAlign: 'center', background: 'transparent', boxShadow: 'none', border: 'none' }}
          >
            <img
              src={activePosterModalUrl}
              alt="Intake Poster Full View"
              style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActivePosterModalUrl(null)}
              style={{ marginTop: '1rem', background: '#ffffff', color: '#000000', fontWeight: 800 }}
            >
              ✕ Close Poster
            </button>
          </div>
        </div>
      )}

      {/* VIDEO MODAL PLAYER */}
      {activeVideoModalUrl && (
        <div className="modal-overlay" onClick={() => setActiveVideoModalUrl(null)}>
          <div
            className="modal-content modal-lg"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '850px',
              width: '95%',
              background: '#090e1f',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #1e293b', color: '#ffffff' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎬</span>
                <span>Promotional Intake Video Trailer</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideoModalUrl(null)}
                style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            <div style={{ width: '100%', background: '#000000', borderRadius: '0 0 16px 16px', overflow: 'hidden' }}>
              <YouTubeEmbed
                url={activeVideoModalUrl}
                title="Intake Promotional Video"
                autoPlay
              />
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
