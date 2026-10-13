import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useAccess } from '@/hooks/useAccess'
import { supabase } from '@/lib/supabase'
import { schoolStore } from '@/lib/schoolData'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { SubjectBadge } from '@/components/shared/SubjectBadge'
import { LessonRow } from '@/components/shared/LessonRow'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { INSTITUTION_CONFIG } from '@/config/institution'
import type { Course, Lesson, Enrollment } from '@/lib/database.types'

function isValidUuid(id?: string): boolean {
  if (!id) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

export function CourseDetail() {
  const { id: courseId } = useParams<{ id: string }>()
  const { profile } = useAuth()
  useAccess()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch course detail
  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ['course-detail', courseId],
    queryFn: async () => {
      if (!courseId) return null

      // Check schoolStore units first
      const storeUnits = schoolStore.getCourseUnits()
      const localUnit = storeUnits.find(
        (u) => u.id === courseId || u.code?.toLowerCase() === courseId.toLowerCase() || u.title?.toLowerCase() === courseId.toLowerCase()
      )
      if (localUnit) {
        const allSubjects = schoolStore.getSubjects()
        const matchedSub = allSubjects.find(
          (s) => s.code === localUnit.code || s.name.toLowerCase() === localUnit.title.toLowerCase() || s.name.toLowerCase() === localUnit.program.toLowerCase()
        )
        return {
          id: localUnit.id,
          title: localUnit.title,
          description: localUnit.description,
          subject_id: matchedSub?.id || localUnit.id,
          teacher_id: localUnit.teacher_id || 'tch-faculty',
          class_id: null,
          is_published: true,
          created_at: localUnit.created_at,
          updated_at: localUnit.created_at,
          teacher: { full_name: localUnit.teacher_name || 'Faculty Lecturer' },
          subject: { name: localUnit.program || matchedSub?.name || 'Online Program', color_hex: matchedSub?.color_hex || '#1e3a8a' },
        } as unknown as Course
      }

      // Check schoolStore subjects
      const storeSubjects = schoolStore.getSubjects()
      const localSub = storeSubjects.find(
        (s) => s.id === courseId || s.code.toLowerCase() === courseId.toLowerCase() || s.name.toLowerCase() === courseId.toLowerCase()
      )
      if (localSub) {
        return {
          id: localSub.id,
          title: localSub.name,
          description: localSub.description,
          subject_id: localSub.id,
          teacher_id: 'tch-faculty',
          class_id: null,
          is_published: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          teacher: { full_name: 'Faculty Lecturer' },
          subject: { name: localSub.category || 'Diploma Course', color_hex: '#1e3a8a' },
        } as unknown as Course
      }

      // If valid UUID, query Supabase
      if (isValidUuid(courseId)) {
        try {
          const { data } = await supabase
            .from('courses')
            .select('*, subject:subjects(*), teacher:profiles!teacher_id(full_name), class:classes(*)')
            .eq('id', courseId)
            .maybeSingle()
          if (data) return data as Course
        } catch {}
      }

      // Resilient fallback
      return {
        id: courseId,
        title: 'Certified Course Program',
        description: 'Comprehensive online course training module.',
        subject_id: 'sub-main',
        teacher_id: 'tch-faculty',
        class_id: null,
        is_published: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        teacher: { full_name: 'Faculty Instructor' },
        subject: { name: 'Global College Virtual Campus', color_hex: '#1e3a8a' },
      } as unknown as Course
    },
    enabled: !!courseId,
  })

  // Fetch lessons for course
  const { data: lessons, isLoading: loadingLessons } = useQuery({
    queryKey: ['course-lessons', courseId],
    queryFn: async () => {
      if (!courseId) return []

      const storeUnits = schoolStore.getCourseUnits()
      const localUnit = storeUnits.find(
        (u) => u.id === courseId || u.code?.toLowerCase() === courseId.toLowerCase() || u.title?.toLowerCase() === courseId.toLowerCase()
      )
      if (localUnit && localUnit.lessons?.length) {
        return localUnit.lessons.map((l, idx) => ({
          id: l.id,
          course_id: localUnit.id,
          title: l.title,
          description: l.content || '',
          youtube_url: l.video_url || '',
          order_index: idx + 1,
          created_at: localUnit.created_at,
          edit_locked_at: '',
        })) as unknown as Lesson[]
      }

      if (isValidUuid(courseId)) {
        try {
          const { data } = await supabase
            .from('lessons')
            .select('*')
            .eq('course_id', courseId)
            .order('order_index', { ascending: true })
          if (data && data.length > 0) return data as Lesson[]
        } catch {}
      }

      return [
        {
          id: courseId,
          course_id: courseId,
          title: 'Module 1: Comprehensive Lecture & Practical Lab',
          description: 'Live interactive video session and guided coursework.',
          youtube_url: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
          order_index: 1,
          created_at: new Date().toISOString(),
          edit_locked_at: '',
        },
      ] as unknown as Lesson[]
    },
    enabled: !!courseId,
  })

  // Fetch enrollment status for current student
  const { data: enrollment, isLoading: loadingEnrollment } = useQuery({
    queryKey: ['student-course-enrollment', courseId, profile?.id],
    queryFn: async () => {
      if (!courseId || !profile?.id) return null
      if (isValidUuid(courseId) && isValidUuid(profile.id)) {
        try {
          const { data } = await supabase
            .from('enrollments')
            .select('*')
            .eq('course_id', courseId)
            .eq('student_id', profile.id)
            .maybeSingle()
          return data as Enrollment | null
        } catch {}
      }
      return {
        id: 'enr-local',
        student_id: profile.id,
        course_id: courseId,
        completed_lesson_ids: [],
        enrolled_at: new Date().toISOString(),
        completed_at: null,
      } as Enrollment
    },
    enabled: !!courseId && !!profile?.id,
  })

  // Auto-enroll and navigate to lesson
  const handleLessonClick = async (lessonId: string) => {
    if (isValidUuid(courseId) && isValidUuid(profile?.id) && !enrollment) {
      try {
        await supabase.from('enrollments').insert({
          student_id: profile!.id,
          course_id: courseId,
          completed_lesson_ids: [],
        })
        queryClient.invalidateQueries({ queryKey: ['student-course-enrollment', courseId, profile!.id] })
      } catch {}
    }

    navigate(`/student/lesson/${lessonId}`)
  }

  // Manual Enroll Button
  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!courseId || !profile?.id) return
      const { data, error } = await supabase
        .from('enrollments')
        .insert({
          student_id: profile.id,
          course_id: courseId,
          completed_lesson_ids: [],
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-course-enrollment', courseId, profile?.id] })
    },
  })

  if (loadingCourse || loadingLessons || loadingEnrollment) {
    return (
      <PageWrapper title="Course Details">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
          <Spinner size="lg" />
        </div>
      </PageWrapper>
    )
  }

  if (!course) {
    return (
      <PageWrapper title="Course Not Found">
        <div className="alert alert-danger">
          Course standard record not found or unavailable.
        </div>
      </PageWrapper>
    )
  }

  const isEnrolled = !!enrollment
  const completedIds = enrollment?.completed_lesson_ids || []
  const totalLessons = lessons?.length || 0
  const progressPct = totalLessons > 0 ? Math.round((completedIds.length / totalLessons) * 100) : 0
  const isCourseComplete = !!enrollment?.completed_at

  // Check if student has cleared fees with Bursar or Admin
  const studentIdentifier = profile?.admission_number || profile?.id || ''
  const cleanId = studentIdentifier.toLowerCase().trim()
  const cleanAlpha = cleanId.replace(/[^a-z0-9]/g, '')
  const profileNameAlpha = (profile?.full_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')

  const studentRecord = schoolStore.getStudents().find((s) => {
    const sAdm = s.admission_number.toLowerCase().trim()
    const sAdmAlpha = sAdm.replace(/[^a-z0-9]/g, '')
    const sNameAlpha = s.full_name.toLowerCase().replace(/[^a-z0-9]/g, '')
    return (
      s.id === profile?.id ||
      sAdm === cleanId ||
      (cleanAlpha.length > 0 && sAdmAlpha === cleanAlpha) ||
      (profileNameAlpha.length > 3 && sNameAlpha === profileNameAlpha)
    )
  })

  const studentInvoices = schoolStore.getInvoices().filter((inv) => {
    const iAdm = inv.admission_number.toLowerCase().trim()
    const iAdmAlpha = iAdm.replace(/[^a-z0-9]/g, '')
    return (
      inv.student_id === profile?.id ||
      iAdm === cleanId ||
      (cleanAlpha.length > 0 && iAdmAlpha === cleanAlpha)
    )
  })

  const studentReceipts = schoolStore.getReceipts().filter((rcpt) => {
    const rAdm = rcpt.admission_number.toLowerCase().trim()
    const rAdmAlpha = rAdm.replace(/[^a-z0-9]/g, '')
    return (
      rcpt.student_id === profile?.id ||
      rAdm === cleanId ||
      (cleanAlpha.length > 0 && rAdmAlpha === cleanAlpha)
    )
  })

  const hasClearedInvoice = studentInvoices.some((inv) => inv.status === 'Paid' || inv.balance === 0)
  const hasValidReceipt = studentReceipts.some((r) => (r.amount_paid ?? r.amount) > 0 || r.balance_remaining === 0)
  const isBiometricCleared = schoolStore
    .getBiometricClearanceLogs()
    .some((p) => p.admission_number.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlpha)

  const isStudentCleared =
    profile?.role === 'admin' ||
    profile?.role === 'teacher' ||
    (profile?.role as any) === 'bursar' ||
    studentRecord?.fee_cleared === true ||
    (studentRecord && studentRecord.fee_balance === 0) ||
    hasClearedInvoice ||
    hasValidReceipt ||
    isBiometricCleared

  return (
    <PageWrapper title={course.title}>
      {/* Back button */}
      <Link to="/student/courses" className="lesson-back-link">
        ← Back to All Courses
      </Link>

      {/* Course Header Banner */}
      <div className="card mb-6" style={{ borderLeft: `6px solid ${course.subject?.color_hex || 'var(--color-primary)'}` }}>
        <div className="card-body">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <SubjectBadge subject={course.subject} />
            {course.class?.name && (
              <span className="badge badge-secondary">Class: {course.class.name}</span>
            )}
            {isStudentCleared ? (
              <span className="badge badge-success" style={{ fontWeight: 800 }}>
                ✅ Cleared by Bursar
              </span>
            ) : (
              <span className="badge badge-warning" style={{ fontWeight: 800, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
                Pending Bursar Clearance
              </span>
            )}
          </div>

          <h1 className="course-card-title" style={{ fontSize: 'var(--text-3xl)' }}>
            {course.title}
          </h1>

          <p style={{ margin: 'var(--space-3) 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-base)' }}>
            {course.description || 'No detailed description provided.'}
          </p>

          <div className="flex items-center gap-4 text-sm text-muted mb-4 flex-wrap">
            <span>Instructor: <strong>{course.teacher?.full_name || 'Global College Teacher'}</strong></span>
            <span>{totalLessons} Modules</span>
          </div>

          {/* Forex & Algorithmic Trading Interactive Studio Banner */}
          {(course.title?.toLowerCase().includes('forex') || course.title?.toLowerCase().includes('trading') || courseId?.toLowerCase().includes('forex') || courseId?.toLowerCase().includes('algo')) && (
            <div
              style={{
                marginTop: '1rem',
                marginBottom: '1rem',
                padding: '1.25rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                border: '1.5px solid #a7f3d0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ fontWeight: 800, color: '#065f46', fontSize: '1rem' }}>
                  Interactive Quantitative Bot Simulator & Backtesting Studio
                </div>
                <div style={{ fontSize: '0.85rem', color: '#047857', marginTop: '0.25rem' }}>
                  Design rule-based EMA crossovers, RSI mean-reversion, test lot sizing, and export runnable Python MT5 bot code.
                </div>
              </div>
              <Link
                to="/student/trading-bot"
                className="btn btn-sm"
                style={{
                  background: '#059669',
                  color: '#ffffff',
                  fontWeight: 700,
                  borderRadius: '10px',
                  padding: '0.6rem 1.1rem',
                  textDecoration: 'none',
                  border: 'none',
                }}
              >
                Open Trading Bot Studio
              </Link>
            </div>
          )}

          {/* Pending Clearance Warning Notice */}
          {!isStudentCleared && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1.5px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '1rem',
                fontSize: '0.86rem',
                color: 'var(--color-text)',
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontWeight: 800, color: '#dc2626', marginBottom: '0.35rem' }}>
                Tuition Fee Clearance Required to Stream Video Lectures
              </div>
              <div>
                To unlock video lectures and interactive labs, tuition must be cleared online via Paystack (M-Pesa Express / Card) or verified with the Admissions & Bursar Desk.
              </div>
            </div>
          )}

          {/* Enrollment or Progress */}
          {!isEnrolled ? (
            <div className="alert alert-info flex justify-between items-center flex-wrap gap-4 mt-4">
              <div>
                <strong>Ready to start learning?</strong> Click any lesson below or press Enroll Now to begin!
              </div>
              <Button
                variant="primary"
                loading={enrollMutation.isPending}
                onClick={() => enrollMutation.mutate()}
              >
                Enroll Now 🚀
              </Button>
            </div>
          ) : (
            <div style={{ marginTop: 'var(--space-4)' }}>
              {isCourseComplete && (
                <div className="alert alert-success mb-4">
                  <span className="alert-icon">🏆</span>
                  <div>
                    <strong>Course Completed!</strong> Congratulations, you have passed all module quizzes for this course!
                  </div>
                </div>
              )}

              <ProgressBar
                value={progressPct}
                label={`${completedIds.length} of ${totalLessons} lessons completed`}
                variant={isCourseComplete ? 'success' : 'primary'}
              />
            </div>
          )}
        </div>
      </div>

      {/* Lessons List */}
      <div>
        <h2 style={{ fontSize: 'var(--text-xl)', color: 'var(--color-primary)', marginBottom: 'var(--space-4)' }}>
          📖 Course Modules & Video Lessons
        </h2>

        {lessons && lessons.length > 0 ? (
          <div>
            {lessons.map((lesson, idx) => {
              const isCompleted = completedIds.includes(lesson.id)
              // All course lessons are fully unlocked and accessible
              const isLocked = false

              return (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  index={idx}
                  isCompleted={isCompleted}
                  isLocked={isLocked}
                  onClick={() => handleLessonClick(lesson.id)}
                />
              )
            })}
          </div>
        ) : (
          <div className="empty-state card">
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-title">No Lessons Uploaded Yet</div>
            <div className="empty-state-desc">
              The teacher is preparing video lessons for this course. Please check back soon!
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
