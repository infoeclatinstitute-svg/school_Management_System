import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React lifecycle:', error, errorInfo)
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
              onClick={() => {
                sessionStorage.clear()
                window.location.reload()
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
              onClick={() => {
                try {
                  localStorage.removeItem('gc_students')
                  localStorage.removeItem('gc-school-data')
                  sessionStorage.clear()
                } catch {
                  // ignore
                }
                window.location.href = '/login'
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
              onClick={() => {
                window.location.href = '/'
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

          {this.state.error && (
            <details style={{ maxWidth: '560px', width: '100%', textAlign: 'left', background: '#1e293b', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.78rem', color: '#cbd5e1' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#f87171' }}>
                Technical Details: {this.state.error.message || 'Unknown error'}
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
