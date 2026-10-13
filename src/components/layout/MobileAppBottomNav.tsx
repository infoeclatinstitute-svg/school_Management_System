import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthContext } from '@/features/auth/AuthContext'
import { isNativeApp } from '@/utils/platform'
import { schoolStore } from '@/lib/schoolData'
import { checkForOTAUpdates } from '@/lib/otaUpdater'
import {
  HomeIcon,
  BookOpenIcon,
  LibraryIcon,
  GraduationCapIcon,
  LockIcon,
} from '@/components/icons/AppIcons'

export function MobileAppBottomNav() {
  const isNative = isNativeApp()
  const location = useLocation()
  const { profile } = useAuthContext()

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

  if (!isNative || currentPath.includes('/lesson/') || currentPath.startsWith('/student/lesson')) {
    return null
  }

  const homeLink = '/'

  const getCoursesLink = () => {
    if (!profile) return '/login'
    if (profile.role === 'student') return '/student/courses'
    if (profile.role === 'teacher') return '/teacher/courses'
    if (profile.role === 'admin') return '/admin/classes'
    return '/student/courses'
  }

  const getPortalLink = () => {
    if (!profile) return '/login'
    if (profile.role === 'admin') return '/admin'
    if (profile.role === 'teacher') return '/teacher'
    if (profile.role === 'bursar') return '/bursar'
    if (profile.role === 'parent') return '/parent'
    return '/student'
  }

  const isHomeActive = currentPath === '/'
  const isCoursesActive =
    currentPath === '/student/courses' ||
    currentPath === '/teacher/courses' ||
    currentPath === '/admin/classes'
  const isLibraryActive = currentPath === '/library'
  const isPortalActive =
    currentPath === '/login' ||
    (!!profile && (
      currentPath.startsWith('/admin') ||
      currentPath.startsWith('/teacher') ||
      currentPath.startsWith('/student') ||
      currentPath.startsWith('/bursar') ||
      currentPath.startsWith('/parent')
    ))

  const tab = (isActive: boolean) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    flex: '1 1 0%',          // equal width, no shrink issues
    minWidth: 0,              // allow flex children to shrink
    height: '100%',
    textDecoration: 'none',
    color: isActive ? '#1d4ed8' : '#64748b',
    transition: 'color 0.18s ease',
    fontSize: '0.66rem',
    fontWeight: (isActive ? 800 : 600) as number,
    gap: '2px',
    userSelect: 'none' as const,
    padding: '0.25rem 0.2rem',
    boxSizing: 'border-box' as const,
    overflow: 'hidden',
  })

  const label = (text: string, isActive: boolean) => (
    <span style={{
      display: 'block',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: '100%',
      textAlign: 'center' as const,
      lineHeight: 1.2,
      fontWeight: isActive ? 800 : 600,
    }}>
      {text}
    </span>
  )

  const bar = (isActive: boolean) =>
    isActive ? (
      <span style={{
        display: 'block',
        width: '20px',
        height: '3px',
        borderRadius: '999px',
        background: '#1d4ed8',
        marginTop: '2px',
      }} />
    ) : <span style={{ display: 'block', height: '5px' }} />

  return (
    <nav
      className="mobile-bottom-nav"
      aria-label="Mobile Navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: '#ffffff',
        borderTop: '1.5px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'stretch',
        alignItems: 'stretch',
        zIndex: 9999,
        boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.07)',
      }}
    >
      {/* 1. Home */}
      <Link to={homeLink} onClick={() => { if (isHomeActive) window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={tab(isHomeActive)}>
        <HomeIcon size={22} color={isHomeActive ? '#1d4ed8' : '#94a3b8'} strokeWidth={isHomeActive ? 2.5 : 1.8} />
        {label('Home', isHomeActive)}
        {bar(isHomeActive)}
      </Link>

      {/* 2. Courses */}
      <Link to={getCoursesLink()} onClick={() => { if (isCoursesActive) window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={tab(isCoursesActive)}>
        <BookOpenIcon size={22} color={isCoursesActive ? '#1d4ed8' : '#94a3b8'} strokeWidth={isCoursesActive ? 2.5 : 1.8} />
        {label(profile?.role === 'student' ? 'My Units' : 'Courses', isCoursesActive)}
        {bar(isCoursesActive)}
      </Link>

      {/* 3. E-Library */}
      <Link to="/library" style={tab(isLibraryActive)}>
        <LibraryIcon size={22} color={isLibraryActive ? '#1d4ed8' : '#94a3b8'} strokeWidth={isLibraryActive ? 2.5 : 1.8} />
        {label('E-Library', isLibraryActive)}
        {bar(isLibraryActive)}
      </Link>

      {/* 4. Portal / Sign In */}
      <Link to={getPortalLink()} style={tab(isPortalActive)}>
        {profile
          ? <GraduationCapIcon size={22} color={isPortalActive ? '#1d4ed8' : '#94a3b8'} strokeWidth={isPortalActive ? 2.5 : 1.8} />
          : <LockIcon size={22} color={isPortalActive ? '#1d4ed8' : '#94a3b8'} strokeWidth={isPortalActive ? 2.5 : 1.8} />
        }
        {label(profile ? 'My Portal' : 'Sign In', isPortalActive)}
        {bar(isPortalActive)}
      </Link>
    </nav>
  )
}
