import type { ComponentType } from 'react'
import { WIDGET_MANIFEST } from './manifest'

type WidgetComponent = ComponentType<{ widgetId: string }>

const widgetComponentCache = new Map<string, WidgetComponent>()
const widgetPromiseCache = new Map<string, Promise<WidgetComponent | undefined>>()

export function resolveLazyWidget(type: string): Promise<WidgetComponent | undefined> {
  const cached = widgetComponentCache.get(type)
  if (cached) return Promise.resolve(cached)

  const pending = widgetPromiseCache.get(type)
  if (pending) return pending

  const entry = WIDGET_MANIFEST.find((e) => e.type === type)
  if (!entry) return Promise.resolve(undefined)

  const promise = Promise.resolve(entry.component)
    .then((component) => {
      widgetComponentCache.set(type, component)
      return component
    })
    .finally(() => {
      widgetPromiseCache.delete(type)
    })

  widgetPromiseCache.set(type, promise)
  return promise
}
