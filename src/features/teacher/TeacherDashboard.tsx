import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { AnnouncementCard } from '@/components/shared/AnnouncementCard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { schoolStore } from '@/lib/schoolData'
import type { Announcement, Course, Profile } from '@/lib/database.types'

export function TeacherDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  // Fetch teacher's assigned course units from schoolStore
  const { data: courses, isLoading: loadingCourses } = useQuery({
    queryKey: ['teacher-courses-dash', profile?.id, profile?.full_name],
    queryFn: async () => {
      const storeUnits = schoolStore.getCourseUnits()
      // Filter for this teacher (or show all if admin)
      const assignedUnits = (profile?.role === 'admin')
        ? storeUnits
        : storeUnits.filter(
            (u) =>
              u.teacher_id === profile?.id ||
              u.teacher_name?.toLowerCase() === profile?.full_name?.toLowerCase()
          )

      return assignedUnits.map((u) => ({
        id: u.id,
        title: u.title,
        description: u.description || `${u.program} • ${u.department}`,
        teacher_id: u.teacher_id,
        is_published: u.is_published,
        created_at: u.created_at,
        meeting_url: u.live_meeting_url,
        schedule_text: u.live_schedule_text,
        lessons: (u.lessons || []).map((l) => ({ id: l.id })),
      })) as unknown as (Course & { lessons: { id: string }[]; meeting_url?: string; schedule_text?: string })[]
    },
    enabled: !!profile?.id,
  })

  // Fetch total students enrolled in teacher's courses
  const { data: totalStudents } = useQuery({
    queryKey: ['teacher-total-students', profile?.id, courses?.length],
    queryFn: async () => {
      if (!profile?.id) return 0
      const courseTitles = new Set((courses || []).map((c) => c.title.toLowerCase()))
      const courseIds = new Set((courses || []).map((c) => c.id))
      if (courseIds.size === 0) return 0
      const matchedStudents = schoolStore.getStudents().filter(
        (s) => courseIds.has(s.class_id) || (s.class_name && courseTitles.has(s.class_name.toLowerCase()))
      )
      return matchedStudents.length
    },
    enabled: !!courses && courses.length > 0,
  })

  // Fetch at-risk students (quiz attempts with < 40% correct)
  const { data: atRiskStudents } = useQuery({
    queryKey: ['at-risk-students', profile?.id],
    queryFn: async () => {
      if (!courses || courses.length === 0) return []
      const courseIds = courses.map((c) => c.id) || []

      // Get lesson ids
      const { data: lessonData } = await supabase.from('lessons').select('id').in('course_id', courseIds)
      const lessonIds = lessonData?.map((l) => l.id) || []
      if (lessonIds.length === 0) return []

      // Get quiz ids
      const { data: quizData } = await supabase.from('quizzes').select('id').in('lesson_id', lessonIds)
      const quizIds = quizData?.map((q) => q.id) || []
      if (quizIds.length === 0) return []

      // Get attempts with profiles
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('*, student:profiles!student_id(full_name, admission_number)')
        .in('quiz_id', quizIds)

      if (!attempts) return []

      // Group by student and calculate pass percentage
      const studentMap = new Map<string, { profile: Profile; total: number; correct: number }>()
      attempts.forEach((att) => {
        const sid = att.student_id
        if (!studentMap.has(sid)) {
          studentMap.set(sid, { profile: att.student as unknown as Profile, total: 0, correct: 0 })
        }
        const stat = studentMap.get(sid)!
        stat.total++
        if (att.is_correct) stat.correct++
      })

      const atRiskList: { name: string; admission: string; pct: number }[] = []
      studentMap.forEach((val) => {
        const pct = Math.round((val.correct / val.total) * 100)
        if (pct < 50) {
          atRiskList.push({
            name: val.profile?.full_name || 'Student',
            admission: val.profile?.admission_number || 'N/A',
            pct,
          })
        }
      })

      return atRiskList
    },
    enabled: !!courses && courses.length > 0,
  })

  // Fetch announcements from schoolStore
  const { data: announcements } = useQuery({
    queryKey: ['announcements-teacher'],
    queryFn: async () => {
      const notices = schoolStore.getNotices().filter(
        (n) => n.target_audience === 'All' || n.target_audience === 'Teachers'
      )
      return notices.slice(0, 3).map((n) => ({
        id: n.id,
        title: n.title,
        body: n.content,
        target: n.target_audience.toLowerCase(),
        pinned: n.is_pinned,
        author_id: profile?.id || '',
        created_at: n.publish_date,
        author: { full_name: n.author_name },
      })) as unknown as Announcement[]
    },
  })

  const totalLessons = courses?.reduce((acc, curr) => acc + (curr.lessons?.length || 0), 0) || 0

  if (loadingCourses) {
    return (
      <PageWrapper title="Teacher Portal">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
          <Spinner size="lg" />
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper
      title={`Welcome, ${profile?.full_name}! 👩‍🏫`}
      subtitle="Global College Teacher Portal • Content Management & Attendance"
    >
      {/* Quick Action Bar */}
      <div className="card mb-6" style={{ background: '#e8edf8', border: '1px solid #c5d2f3' }}>
        <div className="card-body flex justify-between items-center flex-wrap gap-4">
          <div>
            <div className="font-bold text-base text-primary">Faculty Quick Controls</div>
            <div className="text-xs text-muted">Review enrolled trainee cohorts, record daily attendance, and enter exam grades.</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {profile?.role === 'admin' && (
              <Button variant="primary" size="sm" onClick={() => navigate('/teacher/courses/new')}>
                + New Course Unit
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => navigate('/teacher/attendance')}>
              📋 Mark Attendance
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/teacher/gradebook')}>
              💯 Grade Book
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-4 mb-8">
        <div className="stat-card">
          <div className="stat-icon stat-icon-primary">📖</div>
          <div>
            <div className="stat-value">{courses?.length || 0}</div>
            <div className="stat-label">My Courses</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-accent">👥</div>
          <div>
            <div className="stat-value">{totalStudents || 0}</div>
            <div className="stat-label">Total Students</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-success">📹</div>
          <div>
            <div className="stat-value">{totalLessons}</div>
            <div className="stat-label">Lessons Uploaded</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-warning">⚠️</div>
          <div>
            <div className="stat-value">{atRiskStudents?.length || 0}</div>
            <div className="stat-label">At-Risk Students</div>
          </div>
        </div>
      </div>

      {/* At-Risk Students Warning Section */}
      <div className="mb-8">
        <h2 style={{ fontSize: 'var(--text-xl)', color: 'var(--color-primary)', marginBottom: 'var(--space-4)' }}>
          ⚠️ At-Risk Students (Quiz Score &lt; 50%)
        </h2>
        {atRiskStudents && atRiskStudents.length > 0 ? (
          <div className="card" style={{ borderColor: 'var(--color-warning)' }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Admission No.</th>
                    <th>Average Quiz Score</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {atRiskStudents.map((st, i) => (
                    <tr key={i}>
                      <td className="font-bold">{st.name}</td>
                      <td>{st.admission}</td>
                      <td>
                        <span className="badge badge-danger">{st.pct}% Average</span>
                      </td>
                      <td>
                        <Link to="/teacher/students" className="btn btn-xs btn-outline">
                          View Performance
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="alert alert-success">
            <span className="alert-icon">🎉</span>
            <div>All enrolled students are meeting quiz expectations!</div>
          </div>
        )}
      </div>

      {/* Announcements */}
      {announcements && announcements.length > 0 && (
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', color: 'var(--color-primary)', marginBottom: 'var(--space-4)' }}>
            📢 Staff & School Announcements
          </h2>
          <div className="flex flex-col gap-3">
            {announcements.map((a) => (
              <AnnouncementCard key={a.id} announcement={a} />
            ))}
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
