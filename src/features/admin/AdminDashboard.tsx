import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { schoolStore } from '@/lib/schoolData'
import { courseStore } from '@/lib/courseStore'
import { seedCloudDatabase } from '@/lib/databaseSeeder'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import type { Profile, Course } from '@/lib/database.types'

export function AdminDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const primarySchool = tenantSchoolStore.getSchools()[0]
  const institutionName = primarySchool?.name || 'Institutional Management'

  // Automatically sync & seed cloud database in the background
  useEffect(() => {
    seedCloudDatabase()
      .then((res) => {
        if (res.success) {
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
          queryClient.invalidateQueries({ queryKey: ['admin-recent-users'] })
          queryClient.invalidateQueries({ queryKey: ['admin-recent-courses'] })
        }
      })
      .catch(() => {})

    const handleSync = () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin-recent-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-recent-courses'] })
    }
    window.addEventListener('gc-data-synced', handleSync)
    window.addEventListener('gc-courses-updated', handleSync)
    return () => {
      window.removeEventListener('gc-data-synced', handleSync)
      window.removeEventListener('gc-courses-updated', handleSync)
    }
  }, [queryClient])

  // Fetch all user & course counts strictly from active schoolStore / courseStore
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const storeUnits = schoolStore.getCourseUnits()
      const storeSubjects = schoolStore.getSubjects()
      const storeCourses = courseStore.getCourses()
      const storeStudents = schoolStore.getStudents()
      const storeTeachers = schoolStore.getTeachers()

      const totalStudents = storeStudents.length
      const totalTeachers = storeTeachers.length
      const activeStudentsCount = storeStudents.filter((s) => s.status === 'Active').length
      const expiredStudentsCount = totalStudents - activeStudentsCount

      const totalActiveCourses = Math.max(storeUnits.length, storeSubjects.length, storeCourses.length)
      const totalLessons = storeUnits.reduce((acc, u) => acc + (u.lessons?.length || 0), 0)

      return {
        totalStudents,
        totalTeachers,
        courseCount: totalActiveCourses,
        lessonCount: totalLessons,
        expiredStudentsCount,
        activeStudentsCount,
      }
    },
  })

  // Fetch recent profiles from schoolStore
  const { data: recentUsers } = useQuery({
    queryKey: ['admin-recent-users'],
    queryFn: async () => {
      const studentProfiles: Profile[] = schoolStore.getStudents().map((s) => ({
        id: s.id,
        full_name: s.full_name,
        admission_number: s.admission_number,
        role: 'student',
        first_login_at: null,
        access_expires_at: null,
        is_active: s.status === 'Active',
        created_at: s.enrollment_date || new Date().toISOString(),
      }))
      const teacherProfiles: Profile[] = schoolStore.getTeachers().map((t) => ({
        id: t.id,
        full_name: t.name,
        admission_number: t.staff_id || t.id,
        role: 'teacher',
        first_login_at: null,
        access_expires_at: null,
        is_active: true,
        created_at: t.created_at || new Date().toISOString(),
      }))
      return [...studentProfiles, ...teacherProfiles]
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 5)
    },
  })

  // Fetch recent courses from schoolStore / courseStore
  const { data: recentCourses } = useQuery({
    queryKey: ['admin-recent-courses'],
    queryFn: async () => {
      const units = schoolStore.getCourseUnits()
      return units.slice(0, 5).map((u) => ({
        id: u.id,
        title: u.title,
        description: u.description,
        subject_id: u.department,
        teacher_id: u.teacher_id,
        is_published: u.is_published ?? true,
        created_at: u.created_at,
        updated_at: u.created_at,
        teacher: {
          id: u.teacher_id,
          full_name: u.teacher_name || 'Faculty Instructor',
          admission_number: u.teacher_id,
          role: 'teacher',
          first_login_at: null,
          access_expires_at: null,
          is_active: true,
          created_at: u.created_at,
        },
      })) as (Course & { teacher: Profile })[]
    },
  })

  if (loadingStats) {
    return (
      <PageWrapper title="Admin Dashboard">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
          <Spinner size="lg" />
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper
      title="School Administration Control Panel"
      subtitle={`${institutionName} • Student admissions, activation codes, school terms & content moderation.`}
    >
      {/* Quick Action Navigation Deck */}
      <div className="card mb-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: '1px solid #334155' }}>
        <div className="card-body">
          <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
            <div>
              <h2 style={{ color: 'white', fontFamily: 'var(--font-heading)', margin: 0, fontSize: 'var(--text-xl)' }}>
                Administrator Quick Actions
              </h2>
              <p style={{ color: '#94a3b8', margin: 'var(--space-1) 0 0', fontSize: 'var(--text-xs)' }}>
                Direct shortcuts to institution onboarding, candidate admissions, curriculum management, and security controls.
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={() => navigate('/register-school')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                padding: '0.65rem 0.85rem',
                color: '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.82rem',
                fontWeight: 700,
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>🏛️</span>
              <div>
                <div>Onboard Institution</div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500 }}>Multi-tenant setup</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/users')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                padding: '0.65rem 0.85rem',
                color: '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.82rem',
                fontWeight: 700,
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>👤</span>
              <div>
                <div>Admissions &amp; Users</div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500 }}>Issue numbers &amp; accounts</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/intakes')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                padding: '0.65rem 0.85rem',
                color: '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.82rem',
                fontWeight: 700,
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>🗓️</span>
              <div>
                <div>Intake Scheduler</div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500 }}>Cohort advertisements</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/classes')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                padding: '0.65rem 0.85rem',
                color: '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.82rem',
                fontWeight: 700,
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>📚</span>
              <div>
                <div>Manage Courses</div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500 }}>Curriculum &amp; units</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/activations')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                padding: '0.65rem 0.85rem',
                color: '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.82rem',
                fontWeight: 700,
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>🔑</span>
              <div>
                <div>Access Codes</div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500 }}>Student activation keys</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/moderation')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                padding: '0.65rem 0.85rem',
                color: '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.82rem',
                fontWeight: 700,
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>🛡️</span>
              <div>
                <div>Content Moderation</div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500 }}>Platform security review</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 6 Stats Grid */}
      <div className="grid grid-3 mb-8">
        <div className="stat-card">
          <div className="stat-icon stat-icon-primary">🎓</div>
          <div>
            <div className="stat-value">{stats?.totalStudents || 0}</div>
            <div className="stat-label">Enrolled Students</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-accent">👩‍🏫</div>
          <div>
            <div className="stat-value">{stats?.totalTeachers || 0}</div>
            <div className="stat-label">Teaching Staff</div>
          </div>
        </div>

        <div
          className="stat-card"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/admin/classes')}
          title="Click to manage courses"
        >
          <div className="stat-icon stat-icon-success">📚</div>
          <div>
            <div className="stat-value">{stats?.courseCount || 0}</div>
            <div className="stat-label">Active Courses</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-warning">📹</div>
          <div>
            <div className="stat-value">{stats?.lessonCount || 0}</div>
            <div className="stat-label">Uploaded Lessons</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-success">✅</div>
          <div>
            <div className="stat-value">{stats?.activeStudentsCount || 0}</div>
            <div className="stat-label">Active Access (0-30 days)</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderColor: stats?.expiredStudentsCount ? 'var(--color-danger)' : undefined }}>
          <div className="stat-icon stat-icon-accent">⏳</div>
          <div>
            <div className="stat-value" style={{ color: stats?.expiredStudentsCount ? 'var(--color-danger)' : undefined }}>
              {stats?.expiredStudentsCount || 0}
            </div>
            <div className="stat-label">Expired Access (Needs Code)</div>
          </div>
        </div>
      </div>

      {/* Recent Registrations & Courses Grid */}
      <div className="grid grid-2 mb-8">
        {/* Recent Admissions */}
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <h3 style={{ margin: 0 }}>👤 Recent Admissions & Staff</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>
              View All →
            </Button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Admission No.</th>
                  <th>Full Name</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers?.map((u) => (
                  <tr key={u.id}>
                    <td className="font-mono text-xs">{u.admission_number}</td>
                    <td className="font-bold">{u.full_name}</td>
                    <td>
                      <span className={`badge badge-role-${u.role}`}>{u.role}</span>
                    </td>
                    <td className="text-xs text-muted">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Courses */}
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <h3 style={{ margin: 0 }}>📖 Recent Published Courses</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/classes')}>
              Manage All →
            </Button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Course Title</th>
                  <th>Teacher</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentCourses?.map((c) => (
                  <tr key={c.id}>
                    <td className="font-bold">{c.title}</td>
                    <td className="text-xs">{c.teacher?.full_name || 'Teacher'}</td>
                    <td className="text-xs text-muted">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
