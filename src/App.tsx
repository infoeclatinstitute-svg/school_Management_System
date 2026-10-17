import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { schoolStore } from '@/lib/schoolData'
import { seedCloudDatabase } from '@/lib/databaseSeeder'
import { initOTAUpdater } from '@/lib/otaUpdater'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import { licensingStore } from '@/lib/licensingStore'
import { detectTenantFromHost } from '@/lib/tenantDomain'
import { initNativeBridge } from '@/lib/mobileNativeBridge'
import { LayoutShell } from '@/components/layout/LayoutShell'
import { LoadingScreen } from '@/components/ui/Spinner'
import { PullToRefresh } from '@/components/shared/PullToRefresh'
import { ConcurrentSessionAlertModal } from '@/components/shared/ConcurrentSessionAlertModal'

import { LandingPage } from '@/features/landing/LandingPage'
import { Login } from '@/features/auth/Login'

const TutorPublishCoursePage = lazy(() => import('@/features/teacher/TutorPublishCoursePage').then((m) => ({ default: m.TutorPublishCoursePage })))
const ChangePassword = lazy(() => import('@/features/auth/ChangePassword').then((m) => ({ default: m.ChangePassword })))
const TenantSchoolHub = lazy(() => import('@/features/tenant/TenantSchoolHub').then((m) => ({ default: m.TenantSchoolHub })))
const SchoolRegistrationPage = lazy(() => import('@/features/tenant/SchoolRegistrationPage').then((m) => ({ default: m.SchoolRegistrationPage })))
const MasterSaasPortal = lazy(() => import('@/features/saas/MasterSaasPortal').then((m) => ({ default: m.MasterSaasPortal })))

// Lazy-loaded Student Pages
const StudentDashboard = lazy(() => import('@/features/student/StudentDashboard').then((m) => ({ default: m.StudentDashboard })))
const CourseList = lazy(() => import('@/features/student/CourseList').then((m) => ({ default: m.CourseList })))
const CourseDetail = lazy(() => import('@/features/student/CourseDetail').then((m) => ({ default: m.CourseDetail })))
const LessonPlayer = lazy(() => import('@/features/student/LessonPlayer').then((m) => ({ default: m.LessonPlayer })))
const ProgressView = lazy(() => import('@/features/student/ProgressView').then((m) => ({ default: m.ProgressView })))

// Lazy-loaded Teacher Pages
const TeacherDashboard = lazy(() => import('@/features/teacher/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard })))
const MyCourses = lazy(() => import('@/features/teacher/MyCourses').then((m) => ({ default: m.MyCourses })))
const CreateCourse = lazy(() => import('@/features/teacher/CreateCourse').then((m) => ({ default: m.CreateCourse })))
const LessonUploader = lazy(() => import('@/features/teacher/LessonUploader').then((m) => ({ default: m.LessonUploader })))
const EditLesson = lazy(() => import('@/features/teacher/EditLesson').then((m) => ({ default: m.EditLesson })))
const AttendanceTracker = lazy(() => import('@/features/teacher/AttendanceTracker').then((m) => ({ default: m.AttendanceTracker })))
const GradeBook = lazy(() => import('@/features/teacher/GradeBook').then((m) => ({ default: m.GradeBook })))
const StudentProgressView = lazy(() => import('@/features/teacher/StudentProgressView').then((m) => ({ default: m.StudentProgressView })))

// Lazy-loaded Admin Pages
const AdminDashboard = lazy(() => import('@/features/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })))
const ManageUsers = lazy(() => import('@/features/admin/ManageUsers').then((m) => ({ default: m.ManageUsers })))
const ManageClasses = lazy(() => import('@/features/admin/ManageClasses').then((m) => ({ default: m.ManageClasses })))
const ManageSubjects = lazy(() => import('@/features/admin/ManageSubjects').then((m) => ({ default: m.ManageSubjects })))
const ManageTerms = lazy(() => import('@/features/admin/ManageTerms').then((m) => ({ default: m.ManageTerms })))
const ActivationManager = lazy(() => import('@/features/admin/ActivationManager').then((m) => ({ default: m.ActivationManager })))
const ContentModeration = lazy(() => import('@/features/admin/ContentModeration').then((m) => ({ default: m.ContentModeration })))
const AnnouncementsAdmin = lazy(() => import('@/features/admin/AnnouncementsAdmin').then((m) => ({ default: m.AnnouncementsAdmin })))
const IntakeScheduler = lazy(() => import('@/features/admin/IntakeScheduler').then((m) => ({ default: m.IntakeScheduler })))

// Lazy-loaded College SIMS & Hub Pages
const StudentDirectory = lazy(() => import('@/features/sis/StudentDirectory').then((m) => ({ default: m.StudentDirectory })))
const TimetableView = lazy(() => import('@/features/timetable/TimetableView').then((m) => ({ default: m.TimetableView })))
const ExamManagement = lazy(() => import('@/features/exams/ExamManagement').then((m) => ({ default: m.ExamManagement })))
const FeeManagement = lazy(() => import('@/features/fees/FeeManagement').then((m) => ({ default: m.FeeManagement })))
const ResourceLibrary = lazy(() => import('@/features/library/ResourceLibrary').then((m) => ({ default: m.ResourceLibrary })))
const DisciplineTracker = lazy(() => import('@/features/discipline/DisciplineTracker').then((m) => ({ default: m.DisciplineTracker })))
const ParentDashboard = lazy(() => import('@/features/parent/ParentDashboard').then((m) => ({ default: m.ParentDashboard })))
const SchoolNoticeboard = lazy(() => import('@/features/announcements/SchoolNoticeboard').then((m) => ({ default: m.SchoolNoticeboard })))
const BursarDesk = lazy(() => import('@/features/bursar/BursarDesk').then((m) => ({ default: m.BursarDesk })))

/** Student Portal Direct Access Guard */
function StudentNativeGuard({ children }: { children: ReactElement }) {
  return children
}

/** Auth Guard Component */
function RequireAuth({ children, allowedRoles }: { children: ReactElement; allowedRoles?: string[] }) {
  const { profile, loading } = useAuth()

  if (loading) return <LoadingScreen message="Verifying security session..." />
  if (!profile) return <Navigate to="/login" replace />

  // Strict role authorization check
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    if (profile.role === 'admin') return <Navigate to="/admin" replace />
    if (profile.role === 'bursar') return <Navigate to="/bursar" replace />
    if (profile.role === 'teacher') return <Navigate to="/teacher" replace />
    if (profile.role === 'parent') return <Navigate to="/parent" replace />
    return <Navigate to="/student" replace />
  }

  return children
}



/** Portals-Only Entry Router with Subdomain & Custom Domain Auto-Detection */
function RootEntryRouter() {
  const { profile, loading } = useAuth()
  if (loading) return <LoadingScreen message="Opening Portal..." />

  // 0. If requested with target=saas-admin (e.g. from SaaS Admin standalone APK)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('target') === 'saas-admin' || window.location.hash.includes('saas-admin')) {
      return <Navigate to="/saas-admin" replace />
    }
  }

  // 1. If on a school subdomain → show that school's hub
  if (typeof window !== 'undefined') {
    const detected = detectTenantFromHost(window.location.hostname, tenantSchoolStore.getSchools())
    if (detected) {
      return <TenantSchoolHub forcedSlug={detected.school.slug} forcedSubview="hub" />
    }
  }

  // 2. Authenticated users → their role portal
  if (profile) {
    if (profile.role === 'admin') return <Navigate to="/admin" replace />
    if (profile.role === 'bursar') return <Navigate to="/bursar" replace />
    if (profile.role === 'teacher') return <Navigate to="/teacher" replace />
    if (profile.role === 'parent') return <Navigate to="/parent" replace />
    return <Navigate to="/student" replace />
  }

  // 3. Unauthenticated on root domain → public landing page
  return <LandingPage />
}

/** Subdomain Route Resolver: If on a tenant subdomain, serve tenant desks directly without URL rewriting */
function TenantSubdomainRouteOrCentral({
  subview,
  centralElement,
}: {
  subview: string
  centralElement: ReactElement
}) {
  const schools = tenantSchoolStore.getSchools()
  const detected = typeof window !== 'undefined' ? detectTenantFromHost(window.location.hostname, schools) : null

  if (detected) {
    return <TenantSchoolHub forcedSlug={detected.school.slug} forcedSubview={subview} />
  }

  return centralElement
}

/** Proactive Subdomain Router: Directs sub-routes on tenant subdomains */
function TenantSubdomainWatcher() {
  return null
}

/** Smart Route Resolver: Allows students to access school portal via /schoolSlug directly without /s/ */
function FallbackOrSchoolSlug() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)
  if (segments.length >= 1) {
    const candidateSlug = segments[0]
    const school = tenantSchoolStore.getSchoolBySlug(candidateSlug)
    if (school) {
      const subview = segments[1] || 'hub'
      return <TenantSchoolHub forcedSlug={school.slug} forcedSubview={subview} />
    }
  }
  return <Navigate to="/" replace />
}

export function App() {
  useEffect(() => {
    // Defer cloud sync tasks so initial UI renders immediately without network contention
    const syncTimer = setTimeout(() => {
      schoolStore.syncWithCloud().catch(() => {})
      tenantSchoolStore.syncWithCloud().catch(() => {})
      licensingStore.syncWithCloud().catch(() => {})
      seedCloudDatabase().catch(() => {})
    }, 600)

    const cleanupOTA = initOTAUpdater()
    let cleanupNative: (() => void) | undefined
    initNativeBridge().then((cleanup) => {
      cleanupNative = cleanup
    })

    return () => {
      clearTimeout(syncTimer)
      cleanupOTA()
      if (cleanupNative) cleanupNative()
    }
  }, [])

  return (
    <Suspense fallback={<LoadingScreen message="Loading..." />}>
      <TenantSubdomainWatcher />
      <PullToRefresh />
      <ConcurrentSessionAlertModal />
      <Routes>
        {/* Portal Root Route */}
        <Route path="/" element={<RootEntryRouter />} />
        <Route path="/publish-course" element={<TutorPublishCoursePage />} />
        <Route path="/teach-with-us" element={<TutorPublishCoursePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<ChangePassword />} />
        {/* Public School Self-Registration */}
        <Route path="/register-school" element={<SchoolRegistrationPage />} />
        {/* School Hub — accessible via subdomain or direct /schools/:slug path */}
        <Route path="/s/:schoolSlug" element={<TenantSchoolHub />} />
        <Route path="/s/:schoolSlug/:subview" element={<TenantSchoolHub />} />
        <Route path="/schools/:schoolSlug" element={<TenantSchoolHub />} />
        <Route path="/schools/:schoolSlug/:subview" element={<TenantSchoolHub />} />

        {/* Platform Owner SaaS Portal — protected by Master Passcode Security Gate */}
        <Route
          path="/saas-admin"
          element={
            <TenantSubdomainRouteOrCentral
              subview="billing"
              centralElement={<MasterSaasPortal />}
            />
          }
        />
        {/* Open Portal Routes with App Layout */}
        <Route element={<LayoutShell />}>
          <Route path="/library" element={<ResourceLibrary />} />
        </Route>

        {/* Authenticated Layout Routes */}
        <Route
          element={
            <RequireAuth>
              <LayoutShell />
            </RequireAuth>
          }
        >
          {/* Universal College System Hub Modules */}
          <Route path="/timetable" element={<TimetableView />} />
          <Route path="/exams" element={<ExamManagement />} />
          <Route
            path="/fees"
            element={
              <RequireAuth allowedRoles={['admin', 'bursar']}>
                <FeeManagement />
              </RequireAuth>
            }
          />
          <Route path="/noticeboard" element={<SchoolNoticeboard />} />
          <Route
            path="/discipline"
            element={
              <RequireAuth allowedRoles={['admin', 'teacher']}>
                <DisciplineTracker />
              </RequireAuth>
            }
          />
          <Route
            path="/students"
            element={
              <RequireAuth allowedRoles={['admin', 'bursar', 'teacher']}>
                <StudentDirectory />
              </RequireAuth>
            }
          />

          {/* Specialized Roles & Desks - School Subdomain Aware */}
          <Route
            path="/admin"
            element={
              <TenantSubdomainRouteOrCentral
                subview="principal"
                centralElement={
                  <RequireAuth allowedRoles={['admin']}>
                    <AdminDashboard />
                  </RequireAuth>
                }
              />
            }
          />
          <Route
            path="/principal"
            element={
              <TenantSubdomainRouteOrCentral
                subview="principal"
                centralElement={
                  <RequireAuth allowedRoles={['admin']}>
                    <AdminDashboard />
                  </RequireAuth>
                }
              />
            }
          />
          <Route
            path="/bursar"
            element={
              <TenantSubdomainRouteOrCentral
                subview="bursar"
                centralElement={
                  <RequireAuth allowedRoles={['bursar', 'admin']}>
                    <BursarDesk />
                  </RequireAuth>
                }
              />
            }
          />
          <Route path="/secretary" element={<Navigate to="/bursar" replace />} />
          <Route
            path="/parent"
            element={
              <TenantSubdomainRouteOrCentral
                subview="student"
                centralElement={
                  <RequireAuth allowedRoles={['parent', 'admin']}>
                    <ParentDashboard />
                  </RequireAuth>
                }
              />
            }
          />
          <Route
            path="/billing"
            element={
              <TenantSubdomainRouteOrCentral
                subview="billing"
                centralElement={<Navigate to="/" replace />}
              />
            }
          />
          <Route
            path="/programs"
            element={
              <TenantSubdomainRouteOrCentral
                subview="programs"
                centralElement={<Navigate to="/" replace />}
              />
            }
          />
          <Route
            path="/courses"
            element={
              <TenantSubdomainRouteOrCentral
                subview="programs"
                centralElement={<Navigate to="/" replace />}
              />
            }
          />
          <Route
            path="/calendar"
            element={
              <TenantSubdomainRouteOrCentral
                subview="calendar"
                centralElement={<Navigate to="/" replace />}
              />
            }
          />

          {/* Student Portal Routes (Protected with Native App DRM and Role Authorization) */}
          <Route
            path="/student"
            element={
              <TenantSubdomainRouteOrCentral
                subview="student"
                centralElement={
                  <RequireAuth allowedRoles={['student', 'admin']}>
                    <StudentNativeGuard>
                      <StudentDashboard />
                    </StudentNativeGuard>
                  </RequireAuth>
                }
              />
            }
          />
          <Route
            path="/student/courses"
            element={
              <RequireAuth allowedRoles={['student', 'admin']}>
                <StudentNativeGuard>
                  <CourseList />
                </StudentNativeGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/student/courses/:id"
            element={
              <RequireAuth allowedRoles={['student', 'admin']}>
                <StudentNativeGuard>
                  <CourseDetail />
                </StudentNativeGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/student/lesson/:lessonId"
            element={
              <RequireAuth allowedRoles={['student', 'admin']}>
                <StudentNativeGuard>
                  <LessonPlayer />
                </StudentNativeGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/student/lessons/:lessonId"
            element={
              <RequireAuth allowedRoles={['student', 'admin']}>
                <StudentNativeGuard>
                  <LessonPlayer />
                </StudentNativeGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/student/progress"
            element={
              <RequireAuth allowedRoles={['student', 'admin']}>
                <StudentNativeGuard>
                  <ProgressView />
                </StudentNativeGuard>
              </RequireAuth>
            }
          />

          {/* Teacher Portal Routes */}
          <Route
            path="/teacher"
            element={
              <TenantSubdomainRouteOrCentral
                subview="teacher"
                centralElement={
                  <RequireAuth allowedRoles={['teacher', 'admin']}>
                    <TeacherDashboard />
                  </RequireAuth>
                }
              />
            }
          />
          <Route
            path="/teacher/courses"
            element={
              <RequireAuth allowedRoles={['teacher', 'admin']}>
                <MyCourses />
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/courses/new"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <CreateCourse />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/courses/new"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <CreateCourse />
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/lesson/new"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <LessonUploader />
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/lesson/:id/edit"
            element={
              <RequireAuth allowedRoles={['admin', 'teacher']}>
                <EditLesson />
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/lesson/edit/:id"
            element={
              <RequireAuth allowedRoles={['admin', 'teacher']}>
                <EditLesson />
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/attendance"
            element={
              <RequireAuth allowedRoles={['teacher', 'admin']}>
                <AttendanceTracker />
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/gradebook"
            element={
              <RequireAuth allowedRoles={['teacher', 'admin']}>
                <GradeBook />
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/students"
            element={
              <RequireAuth allowedRoles={['teacher', 'admin']}>
                <StudentProgressView />
              </RequireAuth>
            }
          />

          {/* Admin Portal Routes */}

          <Route
            path="/admin/users"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <ManageUsers />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/classes"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <ManageClasses />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/subjects"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <ManageSubjects />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/terms"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <ManageTerms />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/activations"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <ActivationManager />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/moderation"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <ContentModeration />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/announcements"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <AnnouncementsAdmin />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/intakes"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <IntakeScheduler />
              </RequireAuth>
            }
          />
        </Route>

        {/* Fallback Route: Direct school slug (e.g. /my-school) or redirect */}
        <Route path="*" element={<FallbackOrSchoolSlug />} />
      </Routes>
    </Suspense>
  )
}
