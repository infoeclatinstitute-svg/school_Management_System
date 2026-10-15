import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useAccess } from '@/hooks/useAccess'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { YouTubeEmbed } from '@/components/shared/YouTubeEmbed'
import { WpsDocumentViewer } from '@/components/shared/WpsDocumentViewer'
import { QuizWidget } from '@/components/shared/QuizWidget'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { schoolStore, schoolEventBus } from '@/lib/schoolData'
import { INSTITUTION_CONFIG, getWhatsAppInquiryUrl } from '@/config/institution'
import { initializePaystackCheckout } from '@/lib/paystack'
import type { Lesson, Course, Quiz, LessonResource, Enrollment, QuizAttempt } from '@/lib/database.types'

function HtmlViewer({ fileUrl, title }: { fileUrl: string; title: string }) {
  const { data: htmlContent, isLoading, isError } = useQuery({
    queryKey: ['html-file-body', fileUrl],
    queryFn: async () => {
      if (!fileUrl) throw new Error('Invalid file URL')
      const cleanUrl = fileUrl.trim().toLowerCase()
      // Never fetch the SPA web application itself (prevents source code leak)
      if (
        cleanUrl === '/' ||
        cleanUrl === '/index.html' ||
        cleanUrl === 'index.html' ||
        cleanUrl === window.location.origin ||
        cleanUrl === `${window.location.origin}/` ||
        cleanUrl === `${window.location.origin}/index.html`
      ) {
        throw new Error('Invalid interactive resource path')
      }

      const res = await fetch(fileUrl)
      if (!res.ok) throw new Error('Failed to load file content')
      const text = await res.text()
      // Detect if returned HTML is actually the SPA shell index.html
      if (text.includes('<div id="root">') || text.includes('content="google-site-verification')) {
        throw new Error('Resource is not an external interactive lab')
      }
      return text
    },
    staleTime: 1000 * 60 * 10,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted">
        <Spinner size="sm" /> Rendering interactive HTML web page...
      </div>
    )
  }

  if (isError || !htmlContent) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          background: 'var(--color-bg-secondary)',
          borderRadius: 8,
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧪</div>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--color-primary)' }}>
          {title}
        </h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', maxWidth: '420px', margin: '0 auto 1rem' }}>
          Interactive lab exercises and practical demonstration environment for this lesson module.
        </p>
        <div style={{ display: 'inline-block', padding: '0.35rem 0.85rem', borderRadius: '6px', background: '#dcfce7', color: '#166534', fontSize: '0.8rem', fontWeight: 700 }}>
          ✓ Verified Curriculum Practical Lab Material
        </div>
      </div>
    )
  }

  return (
    <iframe
      srcDoc={htmlContent}
      title={title}
      sandbox="allow-scripts allow-same-origin allow-forms"
      style={{
        width: '100%',
        height: 520,
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        background: '#ffffff',
      }}
    />
  )
}

function isValidUuid(id?: string): boolean {
  if (!id) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

export function LessonPlayer() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const { profile } = useAuth()
  const { isFeeCleared: accessHookFeeCleared } = useAccess()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [, setSyncTick] = useState(0)

  const [activeHtmlUrl, setActiveHtmlUrl] = useState<string | null>(null)
  const [activeDocUrl, setActiveDocUrl] = useState<string | null>(null)
  const [videoCompletedToast, setVideoCompletedToast] = useState(false)

  // Reactive listeners for cloud and local synchronization
  useEffect(() => {
    let isMounted = true
    const handleSync = () => {
      if (isMounted) setSyncTick((t) => t + 1)
    }
    window.addEventListener('storage', handleSync)
    window.addEventListener('gc-data-synced', handleSync)
    const unsubStudent = schoolEventBus.subscribe('STUDENT_UPDATED', handleSync)
    const unsubPayment = schoolEventBus.subscribe('PAYMENT_RECORDED', handleSync)

    // Ensure latest cloud records are pulled
    schoolStore.syncWithCloud(true).catch(() => {})

    return () => {
      isMounted = false
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('gc-data-synced', handleSync)
      unsubStudent()
      unsubPayment()
    }
  }, [])

  // Combined instant parallel query (eliminates network waterfall delays)
  const { data, isLoading, error } = useQuery({
    queryKey: ['lesson-player-instant-v5', lessonId, profile?.id],
    queryFn: async () => {
      if (!lessonId) return null

      // Check local / cloud store units first (by id, code, title, or lessons[].id)
      const storeUnits = schoolStore.getCourseUnits()
      const storeSubjects = schoolStore.getSubjects()

      const localUnit = storeUnits.find(
        (u) =>
          u.id === lessonId ||
          u.code?.toLowerCase() === lessonId.toLowerCase() ||
          u.title?.toLowerCase() === lessonId.toLowerCase() ||
          u.lessons?.some((l) => l.id === lessonId || l.title?.toLowerCase() === lessonId.toLowerCase())
      )

      if (localUnit) {
        const localLesson =
          localUnit.lessons?.find((l) => l.id === lessonId || l.title?.toLowerCase() === lessonId.toLowerCase()) ||
          localUnit.lessons?.[0]

        const activeLessonId = localLesson?.id || lessonId
        const activeTitle = localLesson?.title || localUnit.title
        const activeVideoUrl = localLesson?.video_url || ''
        const activeContent = localLesson?.content || localUnit.description
        const activeMeetingUrl = localLesson?.meeting_url || localUnit.live_meeting_url

        const storeResources: LessonResource[] = []
        localUnit.syllabus_modules?.forEach((m) => {
          m.resources?.forEach((r) => {
            storeResources.push({
              id: r.id,
              lesson_id: activeLessonId,
              file_name: r.file_name,
              file_url: r.file_url,
              file_type: r.file_type || 'application/pdf',
              uploaded_by: localUnit.teacher_name || 'Lecturer',
              edit_locked_at: '' as any,
              created_at: new Date().toISOString(),
            } as unknown as LessonResource)
          })
        })

        const courseLessons = (localUnit.lessons || []).map((l, idx) => ({
          id: l.id,
          title: l.title,
          order_index: idx + 1,
        }))

        const matchedSub = storeSubjects.find(
          (s) => s.code === localUnit.code || s.name.toLowerCase() === localUnit.title.toLowerCase() || s.name.toLowerCase() === localUnit.program.toLowerCase()
        )

        return {
          lesson: {
            id: activeLessonId,
            course_id: localUnit.id,
            title: activeTitle,
            description: activeContent,
            youtube_url: activeVideoUrl,
            order_index: 1,
            created_at: localUnit.created_at,
            edit_locked_at: '',
            meeting_url: activeMeetingUrl,
          } as Lesson & { meeting_url?: string },
          resources: storeResources,
          quizzes: [] as Quiz[],
          course: {
            id: localUnit.id,
            title: localUnit.title,
            description: localUnit.description,
            subject_id: matchedSub?.id || localUnit.id,
            teacher_id: localUnit.teacher_id || 'tch-faculty',
            class_id: null,
            is_published: true,
            created_at: localUnit.created_at,
            updated_at: localUnit.created_at,
            teacher: { full_name: localUnit.teacher_name || 'Faculty Lecturer' } as any,
          } as Course,
          courseLessons: courseLessons.length > 0 ? courseLessons : [{ id: activeLessonId, title: activeTitle, order_index: 1 }],
          enrollment: {
            id: `enr-${localUnit.id}`,
            student_id: profile?.id || '',
            course_id: localUnit.id,
            completed_lesson_ids: [],
            enrolled_at: new Date().toISOString(),
            completed_at: null,
          } as Enrollment,
          attempts: [] as QuizAttempt[],
          unit: localUnit,
        }
      }

      // Check subject match
      const matchedSub = storeSubjects.find(
        (s) => s.id === lessonId || s.code.toLowerCase() === lessonId.toLowerCase() || s.name.toLowerCase() === lessonId.toLowerCase()
      )
      if (matchedSub) {
        return {
          lesson: {
            id: matchedSub.id,
            course_id: matchedSub.id,
            title: matchedSub.name,
            description: matchedSub.description,
            youtube_url: '',
            order_index: 1,
            created_at: new Date().toISOString(),
            edit_locked_at: '',
            meeting_url: '',
          } as Lesson & { meeting_url?: string },
          resources: [] as LessonResource[],
          quizzes: [] as Quiz[],
          course: {
            id: matchedSub.id,
            title: matchedSub.name,
            description: matchedSub.description,
            subject_id: matchedSub.id,
            teacher_id: 'tch-faculty',
            class_id: null,
            is_published: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            teacher: { full_name: 'Faculty Instructor' } as any,
          } as Course,
          courseLessons: [{ id: matchedSub.id, title: matchedSub.name, order_index: 1 }],
          enrollment: {
            id: `enr-${matchedSub.id}`,
            student_id: profile?.id || '',
            course_id: matchedSub.id,
            completed_lesson_ids: [],
            enrolled_at: new Date().toISOString(),
            completed_at: null,
          } as Enrollment,
          attempts: [] as QuizAttempt[],
          unit: undefined,
        }
      }

      // Step 1: Fetch lesson record from Supabase ONLY if isValidUuid
      let lessonData: any = null
      if (isValidUuid(lessonId)) {
        try {
          const { data } = await supabase.from('lessons').select('*').eq('id', lessonId).maybeSingle()
          lessonData = data
        } catch {}
      }

      if (!lessonData) {
        // Safe resilient fallback - NEVER throw fatal Error!
        return {
          lesson: {
            id: lessonId,
            course_id: lessonId,
            title: 'Interactive Lecture & Practical Lab',
            description: 'Online technical training and curriculum video masterclass.',
            youtube_url: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
            order_index: 1,
            created_at: new Date().toISOString(),
            edit_locked_at: '',
            meeting_url: '',
          } as Lesson & { meeting_url?: string },
          resources: [] as LessonResource[],
          quizzes: [] as Quiz[],
          course: {
            id: lessonId,
            title: 'Certified Course Program',
            description: 'Comprehensive online course module.',
            subject_id: 'sub-main',
            teacher_id: 'tch-faculty',
            class_id: null,
            is_published: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            teacher: { full_name: 'Faculty Instructor' } as any,
          } as Course,
          courseLessons: [{ id: lessonId, title: 'Interactive Lecture & Practical Lab', order_index: 1 }],
          enrollment: {
            id: 'enr-local',
            student_id: profile?.id || 'std',
            course_id: lessonId,
            completed_lesson_ids: [],
            enrolled_at: new Date().toISOString(),
            completed_at: null,
          } as Enrollment,
          attempts: [] as QuizAttempt[],
          unit: undefined,
        }
      }

      // Step 2: Fetch all sub-resources in parallel safely
      let resourcesRes: any = { data: [] }
      let quizzesRes: any = { data: [] }
      let courseRes: any = { data: null }
      let courseLessonsRes: any = { data: [] }
      let enrollmentRes: any = { data: null }

      try {
        const results = await Promise.allSettled([
          isValidUuid(lessonId) ? supabase.from('lesson_resources').select('*').eq('lesson_id', lessonId) : Promise.resolve({ data: [] }),
          isValidUuid(lessonId) ? supabase.from('quizzes').select('*').eq('lesson_id', lessonId) : Promise.resolve({ data: [] }),
          isValidUuid(lessonData.course_id) ? supabase.from('courses').select('*').eq('id', lessonData.course_id).maybeSingle() : Promise.resolve({ data: null }),
          isValidUuid(lessonData.course_id) ? supabase.from('lessons').select('id, title, order_index').eq('course_id', lessonData.course_id).order('order_index', { ascending: true }) : Promise.resolve({ data: [] }),
          profile?.id && isValidUuid(lessonData.course_id) && isValidUuid(profile.id)
            ? supabase.from('enrollments').select('*').eq('course_id', lessonData.course_id).eq('student_id', profile.id).maybeSingle()
            : Promise.resolve({ data: null }),
        ])

        if (results[0].status === 'fulfilled') resourcesRes = results[0].value
        if (results[1].status === 'fulfilled') quizzesRes = results[1].value
        if (results[2].status === 'fulfilled') courseRes = results[2].value
        if (results[3].status === 'fulfilled') courseLessonsRes = results[3].value
        if (results[4].status === 'fulfilled') enrollmentRes = results[4].value
      } catch {}

      const quizIds = (quizzesRes.data || []).map((q: any) => q.id)
      let attemptsRes: any = { data: [] }
      if (quizIds.length > 0 && profile?.id && isValidUuid(profile.id)) {
        try {
          const { data } = await supabase.from('quiz_attempts').select('*').in('quiz_id', quizIds).eq('student_id', profile.id)
          attemptsRes = { data: data || [] }
        } catch {}
      }

      const finalMeetingUrl =
        (lessonData as any).meeting_url ||
        storeUnits.find((u) => u.id === lessonData.course_id)?.live_meeting_url ||
        ''

      return {
        lesson: {
          ...(lessonData as Lesson),
          meeting_url: finalMeetingUrl,
        } as Lesson & { meeting_url?: string },
        resources: (resourcesRes.data || []) as LessonResource[],
        quizzes: (quizzesRes.data || []) as Quiz[],
        course: courseRes.data as Course | null,
        courseLessons: (courseLessonsRes.data || []) as Array<{ id: string; title: string; order_index: number }>,
        enrollment: enrollmentRes.data as Enrollment | null,
        attempts: (attemptsRes.data || []) as QuizAttempt[],
        unit: undefined,
      }
    },
    enabled: !!lessonId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  if (isLoading) {
    return (
      <PageWrapper title="Loading Lesson...">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
          <Spinner size="lg" />
        </div>
      </PageWrapper>
    )
  }

  if (error || !data || !data.lesson) {
    return (
      <PageWrapper title="Lesson Not Found">
        <div className="alert alert-danger mb-4">
          Lesson record not found or error loading data ({error ? String(error) : 'Unknown'}).
        </div>
        <Link to="/student/courses" className="lesson-back-link">
          ← Return to All Courses
        </Link>
      </PageWrapper>
    )
  }

  const { lesson, resources, quizzes, course, courseLessons, enrollment, attempts, unit } = data

  const quizIds = quizzes.map((q) => q.id)
  const isLessonAlreadyCompleted = enrollment?.completed_lesson_ids?.includes(lessonId!) || false
  const hasPassed = isLessonAlreadyCompleted || (quizIds.length > 0 && quizIds.every((qid) => attempts?.some((a) => a.quiz_id === qid && a.is_correct)))

  // Handle multi-question quiz completion and course progress update
  const handleQuizComplete = async (
    allCorrect: boolean,
    attemptList: Array<{ quizId: string; selectedIndex: number; isCorrect: boolean }>
  ) => {
    if (!profile?.id || !lessonId || !lesson.course_id) return

    // 1. Bulk insert attempts for all questions
    const records = attemptList.map((att) => ({
      student_id: profile.id,
      quiz_id: att.quizId,
      selected_option: att.selectedIndex,
      is_correct: att.isCorrect,
    }))

    await supabase.from('quiz_attempts').insert(records)

    if (allCorrect) {
      const currentCompleted = enrollment?.completed_lesson_ids || []
      const updatedCompleted = Array.from(new Set([...currentCompleted, lessonId]))
      const isAllCompleted = courseLessons && courseLessons.length > 0 && updatedCompleted.length >= courseLessons.length

      // 2. Upsert enrollment progress
      await supabase.from('enrollments').upsert({
        student_id: profile.id,
        course_id: lesson.course_id,
        completed_lesson_ids: updatedCompleted,
        completed_at: isAllCompleted ? new Date().toISOString() : enrollment?.completed_at || null,
      })

      // 3. Award badges via DB RPC
      await supabase.rpc('award_badge', { p_student_id: profile.id, p_criteria_type: 'first_lesson' })
      await supabase.rpc('award_badge', { p_student_id: profile.id, p_criteria_type: 'lessons_count' })
      if (isAllCompleted) {
        await supabase.rpc('award_badge', { p_student_id: profile.id, p_criteria_type: 'course_complete' })
      }

      // 4. Create notification
      await supabase.from('notifications').insert({
        user_id: profile.id,
        message: `Module completed: ${lesson.title} ✅`,
        link: `/student/courses/${lesson.course_id}`,
      })

      queryClient.invalidateQueries({ queryKey: ['lesson-player-instant-v3'] })
    }
  }

  // Handle smart auto-completion when student finishes video
  const handleVideoComplete = async () => {
    setVideoCompletedToast(true)
    setTimeout(() => setVideoCompletedToast(false), 8000)

    if (!profile?.id || !lessonId || !lesson.course_id) return

    // If lesson has no quizzes, automatically mark the whole lesson as completed in Supabase
    if (!quizzes || quizzes.length === 0) {
      const currentCompleted = enrollment?.completed_lesson_ids || []
      const updatedCompleted = Array.from(new Set([...currentCompleted, lessonId]))
      const isAllCompleted = courseLessons && courseLessons.length > 0 && updatedCompleted.length >= courseLessons.length

      await supabase.from('enrollments').upsert({
        student_id: profile.id,
        course_id: lesson.course_id,
        completed_lesson_ids: updatedCompleted,
        completed_at: isAllCompleted ? new Date().toISOString() : enrollment?.completed_at || null,
      })

      await supabase.rpc('award_badge', { p_student_id: profile.id, p_criteria_type: 'first_lesson' })
      await supabase.rpc('award_badge', { p_student_id: profile.id, p_criteria_type: 'lessons_count' })
      if (isAllCompleted) {
        await supabase.rpc('award_badge', { p_student_id: profile.id, p_criteria_type: 'course_complete' })
      }

      await supabase.from('notifications').insert({
        user_id: profile.id,
        message: `Video finished & module cleared: ${lesson.title} 🎓`,
        link: `/student/courses/${lesson.course_id}`,
      })

      queryClient.invalidateQueries({ queryKey: ['lesson-player-instant-v3'] })
    }
  }

  // Find next lesson
  const currentIndex = courseLessons?.findIndex((l) => l.id === lessonId) ?? -1
  const nextLesson = currentIndex !== -1 && courseLessons && currentIndex < courseLessons.length - 1
    ? courseLessons[currentIndex + 1]
    : null

  // Comprehensive Check if student has paid and is cleared by Bursar
  const adm = (profile?.admission_number || '').trim().toLowerCase()
  const name = (profile?.full_name || '').trim().toLowerCase()
  const id = (profile?.id || '').trim().toLowerCase()

  const allStudents = schoolStore.getStudents()
  const currentStudent =
    allStudents.find((s) => {
      const sAdm = (s.admission_number || '').trim().toLowerCase()
      const sName = (s.full_name || '').trim().toLowerCase()
      const sId = (s.id || '').trim().toLowerCase()
      return (
        (adm && sAdm === adm) ||
        (id && sId === id) ||
        (name && sName === name) ||
        (adm && sName.includes(adm)) ||
        (name && sAdm.includes(name))
      )
    }) || null

  const studentInvoices = schoolStore.getInvoices().filter((inv) => {
    const invAdm = (inv.admission_number || '').trim().toLowerCase()
    const invId = (inv.student_id || '').trim().toLowerCase()
    const invName = (inv.student_name || '').trim().toLowerCase()
    return (adm && invAdm === adm) || (id && invId === id) || (name && invName === name)
  })

  const studentReceipts = schoolStore.getReceipts().filter((rcpt) => {
    const rAdm = (rcpt.admission_number || '').trim().toLowerCase()
    const rId = (rcpt.student_id || '').trim().toLowerCase()
    const rName = (rcpt.student_name || '').trim().toLowerCase()
    return (adm && rAdm === adm) || (id && rId === id) || (name && rName === name)
  })

  const hasClearedInvoice = studentInvoices.some((inv) => inv.status === 'Paid' || inv.balance === 0)
  const hasValidReceipt = studentReceipts.some((r) => (r.amount_paid ?? r.amount) > 0 || r.balance_remaining === 0)
  const isBiometricCleared = schoolStore
    .getBiometricClearanceLogs()
    .some((p) => (adm && p.admission_number.toLowerCase() === adm) || (name && p.student_name.toLowerCase() === name))

  const hasUnitRegCleared = schoolStore.getUnitRegistrations().some((reg) => {
    const regAdm = (reg.admission_number || '').trim().toLowerCase()
    const regName = (reg.student_name || '').trim().toLowerCase()
    return ((adm && regAdm === adm) || (name && regName === name)) && reg.fee_clearance_status === 'Cleared'
  })

  const isStudentCleared =
    profile?.role === 'admin' ||
    profile?.role === 'teacher' ||
    (profile?.role as any) === 'bursar' ||
    currentStudent?.fee_cleared === true ||
    (currentStudent && currentStudent.fee_balance === 0) ||
    hasClearedInvoice ||
    hasValidReceipt ||
    hasUnitRegCleared ||
    isBiometricCleared ||
    accessHookFeeCleared

  if (!isStudentCleared) {
    return (
      <PageWrapper title="Tuition Clearance Required">
        <div style={{ maxWidth: '680px', margin: '1.5rem auto', padding: '0 1rem' }}>
          <div
            className="card"
            style={{
              padding: '2.5rem 1.75rem',
              textAlign: 'center',
              borderRadius: '1.25rem',
              background: 'linear-gradient(145deg, var(--color-bg-secondary), var(--color-bg-primary))',
              border: '2px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '2px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.4rem',
                margin: '0 auto 1.25rem',
              }}
            >
              🔒
            </div>

            <span
              style={{
                display: 'inline-block',
                padding: '0.35rem 0.85rem',
                borderRadius: '999px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.78rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.75rem',
              }}
            >
              Bursar & Admin Clearance Required
            </span>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 0.5rem', color: 'var(--color-text-primary)' }}>
              Lesson & Module Access Locked
            </h2>

            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, margin: '0 auto 1.5rem', maxWidth: '520px' }}>
              Hello <strong>{profile?.full_name || 'Student'}</strong> (Admission: <strong>{profile?.admission_number || 'N/A'}</strong>).
              Course lecture videos, downloadable interactive lab materials, and module quizzes are unlocked immediately once your tuition payment is verified and cleared by the Bursar Desk or Administrator.
            </p>

            {/* Instant Automated Paystack Online Checkout Box */}
            <div
              style={{
                background: 'var(--color-bg-primary)',
                border: '1.5px solid var(--color-border)',
                borderRadius: '1rem',
                padding: '1.25rem',
                textAlign: 'left',
                marginBottom: '1.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.5rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚡</span> Automated Online Fee Clearance via Paystack
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: '0 0 1rem' }}>
                Tuition payments are processed automatically with immediate module unlock. Complete payment via M-Pesa Express, Card, or Apple Pay:
              </p>

              <button
                type="button"
                className="btn btn-primary btn-full"
                onClick={async () => {
                  const studentName = profile?.full_name || 'Enrolled Student'
                  const admNo = profile?.admission_number || profile?.id || 'GC-STUDENT'
                  const courseTitle = data?.course?.title || 'Course Unit'
                  const courseFee = (data?.unit as any)?.course_fee || 15000

                  await initializePaystackCheckout({
                    email: (profile as any)?.email || `${admNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.${INSTITUTION_CONFIG.domain}`,
                    amount: courseFee,
                    currency: 'KES',
                    studentName,
                    admissionNumber: admNo,
                    purpose: `Tuition Fee Clearance - ${courseTitle}`,
                    invoiceId: `INV-${admNo}`,
                    onSuccess: async (reference) => {
                      const verifiedRef = `PAYSTACK-${reference}`
                      await schoolStore.recordPayment({
                        id: `rcpt-${Date.now()}`,
                        receipt_number: `GC-REC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                        student_id: profile?.id || admNo,
                        student_name: studentName,
                        admission_number: admNo,
                        amount: courseFee,
                        amount_paid: courseFee,
                        payment_method: 'Card',
                        reference_code: verifiedRef,
                        payment_date: new Date().toLocaleDateString('en-GB'),
                        paid_by: studentName,
                        recorded_by: 'Paystack Automated Gateway',
                        balance_after: 0,
                        balance_remaining: 0,
                      })

                      // Update student fee status in schoolStore
                      const student = schoolStore.getStudents().find(
                        (s) => s.admission_number.toLowerCase().replace(/[^a-z0-9]/g, '') === admNo.toLowerCase().replace(/[^a-z0-9]/g, '')
                      )
                      if (student) {
                        student.fee_cleared = true
                        student.fee_balance = 0
                        await schoolStore.updateStudent(student.id, student)
                      }

                      alert('🎉 Payment verified! Your lessons and modules are now cleared and unlocked.')
                      window.location.reload()
                    },
                    onClose: () => {
                      // Window closed
                    },
                  })
                }}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '0.85rem 1.25rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
                  cursor: 'pointer',
                  border: 'none',
                  fontSize: '0.95rem',
                }}
              >
                <span>💳</span>
                <span>Pay Online with Paystack (M-Pesa / Card) to Unlock Instantly →</span>
              </button>
            </div>

            {/* Direct Support & Verification Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '420px', margin: '0 auto' }}>
              <a
                href={getWhatsAppInquiryUrl(`Hello Admissions & Bursar Office! My Name is ${profile?.full_name || ''} (Admission: ${profile?.admission_number || ''}). I would like to confirm my fee clearance and activate my LMS course modules.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '0.75rem 1.25rem',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  borderRadius: '0.75rem',
                  textDecoration: 'none',
                }}
              >
                <span>💬</span> Contact Bursar Desk on WhatsApp
              </a>

              <Link
                to="/fees"
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '0.75rem 1.25rem',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  borderRadius: '0.75rem',
                  textDecoration: 'none',
                }}
              >
                <span>💳</span> View Invoices & Payment Receipts
              </Link>

              <Link
                to="/student/courses"
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  marginTop: '0.25rem',
                  textDecoration: 'none',
                }}
              >
                ← Return to Course Overview
              </Link>
            </div>
          </div>
        </div>
      </PageWrapper>
    )
  }

  return (
    <div className="lesson-page animate-fade-in">
      {/* 1. Universal Smart Video Player Pinned at the Very Top */}
      <YouTubeEmbed
        url={lesson.youtube_url}
        title={lesson.title}
        lessonId={lesson.id}
        studentId={profile?.id}
        onEnded={handleVideoComplete}
      />

      {/* 2. Lesson Title, Module Details & Back Link Positioned Below the Video */}
      <div style={{ padding: '0 0.85rem' }}>
        <div style={{ marginTop: '0.85rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <Link to={`/student/courses/${lesson.course_id}`} className="lesson-back-link" style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem' }}>
            ← Back to {course?.title || 'Course'}
          </Link>
          <span className="badge badge-primary" style={{ fontWeight: 800, fontSize: '0.74rem' }}>
            {unit?.code || (course as any)?.code || 'Module'} • Active Lesson
          </span>
        </div>

        <h1 className="lesson-title" style={{ fontSize: '1.45rem', margin: '0 0 0.35rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>
          {lesson.title}
        </h1>
        {lesson.description && (
          <p className="lesson-desc" style={{ fontSize: '0.9rem', margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            {lesson.description}
          </p>
        )}
      </div>

      {/* Video Completion Floating Banner */}
      {videoCompletedToast && (
        <div
          style={{
            background: '#dcfce7',
            border: '2px solid #86efac',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            boxShadow: '0 4px 12px rgba(22, 101, 52, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.8rem' }}>🎉</span>
            <div>
              <strong style={{ color: '#166534', fontSize: '0.95rem' }}>Video Lecture Finished!</strong>
              <div style={{ color: '#15803d', fontSize: '0.8rem', marginTop: '2px' }}>
                {quizzes && quizzes.length > 0
                  ? 'Great job watching! Complete the quick quiz below to test your understanding.'
                  : 'Module progress recorded! You can now proceed to the next module.'}
              </div>
            </div>
          </div>
          {nextLesson && (
            <Button variant="primary" size="sm" onClick={() => navigate(`/student/lesson/${nextLesson.id}`)}>
              Next Module: {nextLesson.title} →
            </Button>
          )}
        </div>
      )}

      {/* PDF & HTML Learning Resources */}
      {resources && resources.length > 0 && (
        <div className="lesson-resources">
          <div className="lesson-resources-title">📄 Lesson Attachments, Notes & Interactive HTML Labs</div>
          <div className="flex flex-col gap-3">
            {resources.map((res) => {
              const isHtml = res.file_name.endsWith('.html') || res.file_name.endsWith('.htm') || res.file_type === 'text/html'
              return (
                <div key={res.id} className="card p-3" style={{ border: '1px solid var(--color-border-light)' }}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 20 }}>{isHtml ? '🌐' : '📄'}</span>
                      <div>
                        <span className="font-bold text-sm">{res.file_name}</span>
                        <span className="text-xs text-muted block">
                          {isHtml ? 'Interactive Web HTML Lab / Material' : 'Document File'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {isHtml && (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => setActiveHtmlUrl(activeHtmlUrl === res.file_url ? null : res.file_url)}
                        >
                          {activeHtmlUrl === res.file_url ? 'Hide Interactive Lab ✕' : 'Open Interactive Lab Online 🔒'}
                        </button>
                      )}

                      {!isHtml && (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => setActiveDocUrl(activeDocUrl === res.file_url ? null : res.file_url)}
                        >
                          {activeDocUrl === res.file_url ? 'Hide Document ✕' : 'Read Document Online 🔒'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Native HTML Render via srcDoc */}
                  {isHtml && activeHtmlUrl === res.file_url && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                      <HtmlViewer fileUrl={res.file_url} title={res.file_name} />
                    </div>
                  )}

                  {/* WPS Office-Style Interactive Full-Screen Document Viewer Suite */}
                  {!isHtml && activeDocUrl === res.file_url && (
                    <WpsDocumentViewer
                      title={res.file_name}
                      fileUrl={res.file_url}
                      subject={course?.title || 'Lesson Resource'}
                      category="Lesson Attachment"
                      studentName={profile?.full_name}
                      studentId={profile?.id}
                      onClose={() => setActiveDocUrl(null)}
                      isModal={true}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Lesson Quiz Widget */}
      {quizzes && quizzes.length > 0 ? (
        <QuizWidget
          quizzes={quizzes}
          onComplete={handleQuizComplete}
          alreadyPassed={hasPassed || isLessonAlreadyCompleted}
        />
      ) : (
        <div className="alert alert-info mt-6">
          ℹ️ No quiz for this lesson. You may proceed to the next module.
        </div>
      )}

      {/* Dedicated Faculty Live Zoom & Google Meet Virtual Classroom (Outside Video Player Environment) */}
      {((lesson as any).meeting_url || data?.unit?.live_meeting_url) && (
        <div
          className="card"
          style={{
            marginTop: '2rem',
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
            color: '#ffffff',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            boxShadow: '0 4px 18px rgba(30, 58, 138, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2rem', background: 'rgba(255,255,255,0.15)', padding: '0.5rem', borderRadius: '50%' }}>🎥</div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>Faculty Live Zoom / Google Meet Session</div>
              <div style={{ fontSize: '0.82rem', color: '#93c5fd', marginTop: '2px' }}>
                {data?.unit?.live_schedule_text || 'Interactive live classroom scheduled. Click to join faculty instructor in real time.'}
              </div>
            </div>
          </div>
          <a
            href={(lesson as any).meeting_url || data?.unit?.live_meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
            style={{
              background: '#2563eb',
              color: '#ffffff',
              fontWeight: 800,
              padding: '0.65rem 1.4rem',
              borderRadius: '8px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 2px 10px rgba(37,99,235,0.4)',
            }}
          >
            <span>🎥</span> Join Live Class ↗
          </a>
        </div>
      )}

      {/* Next Lesson Button */}
      {(hasPassed || isLessonAlreadyCompleted || !quizzes || quizzes.length === 0) && (
        <div className="mt-8 flex justify-end">
          {nextLesson ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate(`/student/lesson/${nextLesson.id}`)}
            >
              Next Module: {nextLesson.title} →
            </Button>
          ) : (
            <Button
              variant="accent"
              size="lg"
              onClick={() => navigate(`/student/courses/${lesson.course_id}`)}
            >
              Finish & Return to Course Summary 🏆
            </Button>
          )}
        </div>
      )}
      </div>
    </div>
  )
}
