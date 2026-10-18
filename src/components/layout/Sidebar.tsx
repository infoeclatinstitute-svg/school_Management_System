import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { RoleBadge } from '@/components/ui/Badge'
import {
  HomeIcon,
  BookOpenIcon,
  LibraryIcon,
  LockIcon,
  CreditCardIcon,
  FileTextIcon,
  MegaphoneIcon,
  UsersIcon,
  UserIcon,
  BriefcaseIcon,
  SettingsIcon,
  CalendarIcon,
  BuildingIcon,
  GraduationCapIcon,
  LogOutIcon,
  ShieldCheckIcon,
  AwardIcon,
  MessageCircleIcon,
} from '@/components/icons/AppIcons'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number | string; color?: string; className?: string }>
}

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  // Streamlined Role-Specific Navigation Definitions
  const guestNav: NavItem[] = [
    { to: '/login', label: 'Portal Login & Workstations', icon: LockIcon },
    { to: '/register-school', label: 'School & College Onboarding', icon: BuildingIcon },
    { to: '/library', label: 'E-Library & Past Papers', icon: LibraryIcon },
    { to: '/faq', label: 'Help & Support Chat', icon: MessageCircleIcon },
  ]

  const studentNav: NavItem[] = [
    { to: '/student', label: 'My Student Dashboard', icon: HomeIcon },
    { to: '/student/courses', label: 'My Enrolled Lessons & LMS', icon: BookOpenIcon },
    { to: '/library', label: 'Digital E-Library & Courseware', icon: LibraryIcon },
    { to: '/fees', label: 'My Fee Statement & Paybill', icon: CreditCardIcon },
    { to: '/exams', label: 'My Academic Transcripts', icon: FileTextIcon },
    { to: '/noticeboard', label: 'Student Noticeboard', icon: MegaphoneIcon },
    { to: '/faq', label: 'Help & Support Chat', icon: MessageCircleIcon },
  ]

  const teacherNav: NavItem[] = [
    { to: '/teacher', label: 'Faculty Dashboard', icon: UserIcon },
    { to: '/teacher/courses', label: 'My Courses & Upload Lessons', icon: BookOpenIcon },
    { to: '/teacher/attendance', label: 'Mark Class Attendance', icon: CalendarIcon },
    { to: '/teacher/gradebook', label: 'Continuous Gradebook', icon: AwardIcon },
    { to: '/library', label: 'E-Library & Courseware', icon: LibraryIcon },
    { to: '/noticeboard', label: 'College Noticeboard', icon: MegaphoneIcon },
    { to: '/faq', label: 'Help & Support Chat', icon: MessageCircleIcon },
  ]

  const parentNav: NavItem[] = [
    { to: '/parent', label: 'Ward Overview & Attendance', icon: UsersIcon },
    { to: '/exams', label: 'Ward Academic Transcript', icon: FileTextIcon },
    { to: '/fees', label: 'Fee Clearance & Payments', icon: CreditCardIcon },
    { to: '/noticeboard', label: 'College Circulars', icon: MegaphoneIcon },
    { to: '/faq', label: 'Help & Support Chat', icon: MessageCircleIcon },
  ]

  const bursarNav: NavItem[] = [
    { to: '/bursar', label: 'Bursar & Admissions Desk', icon: BriefcaseIcon },
    { to: '/students', label: 'Student Directory & Admissions', icon: GraduationCapIcon },
    { to: '/fees', label: 'Fee Invoices & Payments', icon: CreditCardIcon },
    { to: '/noticeboard', label: 'Publish Circulars & Notices', icon: MegaphoneIcon },
    { to: '/faq', label: 'Help & Support Chat', icon: MessageCircleIcon },
  ]

  const adminNav: NavItem[] = [
    { to: '/admin', label: 'Admin Dashboard', icon: SettingsIcon },
    { to: '/register-school', label: 'School & College Onboarding', icon: BuildingIcon },
    { to: '/admin/intakes', label: 'Intake Scheduler & Adverts', icon: CalendarIcon },
    { to: '/admin/classes', label: 'Academic Programs & Courses', icon: BookOpenIcon },
    { to: '/students', label: 'Student Directory & Admissions', icon: GraduationCapIcon },
    { to: '/library', label: 'E-Library & Cloud Drive', icon: LibraryIcon },
    { to: '/fees', label: 'Tuition Fees & Bursar Desk', icon: CreditCardIcon },
    { to: '/exams', label: 'Transcripts & Certificates', icon: FileTextIcon },
    { to: '/admin/users', label: 'Staff & Faculty Accounts', icon: UserIcon },
    { to: '/noticeboard', label: 'College Noticeboard', icon: MegaphoneIcon },
    { to: '/faq', label: 'Help & Support Chat', icon: MessageCircleIcon },
  ]

  const roleNavMap: Record<string, { label: string; icon: React.ComponentType<{ size?: number | string }>; links: NavItem[] }> = {
    student: { label: 'Student Portal', icon: GraduationCapIcon, links: studentNav },
    teacher: { label: 'Faculty Desk', icon: UserIcon, links: teacherNav },
    parent: { label: 'Guardian Portal', icon: UsersIcon, links: parentNav },
    bursar: { label: 'Bursar & Admissions Desk', icon: BriefcaseIcon, links: bursarNav },
    admin: { label: 'Institutional Administration', icon: ShieldCheckIcon, links: adminNav },
  }

  const currentSection = profile
    ? (roleNavMap[profile.role] || roleNavMap.student)
    : { label: 'Global College Portal', icon: BuildingIcon, links: guestNav }
  const SectionHeaderIcon = currentSection.icon

  const handleSignOut = async () => {
    onClose()
    await signOut()
    navigate('/login')
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div className="sidebar-section" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="sidebar-section-label" style={{ color: 'var(--color-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SectionHeaderIcon size={16} />
          <span>{currentSection.label}</span>
        </div>
        {currentSection.links.map((link) => {
          const IconComp = link.icon
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/' || link.to === '/student' || link.to === '/teacher' || link.to === '/parent' || link.to === '/admin' || link.to === '/bursar'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="sidebar-link-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconComp size={18} />
              </span>
              <span>{link.label}</span>
            </NavLink>
          )
        })}
      </div>

      {/* User Account or Guest Login Section */}
      <div
        style={{
          padding: '1rem 1rem calc(80px + env(safe-area-inset-bottom, 0px)) 1rem',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-bg-secondary)',
          margin: 0,
          flexShrink: 0,
        }}
      >
        {profile ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  flexShrink: 0,
                }}
              >
                {profile.full_name[0]?.toUpperCase() || 'U'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {profile.full_name}
                </div>
                <RoleBadge role={profile.role} />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="btn btn-sm btn-full"
              style={{
                background: '#dc2626',
                color: '#ffffff',
                fontWeight: 800,
                border: 'none',
                borderRadius: '8px',
                padding: '0.55rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
              }}
            >
              <LogOutIcon size={16} color="#ffffff" />
              <span>Log Out of System</span>
            </button>
          </>
        ) : (
          <NavLink
            to="/login"
            onClick={onClose}
            className="btn btn-primary btn-sm btn-full"
            style={{
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textDecoration: 'none',
            }}
          >
            <LockIcon size={16} />
            <span>Student / Staff Login</span>
          </NavLink>
        )}
      </div>
    </aside>
  )
}
