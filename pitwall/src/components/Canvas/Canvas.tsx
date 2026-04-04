import { useCallback, useEffect, useRef, useState } from 'react'
import { GridLayout, noCompactor } from 'react-grid-layout'
import type { Layout, LayoutItem } from 'react-grid-layout'
import { useWorkspaceStore } from '../../store/workspaceStore'
import type { WidgetConfig } from '../../store/workspaceStore'
import { useDraggingStore } from '../../store/draggingStore'
import { WidgetHost } from '../WidgetHost/WidgetHost'
import { WidgetPicker } from '../WidgetPicker/WidgetPicker'

// Lazy widget imports
import { LapDeltaTower } from '../../widgets/LapDeltaTower'
import { RunningOrderStrip } from '../../widgets/RunningOrderStrip'
import { RaceControlFeed } from '../../widgets/RaceControlFeed'
import { WeatherDashboard } from '../../widgets/WeatherDashboard'
import { TyreIntelligence } from '../../widgets/TyreIntelligence'
import { FullTrackMap } from '../../widgets/FullTrackMap'
import { WeatherRadar } from '../../widgets/WeatherRadar'

// Widget type → component registry
// These must be stable component references (not inline arrows) — React uses
// referential identity to decide whether to unmount/remount. Inline arrows here
// would create a new type on every Canvas render and remount every widget,
// wiping local state and re-triggering all queries.
const WIDGET_REGISTRY: Record<string, React.ComponentType<{ widgetId: string }>> = {
  LapDeltaTower,
  RunningOrderStrip,
  RaceControlFeed,
  WeatherDashboard,
  TyreIntelligence,
  FullTrackMap,
  WeatherRadar,
}

// Default layout dimensions per widget type
const WIDGET_DEFAULTS: Record<string, { w: number; h: number }> = {
  LapDeltaTower: { w: 12, h: 10 },
  RunningOrderStrip: { w: 24, h: 2 },
  RaceControlFeed: { w: 8, h: 8 },
  WeatherDashboard: { w: 8, h: 5 },
  TyreIntelligence: { w: 6, h: 6 },
  FullTrackMap: { w: 8, h: 8 },
  WeatherRadar: { w: 8, h: 8 },
}

function getMinHeightForWidget(type: string): number {
  return type === 'RunningOrderStrip' ? 1 : 3
}


interface CanvasProps {
  tabId: string
}

export function Canvas({ tabId }: CanvasProps) {
  const tabs = useWorkspaceStore((s) => s.tabs)
  const updateLayout = useWorkspaceStore((s) => s.updateLayout)
  const addWidget = useWorkspaceStore((s) => s.addWidget)
  const draggingType = useDraggingStore((s) => s.draggingType)
  const setDraggingType = useDraggingStore((s) => s.setDraggingType)

  const tab = tabs.find((t) => t.id === tabId)
  const [pickerOpen, setPickerOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Container width for GridLayout
  const [containerWidth, setContainerWidth] = useState(1200)
  const containerElRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = containerElRef.current
    if (!node) return
    const ro = new ResizeObserver((entries) => {
      const [{ contentRect } = { contentRect: undefined as DOMRectReadOnly | undefined }] = entries
      const width = contentRect?.width
      if (width) setContainerWidth(width)
    })
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    containerElRef.current = node
  }, [])

  // Keep a ref to tabId so the debounced callback always sees the current tab,
  // even if the user switches tabs within the 3s debounce window.
  const tabIdRef = useRef(tabId)
  useEffect(() => { tabIdRef.current = tabId }, [tabId])

  // Migrate old RunningOrderStrip widgets from legacy default size (h=4/minH=3)
  // to compact defaults without overriding manual custom sizing.
  useEffect(() => {
    if (!tab) return
    let changed = false
    const nextLayout = tab.layout.map((item) => {
      const widget = tab.widgets[item.i]
      if (
        widget?.type === 'RunningOrderStrip'
        && item.h === 4
        && item.minH === 3
      ) {
        changed = true
        return { ...item, h: 2, minH: 1 }
      }
      return item
    })
    if (changed) {
      updateLayout(tabId, nextLayout)
    }
  }, [tab, tabId, updateLayout])

  function handleLayoutChange(layout: Layout) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateLayout(tabIdRef.current, [...layout])
    }, 300)
  }

  function handleAddWidget(type: string) {
    const defaults = WIDGET_DEFAULTS[type] ?? { w: 6, h: 6 }
    const id = crypto.randomUUID()
    const widget: WidgetConfig = {
      id,
      type,
      driverContext: 'FOCUS',
    }
    const layoutItem: LayoutItem = {
      i: id,
      x: 0,
      y: Infinity, // places at bottom
      w: defaults.w,
      h: defaults.h,
      minW: 3,
      minH: getMinHeightForWidget(type),
    }
    addWidget(tabId, widget, layoutItem)
  }

  if (!tab) return null

  const widgetEntries = Object.values(tab.widgets)

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: 'auto',
        position: 'relative',
        background: 'var(--bg)',
        border: draggingType ? '1.5px dashed rgba(232,19,43,0.3)' : 'none',
      }}
    >
      {/* Empty state */}
      {widgetEntries.length === 0 && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: 'var(--cond)',
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--muted2)',
            letterSpacing: '0.06em',
          }}>
            Drop a widget here
          </div>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 9,
            color: 'var(--muted2)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Use the Add widget button to get started
          </div>
        </div>
      )}

      <GridLayout
        layout={tab.layout as Layout}
        gridConfig={{ cols: 24, rowHeight: 40, margin: [4, 4] as [number, number] }}
        dragConfig={{ handle: '.widget-drag-handle' }}
        resizeConfig={{ handles: ['se'] }}
        dropConfig={{
          enabled: true,
          onDragOver: () => {
            if (!draggingType) return false
            const defaults = WIDGET_DEFAULTS[draggingType] ?? { w: 6, h: 6 }
            return { w: defaults.w, h: defaults.h }
          },
        }}
        compactor={noCompactor}
        width={containerWidth}
        onLayoutChange={handleLayoutChange}
        onDrop={(_layout, item, _e) => {
          const type = draggingType
          setDraggingType(null)
          if (!type || !item) return
          const defaults = WIDGET_DEFAULTS[type] ?? { w: 6, h: 6 }
          const id = crypto.randomUUID()
          const widget: WidgetConfig = { id, type, driverContext: 'FOCUS' }
          const layoutItem: LayoutItem = {
            i: id,
            x: item.x,
            y: item.y,
            w: defaults.w,
            h: defaults.h,
            minW: 3,
            minH: getMinHeightForWidget(type),
          }
          addWidget(tabIdRef.current, widget, layoutItem)
        }}
      >
        {widgetEntries.map((widget) => {
          const WidgetComponent = WIDGET_REGISTRY[widget.type]
          return (
            <div key={widget.id}>
              <WidgetHost widgetId={widget.id}>
                {WidgetComponent
                  ? <WidgetComponent widgetId={widget.id} />
                  : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      fontFamily: 'var(--mono)',
                      fontSize: 9,
                      color: 'var(--muted2)',
                    }}>
                      Unknown widget: {widget.type}
                    </div>
                  )
                }
              </WidgetHost>
            </div>
          )
        })}
      </GridLayout>

      {/* Add widget button */}
      <button
        onClick={() => setPickerOpen(true)}
        aria-label="Add widget"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 100,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'var(--red)',
          border: 'none',
          color: '#ffffff',
          fontSize: 18,
          lineHeight: 1,
          cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 0.12s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        +
      </button>

      {/* Widget picker panel */}
      {pickerOpen && (
        <WidgetPicker onClose={() => setPickerOpen(false)} onAdd={handleAddWidget} />
      )}
    </div>
  )
}
