import { Component, type ErrorInfo, type ReactNode } from 'react'
import ErrorState from './ErrorState'

interface Props {
  children: ReactNode
  /** Custom fallback; receives a reset callback. */
  fallback?: (reset: () => void) => ReactNode
  /** When this changes, a caught error is cleared (children are not remounted otherwise). */
  resetKey?: unknown
}

interface State {
  error: Error | null
}

/**
 * Catches render errors in a subtree so one broken widget or page doesn't
 * blank the whole app. Pass `resetKey` (e.g. the pathname) to clear the error on navigation.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.reset()
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error caught by ErrorBoundary:', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children
    if (this.props.fallback) return this.props.fallback(this.reset)
    return (
      <ErrorState
        title="This page ran into a problem"
        description="Something unexpected happened while showing this page. Try again, or go back and retry in a moment."
        onRetry={this.reset}
      />
    )
  }
}
