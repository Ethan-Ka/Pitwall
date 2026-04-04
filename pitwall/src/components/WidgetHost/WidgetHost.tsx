import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { useWidgetDriver } from '../../hooks/useWidgetDriver'
import { WidgetSettingsPanel } from '../WidgetSettings/WidgetSettingsPanel'
import { useDriverStore } from '../../store/driverStore'
import { WidgetErrorBoundary } from '../ErrorBoundary/WidgetErrorBoundary'

// Maps driverContext type to a human-readable widget type label
function widgetTypeLabel(type: string): string {
  const map: Record<string, string> = {
    LapDeltaTower: 'Lap Delta',
    RunningOrderStrip: 'Running Order',
    RaceControlFeed: 'Race Control',
    WeatherDashboard: 'Weather',
    TyreIntelligence: 'Tyre Intel',
    FullTrackMap: 'Track Map',
    WeatherRadar: 'Weather Radar',
  }
  return map[type] ?? type
}

interface WidgetHostProps {
  widgetId: string
  children: React.ReactNode
}

export function WidgetHost({ widgetId, children }: WidgetHostProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const tabs = useWorkspaceStore((s) => s.tabs)
  const removeWidget = useWorkspaceStore((s) => s.removeWidget)

  // Find this widget's config across all tabs
  let tabId: string | undefined
  let config = undefined as ReturnType<typeof useWorkspaceStore.getState>['tabs'][0]['widgets'][string] | undefined

  for (const tab of tabs) {
    if (tab.widgets[widgetId]) {
      tabId = tab.id
      config = tab.widgets[widgetId]
      break
    }
  }

  const { badge, badgeLabel, borderColor, driverNumber } = useWidgetDriver(
    config?.driverContext ?? 'FOCUS'
  )
  const getDriver = useDriverStore((s) => s.getDriver)
  const getTeamColor = useDriverStore((s) => s.getTeamColor)

  const driver = driverNumber != null ? getDriver(driverNumber) : undefined
  const teamColor = driverNumber != null ? getTeamColor(driverNumber) : undefined

  // Badge styles
  const badgeColor =
    badge === 'FOCUS' ? 'var(--green)'
    : badge === 'PINNED' ? 'var(--purple)'
    : 'var(--gold)'

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenuPos) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenuPos(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [contextMenuPos])

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    setContextMenuPos({ x: e.clientX, y: e.clientY })
  }

  function handleRemove() {
    if (tabId && config) {
      removeWidget(tabId, widgetId)
    }
    setContextMenuPos(null)
  }

  if (!config) return null

  return (
    <>
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'var(--bg3)',
          border: `0.5px dashed ${borderColor}`,
          borderRadius: 4,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
        onContextMenu={handleContextMenu}
      >
        {/* Chrome header — full header is the drag handle */}
        <div
          className="widget-drag-handle"
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingInline: 8,
            height: 22,
            borderBottom: '0.5px solid var(--border)',
            background: 'var(--bg4)',
            flexShrink: 0,
            gap: 6,
            cursor: 'grab',
          }}
        >

          {/* Driver badge — clicking opens Driver tab in settings */}
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setSettingsOpen(true) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '1px 6px',
              borderRadius: 2,
              border: `0.5px dashed ${badgeColor}55`,
              background: `${badgeColor}11`,
              cursor: 'pointer',
            }}
          >
            {teamColor && (
              <div style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: teamColor,
                flexShrink: 0,
              }} />
            )}
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: 7,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: badgeColor,
            }}>
              {driver ? driver.name_acronym : badgeLabel}
            </span>
          </div>

          {/* Widget type label */}
          <span
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 7,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--muted2)',
              flex: 1,
            }}
          >
            {widgetTypeLabel(config.type)}
          </span>

          {/* Gear icon → settings */}
          <button
            onClick={(e) => { e.stopPropagation(); setSettingsOpen(true) }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted2)',
              cursor: 'pointer',
              padding: '0 2px',
              fontSize: 10,
              lineHeight: 1,
              transition: 'color 0.12s',
            }}
            aria-label="Widget settings"
          >
            ⚙
          </button>

          {/* Close button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleRemove() }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted2)',
              cursor: 'pointer',
              padding: '0 2px',
              fontSize: 12,
              lineHeight: 1,
              transition: 'color 0.12s',
            }}
            aria-label="Remove widget"
          >
            ×
          </button>
        </div>

        {/* Widget content */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <WidgetErrorBoundary widgetId={widgetId} widgetType={config.type}>
            {children}
          </WidgetErrorBoundary>
        </div>
      </div>

      {/* Context menu — portalled to body to escape transform stacking context */}
      {contextMenuPos && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            left: contextMenuPos.x,
            top: contextMenuPos.y,
            background: 'var(--bg4)',
            border: '0.5px solid var(--border2)',
            borderRadius: 4,
            padding: '4px 0',
            zIndex: 500,
            minWidth: 160,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}
        >
          <ContextMenuItem onClick={() => { setSettingsOpen(true); setContextMenuPos(null) }}>
            Settings
          </ContextMenuItem>
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <ContextMenuItem onClick={handleRemove} danger>
            Remove widget
          </ContextMenuItem>
        </div>,
        document.body
      )}

      {/* Settings panel — portalled to body to escape transform stacking context */}
      {settingsOpen && createPortal(
        <WidgetSettingsPanel widgetId={widgetId} onClose={() => setSettingsOpen(false)} />,
        document.body
      )}
    </>
  )
}


function ContextMenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        width: '100%',
        padding: '5px 12px',
        background: hovered ? (danger ? 'rgba(232,19,43,0.1)' : 'var(--bg3)') : 'transparent',
        border: 'none',
        textAlign: 'left',
        fontFamily: 'var(--mono)',
        fontSize: 9,
        letterSpacing: '0.1em',
        color: danger ? 'var(--red)' : 'var(--white)',
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
    >
      {children}
    </button>
  )
}
