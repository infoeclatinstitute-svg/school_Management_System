import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { isEditable, formatDate } from '@/lib/utils'
import { schoolStore } from '@/lib/schoolData'

export function ContentModeration() {
  const navigate = useNavigate()

  // Fetch all lessons across all courses (combining Supabase + CourseUnits store)
  const { data: lessons, isLoading } = useQuery({
    queryKey: ['admin-all-lessons'],
    queryFn: async () => {
      const storeUnits = schoolStore.getCourseUnits()
      const localLessons = storeUnits.flatMap((u) =>
        (u.lessons || []).map((les) => ({
          id: les.id,
          title: les.title,
          course_id: u.id,
          video_url: les.video_url || '',
          content: les.content || '',
          duration_minutes: les.duration_minutes || 45,
          created_at: u.created_at || new Date().toISOString(),
          course: {
            id: u.id,
            title: u.title,
            teacher: { full_name: u.teacher_name || 'Faculty Lecturer' },
          },
        }))
      )

      try {
        const { data } = await supabase
          .from('lessons')
          .select('*, course:courses(*, teacher:profiles!teacher_id(full_name))')
          .order('created_at', { ascending: false })
        if (data && data.length > 0) {
          return [...(data as any[]), ...localLessons]
        }
      } catch {}

      return localLessons as any[]
    },
  })

  return (
    <PageWrapper
      title="Content Moderation & Admin Lock Override"
      subtitle="As an administrator, you have full override rights to edit or remove any video lesson regardless of the 24-hour lock."
    >
      <div className="alert alert-info mb-6">
        <span className="alert-icon">🛡️</span>
        <div>
          <strong>Admin Privilege Active:</strong> RLS policies grant administrators full write access to all lesson contents and quiz items at any time.
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
          <Spinner size="lg" />
        </div>
      ) : lessons && lessons.length > 0 ? (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Lesson Title</th>
                  <th>Course</th>
                  <th>Teacher</th>
                  <th>Upload Date</th>
                  <th>24h Lock Status</th>
                  <th>Admin Action</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((l) => {
                  const editable = isEditable(l.created_at)

                  return (
                    <tr key={l.id}>
                      <td className="font-bold">{l.title}</td>
                      <td>{l.course?.title}</td>
                      <td className="text-xs">{l.course?.teacher?.full_name || 'Teacher'}</td>
                      <td className="text-xs text-muted">{formatDate(l.created_at)}</td>
                      <td>
                        {editable ? (
                          <span className="badge badge-success">Open (Within 24h)</span>
                        ) : (
                          <span className="badge badge-warning">🔒 Locked (Admin Override Required)</span>
                        )}
                      </td>
                      <td>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/teacher/lesson/${l.id}/edit`)}
                        >
                          ✏️ Edit (Admin Override)
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty-state card">
          <div className="empty-state-icon">🛡️</div>
          <div className="empty-state-title">No Lessons Uploaded</div>
          <div className="empty-state-desc">
            No video lessons have been created yet.
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
