export type CardRow = {
  index: string
  name: string
  description: string
  eso_link: string
  img: string
  reverse: string
}

export async function loadDeck(): Promise<CardRow[]> {
  const res = await fetch('/card_data.csv')
  const text = await res.text()
  return parseCsv(text)
}

function parseCsv(text: string): CardRow[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.length > 0)
  const header = lines.shift()
  if (!header) return []
  const cols = header.split(',')
  return lines.map((line) => {
    const vals = splitCsv(line)
    const row: Record<string, string> = {}
    cols.forEach((c, i) => (row[c] = vals[i] ?? ''))
    return row as CardRow
  })
}

function splitCsv(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}


