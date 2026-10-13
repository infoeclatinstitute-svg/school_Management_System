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
          <p style={{ color: '#94a3b8', maxWidth: '400px', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            A temporary display error occurred. Please click below to refresh.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
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
                fontSize: '0.95rem',
                cursor: 'pointer'
              }}
            >
              🔄 Refresh Application
            </button>
            <button
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
                fontSize: '0.95rem',
                cursor: 'pointer'
              }}
            >
              🏠 Return Home
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
