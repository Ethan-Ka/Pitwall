import { useEffect, useRef, useState } from 'react'
import { useLogStore, type LogLevel, type LogEntry } from '../../store/logStore'

const ALL_LEVELS: LogLevel[] = ['ERR', 'WARN', 'INFO', 'DBG']

const LEVEL_COLORS: Record<LogLevel, string> = {
  ERR: 'var(--red)',
  WARN: 'var(--amber, #f59e0b)',
  INFO: 'var(--blue, #3b82f6)',
  DBG: 'var(--muted2)',
}

interface DiagnosticLogProps {
  open: boolean
  onClose: () => void
}

function LevelBadge({ level }: { level: LogLevel }) {
  return (
    <span style={{
      fontFamily: 'var(--mono)',
      fontSize: 7,
      letterSpacing: '0.1em',
      color: LEVEL_COLORS[level],
      flexShrink: 0,
      width: 32,
      display: 'inline-block',
    }}>
      {level}
    </span>
  )
}

function LogRow({ entry }: { entry: LogEntry }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 8,
      padding: '3px 12px',
      borderBottom: '0.5px solid var(--border)',
      minHeight: 22,
    }}>
      <span style={{
        fontFamily: 'var(--mono)',
        fontSize: 9,
        color: 'var(--muted2)',
        flexShrink: 0,
        width: 90,
      }}>
        {entry.timestamp}
      </span>
      <LevelBadge level={entry.level} />
      <span style={{
        fontFamily: 'var(--mono)',
        fontSize: 9,
        color: 'var(--muted)',
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {entry.message}
      </span>
      {entry.source && (
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 8,
          color: 'var(--muted2)',
          flexShrink: 0,
          maxWidth: 100,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {entry.source}
        </span>
      )}
    </div>
  )
}

export function DiagnosticLog({ open, onClose }: DiagnosticLogProps) {
  const entries = useLogStore((s) => s.entries)
  const clear = useLogStore((s) => s.clear)
  const [activeFilters, setActiveFilters] = useState<Set<LogLevel>>(new Set(ALL_LEVELS))
  const bodyRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [entries, open])

  if (!open) return null

  function toggleFilter(level: LogLevel) {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(level)) {
        next.delete(level)
      } else {
        next.add(level)
      }
      return next
    })
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'pitwall-log.json'
    a.click()
  }

  const filtered = entries.filter((e) => activeFilters.has(e.level))

  return (
    <div style={{
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      height: 240,
      background: 'var(--bg3)',
      borderTop: '0.5px solid var(--border2)',
      zIndex: 300,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
    }}>
      {/* Header bar */}
      <div style={{
        height: 28,
        background: 'var(--bg4)',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        paddingInline: 12,
        gap: 8,
        flexShrink: 0,
      }}>
        {/* Title */}
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 8,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          flexShrink: 0,
          marginRight: 4,
        }}>
          Diagnostic Log
        </span>

        {/* Level filter buttons */}
        {ALL_LEVELS.map((level) => (
          <button
            key={level}
            onClick={() => toggleFilter(level)}
            style={{
              background: activeFilters.has(level) ? `${LEVEL_COLORS[level]}22` : 'transparent',
              border: `0.5px solid ${activeFilters.has(level) ? LEVEL_COLORS[level] : 'var(--border)'}`,
              borderRadius: 2,
              padding: '1px 6px',
              fontFamily: 'var(--mono)',
              fontSize: 7,
              letterSpacing: '0.1em',
              color: activeFilters.has(level) ? LEVEL_COLORS[level] : 'var(--muted2)',
              cursor: 'pointer',
              transition: 'all 0.1s',
            }}
          >
            {level}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Export JSON */}
        <button
          onClick={exportJson}
          style={{
            background: 'none',
            border: '0.5px solid var(--border)',
            borderRadius: 2,
            padding: '1px 8px',
            fontFamily: 'var(--mono)',
            fontSize: 7,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--muted2)',
            cursor: 'pointer',
          }}
        >
          Export JSON
        </button>

        {/* Clear */}
        <button
          onClick={clear}
          style={{
            background: 'none',
            border: '0.5px solid var(--border)',
            borderRadius: 2,
            padding: '1px 8px',
            fontFamily: 'var(--mono)',
            fontSize: 7,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--muted2)',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted2)',
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: 1,
            padding: '0 2px',
          }}
          aria-label="Close diagnostic log"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div
        ref={bodyRef}
        style={{
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {filtered.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            fontFamily: 'var(--mono)',
            fontSize: 9,
            color: 'var(--muted2)',
            letterSpacing: '0.08em',
          }}>
            No log entries
          </div>
        ) : (
          filtered.map((entry) => <LogRow key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  )
}
