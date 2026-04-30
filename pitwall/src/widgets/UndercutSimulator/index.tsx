export const HELP = `# Undercut Simulator

Interactive calculator to estimate whether an undercut strategy will succeed, given current race conditions.

**Inputs:**

- **Gap to car ahead** (seconds): Current on-track gap to the car you want to undercut.
- **Pit loss time** (seconds): Estimated time lost by pitting compared to a lap at race pace (typically 18–25 s).
- **Pace delta** (seconds/lap): How much faster the undercutting car is expected to lap once on fresh tyres.
- **Laps remaining**: How many race laps are left to recover the undercut.

**Outputs:**

- **Laps to undercut**: Laps needed to recover the pit-stop time loss via fresher-tyre pace advantage.
- **Break-even lap**: Laps needed to also cover the initial gap to the car ahead.
- **Net gain**: Time gained per lap × laps to undercut, minus pit loss — the cushion built by the move.
- **Verdict**: WORKS (achievable in remaining laps), NOT ENOUGH LAPS, or UNLIKELY (net gain ≤ gap).

Unfamiliar terms:

- *Undercut*: Pitting before a rival. The fresh tyres allow faster laps immediately after the stop, potentially emerging ahead if the gap closes before the rival pits.
- *Pit loss*: Extra time spent in the pit lane compared to a normal lap — includes entry, service, and exit time.
- *Pace delta*: The lap-time advantage per lap from running on newer tyres relative to the car being chased.

Notes: the simulator uses a simplified linear model — actual race outcomes depend on traffic, safety cars, DRS, and the rival team's response. Use as a directional guide, not a definitive call.
`
import { useState, useMemo } from 'react'

// ─── Sub-component: numeric input row ────────────────────────────────────────

interface NumInputProps {
  label: string
  value: number
  onChange: (v: number) => void
  unit?: string
  min?: number
  max?: number
  step?: number
}

function NumInput({ label, value, onChange, unit, min, max, step }: NumInputProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 0',
      borderBottom: '0.5px solid var(--border)',
    }}>
      <span style={{
        flex: 1,
        fontFamily: 'var(--mono)',
        fontSize: 8,
        color: 'var(--muted2)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        {label}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: 60,
          background: 'var(--bg4)',
          color: 'var(--white)',
          border: '0.5px solid var(--border)',
          borderRadius: 3,
          padding: '3px 6px',
          fontFamily: 'var(--mono)',
          fontSize: 10,
          textAlign: 'right',
        }}
      />
      {unit && (
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 8,
          color: 'var(--muted2)',
          width: 28,
        }}>
          {unit}
        </span>
      )}
    </div>
  )
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

interface SimResult {
  lapsToUndercut: number       // laps needed to recover pit loss
  breakEvenLap: number         // laps needed to also cover the initial gap
  netGainAfterUndercut: number // time gained after lapsToUndercut laps (vs gap)
  verdict: 'WORKS' | 'NOT_ENOUGH_LAPS' | 'UNLIKELY'
}

function simulate(
  gap: number,
  pitLoss: number,
  paceDelta: number,
  lapsRemaining: number,
): SimResult {
  // Guard against zero/negative pace delta to avoid division by zero
  const safeDelta = Math.max(paceDelta, 0.01)

  const lapsToUndercut = Math.ceil(pitLoss / safeDelta)
  const breakEvenLap   = Math.ceil((pitLoss + gap) / safeDelta)
  const netGainAfterUndercut = safeDelta * lapsToUndercut - pitLoss

  let verdict: SimResult['verdict']
  if (lapsToUndercut > lapsRemaining) {
    verdict = 'NOT_ENOUGH_LAPS'
  } else if (netGainAfterUndercut > gap) {
    verdict = 'WORKS'
  } else {
    verdict = 'UNLIKELY'
  }

  return { lapsToUndercut, breakEvenLap, netGainAfterUndercut, verdict }
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export function UndercutSimulator() {

  // Default values
  const DEFAULT_GAP = 2.5;
  const DEFAULT_PIT_LOSS = 22;
  const DEFAULT_PACE_DELTA = 0.4;
  const DEFAULT_LAPS_REMAINING = 20;

  const [gap, setGap]                 = useState(DEFAULT_GAP)
  const [pitLoss, setPitLoss]         = useState(DEFAULT_PIT_LOSS)
  const [paceDelta, setPaceDelta]     = useState(DEFAULT_PACE_DELTA)
  const [lapsRemaining, setLapsRemaining] = useState(DEFAULT_LAPS_REMAINING)
  // Reset handler
  function handleReset() {
    setGap(DEFAULT_GAP);
    setPitLoss(DEFAULT_PIT_LOSS);
    setPaceDelta(DEFAULT_PACE_DELTA);
    setLapsRemaining(DEFAULT_LAPS_REMAINING);
  }

  const result = useMemo(
    () => simulate(gap, pitLoss, paceDelta, lapsRemaining),
    [gap, pitLoss, paceDelta, lapsRemaining],
  )

  // Verdict styling
  const verdictColor =
    result.verdict === 'WORKS'           ? 'var(--green)'  :
    result.verdict === 'NOT_ENOUGH_LAPS' ? 'var(--amber)'  :
    'var(--red)'

  const verdictLabel =
    result.verdict === 'WORKS'           ? 'UNDERCUT WORKS'    :
    result.verdict === 'NOT_ENOUGH_LAPS' ? 'NOT ENOUGH LAPS'  :
    'UNDERCUT UNLIKELY'

  const verdictMark = result.verdict === 'WORKS' ? '✓' : '✗'

  const netGainSign = result.netGainAfterUndercut >= 0 ? '+' : ''

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: 10,
      gap: 0,
      overflow: 'hidden',
    }}>


      {/* ── Header and Reset ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 8,
        borderBottom: '0.5px solid var(--border2)',
        marginBottom: 6,
      }}>
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: '0.14em',
          color: 'var(--white)',
          fontWeight: 600,
          textTransform: 'uppercase',
        }}>
          Undercut Simulator
        </span>
        <button
          onClick={handleReset}
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 8,
            color: 'var(--white)',
            background: 'var(--bg4)',
            border: '0.5px solid var(--border)',
            borderRadius: 3,
            padding: '2px 10px',
            cursor: 'pointer',
            marginLeft: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            transition: 'background 0.15s',
          }}
          title="Reset all fields to default values"
        >
          Reset
        </button>
      </div>

      {/* ── Inputs ── */}
      <NumInput
        label="Current Gap"
        value={gap}
        onChange={setGap}
        unit="s"
        min={0}
        max={60}
        step={0.1}
      />
      <NumInput
        label="Pit Lane Loss"
        value={pitLoss}
        onChange={setPitLoss}
        unit="s"
        min={10}
        max={40}
        step={0.5}
      />
      <NumInput
        label="Pace Delta"
        value={paceDelta}
        onChange={setPaceDelta}
        unit="s/lap"
        min={0.1}
        max={5}
        step={0.1}
      />
      <NumInput
        label="Laps Remaining"
        value={lapsRemaining}
        onChange={setLapsRemaining}
        unit="laps"
        min={1}
        max={70}
        step={1}
      />

      {/* ── Divider ── */}
      <div style={{ height: 1, background: 'var(--border2)', margin: '8px 0' }} />

      {/* ── Result section ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '8px 0',
      }}>
        {/* Section label */}
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 7,
          color: 'var(--muted2)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          Result
        </span>

        {/* Verdict */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--cond)',
          fontSize: 18,
          fontWeight: 700,
          color: verdictColor,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          <span>{verdictLabel}</span>
          <span style={{ fontSize: 16 }}>{verdictMark}</span>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex',
          gap: 16,
          marginTop: 4,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--white)',
            }}>
              {result.breakEvenLap}
            </span>
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: 7,
              color: 'var(--muted2)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              Break-even
            </span>
          </div>

          <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch' }} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: 14,
              fontWeight: 600,
              color: result.netGainAfterUndercut > 0 ? 'var(--green)' : 'var(--red)',
            }}>
              {netGainSign}{result.netGainAfterUndercut.toFixed(1)}s
            </span>
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: 7,
              color: 'var(--muted2)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              Gap recovered
            </span>
          </div>

          <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch' }} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--white)',
            }}>
              {result.lapsToUndercut}
            </span>
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: 7,
              color: 'var(--muted2)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              Laps to gain
            </span>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: 'var(--border2)', margin: '6px 0' }} />

      {/* ── Overcut note ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        paddingTop: 2,
      }}>
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 7,
          color: 'var(--muted2)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          Overcut Scenario
        </span>
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 8,
          color: 'var(--muted)',
          lineHeight: 1.5,
        }}>
          Stay out, then pit later to cover a slower opponent.
        </span>
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 8,
          color: 'var(--muted)',
          lineHeight: 1.5,
        }}>
          Overcut viable if opponent degrades &gt;{paceDelta.toFixed(1)}s/lap faster
        </span>
      </div>
    </div>
  )
}
