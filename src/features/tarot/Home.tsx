import React, { useEffect, useMemo, useRef, useState } from 'react'
import { loadAnimeModule } from '../../lib/anime/loader'
import { loadDeck, type CardRow } from './deck'
import { currentUnix, toBase } from './time'
import { imageBaseFromCard } from './images'
import { FlipImage } from './FlipImage'
import { Card, CardTitle, CardValue } from '../../components/ui/card'
import { Label } from '../../components/ui/label'
import { PixelShaderBackground } from '../../three/PixelShaderBackground'
import QRCode from 'qrcode'

type DrawCard = CardRow & { count: number; digit: number }
const INT32_ROLLOVER = 2147483647

function generateDraw(unix: number, deck: CardRow[]): DrawCard[] {
	const digits = toBase(unix, 156)
	const out: DrawCard[] = []
	let count = 0
	for (const d of digits) {
		const card = deck[d]
		if (!card) continue
		out.push({ ...card, count, digit: d })
		count += 1
	}
	return out
}

export function Home(): JSX.Element {
  const [deck, setDeck] = useState<CardRow[] | null>(null)
  const [unix, setUnix] = useState<number>(currentUnix())
  const [utc, setUtc] = useState<string>(new Date(unix * 1000).toUTCString())
  const timerRef = useRef<any>(null)
  const [isLive, setIsLive] = useState<boolean>(false)
  const [began, setBegan] = useState<boolean>(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const prevSrcBySlotRef = useRef<Record<number, string>>({})
  const [query, setQuery] = useState<string>('')
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [readingOpen, setReadingOpen] = useState<boolean>(false)
  const [readingLoading, setReadingLoading] = useState<boolean>(false)
  const [readingText, setReadingText] = useState<string>('')
  const [selectedDigits, setSelectedDigits] = useState<number[]>([])
  const [sourceMode, setSourceMode] = useState<'current' | 'rollover'>('current')

  useEffect(() => {
    loadDeck().then(setDeck)
  }, [])

  // Parse path to support /<unix>, /<parseable datetime>, /random
  function parsePathToUnix(pathname: string): number | null {
    const raw = decodeURIComponent(pathname.replace(/^\/+|\/+$/g, ''))
    if (!raw) return null
    if (raw.toLowerCase() === 'random') {
      const now = Math.floor(Date.now() / 1000)
      return Math.floor(Math.random() * now)
    }
    if (/^\d+$/.test(raw)) {
      const u = Number(raw)
      if (Number.isFinite(u) && u >= 0) return u
    }
    const parsed = Date.parse(raw.replace(/_/g, ' '))
    if (Number.isFinite(parsed)) {
      return Math.floor(parsed / 1000)
    }
    return null
  }

  // Parse /read/<ids> where ids are base-156 indices joined by '-'
  function parseReadFromPath(pathname: string): number[] | null {
    const trimmed = pathname.replace(/^\/+|\/+$/g, '')
    if (!trimmed.toLowerCase().startsWith('read/')) return null
    const rest = trimmed.slice(5)
    if (!rest) return null
    const parts = rest.split('-').map((p) => Number(p))
    if (parts.some((n) => !Number.isFinite(n) || n < 0 || n > 155)) return null
    return parts as number[]
  }

  // Basic deterministic "AI" reading using card names/descriptions
  async function generateReading(cards: { name: string; reversed: boolean; description: string }[], indices: number[]): Promise<string> {
    // Try dev endpoint first
    try {
      const path = '/read/' + indices.join('-')
      const r = await fetch(path)
      if (r.ok) {
        const data = await r.json()
        if (data?.text) return String(data.text)
      }
    } catch {}
    // Fallback local summary
    const lines = cards.map((c, i) => {
      const pos = ['Past', 'Present', 'Future', 'Theme', 'Challenge', 'Advice'][i] ?? `Card ${i + 1}`
      const title = c.reversed ? `${c.name} (Reversed)` : c.name
      const desc = c.description || '—'
      return `${pos}: ${title}\n${desc}`
    })
    return lines.join('\n\n')
  }

  async function openReadingForDigits(digits: number[]): Promise<void> {
    if (!deck || digits.length === 0) return
    setReadingOpen(true)
    setReadingLoading(true)
    try {
      const cards = digits
        .map((d) => deck[d])
        .filter((r): r is CardRow => Boolean(r))
        .map((row) => ({
          name: row.name.replace(' Reversed', ''),
          reversed: row.reverse?.toUpperCase?.() === 'TRUE' || /Reversed$/.test(row.name),
          description: row.description,
        }))
      const text = await generateReading(cards, digits)
      setReadingText(text)
    } finally {
      setReadingLoading(false)
    }
  }

  async function openReadingForCurrent(): Promise<void> {
    if (!deck) return
    // Use selection if any are chosen; otherwise fallback to last 3
    const order = new Map(draw.map((c, i) => [c.digit, i]))
    const selectedInView = selectedDigits.filter((d) => order.has(d))
    const digits = (selectedInView.length > 0
      ? [...selectedInView].sort((a, b) => (order.get(a) as number) - (order.get(b) as number))
      : draw.slice(-3).map((c) => c.digit))
    await openReadingForDigits(digits)
  }

  // Initialize Anime.js timer paused on load second
  useEffect(() => {
    let cancel = false
    ;(async () => {
      const mod = await loadAnimeModule()
      const { createTimer } = mod
      // Anchor to provided path time or current; paused until user syncs
      const path = window.location.pathname
      const fromPath = parsePathToUnix(path)
      const startSecond = fromPath ?? currentUnix()
      setUnix(startSecond)
      setUtc(new Date(startSecond * 1000).toUTCString())
      timerRef.current = createTimer({
        duration: Number.POSITIVE_INFINITY,
        autoplay: false,
        frameRate: 1,
        onUpdate: (self: any) => {
          if (cancel) return
          const now = startSecond + Math.floor(self.currentTime / 1000)
          setUnix(now)
          setUtc(new Date(now * 1000).toUTCString())
        },
        onBegin: () => { setBegan(true) },
      })
      // If path provided a fixed time, ensure paused/not live
      if (fromPath !== null) {
        try { timerRef.current.pause?.() } catch {}
        setIsLive(false)
      }
      // If /read/<ids> present, open the reading modal for those digits
      const readDigits = parseReadFromPath(path)
      if (readDigits && readDigits.length > 0) {
        void openReadingForDigits(readDigits)
      }
    })()
    return () => {
      cancel = true
      try { timerRef.current?.cancel?.() } catch {}
      timerRef.current = null
      // cleanup
    }
  }, [])

  const selectedUnix = useMemo(() => (sourceMode === 'current' ? unix : (INT32_ROLLOVER - unix)), [unix, sourceMode])
  const selectedUtc = useMemo(() => new Date(selectedUnix * 1000).toUTCString(), [selectedUnix])
  const draw = useMemo(() => (deck ? generateDraw(selectedUnix, deck) : []), [selectedUnix, deck])
  

  // Entry animation on change - disabled to allow card flips to work
  useEffect(() => {
    // No-op for now to prevent conflicts with card flip animations
    // This was causing cards to re-mount instead of flip
  }, [])

  useEffect(() => {}, [draw, deck, unix])

  // Keep selection in sync with visible draw
  useEffect(() => {
    const present = new Set(draw.map((c) => c.digit))
    setSelectedDigits((prev) => prev.filter((d) => present.has(d)))
  }, [draw])

  function toggleSelectedDigit(digit: number): void {
    setSelectedDigits((prev) => (prev.includes(digit) ? prev.filter((d) => d !== digit) : [...prev, digit]))
  }

  // Generate QR code pointing to current absolute URL for the selected second
  useEffect(() => {
    const canvas = qrCanvasRef.current
    if (!canvas) return
    const url = new URL(`/${selectedUnix}`, window.location.origin).toString()
    QRCode.toCanvas(canvas, url, { width: 96, margin: 0, color: { dark: '#ffffff', light: '#00000000' } }, (err?: unknown) => {
      if (err) {
        try { const ctx = canvas.getContext('2d'); if (ctx) { ctx.clearRect(0,0,canvas.width,canvas.height) } } catch {}
      }
    })
  }, [selectedUnix])

  // (Astrology feature paused)

  return (
    <div ref={containerRef} style={{ display: 'grid', placeItems: 'center', height: '100%', padding: '6px 16px 16px 16px' }}>
      {/* Pixelated shader background (nearest-neighbor upscaled) */}
      <PixelShaderBackground pixelSize={3} zIndex={0} />
      {/* Site name */}
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div className="bg-[var(--card)] text-[var(--card-foreground)] border-2 border-[var(--border)] rounded-[var(--radius)]" style={{ display: 'inline-block', padding: 8 }}>
          <Label style={{ fontSize: 18, color: 'var(--card-foreground)', letterSpacing: '0.08em' }}>psychosis.lol</Label>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 0, opacity: 0.95 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              if (!timerRef.current) return
              if (isLive) {
                // Pause at the current unix second
                const pausedAt = currentUnix()
                try { timerRef.current.pause?.() } catch {}
                setIsLive(false)
                setUnix(pausedAt)
                setUtc(new Date(pausedAt * 1000).toUTCString())
                return
              }
              // Sync to real time and start playing
              const real = currentUnix()
              timerRef.current.restart?.()
              const startedAt = real
              setIsLive(true)
              setBegan(false)
              timerRef.current.play?.()
              timerRef.current.onUpdate = (self: any) => {
                const now = startedAt + Math.floor(self.currentTime / 1000)
                setUnix(now)
                setUtc(new Date(now * 1000).toUTCString())
              }
              timerRef.current.onBegin = () => { setBegan(true) }
              // Reset the URL when syncing live
              try { window.history.replaceState(null, '', '/') } catch {}
            }}
            className="bg-[var(--card)] text-[var(--card-foreground)] border-2 border-[var(--border)] rounded-[var(--radius)] shadow-none px-3 py-2 font-mono text-[12px] tracking-[0.1em] uppercase cursor-pointer select-none hover:opacity-95 active:translate-y-[1px] transition-[transform,opacity]"
            aria-pressed={isLive}
          >
            {isLive ? 'Pause' : 'Sync & Play'}
          </button>

          {/* Timestamp/Datetime search */}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const parsed = parsePathToUnix('/' + query)
                if (parsed !== null) {
                  setIsLive(false)
                  setUnix(parsed)
                  setUtc(new Date(parsed * 1000).toUTCString())
                  try { window.history.replaceState(null, '', '/' + encodeURIComponent(query)) } catch {}
                }
              }
            }}
            placeholder="timestamp, datetime, or random"
            className="bg-[var(--card)] text-[var(--card-foreground)] border-2 border-[var(--border)] rounded-[var(--radius)] px-3 py-2 font-mono text-[12px] tracking-[0.05em]"
            style={{ minWidth: 260 }}
            aria-label="Timestamp or datetime"
          />
          <button
            onClick={() => {
              const parsed = parsePathToUnix('/' + query)
              if (parsed !== null) {
                setIsLive(false)
                setUnix(parsed)
                setUtc(new Date(parsed * 1000).toUTCString())
                try { window.history.replaceState(null, '', '/' + encodeURIComponent(query)) } catch {}
              }
            }}
            className="bg-[var(--card)] text-[var(--card-foreground)] border-2 border-[var(--border)] rounded-[var(--radius)] shadow-none px-3 py-2 font-mono text-[12px] tracking-[0.1em] uppercase cursor-pointer select-none hover:opacity-95 active:translate-y-[1px] transition-[transform,opacity]"
          >
            Go
          </button>

          {/* Random time button */}
          <button
            onClick={() => {
              const parsed = parsePathToUnix('/random')
              if (parsed !== null) {
                setIsLive(false)
                setUnix(parsed)
                setUtc(new Date(parsed * 1000).toUTCString())
                try { window.history.replaceState(null, '', '/random') } catch {}
              }
            }}
            className="bg-[var(--card)] text-[var(--card-foreground)] border-2 border-[var(--border)] rounded-[var(--radius)] shadow-none px-3 py-2 font-mono text-[12px] tracking-[0.1em] uppercase cursor-pointer select-none hover:opacity-95 active:translate-y-[1px] transition-[transform,opacity]"
            title="Random time"
            aria-label="Random time"
          >
            🎲
          </button>

          {/* AI reading button (sparkle emoji as placeholder) */}
          <button
            onClick={() => {
              void openReadingForCurrent()
            }}
            className="bg-[var(--card)] text-[var(--card-foreground)] border-2 border-[var(--border)] rounded-[var(--radius)] shadow-none px-3 py-2 font-mono text-[12px] tracking-[0.1em] uppercase cursor-pointer select-none hover:opacity-95 active:translate-y-[1px] transition-[transform,opacity]"
            style={{ borderColor: selectedDigits.length ? '#ffffff' : 'var(--border)', boxShadow: selectedDigits.length ? '0 0 0 2px #ffffff, 0 0 12px rgba(255,255,255,0.25) inset' : 'none' }}
            aria-haspopup="dialog"
            aria-pressed={selectedDigits.length > 0}
            title="AI Reading"
          >
            ✨
          </button>
          
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, maxWidth: 960, margin: '0 auto', alignItems: 'center' }}>
          <Card onClick={() => setSourceMode('rollover')} style={{ borderColor: sourceMode === 'rollover' ? '#ffffff' : 'var(--border)', cursor: 'pointer' }} role="button" aria-pressed={sourceMode === 'rollover'}>
            <CardTitle>seconds remaining</CardTitle>
            <CardValue>{INT32_ROLLOVER - unix}</CardValue>
          </Card>
          <Card onClick={() => setSourceMode('current')} style={{ borderColor: sourceMode === 'current' ? '#ffffff' : 'var(--border)', cursor: 'pointer' }} role="button" aria-pressed={sourceMode === 'current'}>
            <CardTitle>{isLive ? 'current time' : (unix > Math.floor(Date.now() / 1000) ? 'future time' : 'past time')}</CardTitle>
            <CardValue>{unix}</CardValue>
          </Card>
          <Card style={{ width: 'auto', display: 'inline-block' }}>
            <CardTitle>share</CardTitle>
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <canvas
                ref={qrCanvasRef}
                width={96}
                height={96}
                style={{ width: 96, height: 96, cursor: 'pointer' }}
                onClick={async () => {
                  try {
                    const r = await fetch(`/og?unix=${selectedUnix}`)
                    if (r.ok) {
                      const data = await r.json()
                      const shareUrl = new URL(`/s/${selectedUnix}`, window.location.origin).toString()
                      await navigator.clipboard.writeText(shareUrl)
                    }
                  } catch {}
                }}
                title="Click to copy link to this second"
                role="button"
                aria-label="Copy link to this second"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    void (async () => {
                      try {
                        const r = await fetch(`/og?unix=${selectedUnix}`)
                        if (r.ok) {
                          const shareUrl = new URL(`/s/${selectedUnix}`, window.location.origin).toString()
                          await navigator.clipboard.writeText(shareUrl)
                        }
                      } catch {}
                    })()
                  }
                }}
              />
            </div>
          </Card>
        </div>
        <div className="bg-[var(--card)] text-[var(--card-foreground)] border-2 border-[var(--border)] rounded-[var(--radius)]" style={{ display: 'inline-block', padding: 6, marginTop: 8, marginBottom: 4 }}>
          <Label style={{ fontSize: 14, color: 'var(--card-foreground)' }}>{selectedUtc}</Label>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, maxWidth: 1100 }}>
        {draw.slice(-7).map((card) => {
          const slot = card.count
          const baseName = card.name.replace(' Reversed', '')
          const isReversed = (card.digit % 2) === 1
          const label = isReversed ? `${baseName} Reversed` : baseName
          // Use the even-indexed partner of this digit for the image; pairs are [even=upright, odd=reversed]
          const baseIndex = Math.floor(card.digit / 2)
          const evenDigit = card.digit - (card.digit % 2)
          const imageRow = (deck && deck[evenDigit]) || card
          const src = `/card-sprites-128/${imageBaseFromCard(imageRow)}.png`
          const isSelected = selectedDigits.includes(card.digit)
          console.debug('[Home] render slot', { slot, digit: card.digit, baseIndex, evenDigit, src, label, isSelected })
          return (
            <div
              key={slot}
              className="tarot-card"
              style={{ width: 160, textAlign: 'center', cursor: 'pointer' }}
              onClick={() => toggleSelectedDigit(card.digit)}
              role="button"
              aria-pressed={isSelected}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelectedDigit(card.digit) } }}
            >
              <Card style={{ display: 'inline-block', padding: 8, background: 'var(--card)', color: 'var(--card-foreground)', borderColor: isSelected ? '#ffffff' : 'var(--border)', boxShadow: isSelected ? '0 0 0 2px #ffffff, 0 0 12px rgba(255,255,255,0.25) inset' : 'none' }}>
                <FlipImage
                  className="pixel"
                  src={src}
                  alt={label}
                  width={144}
                  height={224}
                  playing={isLive}
                  reversed={isReversed}
                  animateOnReversed={sourceMode === 'current'}
                />
              </Card>
              <div style={{ height: 56, marginTop: 6 }}>
                <div
                  className="bg-[var(--card)] text-[var(--card-foreground)] border-2 border-[var(--border)] rounded-[var(--radius)]"
                  style={{ padding: 6, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderColor: isSelected ? '#ffffff' : 'var(--border)' }}
                >
                  <Label
                    style={{
                      lineHeight: '16px',
                      color: 'var(--card-foreground)',
                      width: '100%',
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 3 as any,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {label}
                  </Label>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Reading modal */}
      {readingOpen ? (
        <div role="dialog" aria-modal="true" className="bg-[var(--card)] text-[var(--card-foreground)] border-2 border-[var(--border)] rounded-[var(--radius)]" style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(0,0,0,0.4)' }} onClick={() => setReadingOpen(false)}>
          <div className="bg-[var(--card)] text-[var(--card-foreground)] border-2 border-[var(--border)] rounded-[var(--radius)]" style={{ width: 'min(90vw, 720px)', maxHeight: '85vh', padding: 16, overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Label style={{ fontSize: 16, color: 'var(--card-foreground)' }}>AI Tarot Reading</Label>
              <button onClick={() => setReadingOpen(false)} className="bg-[var(--card)] text-[var(--card-foreground)] border-2 border-[var(--border)] rounded-[var(--radius)] px-2 py-1 font-mono text-[12px]">Close</button>
            </div>
            {readingLoading ? (
              <div style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
                <div className="crt-flicker" style={{ position: 'relative', width: 96, height: 24 }} />
                <Label style={{ marginTop: 12 }}>Summoning spirits…</Label>
              </div>
            ) : (
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: '18px', wordBreak: 'break-word' }}>{readingText}</pre>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}


