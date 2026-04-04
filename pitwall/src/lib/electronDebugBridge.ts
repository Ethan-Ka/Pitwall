import { useAmbientStore } from '../store/ambientStore'
import { useLogStore } from '../store/logStore'
import { useSessionStore } from '../store/sessionStore'

type DebugActionMessage = {
  action: string
  payload?: unknown
}

function runDebugAction(action: string) {
  const ambient = useAmbientStore.getState()
  const session = useSessionStore.getState()
  const log = useLogStore.getState()

  switch (action) {
    case 'toast-sample':
      ambient.addToast('Developer test toast fired from Developer Menu.', 'YELLOW')
      log.addEntry('DBG', 'Triggered sample toast from Developer Menu.', 'devtools')
      break
    case 'simulate-rate-limit':
      ambient.addToast('OpenF1 rate limit reached. Requests are being throttled.', 'YELLOW')
      log.addEntry('WARN', 'Simulated OpenF1 429 rate-limit warning.', 'devtools')
      break
    case 'simulate-invalid-api-key':
      session.clearApiKey()
      session.setMode('onboarding')
      ambient.addToast('Simulated invalid API key. Returned to onboarding.', 'RED')
      log.addEntry('WARN', 'Simulated invalid API key (401) from Developer Menu.', 'devtools')
      break
    case 'set-mode-live':
      session.setMode('live')
      ambient.addToast('Mode switched to live.', 'GREEN')
      log.addEntry('DBG', 'Switched mode to live from Developer Menu.', 'devtools')
      break
    case 'set-mode-historical':
      session.setMode('historical')
      ambient.addToast('Mode switched to historical.', 'YELLOW')
      log.addEntry('DBG', 'Switched mode to historical from Developer Menu.', 'devtools')
      break
    case 'clear-diagnostic-log':
      log.clear()
      useLogStore.getState().addEntry('INFO', 'Diagnostic log cleared from Developer Menu.', 'devtools')
      break
    default:
      log.addEntry('WARN', `Unknown debug action: ${action}`, 'devtools')
  }
}

export function initElectronDebugBridge() {
  if (!window.electronAPI || typeof window.electronAPI.onDebugAction !== 'function') return

  window.electronAPI.onDebugAction((message: DebugActionMessage) => {
    if (!message || typeof message.action !== 'string') return
    runDebugAction(message.action)
  })
}
