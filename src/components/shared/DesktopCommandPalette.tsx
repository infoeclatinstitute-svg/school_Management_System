import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

interface PaletteItem {
  id: string
  title: string
  category: string
  icon: string
  action: () => void
}

export function DesktopCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      } else if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const items: PaletteItem[] = useMemo(() => [
    {
      id: 'sis',
      title: 'Students SIS Directory & Admissions',
      category: 'Campus Desks',
      icon: '🎓',
      action: () => {
        navigate('/students')
        setIsOpen(false)
      },
    },
    {
      id: 'bursar',
      title: 'Bursar, Admissions & Secretary Desk',
      category: 'Campus Desks',
      icon: '💼',
      action: () => {
        navigate('/bursar')
        setIsOpen(false)
      },
    },
    {
      id: 'timetable',
      title: 'Master Timetable & Lecture Planner',
      category: 'Campus Desks',
      icon: '📅',
      action: () => {
        navigate('/timetable')
        setIsOpen(false)
      },
    },
    {
      id: 'exams',
      title: 'Examinations, Transcripts & Dean’s List',
      category: 'Campus Desks',
      icon: '📜',
      action: () => {
        navigate('/exams')
        setIsOpen(false)
      },
    },
    {
      id: 'fees',
      title: 'Fees, M-Pesa Paybill & Statements',
      category: 'Campus Desks',
      icon: '💳',
      action: () => {
        navigate('/fees')
        setIsOpen(false)
      },
    },
    {
      id: 'library',
      title: 'E-Library, Modular Past Papers & Manuals',
      category: 'Campus Desks',
      icon: '📖',
      action: () => {
        navigate('/library')
        setIsOpen(false)
      },
    },
    {
      id: 'noticeboard',
      title: 'Noticeboard, Circulars & Directives',
      category: 'Campus Desks',
      icon: '📢',
      action: () => {
        navigate('/noticeboard')
        setIsOpen(false)
      },
    },
    {
      id: 'role-admin',
      title: 'Principal / Admin Login',
      category: 'Workstations',
      icon: '🛡️',
      action: () => {
        navigate('/login?role=admin')
        setIsOpen(false)
      },
    },
    {
      id: 'role-bursar',
      title: 'Bursar & Admissions Desk Login',
      category: 'Workstations',
      icon: '💼',
      action: () => {
        navigate('/login?role=bursar')
        setIsOpen(false)
      },
    },
    {
      id: 'role-teacher',
      title: 'Faculty / Teacher Login',
      category: 'Workstations',
      icon: '👩‍🏫',
      action: () => {
        navigate('/login?role=teacher')
        setIsOpen(false)
      },
    },
    {
      id: 'role-student',
      title: 'Student Portal Login',
      category: 'Workstations',
      icon: '🎓',
      action: () => {
        navigate('/login?role=student')
        setIsOpen(false)
      },
    },
    {
      id: 'role-parent',
      title: 'Parent / Sponsor Login',
      category: 'Workstations',
      icon: '👨‍👩‍👧',
      action: () => {
        navigate('/login?role=parent')
        setIsOpen(false)
      },
    },
  ], [navigate])

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase())
    )
  }, [items, search])

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 1200, alignItems: 'flex-start', paddingTop: '10vh' }}
      onClick={() => setIsOpen(false)}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: '600px',
          width: '90%',
          padding: 0,
          background: 'var(--color-surface)',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-bg-secondary)',
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>🔍</span>
          <input
            type="text"
            autoFocus
            placeholder="Type a desk, module, or role command... (or ESC to close)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '1rem',
              color: 'var(--color-text-primary)',
            }}
          />
          <span
            style={{
              fontSize: '0.7rem',
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
              fontWeight: 700,
            }}
          >
            Ctrl+K
          </span>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '0.5rem' }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
              No matching commands or campus desks found.
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--color-text-primary)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>{item.category}</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>Jump →</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
