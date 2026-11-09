import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { queryClient } from './query-client'
import { AppBootstrap } from './AppBootstrap'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Opts in to React Router v7 behaviour now, which also silences its warnings. */}
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppBootstrap>{children}</AppBootstrap>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
