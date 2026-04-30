export const HELP = `# Weather Radar

Embedded Windy.com weather map automatically centred on the active circuit location.

- **Radar overlay**: Shows precipitation (rain/snow), wind, cloud cover, or temperature — switch layers using the Windy controls inside the widget.
- **Auto-centre**: The map repositions when the active circuit changes.
- **Zoom**: Use the Windy controls inside the embedded map to zoom in or out.

Unfamiliar terms:

- *Windy*: A web-based weather visualisation tool that renders live forecast data from multiple meteorological models (ECMWF, GFS, etc.).
- *ECMWF*: European Centre for Medium-Range Weather Forecasts — one of the most accurate global forecast models, used by many F1 weather teams.

Notes: this widget requires an active internet connection to load the Windy embed. If the circuit location is not found, the map may default to a generic centre point. Weather shown is forecast data, not circuit-specific sensors — use the Weather Dashboard for official circuit readings.
`
import { useSessionStore } from '../../store/sessionStore'
import { useRefreshFade } from '../../hooks/useRefreshFade'

interface WeatherRadarProps {
  widgetId: string
}

// Circuit coordinates lookup table for major F1 circuits
const CIRCUIT_COORDS: Record<string, { lat: number; lon: number; zoom: number }> = {
  // circuit_short_name → lat/lon/zoom (zoomed out by 5)
  Monza: { lat: 45.62, lon: 9.29, zoom: 8 },
  Silverstone: { lat: 52.07, lon: -1.02, zoom: 8 },
  Spa: { lat: 50.43, lon: 5.97, zoom: 8 },
  Monaco: { lat: 43.73, lon: 7.42, zoom: 9 },
  Bahrain: { lat: 26.03, lon: 50.51, zoom: 9 },
  Jeddah: { lat: 21.63, lon: 39.10, zoom: 9 },
  'Baku City Circuit': { lat: 40.37, lon: 49.85, zoom: 9 },
  Baku: { lat: 40.37, lon: 49.85, zoom: 9 },
  Miami: { lat: 25.96, lon: -80.24, zoom: 9 },
  Imola: { lat: 44.34, lon: 11.71, zoom: 9 },
  Barcelona: { lat: 41.57, lon: 2.26, zoom: 9 },
  Montreal: { lat: 45.50, lon: -73.52, zoom: 9 },
  'Red Bull Ring': { lat: 47.22, lon: 14.76, zoom: 9 },
  Spielberg: { lat: 47.22, lon: 14.76, zoom: 9 },
  Hungaroring: { lat: 47.58, lon: 19.25, zoom: 9 },
  Zandvoort: { lat: 52.39, lon: 4.54, zoom: 9 },
  Singapore: { lat: 1.29, lon: 103.86, zoom: 10 },
  Suzuka: { lat: 34.84, lon: 136.54, zoom: 9 },
  Lusail: { lat: 25.49, lon: 51.45, zoom: 9 },
  Austin: { lat: 30.13, lon: -97.64, zoom: 8 },
  'Mexico City': { lat: 19.40, lon: -99.09, zoom: 9 },
  'São Paulo': { lat: -23.70, lon: -46.70, zoom: 9 },
  Interlagos: { lat: -23.70, lon: -46.70, zoom: 9 },
  'Las Vegas': { lat: 36.12, lon: -115.17, zoom: 9 },
  'Yas Marina': { lat: 24.47, lon: 54.60, zoom: 9 },
  'Abu Dhabi': { lat: 24.47, lon: 54.60, zoom: 9 },
  Melbourne: { lat: -37.85, lon: 144.97, zoom: 9 },
  Shanghai: { lat: 31.34, lon: 121.22, zoom: 9 },
  Sakhir: { lat: 26.03, lon: 50.51, zoom: 9 },
}
import { useState, useRef, useEffect } from 'react'

function buildWindyUrl(lat: number, lon: number, zoom: number, overlay: string): string {
  // Windy dark mode: use 'bgColor=dark' param, marker enabled
  return `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=650&height=450&zoom=${zoom}&level=surface&overlay=${overlay}&product=ecmwf&menu=&message=&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1&bgColor=dark`;
}





export function WeatherRadar({ widgetId: _ }: WeatherRadarProps) {
  const activeSession = useSessionStore((s) => s.activeSession)
  const circuitName = activeSession?.circuit_short_name ?? null
  const refreshFade = useRefreshFade([activeSession?.session_key, circuitName])
  const coords = circuitName ? CIRCUIT_COORDS[circuitName] : null

  // Overlay state
  const overlays = [
    { key: 'rain', label: 'Rain' },
    { key: 'wind', label: 'Wind' },
    { key: 'clouds', label: 'Clouds' },
    { key: 'pressure', label: 'Pressure' },
    { key: 'temp', label: 'Temp' },
  ]
  const [overlay, setOverlay] = useState('rain')

  // Auto-relocate logic
  const [autoRelocate, setAutoRelocate] = useState(true)
  const [userMoved, setUserMoved] = useState(false)
  const relocateTimeout = useRef<number | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Listen for postMessage from Windy iframe (detect user pan/zoom)
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      // Windy sends messages with type 'windy'
      if (typeof e.data === 'string' && e.data.includes('windy')) {
        setUserMoved(true)
        if (autoRelocate && relocateTimeout.current) {
          clearTimeout(relocateTimeout.current)
        }
        if (autoRelocate) {
          relocateTimeout.current = setTimeout(() => {
            setUserMoved(false)
          }, 15000) // 15s after move, recenter
        }
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [autoRelocate])

  // When userMoved becomes false, reload iframe to recenter
  useEffect(() => {
    if (!userMoved && iframeRef.current && autoRelocate) {
      iframeRef.current.src = coords ? buildWindyUrl(coords.lat, coords.lon, coords.zoom, overlay) : ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userMoved])

  // If overlay or coords change, always recenter
  useEffect(() => {
    if (iframeRef.current && coords) {
      iframeRef.current.src = buildWindyUrl(coords.lat, coords.lon, coords.zoom, overlay)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay, coords?.lat, coords?.lon, coords?.zoom])

  return (
    <div
      className={refreshFade ? 'data-refresh-fade' : undefined}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
      {/* Header + Overlay Switcher */}
      <div style={{
        padding: '4px 8px',
        borderBottom: '0.5px solid var(--border)',
        background: 'var(--bg4)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 7,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--muted2)',
          flex: 1,
        }}>
          Weather Radar
        </span>
        {circuitName && (
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: 7,
            letterSpacing: '0.08em',
            color: 'var(--muted)',
          }}>
            {circuitName}
          </span>
        )}
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 6,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: coords ? 'var(--green)' : 'var(--muted2)',
          padding: '1px 5px',
          border: `0.5px solid ${coords ? 'rgba(29,184,106,0.4)' : 'var(--border)'}`,
          borderRadius: 2,
        }}>
          {coords ? 'GEO-LOCKED' : 'NO COORDS'}
        </span>
        {/* Overlay Switcher */}
        {coords && (
          <span style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
            {overlays.map((o) => (
              <button
                key={o.key}
                onClick={() => setOverlay(o.key)}
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 7,
                  padding: '2px 7px',
                  borderRadius: 2,
                  border: overlay === o.key ? '1.5px solid var(--teal)' : '0.5px solid var(--border)',
                  background: overlay === o.key ? 'rgba(34,197,94,0.12)' : 'var(--bg3)',
                  color: overlay === o.key ? 'var(--teal)' : 'var(--muted2)',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.12s',
                }}
              >
                {o.label}
              </button>
            ))}
          </span>
        )}
      </div>

      {/* Radar content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {coords ? (
          <iframe
            ref={iframeRef}
            src={buildWindyUrl(coords.lat, coords.lon, coords.zoom, overlay)}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              filter: 'brightness(0.95)',
              background: '#0D1116',
            }}
            title={`Weather radar — ${circuitName}`}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        ) : (
          <div>
            {/* Auto-relocate toggle */}
            <div style={{ padding: '4px 8px', fontSize: 10, color: 'var(--muted2)', fontFamily: 'var(--mono)' }}>
              <label style={{ cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={autoRelocate}
                  onChange={e => setAutoRelocate(e.target.checked)}
                  style={{ marginRight: 6 }}
                />
                Auto-recenter after move
              </label>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 10,
              padding: 16,
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: 'var(--cond)',
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--muted)',
              }}>
                Weather Radar
              </div>
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: 8,
              color: 'var(--muted2)',
              letterSpacing: '0.06em',
              lineHeight: 1.8,
              maxWidth: 200,
            }}>
              {circuitName
                ? `Circuit coordinates not found for "${circuitName}". Windy embed will load once coordinates are available.`
                : 'No active session. Select a session to load circuit weather.'
              }
            </div>
            {circuitName && (
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: 7,
                color: 'var(--muted2)',
                padding: '4px 8px',
                border: '0.5px solid var(--border)',
                borderRadius: 3,
                background: 'var(--bg4)',
              }}>
                Windy embed — circuit coordinates loaded from session
              </div>
            )}
          </div>
          </div>
        )}
      </div>
   </div>)}