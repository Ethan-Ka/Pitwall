import { Component, type ReactNode, type ErrorInfo } from 'react'
import { useLogStore } from '../../store/logStore'

interface Props {
  widgetId: string
  widgetType: string
  children: ReactNode
}

interface State {
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    console.error(`[${this.props.widgetType}] ${error.message}`, errorInfo.componentStack)
    useLogStore.getState().addEntry('ERR', `Widget crash [${this.props.widgetType}]: ${error.message}`, this.props.widgetId)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg4)',
        }}>
          <button
            onClick={() => this.setState({ error: null, errorInfo: null })}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 8,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              background: 'var(--bg3)',
              border: '0.5px solid var(--border)',
              borderRadius: 2,
              padding: '5px 12px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
