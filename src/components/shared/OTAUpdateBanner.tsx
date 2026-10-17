import { useState, useEffect } from 'react'
import { checkForOTAUpdates } from '@/lib/otaUpdater'

export function OTAUpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    const handleUpdate = () => {
      setUpdateAvailable(true)
    }

    const handleUpdating = () => {
      setIsUpdating(true)
    }

    window.addEventListener('gc-update-available', handleUpdate)
    window.addEventListener('gc-app-updating', handleUpdating)

    return () => {
      window.removeEventListener('gc-update-available', handleUpdate)
      window.removeEventListener('gc-app-updating', handleUpdating)
    }
  }, [])

  const handleApplyUpdate = async () => {
    setIsUpdating(true)
    try {
      await checkForOTAUpdates(true)
    } catch {
      window.location.reload()
    }
  }

  if (!updateAvailable) return null

  return (
    <aside
      aria-label="App update notification"
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 999999,
        background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
        border: '1.5px solid #6366f1',
        borderRadius: '16px',
        padding: '1rem 1.25rem',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(99, 102, 241, 0.3)',
        color: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '420px',
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'rgba(99, 102, 241, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          flexShrink: 0,
        }}
      >
        🚀
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#e0e7ff' }}>
          Over-The-Air Update Available
        </div>
        <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px', lineHeight: 1.4 }}>
          A fresh build is ready. Refresh now for the latest features &amp; database improvements.
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={handleApplyUpdate}
          disabled={isUpdating}
          style={{
            background: isUpdating
              ? '#475569'
              : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: '#ffffff',
            border: 'none',
            padding: '0.45rem 0.85rem',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 800,
            cursor: isUpdating ? 'wait' : 'pointer',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
          }}
        >
          {isUpdating ? 'Updating...' : 'Update Now'}
        </button>

        <button
          type="button"
          onClick={() => setUpdateAvailable(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '1rem',
            cursor: 'pointer',
            padding: '0 4px',
          }}
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </aside>
  )
}
