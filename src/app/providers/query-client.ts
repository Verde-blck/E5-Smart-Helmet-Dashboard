import { QueryClient } from '@tanstack/react-query'

// Exported as a standalone instance (not just inside a component) because the
// socket router and endSession() both need to reach it from outside React.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
      // An operator returning to a backgrounded tab is the other common path
      // to stale data, alongside a dropped socket.
      refetchOnWindowFocus: true,
    },
  },
})
