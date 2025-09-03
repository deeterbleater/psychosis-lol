// Serverless function: /api/read/[ids]
// Safe for public repo; requires ANTHROPIC_API_KEY set in Vercel project env
import type { VercelRequest, VercelResponse } from '@vercel/node'
import fs from 'node:fs'
import path from 'node:path'

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

const deck = loadDeck()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const idsParam = (req.query.ids as string) || ''
    const ids = idsParam.split('-').filter(Boolean).map((n) => Number(n))
    if (!ids.length || ids.some((n) => !Number.isFinite(n) || n < 0 || n > 155)) {
      res.status(400).json({ error: 'invalid card ids' })
      return
    }
    const cards = ids.map((i) => deck[i]).filter(Boolean)
    const promptList = cards.map((c, i) => {
      const name = c.name
      const desc = c.description
      const pos = ['Past','Present','Future','Theme','Challenge','Advice'][i] || `Card ${i+1}`
      return `${pos}: ${name} — ${desc}`
    }).join('\n')
    const tarotSpreadBlock = `<tarot_spread>\n${promptList}\n</tarot_spread>`

    const apiKey = process.env.ANTHROPIC_API_KEY || ''
    if (!apiKey) {
      res.status(200).json({ text: `Tarot Summary\n\n${promptList}` })
      return
    }

    const system = (process.env.ANTHROPIC_SYSTEM_PROMPT || 'You are an insightful tarot reader. Provide a cohesive spread interpretation.').toString()
    const body = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 800,
      temperature: 0.7,
      system,
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
      res.status(200).json({ text: `Tarot Summary\n\n${promptList}` })
      return
    }
    const data = await r.json() as any
    const content = (data?.content?.[0]?.text as string) || 'No response.'
    res.status(200).json({ text: content })
  } catch (e) {
    res.status(500).json({ error: 'internal_error' })
  }
}


