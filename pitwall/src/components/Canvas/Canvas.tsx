import { useCallback, useRef, useState } from 'react'
import GridLayout from 'react-grid-layout'
import type { Layout } from 'react-grid-layout'
import { useWorkspaceStore } from '../../store/workspaceStore'
import type { WidgetConfig } from '../../store/workspaceStore'
import { WidgetHost } from '../WidgetHost/WidgetHost'

// Lazy widget imports
import { LapDeltaTower } from '../../widgets/LapDeltaTower'
import { RunningOrderStrip } from '../../widgets/RunningOrderStrip'
import { RaceControlFeed } from '../../widgets/RaceControlFeed'
import { WeatherDashboard } from '../../widgets/WeatherDashboard'
import { TyreIntelligence } from '../../widgets/TyreIntelligence'
import { FullTrackMap } from '../../widgets/FullTrackMap'
import { WeatherRadar } from '../../widgets/WeatherRadar'

// Widget type → component registry
const WIDGET_REGISTRY: Record<string, React.ComponentType<{ widgetId: string }>> = {
  LapDeltaTower: ({ widgetId }) => <LapDeltaTower widgetId={widgetId} />,
  RunningOrderStrip: ({ widgetId }) => <RunningOrderStrip widgetId={widgetId} />,
  RaceControlFeed: ({ widgetId }) => <RaceControlFeed widgetId={widgetId} />,
  WeatherDashboard: ({ widgetId }) => <WeatherDashboard widgetId={widgetId} />,
  TyreIntelligence: ({ widgetId }) => <TyreIntelligence widgetId={widgetId} />,
  FullTrackMap: ({ widgetId }) => <FullTrackMap widgetId={widgetId} />,
  WeatherRadar: ({ widgetId }) => <WeatherRadar widgetId={widgetId} />,
}

// Default layout dimensions per widget type
const WIDGET_DEFAULTS: Record<string, { w: number; h: number }> = {
  LapDeltaTower: { w: 12, h: 10 },
  RunningOrderStrip: { w: 24, h: 4 },
  RaceControlFeed: { w: 8, h: 8 },
  WeatherDashboard: { w: 8, h: 5 },
  TyreIntelligence: { w: 6, h: 6 },
  FullTrackMap: { w: 8, h: 8 },
  WeatherRadar: { w: 8, h: 8 },
}

const WIDGET_LABELS: Record<string, string> = {
  LapDeltaTower: 'Lap Delta Tower',
  RunningOrderStrip: 'Running Order Strip',
  RaceControlFeed: 'Race Control Feed',
  WeatherDashboard: 'Weather Dashboard',
  TyreIntelligence: 'Tyre Intelligence',
  FullTrackMap: 'Full Track Map',
  WeatherRadar: 'Weather Radar',
}

interface CanvasProps {
  tabId: string
}

export function Canvas({ tabId }: CanvasProps) {
  const tabs = useWorkspaceStore((s) => s.tabs)
  const updateLayout = useWorkspaceStore((s) => s.updateLayout)
  const addWidget = useWorkspaceStore((s) => s.addWidget)

  const tab = tabs.find((t) => t.id === tabId)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Container width for GridLayout
  const [containerWidth, setContainerWidth] = useState(1200)
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) setContainerWidth(width)
    })
    ro.observe(node)
  }, [])

  function handleLayoutChange(layout: Layout[]) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateLayout(tabId, layout)
    }, 3000)
  }

  function handleAddWidget(type: string) {
    const defaults = WIDGET_DEFAULTS[type] ?? { w: 6, h: 6 }
    const id = crypto.randomUUID()
    const widget: WidgetConfig = {
      id,
      type,
      driverContext: 'FOCUS',
    }
    const layoutItem: Layout = {
      i: id,
      x: 0,
      y: Infinity, // places at bottom
      w: defaults.w,
      h: defaults.h,
      minW: 3,
      minH: 3,
    }
    addWidget(tabId, widget, layoutItem)
    setAddMenuOpen(false)
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
        layout={tab.layout}
        cols={24}
        rowHeight={40}
        margin={[4, 4]}
        width={containerWidth}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".widget-drag-handle"
        resizeHandles={['se']}
        isResizable
        isDraggable
        compactType={null}
        preventCollision={false}
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
      <div style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 100,
      }}>
        {addMenuOpen && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            right: 0,
            marginBottom: 8,
            background: 'var(--bg4)',
            border: '0.5px solid var(--border2)',
            borderRadius: 4,
            padding: '4px 0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            minWidth: 200,
          }}>
            {Object.keys(WIDGET_LABELS).map((type) => (
              <button
                key={type}
                onClick={() => handleAddWidget(type)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '7px 14px',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  fontFamily: 'var(--mono)',
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  color: 'var(--white)',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg3)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {WIDGET_LABELS[type]}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setAddMenuOpen((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            background: addMenuOpen ? 'var(--bg4)' : 'var(--bg3)',
            border: '0.5px solid var(--border2)',
            borderRadius: 4,
            fontFamily: 'var(--mono)',
            fontSize: 9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--white)',
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            transition: 'background 0.12s',
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
          Add widget
        </button>
      </div>
    </div>
  )
}
