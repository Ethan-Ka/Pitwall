import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import 'react-grid-layout/css/styles.css'
import './index.css'
import App from './App.tsx'
import { AppErrorBoundary } from './components/ErrorBoundary/AppErrorBoundary'
import { initLogBridge } from './store/logStore'
import { initElectronDebugBridge } from './lib/electronDebugBridge'

initLogBridge()
initElectronDebugBridge()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
