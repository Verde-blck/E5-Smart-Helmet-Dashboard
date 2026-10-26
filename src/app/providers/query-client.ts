import { QueryClient } from '@tanstack/react-query'

// Standalone so code outside React (socket router, endSession) can reach it.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
      // Returning to a backgrounded tab is a common path to stale data.
      refetchOnWindowFocus: true,
    },
  },
})
