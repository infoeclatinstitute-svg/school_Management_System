import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Spinner } from '@/components/ui/Spinner'
import type { Course, Profile } from '@/lib/database.types'

export function StudentProgressView() {
  const { profile } = useAuth()

  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch teacher's courses
  const { data: courses } = useQuery({
    queryKey: ['teacher-courses-spv', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data } = await supabase.from('courses').select('*').eq('teacher_id', profile.id)
      return (data || []) as Course[]
    },
    enabled: !!profile?.id,
  })

  // Fetch student progress for selected course
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['teacher-student-progress', selectedCourseId],
    queryFn: async () => {
      if (!selectedCourseId) return []

      // Get lessons count
      const { count: totalLessons } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', selectedCourseId)

      const { data, error } = await supabase
        .from('enrollments')
        .select('*, student:profiles!student_id(*)')
        .eq('course_id', selectedCourseId)

      if (error) throw error

      return (data || []).map((e) => ({
        ...e,
        student: e.student as Profile,
        totalLessons: totalLessons || 0,
      }))
    },
    enabled: !!selectedCourseId,
  })

  const filteredEnrollments = enrollments?.filter((e) => {
    return (
      e.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.student?.admission_number?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  return (
    <PageWrapper
      title="Student Progress & Course Engagement"
      subtitle="Monitor individual student completion rates across your courses."
    >
      {/* Search & Course Filter Bar */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="grid grid-2" style={{ gap: 'var(--space-4)' }}>
            <div className="form-group mb-0">
              <label className="form-label" htmlFor="spvCourse">Select Course *</label>
              <select
                id="spvCourse"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                <option value="">-- Select Course --</option>
                {courses?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group mb-0">
              <label className="form-label" htmlFor="spvSearch">Filter Students</label>
              <input
                id="spvSearch"
                type="text"
                placeholder="Search by student name or admission number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={!selectedCourseId}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Cards List */}
      {selectedCourseId ? (
        isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
            <Spinner size="lg" />
          </div>
        ) : filteredEnrollments && filteredEnrollments.length > 0 ? (
          <div className="flex flex-col gap-4">
            {filteredEnrollments.map((enr) => {
              const completedCount = enr.completed_lesson_ids?.length || 0
              const totalLessons = enr.totalLessons
              const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0
              const isAtRisk = pct < 40

              return (
                <div key={enr.id} className="card" style={{ borderColor: isAtRisk ? 'var(--color-warning)' : 'var(--color-border-light)' }}>
                  <div className="card-body">
                    <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                      <div>
                        <div className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>
                          {enr.student?.full_name}
                        </div>
                        <div className="text-xs text-muted">
                          Admission: {enr.student?.admission_number} • Enrolled: {new Date(enr.enrolled_at).toLocaleDateString()}
                        </div>
                      </div>

                      {isAtRisk ? (
                        <span className="badge badge-warning">⚠️ Low Engagement</span>
                      ) : enr.completed_at ? (
                        <span className="badge badge-success">🏆 Course Completed</span>
                      ) : (
                        <span className="badge badge-primary">Active Learning</span>
                      )}
                    </div>

                    <ProgressBar
                      value={pct}
                      label={`${completedCount} of ${totalLessons} lessons completed`}
                      variant={isAtRisk ? 'accent' : 'primary'}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty-state card">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No Enrolled Students</div>
            <div className="empty-state-desc">
              No students are currently enrolled in this course.
            </div>
          </div>
        )
      ) : (
        <div className="empty-state card">
          <div className="empty-state-icon">📖</div>
          <div className="empty-state-title">Select a Course</div>
          <div className="empty-state-desc">
            Select a course from the dropdown above to inspect student progress metrics.
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
