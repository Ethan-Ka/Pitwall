import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { useShallow } from 'zustand/react/shallow'
import { useWidgetDriver } from '../../hooks/useWidgetDriver'
import { WidgetSettingsPanel } from '../WidgetSettings/WidgetSettingsPanel'
import { useDriverStore } from '../../store/driverStore'
import { WidgetErrorBoundary } from '../ErrorBoundary/WidgetErrorBoundary'
import { useAmbientStore } from '../../store/ambientStore'
import { FLAG_COLORS } from '../AmbientBar/flagStateMachine'
import { useRefreshFade } from '../../hooks/useRefreshFade'
import { WINDOW_CLIENT_ID } from '../../lib/windowSync'
import { useFocusEditorStore } from '../../store/focusEditorStore'

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
  const rootRef = useRef<HTMLDivElement>(null)
  const editingWidgetId = useFocusEditorStore((s) => s.editingWidgetId)
  const setEditingWidgetId = useFocusEditorStore((s) => s.setEditingWidgetId)

  const { tabId, config, layoutItem } = useWorkspaceStore(
    useShallow((s) => {
      for (const tab of s.tabs) {
        const widgetConfig = tab.widgets[widgetId]
        if (widgetConfig) {
          return {
            tabId: tab.id,
            config: widgetConfig,
            layoutItem: tab.layout.find((item) => item.i === widgetId),
          }
        }
      }

      return {
        tabId: undefined,
        config: undefined,
        layoutItem: undefined,
      }
    })
  )
  const removeWidget = useWorkspaceStore((s) => s.removeWidget)

  const { badge, badgeLabel, borderColor, driverNumber } = useWidgetDriver(
    config?.driverContext ?? 'FOCUS'
  )
  const getDriver = useDriverStore((s) => s.getDriver)
  const getTeamColor = useDriverStore((s) => s.getTeamColor)

  const driver = driverNumber != null ? getDriver(driverNumber) : undefined
  const teamColor = driverNumber != null ? getTeamColor(driverNumber) : undefined
  const flagState = useAmbientStore((s) => s.flagState)
  const ambientLayerEnabled = useAmbientStore((s) => s.ambientLayerEnabled)
  const ambientLayerIntensity = useAmbientStore((s) => s.ambientLayerIntensity)
  const isPoppedOut = Boolean(config?.settings && (config.settings as Record<string, unknown>).poppedOut)
  const focusRefresh = useRefreshFade([config?.driverContext, driverNumber])

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
    if (isPoppedOut) {
      void dockWidgetBackToWorkspace()
      setContextMenuPos(null)
      return
    }
    if (tabId && config) {
      removeWidget(tabId, widgetId)
    }
    setContextMenuPos(null)
  }

  function buildTransferPayload() {
    if (!tabId || !config) return null
    return {
      version: 1 as const,
      sourceClientId: WINDOW_CLIENT_ID,
      sourceTabId: tabId,
      widget: config,
      layout: {
        w: layoutItem?.w ?? 6,
        h: layoutItem?.h ?? 6,
        minW: layoutItem?.minW,
        minH: layoutItem?.minH,
      },
    }
  }

  function buildPopoutBounds() {
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return undefined
    const width = Math.max(280, Math.round(rect.width))
    const height = Math.max(180, Math.round(rect.height))
    return {
      x: Math.round(window.screenX + rect.left),
      y: Math.round(window.screenY + rect.top),
      width,
      height,
    }
  }

  async function popOutWidget() {
    const payload = buildTransferPayload()
    if (!payload || !tabId || !window.electronAPI) return
    try {
      await window.electronAPI.openNewWindow({
        transferWidget: payload,
        windowKind: 'widget-popout',
        popoutBounds: buildPopoutBounds(),
      })
      removeWidget(tabId, widgetId)
      setContextMenuPos(null)
    } catch {
      // no-op: keep widget in place if opening a new window fails
    }
  }

  async function dockWidgetBackToWorkspace() {
    if (!isPoppedOut || !window.electronAPI?.dockWidgetToMainWorkspace) return
    const payload = buildTransferPayload()
    if (!payload) return

    try {
      const docked = await window.electronAPI.dockWidgetToMainWorkspace(payload)
      if (!docked) return
      await window.electronAPI.closeCurrentWindow?.()
    } catch {
      // no-op: keep window open if docking fails
    }
  }

  if (!config) return null

  const isFocusEditingTarget = editingWidgetId === widgetId

  return (
    <>
      <div
        ref={rootRef}
        data-widget-id={widgetId}
        onClick={() => setEditingWidgetId(widgetId)}
        className="animated-scale-in"
        style={{
          animationDuration: '110ms',
          width: '100%',
          height: '100%',
          background: 'var(--bg3)',
          border: isFocusEditingTarget
            ? `0.75px solid ${teamColor ?? 'var(--green)'}`
            : `0.5px dashed ${borderColor}`,
          borderRadius: 4,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: isFocusEditingTarget ? '0 0 0 1px rgba(0,0,0,0.25) inset' : 'none',
        }}
        onContextMenu={handleContextMenu}
      >
        {isPoppedOut && ambientLayerEnabled && flagState !== 'NONE' && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: `radial-gradient(140% 110% at 50% -18%, ${FLAG_COLORS[flagState].glow}1a 0%, transparent 62%)`,
              opacity: Math.min(0.24, (ambientLayerIntensity / 100) * 0.26),
              transition: 'opacity 0.25s ease, background 0.25s ease',
              zIndex: 0,
            }}
          />
        )}

        {/* Chrome header — full header is the drag handle */}
        <div
          className="widget-drag-handle"
          title={isPoppedOut ? 'Drag over main workspace to auto-dock, or press close to dock back.' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingInline: 8,
            height: 22,
            borderBottom: '0.5px solid var(--border)',
            background: 'var(--bg4)',
            flexShrink: 0,
            gap: 6,
            cursor: isPoppedOut ? 'move' : 'grab',
            WebkitAppRegion: isPoppedOut ? 'drag' : 'no-drag',
            position: 'relative',
            zIndex: 1,
          }}
        >

          {/* Driver badge — clicking opens Driver tab in settings */}
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setSettingsOpen(true) }}
            className="interactive-chip"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '1px 6px',
              borderRadius: 2,
              border: `0.5px dashed ${badgeColor}55`,
              background: `${badgeColor}11`,
              cursor: 'pointer',
              WebkitAppRegion: 'no-drag',
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
            className="interactive-button"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted2)',
              cursor: 'pointer',
              padding: '0 2px',
              fontSize: 10,
              lineHeight: 1,
              transition: 'color 0.12s',
              WebkitAppRegion: 'no-drag',
            }}
            aria-label="Widget settings"
          >
            ⚙
          </button>

          {/* Pop out button */}
          {!isPoppedOut && window.electronAPI && (
            <button
              onClick={(e) => { e.stopPropagation(); void popOutWidget() }}
              onMouseDown={(e) => e.stopPropagation()}
              className="interactive-button"
              title="Pop out widget"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted2)',
                cursor: 'pointer',
                padding: '0 2px',
                fontSize: 10,
                lineHeight: 1,
                transition: 'color 0.12s',
                WebkitAppRegion: 'no-drag',
              }}
              aria-label="Pop out widget"
            >
              ↗
            </button>
          )}

          {/* Close button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleRemove() }}
            onMouseDown={(e) => e.stopPropagation()}
            className="interactive-button"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted2)',
              cursor: 'pointer',
              padding: '0 2px',
              fontSize: 12,
              lineHeight: 1,
              transition: 'color 0.12s',
              WebkitAppRegion: 'no-drag',
            }}
            aria-label={isPoppedOut ? 'Dock widget back to workspace' : 'Remove widget'}
          >
            ×
          </button>
        </div>

        {/* Widget content */}
        <div
          className={focusRefresh ? 'data-refresh-fade' : undefined}
          style={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}
        >
          <WidgetErrorBoundary widgetId={widgetId} widgetType={config.type}>
            {children}
          </WidgetErrorBoundary>
        </div>
      </div>

      {/* Context menu — portalled to body to escape transform stacking context */}
      {contextMenuPos && createPortal(
        <div
          ref={menuRef}
          className="animated-scale-in"
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
          {window.electronAPI && (
            <ContextMenuItem onClick={() => { void popOutWidget() }}>
              Pop out widget
            </ContextMenuItem>
          )}
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
