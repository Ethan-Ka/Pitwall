import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import 'react-grid-layout/css/styles.css'
import './index.css'
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

function isWidgetPopoutWindow(): boolean {
  try {
    const params = new URLSearchParams(window.location.search)
    return params.get('windowKind') === 'widget-popout'
  } catch {
    return false
  }
}

async function resolveRootComponent() {
  if (isWidgetPopoutWindow()) {
    const popoutModule = await import('./PopoutApp.tsx')
    return popoutModule.default
  }

  const appModule = await import('./App.tsx')
  return appModule.default
}

void resolveRootComponent().then((RootComponent) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <RootComponent />
        </QueryClientProvider>
      </AppErrorBoundary>
    </StrictMode>,
  )
})
