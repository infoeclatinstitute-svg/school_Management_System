import { useState, useEffect } from 'react'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div
      style={{
        background: '#f59e0b',
        color: '#78350f',
        padding: '0.4rem 1rem',
        fontSize: '0.85rem',
        fontWeight: 600,
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        borderBottom: '1px solid #d97706',
        zIndex: 9999,
      }}
    >
      <span>⚠️</span>
      <span>You are currently working offline. Global College Portal is operating from local cached storage.</span>
    </div>
  )
}
