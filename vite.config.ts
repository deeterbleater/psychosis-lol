import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'

dotenv.config()

type CardRow = { index: string; name: string; description: string; eso_link: string; img: string; reverse: string }

function loadDeck(): CardRow[] {
  try {
    const csvPath = path.join(process.cwd(), 'public', 'card_data.csv')
    const text = fs.readFileSync(csvPath, 'utf8')
    const lines = text.trim().split(/\r?\n/)
    const header = lines.shift() || ''
    const cols = header.split(',')
    return lines.map((line) => {
      const vals: string[] = []
      let cur = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') { inQuotes = !inQuotes; continue }
        if (ch === ',' && !inQuotes) { vals.push(cur); cur = '' } else { cur += ch }
      }
      vals.push(cur)
      const row: Record<string, string> = {}
      cols.forEach((c, i) => { row[c] = vals[i] ?? '' })
      return row as CardRow
    })
  } catch {
    return []
  }
}

const deckCache = loadDeck()

function toBase(num: number, base: number): number[] {
  if (!Number.isFinite(num) || num < 0) return []
  const digits: number[] = []
  let n = Math.floor(num)
  do {
    digits.unshift(n % base)
    n = Math.floor(n / base)
  } while (n > 0)
  return digits
}

function ensureDir(p: string): void {
  try { fs.mkdirSync(p, { recursive: true }) } catch {}
}

function buildOgSvg(unix: number): string {
  const digits = toBase(unix, 156)
  const last = digits.slice(-3)
  const cards = last.map((d) => deckCache[d]).filter(Boolean)
  const utc = new Date(unix * 1000).toUTCString()
  const lines = cards.map((c) => (c?.name || '').replace(/\s+Reversed$/,''))
  const w = 1200, h = 630
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0b1020"/>
        <stop offset="100%" stop-color="#111828"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${w}" height="${h}" fill="url(#g)"/>
    <text x="60" y="100" fill="#ffffff" font-family="monospace" font-size="54" letter-spacing="4">psychosis.lol</text>
    <text x="60" y="170" fill="#cbd5e1" font-family="monospace" font-size="28">${utc}</text>
    <text x="60" y="250" fill="#e2e8f0" font-family="monospace" font-size="36">${String(unix)}</text>
    ${lines.map((t,i)=>`<text x="60" y="${340 + i*60}" fill="#ffffff" font-family="monospace" font-size="42">${(i+1)}. ${t}</text>`).join('')}
    <text x="60" y="590" fill="#94a3b8" font-family="monospace" font-size="24">“a tarot clock in base‑156”</text>
  </svg>`
}

export default defineConfig({
  plugins: [react(), {
    name: 'read-endpoint',
    configureServer(server) {
      server.middlewares.use('/read', async (req, res, next) => {
        try {
          const url = new URL(req.originalUrl || req.url || '', 'http://localhost')
          const ids = url.pathname.replace(/^\/read\//, '').split('-').filter(Boolean).map((n) => Number(n))
          if (!ids.length || ids.some((n) => !Number.isFinite(n) || n < 0 || n > 155)) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'invalid card ids' }))
            return
          }
          const cards = ids.map((i) => deckCache[i]).filter(Boolean)
          const promptList = cards.map((c, i) => {
            const name = c.name
            const desc = c.description
            const pos = ['Past','Present','Future','Theme','Challenge','Advice'][i] || `Card ${i+1}`
            return `${pos}: ${name} — ${desc}`
          }).join('\n')
          const tarotSpreadBlock = `<tarot_spread>\n${promptList}\n</tarot_spread>`

          const apiKey = process.env.ANTHROPIC_API_KEY || ''
          if (!apiKey) {
            // Fallback local summary if no key provided
            const text = `Tarot Summary\n\n${promptList}`
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ text }))
            return
          }

          const systemFromFile = (() => {
            try {
              const p = process.env.ANTHROPIC_SYSTEM_PROMPT_FILE || 'anthropic_system_prompt.txt'
              if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8')
            } catch {}
            return ''
          })()
          const systemPrompt = (process.env.ANTHROPIC_SYSTEM_PROMPT || systemFromFile || 'You are an insightful tarot reader. Provide a cohesive, hopeful spread interpretation.').toString()

          const body = {
            model: 'claude-3-haiku-20240307',
            max_tokens: 800,
            temperature: 0.7,
            system: systemPrompt,
            messages: [{ role: 'user', content: tarotSpreadBlock }],
          }

          const r = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(body),
          })
          if (!r.ok) {
            const text = `Tarot Summary\n\n${promptList}`
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ text }))
            return
          }
          const data = await r.json() as any
          const content = (data?.content?.[0]?.text as string) || 'No response.'
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ text: content }))
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'internal_error' }))
        }
      })
      server.middlewares.use('/api/read', async (req, res, next) => {
        try {
          const url = new URL(req.originalUrl || req.url || '', 'http://localhost')
          const ids = url.pathname.replace(/^\/api\/read\//, '').split('-').filter(Boolean).map((n) => Number(n))
          if (!ids.length || ids.some((n) => !Number.isFinite(n) || n < 0 || n > 155)) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'invalid card ids' }))
            return
          }
          const cards = ids.map((i) => deckCache[i]).filter(Boolean)
          const promptList = cards.map((c, i) => {
            const name = c.name
            const desc = c.description
            const pos = ['Past','Present','Future','Theme','Challenge','Advice'][i] || `Card ${i+1}`
            return `${pos}: ${name} — ${desc}`
          }).join('\n')
          const tarotSpreadBlock = `<tarot_spread>\n${promptList}\n</tarot_spread>`

          const apiKey = process.env.ANTHROPIC_API_KEY || ''
          if (!apiKey) {
            const text = `Tarot Summary\n\n${promptList}`
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ text }))
            return
          }

          const systemFromFile = (() => {
            try {
              const p = process.env.ANTHROPIC_SYSTEM_PROMPT_FILE || 'anthropic_system_prompt.txt'
              if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8')
            } catch {}
            return ''
          })()
          const systemPrompt = (process.env.ANTHROPIC_SYSTEM_PROMPT || systemFromFile || 'You are an insightful tarot reader. Provide a cohesive, hopeful spread interpretation.').toString()

          const body = {
            model: 'claude-3-haiku-20240307',
            max_tokens: 800,
            temperature: 0.7,
            system: systemPrompt,
            messages: [{ role: 'user', content: tarotSpreadBlock }],
          }

          const r = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(body),
          })
          if (!r.ok) {
            const text = `Tarot Summary\n\n${promptList}`
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ text }))
            return
          }
          const data = await r.json() as any
          const content = (data?.content?.[0]?.text as string) || 'No response.'
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ text: content }))
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'internal_error' }))
        }
      })
      // Generate and cache an OG image; returns { url, page }
      server.middlewares.use('/og', async (req, res, next) => {
        try {
          const url = new URL(req.originalUrl || req.url || '', 'http://localhost')
          const u = Number(url.searchParams.get('unix') || '0')
          if (!Number.isFinite(u) || u <= 0) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'invalid_unix' }))
            return
          }
          const cacheDir = path.join(process.cwd(), 'public', 'og-cache')
          ensureDir(cacheDir)
          const svg = buildOgSvg(u)
          const outPath = path.join(cacheDir, `${u}.svg`)
          fs.writeFileSync(outPath, svg, 'utf8')
          const imgUrl = `/og-cache/${u}.svg`
          const pageUrl = `/s/${u}`
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ url: imgUrl, page: pageUrl }))
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'internal_error' }))
        }
      })
      // Share page with OG tags for Twitter/Discord previews
      server.middlewares.use(async (req, res, next) => {
        const m = req.url?.match(/^\/s\/(\d{1,12})(?:\/?$)/)
        if (!m) return next()
        const unix = Number(m[1])
        const og = `/og-cache/${unix}.svg`
        const title = `psychosis.lol — ${unix}`
        const desc = `A tarot clock. Second ${unix}.`
        const html = `<!doctype html><html><head>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width,initial-scale=1"/>
          <title>${title}</title>
          <meta property="og:type" content="website"/>
          <meta property="og:title" content="${title}"/>
          <meta property="og:description" content="${desc}"/>
          <meta property="og:image" content="${og}"/>
          <meta name="twitter:card" content="summary_large_image"/>
          <meta name="twitter:title" content="${title}"/>
          <meta name="twitter:description" content="${desc}"/>
          <meta name="twitter:image" content="${og}"/>
          <link rel="canonical" href="/${unix}"/>
        </head><body>
          <script>location.replace('/${unix}')</script>
          <a href="/${unix}" style="font-family: monospace">Continue to psychosis.lol</a>
        </body></html>`
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(html)
      })
      server.middlewares.use('/astro', async (req, res, next) => {
        const url = new URL(req.originalUrl || req.url || '', 'http://localhost')
        const u = Number(url.searchParams.get('unix') || '0')
        if (!Number.isFinite(u) || u <= 0) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'invalid_unix' }))
          return
        }
        try {
          const ephPath = path.join(process.cwd(), 'public', 'sweph')
          const hasSepl = fs.existsSync(path.join(ephPath, 'sepl_18.se1'))
          const hasSemo = fs.existsSync(path.join(ephPath, 'semo_18.se1'))
          const hasLeap = fs.existsSync(path.join(ephPath, 'seleapsec.txt'))
          const mod = await (server as any).ssrLoadModule('/src/features/tarot/astro.ts')
          const data = await mod.getSunMoonForUnix(u)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ...data, _diag: { hasSepl, hasSemo, hasLeap } }))
        } catch (e: any) {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'astro_failed', message: String(e?.message || e) }))
        }
      })
    },
  }],
})
