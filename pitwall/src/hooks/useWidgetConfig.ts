import { useWorkspaceStore } from '../store/workspaceStore'
import type { WidgetConfig } from '../store/workspaceStore'

export function useWidgetConfig(widgetId: string): WidgetConfig | undefined {
  return useWorkspaceStore((s) => {
    for (const tab of s.tabs) {
      const config = tab.widgets[widgetId]
      if (config) return config
    }
    return undefined
  })
}
