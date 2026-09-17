import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { queryClient } from './query-client'
import { AppBootstrap } from './AppBootstrap'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppBootstrap>{children}</AppBootstrap>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
