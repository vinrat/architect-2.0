import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { router } from './router'
import { useAppStore } from './store/useAppStore'
import './index.css'

// Apply persisted theme before first render
const savedTheme = useAppStore.getState().theme
if (savedTheme === 'light') document.documentElement.classList.add('light')

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#121a2d',
            border: '1px solid #1f2d48',
            color: '#e5e7eb',
            fontSize: '12px',
          },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
)
