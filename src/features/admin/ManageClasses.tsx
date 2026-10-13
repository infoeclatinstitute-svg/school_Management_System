import { useState, useEffect, useMemo } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { DatabaseIcon, BookOpenIcon, SearchIcon, RefreshCwIcon, UserIcon, ClockIcon, CalendarIcon } from '@/components/icons/AppIcons'
import { courseStore } from '@/lib/courseStore'
import { type CourseProgram } from '@/config/officialCourses'
import { supabase } from '@/lib/supabase'

export interface DbSubject {
  id: string
  name: string
  color_hex?: string | null
  created_at?: string
}

const CATEGORY_OPTIONS = [
  'All',
  'Tech & Programming',
  'Data Science & Research',
  'Computer & Digital Skills',
  'Business Tech & Accounting',
  'Languages & Communication',
  'Creative Arts & Design',
]

export function ManageClasses() {
  const [activeTab, setActiveTab] = useState<'courses' | 'subjects'>('courses')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [isSyncing, setIsSyncing] = useState(false)
  const [courses, setCourses] = useState<CourseProgram[]>(() => courseStore.getCourses())

  // 1. Live synchronization with courseStore & Supabase cloud
  useEffect(() => {
    const handleUpdate = () => {
      setCourses(courseStore.getCourses())
    }

    window.addEventListener('gc-courses-updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)

    // Fetch cloud courses from Supabase on mount
    courseStore.fetchCloudCourses().then((list) => {
      setCourses(list)
    })

    return () => {
      window.removeEventListener('gc-courses-updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      const list = await courseStore.fetchCloudCourses()
      setCourses(list)
    } finally {
      setIsSyncing(false)
    }
  }

  // 2. Subjects state for tab 2
  const [subjects, setSubjects] = useState<DbSubject[]>(() => {
    try {
      const raw = localStorage.getItem('gc_v2_db_subjects')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false)

  const fetchSubjects = async () => {
    setIsLoadingSubjects(true)
    try {
      const { data: syncRow } = await supabase
        .from('app_cloud_sync')
        .select('data')
        .eq('key', 'gc_v2_db_subjects')
        .maybeSingle()
      if (syncRow?.data && Array.isArray(syncRow.data)) {
        setSubjects(syncRow.data as DbSubject[])
        localStorage.setItem('gc_v2_db_subjects', JSON.stringify(syncRow.data))
      } else {
        const raw = localStorage.getItem('gc_v2_db_subjects')
        setSubjects(raw ? JSON.parse(raw) : [])
      }
    } catch {
      // Fallback to local
    } finally {
      setIsLoadingSubjects(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'subjects') {
      fetchSubjects()
    }
  }, [activeTab])

  // --- Course Modal State ---
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<CourseProgram | null>(null)
  const [courseTitle, setCourseTitle] = useState('')
  const [courseShortTitle, setCourseShortTitle] = useState('')
  const [courseCategory, setCourseCategory] = useState('Tech & Programming')
  const [courseDepartment, setCourseDepartment] = useState('')
  const [courseInstructor, setCourseInstructor] = useState('')
  const [courseFeeUsd, setCourseFeeUsd] = useState<number>(60)
  const [courseFeeKes, setCourseFeeKes] = useState<number>(8000)
  const [courseDuration, setCourseDuration] = useState('12 Weeks (3 Months)')
  const [courseSchedule, setCourseSchedule] = useState(
    'All Shifts: Early Morning, Late Morning, Midday, Afternoon, Evening & Night'
  )
  const [courseCareerOutcome, setCourseCareerOutcome] = useState('')
  const [courseSkillsInput, setCourseSkillsInput] = useState('')
  const [courseBestseller, setCourseBestseller] = useState(false)
  const [coursePopular, setCoursePopular] = useState(false)
  const [courseRating, setCourseRating] = useState(5.0)
  const [courseRatingCount, setCourseRatingCount] = useState(0)
  const [courseStudentsEnrolled, setCourseStudentsEnrolled] = useState(0)
  const [courseToDelete, setCourseToDelete] = useState<CourseProgram | null>(null)
  const [isSavingCourse, setIsSavingCourse] = useState(false)

  // --- Subject Modal State ---
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState<DbSubject | null>(null)
  const [subjectName, setSubjectName] = useState('')
  const [subjectColor, setSubjectColor] = useState('#2563eb')
  const [subjectToDelete, setSubjectToDelete] = useState<DbSubject | null>(null)
  const [isSavingSubject, setIsSavingSubject] = useState(false)

  // Open Create Course Modal
  const handleOpenCreateCourse = () => {
    setEditingCourse(null)
    setCourseTitle('')
    setCourseShortTitle('')
    setCourseCategory('Tech & Programming')
    setCourseDepartment('School of IT and Data Science')
    setCourseInstructor('Global College Certified Senior Lecturer')
    setCourseFeeUsd(60)
    setCourseFeeKes(8000)
    setCourseDuration('12 Weeks (3 Months)')
    setCourseSchedule('All Shifts: Early Morning, Late Morning, Midday, Afternoon, Evening & Night')
    setCourseCareerOutcome('')
    setCourseSkillsInput('Live Virtual Classes, Verified E-Certificate, Hands-on Lab')
    setCourseBestseller(false)
    setCoursePopular(false)
    setCourseRating(5.0)
    setCourseRatingCount(0)
    setCourseStudentsEnrolled(0)
    setShowCourseModal(true)
  }

  // Open Edit Course Modal
  const handleOpenEditCourse = (c: CourseProgram) => {
    setEditingCourse(c)
    setCourseTitle(c.title || '')
    setCourseShortTitle(c.shortTitle || c.title || '')
    setCourseCategory(c.category || 'Tech & Programming')
    setCourseDepartment(c.departmentName || '')
    setCourseInstructor(c.instructor || '')
    setCourseFeeUsd(c.feeUsd || 60)
    setCourseFeeKes(c.feeKes || Math.round((c.feeUsd || 60) * 133))
    setCourseDuration(c.duration || '12 Weeks (3 Months)')
    setCourseSchedule(c.schedule || 'All Shifts: Early Morning, Late Morning, Midday, Afternoon, Evening & Night')
    setCourseCareerOutcome(c.careerOutcome || '')
    setCourseSkillsInput((c.skills || []).join(', '))
    setCourseBestseller(Boolean(c.bestseller))
    setCoursePopular(Boolean(c.popular))
    setCourseRating(c.rating ?? 5.0)
    setCourseRatingCount(c.ratingCount ?? 0)
    setCourseStudentsEnrolled(c.studentsEnrolled ?? 0)
    setShowCourseModal(true)
  }

  // Save Course (Create or Update)
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseTitle.trim()) return

    setIsSavingCourse(true)
    try {
      const skillsArray = courseSkillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      if (editingCourse) {
        const updated: CourseProgram = {
          ...editingCourse,
          title: courseTitle.trim(),
          shortTitle: courseShortTitle.trim() || courseTitle.trim(),
          category: courseCategory,
          departmentName: courseDepartment.trim() || editingCourse.departmentName,
          instructor: courseInstructor.trim() || 'Global College Faculty Specialist',
          feeUsd: Number(courseFeeUsd) || 60,
          feeKes: Number(courseFeeKes) || Math.round((Number(courseFeeUsd) || 60) * 133),
          duration: courseDuration.trim() || '12 Weeks (3 Months)',
          schedule: courseSchedule.trim(),
          careerOutcome: courseCareerOutcome.trim() || editingCourse.careerOutcome,
          skills: skillsArray.length > 0 ? skillsArray : editingCourse.skills,
          bestseller: courseBestseller,
          popular: coursePopular,
          rating: Number(courseRating) || 5.0,
          ratingCount: Number(courseRatingCount) || 0,
          studentsEnrolled: Number(courseStudentsEnrolled) || 0,
        }

        await courseStore.saveCourse(updated)
      } else {
        await courseStore.addCourse({
          title: courseTitle.trim(),
          shortTitle: courseShortTitle.trim() || courseTitle.trim(),
          category: courseCategory,
          departmentName: courseDepartment.trim() || 'Academic Faculty',
          instructor: courseInstructor.trim() || 'Global College Faculty Specialist',
          feeUsd: Number(courseFeeUsd) || 60,
          feeKes: Number(courseFeeKes) || Math.round((Number(courseFeeUsd) || 60) * 133),
          duration: courseDuration.trim() || '12 Weeks (3 Months)',
          schedule: courseSchedule.trim(),
          careerOutcome: courseCareerOutcome.trim() || 'Certified Professional Competency',
          skills: skillsArray.length > 0 ? skillsArray : ['Live Virtual Classes', 'Verified E-Certificate'],
          bestseller: courseBestseller,
          popular: coursePopular,
          rating: Number(courseRating) || 5.0,
          ratingCount: Number(courseRatingCount) || 0,
          studentsEnrolled: Number(courseStudentsEnrolled) || 0,
        })
      }

      setShowCourseModal(false)
      setEditingCourse(null)
      setCourses(courseStore.getCourses())
    } catch (err: any) {
      alert(`Error saving course: ${err?.message || err}`)
    } finally {
      setIsSavingCourse(false)
    }
  }

  // Delete Course
  const handleDeleteCourse = async () => {
    if (!courseToDelete) return
    setIsSavingCourse(true)
    try {
      await courseStore.deleteCourse(courseToDelete.id)
      setCourses(courseStore.getCourses())
      setCourseToDelete(null)
    } catch (err: any) {
      alert(`Error deleting course: ${err?.message || err}`)
    } finally {
      setIsSavingCourse(false)
    }
  }

  // Subject Save
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subjectName.trim()) return

    setIsSavingSubject(true)
    try {
      const nextList = editingSubject
        ? subjects.map((s) =>
            s.id === editingSubject.id
              ? { ...s, name: subjectName.trim(), color_hex: subjectColor }
              : s
          )
        : [
            ...subjects,
            {
              id: `subj-${Date.now()}`,
              name: subjectName.trim(),
              color_hex: subjectColor,
              created_at: new Date().toISOString(),
            },
          ]

      setSubjects(nextList)
      localStorage.setItem('gc_v2_db_subjects', JSON.stringify(nextList))
      await supabase
        .from('app_cloud_sync')
        .upsert({ key: 'gc_v2_db_subjects', data: nextList, updated_at: new Date().toISOString() }, { onConflict: 'key' })

      setShowSubjectModal(false)
      setEditingSubject(null)
    } catch (err: any) {
      alert(`Error saving subject: ${err?.message || err}`)
    } finally {
      setIsSavingSubject(false)
    }
  }

  // Delete Subject
  const handleDeleteSubject = async () => {
    if (!subjectToDelete) return
    try {
      const nextList = subjects.filter((s) => s.id !== subjectToDelete.id)
      setSubjects(nextList)
      localStorage.setItem('gc_v2_db_subjects', JSON.stringify(nextList))
      await supabase
        .from('app_cloud_sync')
        .upsert({ key: 'gc_v2_db_subjects', data: nextList, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      setSubjectToDelete(null)
    } catch (err: any) {
      alert(`Error deleting subject: ${err?.message || err}`)
    }
  }

  // Filtered Courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchCat = selectedCategory === 'All' || c.category === selectedCategory
      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.instructor || '').toLowerCase().includes(q) ||
        (c.departmentName || '').toLowerCase().includes(q) ||
        (c.careerOutcome || '').toLowerCase().includes(q)
      return matchCat && matchSearch
    })
  }, [courses, selectedCategory, searchQuery])

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [subjects, searchQuery])

  return (
    <PageWrapper title="Academic Programs & Live Course Management">
      <div className="space-y-6">
        {/* Top Header Card */}
        <div
          className="card p-6"
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
            color: '#ffffff',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 24px rgba(30, 58, 138, 0.15)',
          }}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DatabaseIcon size={24} color="#93c5fd" />
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Academic Programs & Courses Console
                </h1>
                <span
                  className="badge"
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff' }} />
                  REAL-TIME CLOUD & CATALOG SYNC
                </span>
              </div>
              <p style={{ color: '#e2e8f0', fontSize: '0.88rem', margin: '0.25rem 0 0' }}>
                Manage all <strong style={{ color: '#ffffff' }}>{courses.length} academic courses</strong>. Any changes
                saved here update the public website, course catalog, fees, and SIMS in real time.
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="primary"
                onClick={activeTab === 'courses' ? handleOpenCreateCourse : () => { setEditingSubject(null); setSubjectName(''); setSubjectColor('#2563eb'); setShowSubjectModal(true); }}
                style={{ fontWeight: 800, padding: '0.65rem 1.25rem', background: '#ffffff', color: '#1e3a8a' }}
              >
                {activeTab === 'courses' ? '+ Add New Program / Course' : '+ Add Subject Discipline'}
              </Button>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="btn btn-secondary btn-sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title="Synchronize from Cloud Database"
              >
                <RefreshCwIcon size={14} color="#ffffff" />
                <span>{isSyncing ? 'Syncing...' : 'Refresh Cloud Data'}</span>
              </button>
            </div>
          </div>

          {/* Database Metrics Grid */}
          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-5"
            style={{ borderTop: '1px solid rgba(255, 255, 255, 0.15)' }}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#e2e8f0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Active Programs
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ffffff', margin: '0.25rem 0' }}>
                {courses.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Live on public site & catalog</div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#e2e8f0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Bestsellers & Featured
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ffffff', margin: '0.25rem 0' }}>
                {courses.filter((c) => c.bestseller).length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Highlighted with golden badges</div>
            </div>

            <div
              className="col-span-2 sm:col-span-1"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#e2e8f0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Average Rating
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ffffff', margin: '0.25rem 0' }}>
                5.0 ★
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Verified student evaluations</div>
            </div>
          </div>
        </div>

        {/* Tab & Search Control Bar */}
        <div
          className="card p-4 flex flex-col gap-4"
          style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            {/* Table Switcher Tabs */}
            <div className="flex gap-2 p-1 rounded-xl" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setActiveTab('courses')}
                className="px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2"
                style={{
                  background: activeTab === 'courses' ? '#1d4ed8' : 'transparent',
                  color: activeTab === 'courses' ? '#ffffff' : '#475569',
                }}
              >
                <BookOpenIcon size={15} color={activeTab === 'courses' ? '#ffffff' : '#475569'} />
                <span>Academic Programs ({courses.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('subjects')}
                className="px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2"
                style={{
                  background: activeTab === 'subjects' ? '#1d4ed8' : 'transparent',
                  color: activeTab === 'subjects' ? '#ffffff' : '#475569',
                }}
              >
                <DatabaseIcon size={15} color={activeTab === 'subjects' ? '#ffffff' : '#475569'} />
                <span>Subject Disciplines ({subjects.length})</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon size={16} color="#64748b" />
              </span>
              <input
                type="text"
                className="input pl-9 text-sm"
                style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#0f172a' }}
                placeholder={
                  activeTab === 'courses'
                    ? 'Search by title, instructor, career role...'
                    : 'Search subjects...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills (Courses tab only) */}
          {activeTab === 'courses' && (
            <div className="flex gap-2 overflow-x-auto pb-1 pt-1" style={{ scrollbarWidth: 'thin' }}>
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: selectedCategory === cat ? '1px solid #1e40af' : '1px solid #e2e8f0',
                    background: selectedCategory === cat ? '#1e40af' : '#f8fafc',
                    color: selectedCategory === cat ? '#ffffff' : '#475569',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TAB 1: COURSES GRID VIEW (Visually Matching Public Catalog) */}
        {activeTab === 'courses' && (
          <div>
            {filteredCourses.length === 0 ? (
              <div className="card p-12 text-center text-slate-500" style={{ background: '#ffffff' }}>
                <div className="flex justify-center mb-2">
                  <BookOpenIcon size={36} color="#94a3b8" />
                </div>
                <h3 className="font-bold text-slate-700">No Programs Found</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Try adjusting your search query or category filter, or add a new program using the button above.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: c.bestseller ? '2px solid #eab308' : '1px solid #e2e8f0',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                  >
                    <div>
                      {/* Top Badges Row */}
                      <div className="flex justify-between items-center gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {c.category?.split('&')[0]?.trim() || 'ACADEMIC'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>🌐 100% Online</span>
                        </div>

                        {c.bestseller ? (
                          <span
                            style={{
                              background: '#fef9c3',
                              color: '#854d0e',
                              border: '1px solid #facc15',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            ★ BESTSELLER
                          </span>
                        ) : (
                          <span
                            style={{
                              background: '#f0fdf4',
                              color: '#166534',
                              border: '1px solid #86efac',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                            }}
                          >
                            50% OFF
                          </span>
                        )}
                      </div>

                      {/* Course Title */}
                      <h3
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 900,
                          color: '#0f172a',
                          lineHeight: 1.35,
                          marginBottom: '0.5rem',
                          textTransform: 'uppercase',
                          fontFamily: 'var(--font-heading, Georgia, serif)',
                        }}
                      >
                        {c.title}
                      </h3>

                      {/* Instructor Line */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#475569',
                          fontSize: '0.8rem',
                          marginBottom: '0.65rem',
                        }}
                      >
                        <UserIcon size={14} color="#64748b" />
                        <span style={{ fontWeight: 600 }}>{c.instructor}</span>
                      </div>

                      {/* Ratings & Enrolment Metric */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.8rem',
                          marginBottom: '0.85rem',
                        }}
                      >
                        <span style={{ color: '#d97706', fontWeight: 900 }}>
                          {c.rating?.toFixed(1) || '5.0'} ★★★★★
                        </span>
                        <span style={{ color: '#64748b' }}>({c.ratingCount || 120})</span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ color: '#0284c7', fontWeight: 700 }}>
                          {(c.studentsEnrolled || 250).toLocaleString()} students
                        </span>
                      </div>

                      {/* Schedule & Duration Box */}
                      <div
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '0.75rem',
                          marginBottom: '0.85rem',
                          fontSize: '0.78rem',
                          color: '#334155',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                          <ClockIcon size={13} color="#2563eb" />
                          <span>{c.duration}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: '#64748b', lineHeight: 1.35 }}>
                          <CalendarIcon size={13} color="#64748b" />
                          <span>{c.schedule}</span>
                        </div>
                      </div>

                      {/* Target Career Role Box */}
                      {c.careerOutcome && (
                        <div
                          style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '10px',
                            padding: '0.75rem',
                            marginBottom: '0.85rem',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              color: '#166534',
                              marginBottom: '2px',
                            }}
                          >
                            Target Career Role:
                          </div>
                          <p style={{ margin: 0, fontSize: '0.78rem', color: '#15803d', lineHeight: 1.4 }}>
                            {c.careerOutcome}
                          </p>
                        </div>
                      )}

                      {/* Skills Tags */}
                      {c.skills && c.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {c.skills.slice(0, 3).map((skill, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: '#f1f5f9',
                                color: '#475569',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                              }}
                            >
                              ✓ {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Pricing & Action Buttons */}
                    <div
                      style={{
                        borderTop: '1px solid #e2e8f0',
                        paddingTop: '0.85rem',
                        marginTop: '0.5rem',
                      }}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                            Tuition Fee
                          </div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e3a8a' }}>
                            ${c.feeUsd}{' '}
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                              (KES {c.feeKes.toLocaleString()})
                            </span>
                          </div>
                        </div>
                        <span
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#475569',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}
                        >
                          Installments
                        </span>
                      </div>

                      {/* Admin Controls */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCourse(c)}
                          className="btn btn-primary btn-sm flex-1"
                          style={{
                            fontWeight: 800,
                            padding: '7px 12px',
                            fontSize: '0.82rem',
                            background: '#1e40af',
                            color: '#ffffff',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          ✏️ Edit Program Details
                        </button>
                        <button
                          type="button"
                          onClick={() => setCourseToDelete(c)}
                          className="btn btn-ghost btn-sm"
                          style={{
                            color: '#dc2626',
                            padding: '7px 10px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            borderRadius: '8px',
                          }}
                          title="Delete Program"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SUBJECT DISCIPLINES */}
        {activeTab === 'subjects' && (
          <div>
            {isLoadingSubjects ? (
              <div className="card p-12 text-center" style={{ background: '#ffffff' }}>
                <Spinner />
                <p className="text-slate-500 mt-2 text-sm">Querying Supabase subjects table...</p>
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="card p-12 text-center text-slate-500" style={{ background: '#ffffff' }}>
                <div className="flex justify-center mb-2">
                  <DatabaseIcon size={32} color="#94a3b8" />
                </div>
                <h3 className="font-bold text-slate-700">No Subjects Found</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Add a new discipline using the "+ Add Subject Discipline" button.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSubjects.map((s) => (
                  <div
                    key={s.id}
                    className="card p-4 flex items-center justify-between border border-slate-200"
                    style={{ background: '#ffffff', borderRadius: '12px' }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: s.color_hex || '#2563eb' }}
                      />
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 m-0">{s.name}</h4>
                        <span className="text-xs text-slate-500">Official Subject Discipline</span>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSubject(s)
                          setSubjectName(s.name)
                          setSubjectColor(s.color_hex || '#2563eb')
                          setShowSubjectModal(true)
                        }}
                        className="btn btn-ghost btn-sm text-blue-600"
                        style={{ fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubjectToDelete(s)}
                        className="btn btn-ghost btn-sm text-red-600"
                        style={{ fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* COMPREHENSIVE MODAL: EDIT / CREATE COURSE PROGRAM */}
      <Modal
        isOpen={showCourseModal}
        onClose={() => setShowCourseModal(false)}
        title={editingCourse ? 'Edit Academic Program & Course' : 'Add New Academic Program / Course'}
        size="lg"
      >
        <form onSubmit={handleSaveCourse} className="space-y-4">
          {/* Section 1: Title & Identification */}
          <div>
            <label className="label font-bold text-xs uppercase text-slate-600">Full Course Program Title *</label>
            <input
              type="text"
              required
              className="input"
              placeholder="e.g. Full-Stack Web Development & Modern JavaScript (React 19 & Node.js)"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label font-bold text-xs uppercase text-slate-600">Short Title (Nav & Catalog)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Full-Stack Web Dev (React 19)"
                value={courseShortTitle}
                onChange={(e) => setCourseShortTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="label font-bold text-xs uppercase text-slate-600">Discipline Category *</label>
              <select
                className="input"
                value={courseCategory}
                onChange={(e) => setCourseCategory(e.target.value)}
              >
                {CATEGORY_OPTIONS.filter((c) => c !== 'All').map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Department & Instructor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label font-bold text-xs uppercase text-slate-600">Department / Faculty *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Department of Software Engineering"
                value={courseDepartment}
                onChange={(e) => setCourseDepartment(e.target.value)}
              />
            </div>
            <div>
              <label className="label font-bold text-xs uppercase text-slate-600">Instructor Name & Credentials *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Eng. Alex Mwangi • Senior Software Architect"
                value={courseInstructor}
                onChange={(e) => setCourseInstructor(e.target.value)}
              />
            </div>
          </div>

          {/* Section 3: Pricing & Timing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label font-bold text-xs uppercase text-slate-600">Tuition Fee ($ USD) *</label>
              <input
                type="number"
                min="0"
                required
                className="input"
                value={courseFeeUsd}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setCourseFeeUsd(val)
                  setCourseFeeKes(Math.round(val * 133))
                }}
              />
            </div>
            <div>
              <label className="label font-bold text-xs uppercase text-slate-600">Tuition Fee (KES Equivalent)</label>
              <input
                type="number"
                min="0"
                className="input"
                value={courseFeeKes}
                onChange={(e) => setCourseFeeKes(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label font-bold text-xs uppercase text-slate-600">Course Duration *</label>
              <input
                type="text"
                required
                className="input"
                placeholder="e.g. 12 Weeks (3 Months)"
                value={courseDuration}
                onChange={(e) => setCourseDuration(e.target.value)}
              />
            </div>
            <div>
              <label className="label font-bold text-xs uppercase text-slate-600">Daily Shifts / Schedule *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. All Shifts: Early Morning, Late Morning, Midday..."
                value={courseSchedule}
                onChange={(e) => setCourseSchedule(e.target.value)}
              />
            </div>
          </div>

          {/* Section 4: Target Career Role & Skills */}
          <div>
            <label className="label font-bold text-xs uppercase text-slate-600">Target Career Role & Competency Description</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Outline what practical job competency and projects the student will master upon completion..."
              value={courseCareerOutcome}
              onChange={(e) => setCourseCareerOutcome(e.target.value)}
            />
          </div>

          <div>
            <label className="label font-bold text-xs uppercase text-slate-600">Key Skills & Practical Badges (Comma-separated)</label>
            <input
              type="text"
              className="input"
              placeholder="React 19, Node.js APIs, PostgreSQL, Cloud Deployment"
              value={courseSkillsInput}
              onChange={(e) => setCourseSkillsInput(e.target.value)}
            />
          </div>

          {/* Section 5: Badges & Ratings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label font-bold text-xs uppercase text-slate-600">Student Rating (Stars)</label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                className="input"
                value={courseRating}
                onChange={(e) => setCourseRating(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label font-bold text-xs uppercase text-slate-600">Review Count</label>
              <input
                type="number"
                min="0"
                className="input"
                value={courseRatingCount}
                onChange={(e) => setCourseRatingCount(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label font-bold text-xs uppercase text-slate-600">Enrolled Students</label>
              <input
                type="number"
                min="0"
                className="input"
                value={courseStudentsEnrolled}
                onChange={(e) => setCourseStudentsEnrolled(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 m-0">
              <input
                type="checkbox"
                checked={courseBestseller}
                onChange={(e) => setCourseBestseller(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600"
              />
              <span>★ Flagship Bestseller Badge</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 m-0">
              <input
                type="checkbox"
                checked={coursePopular}
                onChange={(e) => setCoursePopular(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600"
              />
              <span>Featured on Homepage</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="secondary" onClick={() => setShowCourseModal(false)} disabled={isSavingCourse}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSavingCourse}>
              {editingCourse ? 'Save Changes & Sync Public Website' : '+ Create & Publish Program'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD / EDIT SUBJECT */}
      <Modal
        isOpen={showSubjectModal}
        onClose={() => setShowSubjectModal(false)}
        title={editingSubject ? 'Edit Subject Discipline' : 'Add Subject Discipline'}
      >
        <form onSubmit={handleSaveSubject} className="space-y-4">
          <div>
            <label className="label">Subject Discipline Name *</label>
            <input
              type="text"
              required
              className="input"
              placeholder="e.g. Artificial Intelligence and Cloud Computing"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Color Identifier Tag</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={subjectColor}
                onChange={(e) => setSubjectColor(e.target.value)}
                className="w-12 h-10 p-1 rounded border cursor-pointer"
              />
              <input
                type="text"
                className="input flex-1"
                placeholder="#2563eb"
                value={subjectColor}
                onChange={(e) => setSubjectColor(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="secondary" onClick={() => setShowSubjectModal(false)} disabled={isSavingSubject}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSavingSubject}>
              {editingSubject ? 'Update Subject' : '+ Add Subject to Database'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE COURSE */}
      <ConfirmModal
        isOpen={Boolean(courseToDelete)}
        onClose={() => setCourseToDelete(null)}
        onConfirm={handleDeleteCourse}
        title="Delete Academic Program"
        message={`Are you sure you want to permanently delete "${courseToDelete?.title}"? It will be removed from the public course catalog, student enrollment, and cloud database.`}
        confirmLabel="Yes, Delete Program"
        loading={isSavingCourse}
      />

      {/* CONFIRM DELETE SUBJECT */}
      <ConfirmModal
        isOpen={Boolean(subjectToDelete)}
        onClose={() => setSubjectToDelete(null)}
        onConfirm={handleDeleteSubject}
        title="Delete Subject Discipline"
        message={`Are you sure you want to delete "${subjectToDelete?.name}"?`}
        confirmLabel="Yes, Delete Subject"
        loading={isSavingSubject}
      />
    </PageWrapper>
  )
}
