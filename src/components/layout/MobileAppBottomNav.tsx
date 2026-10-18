import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthContext } from '@/features/auth/AuthContext'
import { isNativeApp } from '@/utils/platform'
import { schoolStore } from '@/lib/schoolData'
import { checkForOTAUpdates } from '@/lib/otaUpdater'
import {
  HomeIcon,
  BookOpenIcon,
  LibraryIcon,
  CalendarIcon,
  CreditCardIcon,
  GraduationCapIcon,
  LockIcon,
} from '@/components/icons/AppIcons'

export function MobileAppBottomNav() {
  const isNative = isNativeApp()
  const location = useLocation()
  const { profile } = useAuthContext()

  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return (
      window.innerWidth <= 768 ||
      isNativeApp() ||
      window.matchMedia('(display-mode: standalone)').matches
    )
  })

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(
        window.innerWidth <= 768 ||
        isNativeApp() ||
        window.matchMedia('(display-mode: standalone)').matches
      )
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const currentPath = location.pathname

  useEffect(() => {
    if (!isNative) return
    const runSync = async () => {
      try {
        await Promise.allSettled([
          schoolStore.syncWithCloud(true),
          checkForOTAUpdates(true),
        ])
        window.dispatchEvent(new CustomEvent('gc-data-synced'))
        window.dispatchEvent(new Event('storage'))
      } catch { /* silent */ }
    }
    runSync()
    window.addEventListener('focus', runSync)
    return () => window.removeEventListener('focus', runSync)
  }, [isNative])

  // Don't render on desktop non-native screens or inside video lesson players
  if (
    (!isMobileViewport && !isNative) ||
    currentPath.includes('/lesson/') ||
    currentPath.startsWith('/student/lesson')
  ) {
    return null
  }

  const isStudent = profile?.role === 'student'
  const isTeacher = profile?.role === 'teacher'
  const isAdmin = profile?.role === 'admin'
  const isBursar = profile?.role === 'bursar'

  const homeLink = profile ? (isStudent ? '/student' : isTeacher ? '/teacher' : isAdmin ? '/admin' : isBursar ? '/bursar' : '/') : '/'

  const getCoursesLink = () => {
    if (!profile) return '/login'
    if (isStudent) return '/student/courses'
    if (isTeacher) return '/teacher/courses'
    if (isAdmin) return '/admin/classes'
    return '/student/courses'
  }

  const getPortalLink = () => {
    if (!profile) return '/login'
    if (isAdmin) return '/admin'
    if (isTeacher) return '/teacher'
    if (isBursar) return '/bursar'
    if (profile.role === 'parent') return '/parent'
    return '/student'
  }

  const isHomeActive = currentPath === '/' || (isStudent && currentPath === '/student')
  const isCoursesActive =
    currentPath === '/student/courses' ||
    currentPath === '/teacher/courses' ||
    currentPath === '/admin/classes'
  const isTimetableActive = currentPath === '/timetable'
  const isFeesActive = currentPath === '/fees'
  const isLibraryActive = currentPath === '/library'
  const isPortalActive =
    (currentPath === '/login') ||
    (!isHomeActive &&
      !!profile &&
      (currentPath.startsWith('/admin') ||
        currentPath.startsWith('/teacher') ||
        currentPath.startsWith('/student') ||
        currentPath.startsWith('/bursar') ||
        currentPath.startsWith('/parent')))

  const tabStyle = (isActive: boolean) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    flex: '1 1 0%',
    minWidth: 0,
    height: '100%',
    textDecoration: 'none',
    color: isActive ? '#2563eb' : '#64748b',
    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
    fontSize: '0.67rem',
    fontWeight: (isActive ? 800 : 600) as number,
    gap: '2px',
    userSelect: 'none' as const,
    padding: '0.2rem 0.15rem',
    boxSizing: 'border-box' as const,
    overflow: 'hidden',
    touchAction: 'manipulation' as const,
  })

  const pillStyle = (isActive: boolean) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3px 8px',
    borderRadius: '12px',
    background: isActive ? 'rgba(37, 99, 235, 0.09)' : 'transparent',
    transition: 'background 0.18s ease',
  })

  const labelText = (text: string, isActive: boolean) => (
    <span
      style={{
        display: 'block',
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '100%',
        textAlign: 'center' as const,
        lineHeight: 1.15,
        fontWeight: isActive ? 800 : 600,
        letterSpacing: '-0.01em',
        marginTop: '1px',
      }}
    >
      {text}
    </span>
  )

  const activeDot = (isActive: boolean) =>
    isActive ? (
      <span
        style={{
          display: 'block',
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          background: '#2563eb',
          marginTop: '2px',
          boxShadow: '0 0 6px rgba(37, 99, 235, 0.6)',
        }}
      />
    ) : (
      <span style={{ display: 'block', height: '4px', marginTop: '2px' }} />
    )

  return (
    <nav
      className={`mobile-bottom-nav ${isNative ? 'force-native' : ''}`}
      aria-label="Mobile Navigation Dock"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(62px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(226, 232, 240, 0.85)',
        display: 'flex',
        justifyContent: 'stretch',
        alignItems: 'stretch',
        zIndex: 9999,
        boxShadow: '0 -4px 20px rgba(15, 23, 42, 0.05)',
      }}
    >
      {/* 1. Home / Dashboard */}
      <Link
        to={homeLink}
        onClick={() => {
          if (isHomeActive) window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        style={tabStyle(isHomeActive)}
      >
        <div style={pillStyle(isHomeActive)}>
          <HomeIcon
            size={21}
            color={isHomeActive ? '#2563eb' : '#64748b'}
            strokeWidth={isHomeActive ? 2.5 : 1.9}
          />
        </div>
        {labelText('Home', isHomeActive)}
        {activeDot(isHomeActive)}
      </Link>

      {/* 2. Courses / LMS */}
      <Link
        to={getCoursesLink()}
        onClick={() => {
          if (isCoursesActive) window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        style={tabStyle(isCoursesActive)}
      >
        <div style={pillStyle(isCoursesActive)}>
          <BookOpenIcon
            size={21}
            color={isCoursesActive ? '#2563eb' : '#64748b'}
            strokeWidth={isCoursesActive ? 2.5 : 1.9}
          />
        </div>
        {labelText(isStudent ? 'My Units' : 'Courses', isCoursesActive)}
        {activeDot(isCoursesActive)}
      </Link>

      {/* 3. Timetable Schedule (or E-Library for guest) */}
      {profile ? (
        <Link
          to="/timetable"
          onClick={() => {
            if (isTimetableActive) window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          style={tabStyle(isTimetableActive)}
        >
          <div style={pillStyle(isTimetableActive)}>
            <CalendarIcon
              size={21}
              color={isTimetableActive ? '#2563eb' : '#64748b'}
              strokeWidth={isTimetableActive ? 2.5 : 1.9}
            />
          </div>
          {labelText('Schedule', isTimetableActive)}
          {activeDot(isTimetableActive)}
        </Link>
      ) : (
        <Link
          to="/library"
          style={tabStyle(isLibraryActive)}
        >
          <div style={pillStyle(isLibraryActive)}>
            <LibraryIcon
              size={21}
              color={isLibraryActive ? '#2563eb' : '#64748b'}
              strokeWidth={isLibraryActive ? 2.5 : 1.9}
            />
          </div>
          {labelText('E-Library', isLibraryActive)}
          {activeDot(isLibraryActive)}
        </Link>
      )}

      {/* 4. Tuition / Fees (or Library for students) */}
      {isStudent ? (
        <Link
          to="/fees"
          onClick={() => {
            if (isFeesActive) window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          style={tabStyle(isFeesActive)}
        >
          <div style={pillStyle(isFeesActive)}>
            <CreditCardIcon
              size={21}
              color={isFeesActive ? '#2563eb' : '#64748b'}
              strokeWidth={isFeesActive ? 2.5 : 1.9}
            />
          </div>
          {labelText('Paybill', isFeesActive)}
          {activeDot(isFeesActive)}
        </Link>
      ) : (
        <Link
          to="/library"
          style={tabStyle(isLibraryActive)}
        >
          <div style={pillStyle(isLibraryActive)}>
            <LibraryIcon
              size={21}
              color={isLibraryActive ? '#2563eb' : '#64748b'}
              strokeWidth={isLibraryActive ? 2.5 : 1.9}
            />
          </div>
          {labelText('E-Library', isLibraryActive)}
          {activeDot(isLibraryActive)}
        </Link>
      )}

      {/* 5. Portal / My Account */}
      <Link
        to={getPortalLink()}
        style={tabStyle(isPortalActive)}
      >
        <div style={pillStyle(isPortalActive)}>
          {profile ? (
            <GraduationCapIcon
              size={21}
              color={isPortalActive ? '#2563eb' : '#64748b'}
              strokeWidth={isPortalActive ? 2.5 : 1.9}
            />
          ) : (
            <LockIcon
              size={21}
              color={isPortalActive ? '#2563eb' : '#64748b'}
              strokeWidth={isPortalActive ? 2.5 : 1.9}
            />
          )}
        </div>
        {labelText(profile ? (isStudent ? 'My Desk' : 'Portal') : 'Sign In', isPortalActive)}
        {activeDot(isPortalActive)}
      </Link>
    </nav>
  )
}
