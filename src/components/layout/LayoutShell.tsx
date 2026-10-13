import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { OfflineIndicator } from '@/components/shared/OfflineIndicator'
import { DesktopCommandPalette } from '@/components/shared/DesktopCommandPalette'
import { ClassBellReminderModal } from '@/components/shared/ClassBellReminderModal'
import { ConcurrentSessionAlertModal } from '@/components/shared/ConcurrentSessionAlertModal'
import { MobileAppBottomNav } from './MobileAppBottomNav'
import { INSTITUTION_CONFIG } from '@/config/institution'
import { isNativeApp, isElectronApp } from '@/utils/platform'

export function LayoutShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isNative = isNativeApp()
  const isDesktop = isElectronApp()
  const location = useLocation()
  const isVideoEnvironment = location.pathname.includes('/lesson/') || location.pathname.startsWith('/student/lesson')

  useEffect(() => {
    const handleToggleSidebar = () => {
      setSidebarOpen((prev) => !prev)
    }
    const handleCloseSidebar = () => {
      setSidebarOpen(false)
    }
    window.addEventListener('gc-toggle-sidebar', handleToggleSidebar)
    window.addEventListener('gc-close-sidebar', handleCloseSidebar)
    return () => {
      window.removeEventListener('gc-toggle-sidebar', handleToggleSidebar)
      window.removeEventListener('gc-close-sidebar', handleCloseSidebar)
    }
  }, [])

  return (
    <div className="app-layout">
      <OfflineIndicator />
      <DesktopCommandPalette />
      <ClassBellReminderModal />
      <ConcurrentSessionAlertModal />
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {!isVideoEnvironment && <MobileAppBottomNav />}
      <main
        className="main-content"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'calc(100vh - 64px)',
          paddingBottom: isVideoEnvironment ? '0' : (isDesktop ? '1rem' : isNative ? '4.5rem' : '5rem'),
          
        }}
      >
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>

        {/* Public Website Marketing Footer (Never shown inside Native Apps) */}
        {!isNative && (
          <footer
            className="no-print"
            style={{
              marginTop: '3rem',
              padding: '1.25rem 2rem',
              background: 'var(--color-bg-secondary)',
              borderTop: '1px solid var(--color-border)',
              fontSize: '0.8rem',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div>
                <strong style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
                  {INSTITUTION_CONFIG.name}
                </strong>{' '}
                • {INSTITUTION_CONFIG.tagline}
              </div>
            </div>
            <div>
              <span>© {new Date().getFullYear()} {INSTITUTION_CONFIG.name}. All rights reserved.</span>
            </div>
          </footer>
        )}
      </main>
    </div>
  )
}
