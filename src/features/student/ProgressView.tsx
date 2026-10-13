import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useAccess } from '@/hooks/useAccess'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { SubjectBadge } from '@/components/shared/SubjectBadge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import type { Enrollment, Course, StudentBadge } from '@/lib/database.types'

export function ProgressView() {
  const { profile } = useAuth()
  useAccess()

  // Fetch enrollments with full course details
  const { data: enrollments, isLoading: loadingEnrollments } = useQuery({
    queryKey: ['progress-enrollments', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, course:courses(*, subject:subjects(*), lessons:lessons(id, title))')
        .eq('student_id', profile.id)
      if (error) throw error
      return data as (Enrollment & { course: Course & { lessons: { id: string; title: string }[] } })[]
    },
    enabled: !!profile?.id,
  })

  // Fetch student badges
  const { data: badges, isLoading: loadingBadges } = useQuery({
    queryKey: ['progress-badges', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('student_badges')
        .select('*, badge:badges(*)')
        .eq('student_id', profile.id)
      if (error) throw error
      return data as StudentBadge[]
    },
    enabled: !!profile?.id,
  })

  if (loadingEnrollments || loadingBadges) {
    return (
      <PageWrapper title="My Academic Progress">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
          <Spinner size="lg" />
        </div>
      </PageWrapper>
    )
  }

  const totalEnrolled = enrollments?.length || 0
  const totalCompletedCourses = enrollments?.filter((e) => e.completed_at !== null).length || 0
  const totalLessonsDone = enrollments?.reduce((acc, curr) => acc + (curr.completed_lesson_ids?.length || 0), 0) || 0

  return (
    <PageWrapper
      title="My Academic Progress & Achievements"
      subtitle="Track your course completion, quiz milestones, and earned achievement badges."
    >
      {/* Overview Stats Cards */}
      <div className="grid grid-4 mb-8">
        <div className="stat-card">
          <div className="stat-icon stat-icon-primary">📚</div>
          <div>
            <div className="stat-value">{totalEnrolled}</div>
            <div className="stat-label">Enrolled Courses</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-success">🏆</div>
          <div>
            <div className="stat-value">{totalCompletedCourses}</div>
            <div className="stat-label">Courses Completed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-accent">📖</div>
          <div>
            <div className="stat-value">{totalLessonsDone}</div>
            <div className="stat-label">Lessons Completed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-warning">🏅</div>
          <div>
            <div className="stat-value">{badges?.length || 0}</div>
            <div className="stat-label">Badges Earned</div>
          </div>
        </div>
      </div>

      {/* Course Breakdown Section */}
      <div className="mb-8">
        <h2 style={{ fontSize: 'var(--text-xl)', color: 'var(--color-primary)', marginBottom: 'var(--space-4)' }}>
          📖 Course Progress Breakdown
        </h2>

        {enrollments && enrollments.length > 0 ? (
          <div className="flex flex-col gap-4">
            {enrollments.map((enr) => {
              const lessons = enr.course?.lessons || []
              const totalLessons = lessons.length
              const completedCount = enr.completed_lesson_ids?.length || 0
              const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0
              const isDone = !!enr.completed_at

              return (
                <div key={enr.id} className="card">
                  <div className="card-body">
                    <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                      <div>
                        <SubjectBadge subject={enr.course?.subject} />
                        <h3 style={{ margin: 'var(--space-2) 0 0', fontFamily: 'var(--font-heading)', color: 'var(--color-primary)' }}>
                          {enr.course?.title}
                        </h3>
                      </div>
                      {isDone && (
                        <span className="badge badge-success" style={{ fontSize: 'var(--text-sm)' }}>
                          Completed on {formatDate(enr.completed_at!)} ✅
                        </span>
                      )}
                    </div>

                    <ProgressBar
                      value={pct}
                      label={`${completedCount} of ${totalLessons} lessons completed`}
                      variant={isDone ? 'success' : 'primary'}
                    />

                    {/* Lesson checklist */}
                    {lessons.length > 0 && (
                      <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                        <div className="text-xs font-bold text-muted mb-2">Module Completion:</div>
                        <div className="grid grid-2" style={{ gap: 'var(--space-2)' }}>
                          {lessons.map((l) => {
                            const done = enr.completed_lesson_ids?.includes(l.id)
                            return (
                              <div key={l.id} className="flex items-center gap-2 text-xs text-secondary">
                                <span>{done ? '✅' : '⚪'}</span>
                                <span style={{ textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.7 : 1 }}>
                                  {l.title}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty-state card">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-title">No Course Activity Recorded</div>
            <div className="empty-state-desc">
              Enroll in a course to view detailed progress breakdown.
            </div>
          </div>
        )}
      </div>

      {/* Achievement Badges Section */}
      <div>
        <h2 style={{ fontSize: 'var(--text-xl)', color: 'var(--color-primary)', marginBottom: 'var(--space-4)' }}>
          🏅 Achievement Badges
        </h2>

        {badges && badges.length > 0 ? (
          <div className="grid grid-3">
            {badges.map((sb) => (
              <div key={sb.id} className="card text-center p-4">
                <div style={{ fontSize: 44, marginBottom: 'var(--space-2)' }}>{sb.badge?.icon_emoji}</div>
                <div className="font-bold text-base" style={{ color: 'var(--color-primary)' }}>
                  {sb.badge?.name}
                </div>
                <p className="text-xs text-muted mt-1">{sb.badge?.description}</p>
                <div className="text-xs text-muted mt-2" style={{ opacity: 0.8 }}>
                  Awarded: {formatDate(sb.awarded_at)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state card">
            <div className="empty-state-icon">🎯</div>
            <div className="empty-state-title">No Badges Unlocked Yet</div>
            <div className="empty-state-desc">
              Complete lessons, quizzes, and maintain login streaks to unlock achievement badges!
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
