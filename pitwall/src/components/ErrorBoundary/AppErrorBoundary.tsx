import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error): State { return { error } }

  render() {
    if (this.state.error) {
      return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: 480, padding: 32 }}>
            <div style={{ fontFamily: 'var(--cond)', fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
              PIT<span style={{ color: 'var(--red)' }}>W</span>ALL
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--red)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 20 }}>
              Application error
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 24 }}>
              {this.state.error.message}
            </div>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload() }}
              style={{ background: 'var(--red)', border: 'none', borderRadius: 3, padding: '10px 24px', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff', cursor: 'pointer' }}
            >
              Reload app
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
