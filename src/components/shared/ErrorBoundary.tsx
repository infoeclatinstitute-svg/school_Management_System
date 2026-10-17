import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorId: string
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorId: '',
  }

  public static getDerivedStateFromError(error: Error): State {
    const errorId = `ERR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    return { hasError: true, error, errorId }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[${this.state.errorId}] Uncaught error in React lifecycle:`, error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#0f172a',
          color: '#f8fafc'
        }}>
          <h1 style={{ fontSize: '1.8rem', color: '#60a5fa', marginBottom: '0.5rem' }}>Global College Portal</h1>
          <p style={{ color: '#94a3b8', maxWidth: '420px', marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
            A temporary display error occurred. Please click below to refresh or restore your session.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <button
              type="button"
              onClick={async () => {
                try {
                  if ('caches' in window) {
                    const keys = await caches.keys()
                    await Promise.all(keys.map((k) => caches.delete(k)))
                  }
                } catch {}
                sessionStorage.clear()
                window.location.href = window.location.pathname + '?_t=' + Date.now()
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.92rem',
                cursor: 'pointer'
              }}
            >
              🔄 Refresh Application
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const keysToRemove: string[] = []
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i)
                    if (key && (key.startsWith('gc_') || key.startsWith('gc-'))) {
                      keysToRemove.push(key)
                    }
                  }
                  keysToRemove.forEach((k) => localStorage.removeItem(k))
                  sessionStorage.clear()
                  if ('caches' in window) {
                    const keys = await caches.keys()
                    await Promise.all(keys.map((k) => caches.delete(k)))
                  }
                } catch {}
                window.location.href = '/login?_t=' + Date.now()
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#047857',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.92rem',
                cursor: 'pointer'
              }}
            >
              🧹 Reset Cache & Login
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  if ('caches' in window) {
                    const keys = await caches.keys()
                    await Promise.all(keys.map((k) => caches.delete(k)))
                  }
                } catch {}
                sessionStorage.clear()
                window.location.href = '/?_t=' + Date.now()
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#334155',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.92rem',
                cursor: 'pointer'
              }}
            >
              🏠 Return Home
            </button>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
            Incident Reference: <code style={{ color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>{this.state.errorId || 'ERR-RECOVER'}</code>
          </div>

          {import.meta.env.DEV && this.state.error && (
            <details style={{ marginTop: '1.5rem', maxWidth: '560px', width: '100%', textAlign: 'left', background: '#1e293b', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.78rem', color: '#cbd5e1' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#f87171' }}>
                [Dev Only] Diagnostic Details
              </summary>
              <pre style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#94a3b8', fontSize: '0.72rem' }}>
                {this.state.error.stack || this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
