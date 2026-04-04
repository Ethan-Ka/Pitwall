// Compact layout export/import codec
// Encodes a CanvasTab into a short base64 JSON string for sharing

import type { LayoutItem } from 'react-grid-layout'
import type { CanvasTab } from '../store/workspaceStore'

export function encodeLayout(tab: Pick<CanvasTab, 'layout' | 'widgets' | 'name'>): string {
  const payload = {
    n: tab.name,
    l: tab.layout.map((item) => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    })),
    w: Object.fromEntries(
      Object.entries(tab.widgets).map(([id, cfg]) => [
        id,
        {
          t: cfg.type,
          d: cfg.driverContext,
          p: cfg.pinnedDriver,
          s: cfg.settings,
        },
      ])
    ),
  }
  return btoa(JSON.stringify(payload))
}

export function decodeLayout(code: string): { name: string; layout: LayoutItem[]; widgets: CanvasTab['widgets'] } {
  const payload = JSON.parse(atob(code))
  return {
    name: payload.n ?? 'Imported',
    layout: (payload.l ?? []).map((item: any) => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: 2,
      minH: 2,
    })),
    widgets: Object.fromEntries(
      Object.entries(payload.w ?? {}).map(([id, cfg]: [string, any]) => [
        id,
        {
          id,
          type: cfg.t,
          driverContext: cfg.d ?? 'FOCUS',
          pinnedDriver: cfg.p,
          settings: cfg.s,
        },
      ])
    ),
  }
}
