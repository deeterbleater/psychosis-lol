// Serverless function: /api/og/[unix] → returns SVG and sets cache headers
import type { VercelRequest, VercelResponse } from '@vercel/node'

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const unix = Number(req.query.unix || '0')
  if (!Number.isFinite(unix) || unix <= 0) {
    res.status(400).send('invalid unix')
    return
  }
  const digits = toBase(unix, 156)
  const utc = new Date(unix * 1000).toUTCString()
  const w = 1200, h = 630
  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0b1020"/><stop offset="100%" stop-color="#111828"/></linearGradient></defs>
  <rect x="0" y="0" width="${w}" height="${h}" fill="url(#g)"/>
  <text x="60" y="100" fill="#ffffff" font-family="monospace" font-size="54" letter-spacing="4">psychosis.lol</text>
  <text x="60" y="170" fill="#cbd5e1" font-family="monospace" font-size="28">${utc}</text>
  <text x="60" y="250" fill="#e2e8f0" font-family="monospace" font-size="36">${String(unix)}</text>
  <text x="60" y="340" fill="#94a3b8" font-family="monospace" font-size="28">base‑156: ${digits.join('·')}</text>
  <text x="60" y="590" fill="#94a3b8" font-family="monospace" font-size="24">“a tarot clock in base‑156”</text>
</svg>`
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=31536000, immutable')
  res.status(200).send(svg)
}


