import { useEffect } from 'react'

type SpinnerSize = 'sm' | 'md' | 'lg'

export function Spinner({ size = 'md', className = '' }: { size?: SpinnerSize; className?: string }) {
  const cls = ['spinner', size !== 'md' ? `spinner-${size}` : '', className].filter(Boolean).join(' ')
  return <span className={cls} role="status" aria-label="Loading…" />
}

export function LoadingScreen({ message = 'Loading…' }: { message?: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        color: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <Spinner size="lg" />
      <p
        style={{
          margin: 0,
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#475569',
        }}
      >
        {message}
      </p>
    </div>
  )
}

export function AppOpeningSplashScreen({ onFinished }: { onFinished?: () => void }) {
  useEffect(() => {
    onFinished?.()
  }, [onFinished])

  return null
}
