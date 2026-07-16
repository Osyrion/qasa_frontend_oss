import { QueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          if (isAxiosError(error) && error.response && error.response.status < 500) {
            return false
          }
          return failureCount < 2
        },
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export const queryClient = createQueryClient()
