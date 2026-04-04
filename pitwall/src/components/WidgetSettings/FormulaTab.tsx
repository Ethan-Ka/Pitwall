interface FormulaTabProps {
  formula: string
  onChange: (formula: string) => void
  defaultFormula: string
}

export function FormulaTab({ formula, onChange, defaultFormula }: FormulaTabProps) {
  const isModified = formula !== defaultFormula

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
      <div>
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 8,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--muted2)',
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>Formula editor</span>
          {isModified && (
            <span style={{ color: 'var(--amber)' }}>Modified</span>
          )}
        </div>
        <textarea
          value={formula}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          style={{
            width: '100%',
            minHeight: 140,
            background: 'var(--bg)',
            border: '0.5px solid var(--border2)',
            borderRadius: 3,
            padding: '10px 12px',
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--white)',
            lineHeight: 1.7,
            resize: 'vertical',
            outline: 'none',
            letterSpacing: '0.02em',
          }}
        />
      </div>

      {/* Live preview pane */}
      <div>
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 8,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--muted2)',
          marginBottom: 8,
        }}>
          Preview
        </div>
        <div style={{
          background: 'var(--bg)',
          border: '0.5px solid var(--border)',
          borderRadius: 3,
          padding: '12px',
          minHeight: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: 9,
            color: 'var(--muted2)',
            letterSpacing: '0.08em',
            textAlign: 'center',
          }}>
            Preview available for historical data
          </span>
        </div>
      </div>

      {/* Reset button */}
      <button
        onClick={() => onChange(defaultFormula)}
        disabled={!isModified}
        style={{
          alignSelf: 'flex-start',
          padding: '5px 12px',
          borderRadius: 3,
          border: '0.5px solid var(--border2)',
          background: isModified ? 'var(--bg4)' : 'transparent',
          fontFamily: 'var(--mono)',
          fontSize: 8,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: isModified ? 'var(--muted)' : 'var(--muted2)',
          cursor: isModified ? 'pointer' : 'not-allowed',
          transition: 'all 0.12s',
        }}
      >
        Reset to default
      </button>
    </div>
  )
}
