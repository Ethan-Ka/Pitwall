import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  checkFastF1Server,
  getFastF1AuthStatus,
  signOutFastF1,
  startFastF1Auth,
} from '../api/fastf1Bridge'
import { fetchSessions, validateApiKey } from '../api/openf1'
import { useSessionStore, type DataSource } from '../store/sessionStore'

export function ApiKeyOnboarding() {
  const { setApiKey, setMode, setDataSource, setF1TVAuth, setFastF1ServerAvailable, setOnboardingComplete } =
    useSessionStore()

  // Which source tab is previewed (not yet committed to store)
  const [source, setSource] = useState<DataSource>('openf1')

  // ── OpenF1 state ──────────────────────────────────────────────────────────
  const [key, setKey] = useState('')
  const [keyStatus, setKeyStatus] = useState<
    'idle' | 'loading' | 'error_invalid' | 'error_forbidden' | 'error_rate' | 'error_network'
  >('idle')

  // ── FastF1 state ──────────────────────────────────────────────────────────
  const [bridgeReady, setBridgeReady] = useState<boolean | null>(null)
  const [f1tvStatus, setF1tvStatus] = useState<'unknown' | 'authenticated' | 'unauthenticated'>(
    'unknown'
  )
  const [f1tvEmail, setF1tvEmail] = useState<string | null>(null)
  const [authPending, setAuthPending] = useState(false)
  const [authLoginUrl, setAuthLoginUrl] = useState<string | null>(null)
  const [authInstructions, setAuthInstructions] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Check bridge + F1TV status when FastF1 tab is opened
  useEffect(() => {
    if (source !== 'fastf1') return
    let cancelled = false

    async function probe() {
      const ok = await checkFastF1Server()
      if (cancelled) return
      setBridgeReady(ok)
      setFastF1ServerAvailable(ok)
      if (ok) {
        try {
          const s = await getFastF1AuthStatus()
          if (!cancelled) {
            setF1tvStatus(s.authenticated ? 'authenticated' : 'unauthenticated')
            setF1tvEmail(s.email)
            setF1TVAuth(s.authenticated, s.email)
          }
        } catch {
          if (!cancelled) setF1tvStatus('unauthenticated')
        }
      }
    }

    probe()
    return () => { cancelled = true }
  }, [source, setFastF1ServerAvailable, setF1TVAuth])

  // Poll for F1TV auth completion after the browser flow is opened
  useEffect(() => {
    if (!authPending) return
    pollRef.current = setInterval(async () => {
      try {
        const s = await getFastF1AuthStatus()
        if (s.authenticated) {
          setF1tvStatus('authenticated')
          setF1tvEmail(s.email)
          setF1TVAuth(true, s.email)
          setAuthPending(false)
        }
      } catch {
        // bridge may have restarted; keep polling
      }
    }, 3_000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [authPending, setF1TVAuth])

  // ── Race proximity (public endpoint, no key needed) ───────────────────────
  const { data: onboardingSessions } = useQuery({
    queryKey: ['sessions-onboarding', new Date().getFullYear()],
    queryFn: () => fetchSessions({ year: new Date().getFullYear() }),
    staleTime: 5 * 60_000,
    retry: false,
  })

  const raceIsImminent = useMemo(() => {
    if (!onboardingSessions) return false
    const now = Date.now()
    const HOUR = 60 * 60 * 1000
    const next = onboardingSessions
      .filter(s => s.session_type === 'Race' && new Date(s.date_end).getTime() > now - 30 * 60_000)
      .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())[0]
    if (!next) return false
    const start = new Date(next.date_start).getTime()
    const end = new Date(next.date_end).getTime()
    const msToStart = start - now
    return (now >= start && now <= end) || msToStart <= HOUR
  }, [onboardingSessions])

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleOpenF1GetStarted() {
    if (key.trim()) {
      setKeyStatus('loading')
      const result = await validateApiKey(key.trim())
      if (result === 'valid') {
        setDataSource('openf1')
        setApiKey(key.trim()) // sets mode:'historical', onboardingComplete:true
        if (raceIsImminent) setMode('live')
      } else if (result === 'invalid') setKeyStatus('error_invalid')
      else if (result === 'forbidden') setKeyStatus('error_forbidden')
      else if (result === 'rate_limited') setKeyStatus('error_rate')
      else setKeyStatus('error_network')
    } else {
      setDataSource('openf1')
      setOnboardingComplete(true)
      setMode('historical')
    }
  }

  function handleOpenF1Historical() {
    setDataSource('openf1')
    setOnboardingComplete(true)
    setMode('historical')
  }

  async function handleOpenF1CardLive() {
    if (!key.trim()) return
    setKeyStatus('loading')
    const result = await validateApiKey(key.trim())
    if (result === 'valid') {
      setDataSource('openf1')
      setApiKey(key.trim())
      setMode('live')
    } else if (result === 'invalid') setKeyStatus('error_invalid')
    else if (result === 'forbidden') setKeyStatus('error_forbidden')
    else if (result === 'rate_limited') setKeyStatus('error_rate')
    else setKeyStatus('error_network')
  }

  async function handleF1TVSignIn() {
    try {
      const res = await startFastF1Auth()
      if (res.status === 'already_authenticated') {
        const s = await getFastF1AuthStatus()
        setF1tvStatus('authenticated')
        setF1tvEmail(s.email)
        setF1TVAuth(true, s.email)
        return
      }
      if (res.login_url) {
        setAuthLoginUrl(res.login_url)
        setAuthInstructions(res.instructions ?? null)
        window.electronAPI?.openExternal(res.login_url)
        setAuthPending(true)
      }
    } catch {
      // bridge not running — UI already shows the bridge warning
    }
  }

  async function handleF1TVSignOut() {
    await signOutFastF1().catch(() => {})
    setF1tvStatus('unauthenticated')
    setF1tvEmail(null)
    setF1TVAuth(false, null)
    setAuthPending(false)
  }

  function handleFastF1Historical() {
    setDataSource('fastf1')
    setOnboardingComplete(true)
    setMode('historical')
  }

  function handleFastF1Live() {
    setDataSource('fastf1')
    setOnboardingComplete(true)
    setMode('live')
  }

  function handleFastF1GetStarted() {
    setDataSource('fastf1')
    setOnboardingComplete(true)
    setMode(f1tvStatus === 'authenticated' && raceIsImminent ? 'live' : 'historical')
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  const monoSm: React.CSSProperties = {
    fontFamily: 'var(--mono)',
    fontSize: 9,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--muted2)',
  }

  const card: React.CSSProperties = {
    background: 'var(--bg3)',
    border: '0.5px solid var(--border)',
    borderRadius: 4,
    padding: '16px 18px',
  }

  const errorBox = (color: string, bg: string, border: string): React.CSSProperties => ({
    background: bg,
    border: `0.5px solid ${border}`,
    borderRadius: 3,
    padding: '8px 12px',
    fontSize: 11,
    color,
    marginBottom: 10,
    fontFamily: 'var(--mono)',
  })

  return (
    <div
      className="animated-fade"
      style={{
        background: 'var(--bg)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div className="animated-surface" style={{ width: 480, padding: '0 24px' }}>
        {/* Logo */}
        <div
          style={{
            fontFamily: 'var(--cond)',
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: 8,
            lineHeight: 1,
          }}
        >
          PIT<span style={{ color: 'var(--red)' }}>W</span>ALL
        </div>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            marginBottom: 32,
          }}
        >
          F1 race intelligence platform
        </div>

        {/* Source selector */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ ...monoSm, marginBottom: 8 }}>Data source</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {(['openf1', 'fastf1'] as DataSource[]).map((s) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className="interactive-button"
                style={{
                  background: source === s ? 'var(--bg4)' : 'transparent',
                  border: `0.5px solid ${source === s ? 'var(--red)' : 'var(--border)'}`,
                  borderRadius: 3,
                  padding: '9px 0',
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: source === s ? 'var(--white)' : 'var(--muted)',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                {s === 'openf1' ? 'OpenF1' : 'FastF1'}
              </button>
            ))}
          </div>
        </div>

        {/* ── OpenF1 panel ─────────────────────────────────────────────── */}
        {source === 'openf1' && (
          <>
            <div
              style={{
                fontFamily: 'var(--cond)',
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              OpenF1 API Tiers
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div className="interactive-card" style={card}>
                <div style={{ ...monoSm, marginBottom: 8 }}>Historical</div>
                <div
                  style={{
                    fontFamily: 'var(--cond)',
                    fontSize: 24,
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  Free
                </div>
                <div style={{ fontSize: 11, color: 'rgba(242,240,235,0.55)', lineHeight: 1.6, fontWeight: 300 }}>
                  2023–present · all widgets · no live updates
                </div>
              </div>
              <div
                className="interactive-card"
                style={{ ...card, border: '0.5px solid var(--border2)', borderLeft: '2px solid var(--red)' }}
              >
                <div style={{ ...monoSm, marginBottom: 8 }}>Live</div>
                <div
                  style={{
                    fontFamily: 'var(--cond)',
                    fontSize: 24,
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  €10<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)' }}>/mo</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(242,240,235,0.55)', lineHeight: 1.6, fontWeight: 300 }}>
                  ~3s real-time · team radio · all 18 endpoints
                </div>
              </div>
            </div>

            <div
              style={{
                marginBottom: 18,
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: 'var(--muted)',
                letterSpacing: '0.04em',
              }}
            >
              Need live data?{' '}
              <a
                href="https://openf1.org/subscribe"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--white)', textDecoration: 'underline', textUnderlineOffset: 2 }}
              >
                Buy an OpenF1 API key
              </a>
              .
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ ...monoSm, marginBottom: 8 }}>OpenF1 API key (optional)</div>
              <input
                type="text"
                value={key}
                onChange={(e) => { setKey(e.target.value); setKeyStatus('idle') }}
                onKeyDown={(e) => e.key === 'Enter' && handleOpenF1Validate()}
                placeholder="Paste your OpenF1 subscriber key…"
                style={{
                  width: '100%',
                  background: 'var(--bg4)',
                  border: `0.5px solid ${keyStatus.startsWith('error') ? 'var(--red)' : 'var(--border2)'}`,
                  borderRadius: 3,
                  padding: '10px 14px',
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  color: 'var(--white)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {keyStatus === 'error_invalid' && (
              <div style={errorBox('var(--red)', 'var(--red2)', 'rgba(232,19,43,0.28)')}>
                Invalid API key — HTTP 401. Check openf1.org/account.
              </div>
            )}
            {keyStatus === 'error_forbidden' && (
              <div style={errorBox('var(--red)', 'var(--red2)', 'rgba(232,19,43,0.28)')}>
                Subscription required — HTTP 403. Visit openf1.org/subscribe.
              </div>
            )}
            {keyStatus === 'error_rate' && (
              <div style={errorBox('var(--amber)', 'rgba(224,144,0,0.1)', 'rgba(224,144,0,0.3)')}>
                Rate limit hit — wait 60 seconds and try again.
              </div>
            )}
            {keyStatus === 'error_network' && (
              <div style={errorBox('var(--muted)', 'rgba(74,74,79,0.2)', 'var(--border2)')}>
                Network error — check your connection, then try again.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <button
                onClick={handleOpenF1CardLive}
                disabled={!key.trim() || keyStatus === 'loading'}
                className="interactive-button"
                style={{
                  background: 'transparent',
                  border: `0.5px solid ${!!key.trim() && keyStatus !== 'loading' ? 'rgba(232,19,43,0.5)' : 'var(--border)'}`,
                  borderRadius: 3,
                  padding: '12px 14px',
                  textAlign: 'left',
                  cursor: !!key.trim() && keyStatus !== 'loading' ? 'pointer' : 'not-allowed',
                  opacity: !!key.trim() && keyStatus !== 'loading' ? 1 : 0.45,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--white)' }}>
                    {keyStatus === 'loading' ? 'Validating…' : 'With live access'}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', lineHeight: 1.6 }}>
                  Unlocks real-time data during active race sessions
                </div>
              </button>

              <button
                onClick={handleOpenF1Historical}
                className="interactive-button"
                style={{
                  background: 'transparent',
                  border: '0.5px solid var(--border)',
                  borderRadius: 3,
                  padding: '12px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5 }}>
                  Historical only
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted2)', lineHeight: 1.6 }}>
                  Browse all sessions from 2023–present
                </div>
              </button>
            </div>

            <button
              onClick={handleOpenF1GetStarted}
              disabled={keyStatus === 'loading'}
              className="interactive-button"
              style={{
                width: '100%',
                background: 'var(--red)',
                border: 'none',
                borderRadius: 3,
                padding: '11px',
                fontFamily: 'var(--mono)',
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--white)',
                cursor: keyStatus === 'loading' ? 'not-allowed' : 'pointer',
                marginBottom: 10,
                transition: 'background 0.15s',
              }}
            >
              {keyStatus === 'loading' ? 'Validating…' : 'Get started'}
            </button>

            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted2)', letterSpacing: '0.04em' }}>
              Live mode can be toggled anytime from the toolbar
            </div>
          </>
        )}

        {/* ── FastF1 panel ─────────────────────────────────────────────── */}
        {source === 'fastf1' && (
          <>
            <div
              style={{
                fontFamily: 'var(--cond)',
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              FastF1 Data Source
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div className="interactive-card" style={card}>
                <div style={{ ...monoSm, marginBottom: 8 }}>Historical</div>
                <div
                  style={{
                    fontFamily: 'var(--cond)',
                    fontSize: 24,
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  Free
                </div>
                <div style={{ fontSize: 11, color: 'rgba(242,240,235,0.55)', lineHeight: 1.6, fontWeight: 300 }}>
                  2018–present · richer telemetry · lap-aligned car data
                </div>
              </div>
              <div
                className="interactive-card"
                style={{ ...card, border: '0.5px solid var(--border2)', borderLeft: '2px solid var(--red)' }}
              >
                <div style={{ ...monoSm, marginBottom: 8 }}>Live</div>
                <div
                  style={{
                    fontFamily: 'var(--cond)',
                    fontSize: 18,
                    fontWeight: 700,
                    marginBottom: 6,
                    lineHeight: 1.2,
                  }}
                >
                  F1TV Sub
                </div>
                <div style={{ fontSize: 11, color: 'rgba(242,240,235,0.55)', lineHeight: 1.6, fontWeight: 300 }}>
                  Direct SignalR feed · no rate limits · lower latency
                </div>
              </div>
            </div>

            {/* Bridge status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
                padding: '8px 12px',
                background: 'var(--bg3)',
                border: `0.5px solid ${bridgeReady === false ? 'rgba(232,19,43,0.3)' : bridgeReady === true ? 'rgba(0,200,100,0.25)' : 'var(--border)'}`,
                borderRadius: 3,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background:
                    bridgeReady === null
                      ? 'var(--muted2)'
                      : bridgeReady
                      ? '#00c864'
                      : 'var(--red)',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
                {bridgeReady === null
                  ? 'Checking Python bridge…'
                  : bridgeReady
                  ? 'Python bridge running'
                  : 'Python bridge not found — run npm run fastf1:install then restart'}
              </span>
            </div>

            {/* F1TV auth section */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...monoSm, marginBottom: 8 }}>F1TV authentication (optional, for live timing)</div>

              {f1tvStatus === 'authenticated' ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'rgba(0,200,100,0.08)',
                    border: '0.5px solid rgba(0,200,100,0.25)',
                    borderRadius: 3,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#00c864', fontSize: 12 }}>✓</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--white)' }}>
                      {f1tvEmail ? `Signed in as ${f1tvEmail}` : 'F1TV connected'}
                    </span>
                  </div>
                  <button
                    onClick={handleF1TVSignOut}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontFamily: 'var(--mono)',
                      fontSize: 9,
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      textDecoration: 'underline',
                      textUnderlineOffset: 2,
                      padding: 0,
                    }}
                  >
                    Sign out
                  </button>
                </div>
              ) : authPending ? (
                <div
                  style={{
                    padding: '12px',
                    background: 'var(--bg3)',
                    border: '0.5px solid var(--border2)',
                    borderRadius: 3,
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 10,
                      color: 'var(--muted)',
                      marginBottom: 8,
                    }}
                  >
                    Waiting for F1TV sign-in…
                  </div>
                  {authInstructions && (
                    <div
                      style={{
                        fontSize: 10,
                        color: 'rgba(242,240,235,0.45)',
                        lineHeight: 1.7,
                        marginBottom: 8,
                        fontFamily: 'var(--mono)',
                      }}
                    >
                      {authInstructions}
                    </div>
                  )}
                  {authLoginUrl && (
                    <button
                      onClick={() => window.electronAPI?.openExternal(authLoginUrl)}
                      className="interactive-button"
                      style={{
                        background: 'none',
                        border: 'none',
                        fontFamily: 'var(--mono)',
                        fontSize: 9,
                        color: 'var(--white)',
                        cursor: 'pointer',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        textDecoration: 'underline',
                        textUnderlineOffset: 2,
                        padding: 0,
                      }}
                    >
                      Reopen browser
                    </button>
                  )}
                  <button
                    onClick={() => setAuthPending(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontFamily: 'var(--mono)',
                      fontSize: 9,
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      padding: 0,
                      marginLeft: 12,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleF1TVSignIn}
                  disabled={!bridgeReady}
                  className="interactive-button"
                  style={{
                    width: '100%',
                    background: bridgeReady ? 'var(--bg4)' : 'transparent',
                    border: '0.5px solid var(--border2)',
                    borderRadius: 3,
                    padding: '10px',
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: bridgeReady ? 'var(--white)' : 'var(--muted2)',
                    cursor: bridgeReady ? 'pointer' : 'not-allowed',
                    transition: 'background 0.12s',
                  }}
                >
                  Sign in with F1TV
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <button
                onClick={handleFastF1Live}
                disabled={f1tvStatus !== 'authenticated'}
                className="interactive-button"
                style={{
                  background: 'transparent',
                  border: `0.5px solid ${f1tvStatus === 'authenticated' ? 'rgba(232,19,43,0.5)' : 'var(--border)'}`,
                  borderRadius: 3,
                  padding: '12px 14px',
                  textAlign: 'left',
                  cursor: f1tvStatus === 'authenticated' ? 'pointer' : 'not-allowed',
                  opacity: f1tvStatus === 'authenticated' ? 1 : 0.45,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--white)' }}>
                    Live timing
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', lineHeight: 1.6 }}>
                  Direct SignalR feed during active race sessions
                </div>
              </button>

              <button
                onClick={handleFastF1Historical}
                className="interactive-button"
                style={{
                  background: 'transparent',
                  border: '0.5px solid var(--border)',
                  borderRadius: 3,
                  padding: '12px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5 }}>
                  Historical only
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted2)', lineHeight: 1.6 }}>
                  Rich telemetry data from 2018–present
                </div>
              </button>
            </div>

            <button
              onClick={handleFastF1GetStarted}
              className="interactive-button"
              style={{
                width: '100%',
                background: 'var(--red)',
                border: 'none',
                borderRadius: 3,
                padding: '11px',
                fontFamily: 'var(--mono)',
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--white)',
                cursor: 'pointer',
                marginBottom: 10,
                transition: 'background 0.15s',
              }}
            >
              Get started
            </button>

            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted2)', letterSpacing: '0.04em' }}>
              Live timing only has data when a session is active · switch modes anytime from the toolbar
            </div>
          </>
        )}

        <div
          style={{
            marginTop: 24,
            fontFamily: 'var(--mono)',
            fontSize: 9,
            color: 'var(--muted2)',
            lineHeight: 1.8,
            letterSpacing: '0.04em',
          }}
        >
          All credentials are stored locally. No Pitwall servers are involved.
        </div>
      </div>
    </div>
  )
}
