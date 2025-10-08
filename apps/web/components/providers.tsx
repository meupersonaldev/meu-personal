'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { useEffect, useState } from 'react'
import NotificationsProvider from '@/components/notifications/NotificationsProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  useEffect(() => {
    // Garantir que o body fique visível mesmo em rotas sem animação própria
    if (typeof document !== 'undefined') {
      document.body.classList.add('loaded')
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationsProvider>
        {children}
      </NotificationsProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'white',
            color: '#202020',
            border: '1px solid #D4D4D8',
          },
        }}
      />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
