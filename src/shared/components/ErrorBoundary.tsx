import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Shown instead of the default panel. */
  fallback?: ReactNode
  /** Names the area, so the message says what broke. */
  label?: string
}

interface State {
  error: Error | null
}

/**
 * Stops one broken component taking the whole page with it.
 *
 * React unmounts the entire tree when a render throws, which on this
 * dashboard meant a blank screen — on a system someone is meant to be
 * watching for SOS alerts. Wrapping each region means a failure is contained
 * to that card, and the rest of the fleet view keeps working.
 *
 * Has to be a class: there is still no hook equivalent for this.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept in the console rather than swallowed — without it the cause is
    // invisible once the fallback renders.
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
