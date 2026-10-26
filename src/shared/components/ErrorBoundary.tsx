import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  label?: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.label ?? 'app'}] render failed`, error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    if (this.props.fallback) return this.props.fallback

    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">
          {this.props.label ? `${this.props.label} couldn't load` : "Something didn't load"}
        </p>
        <p className="mt-1 text-xs text-red-700">
          The rest of the dashboard is still working. Reload to try again — and
          if it keeps happening, the browser console has the details.
        </p>
        <button
          onClick={() => this.setState({ error: null })}
          className="mt-2 rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-white"
        >
          Try again
        </button>
      </div>
    )
  }
}
