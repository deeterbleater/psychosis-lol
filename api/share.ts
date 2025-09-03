import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
	const unixParam = (req.query.unix as string) || ''
	const unix = Number(unixParam)
	if (!Number.isFinite(unix) || unix <= 0) {
		res.status(400).json({ error: 'invalid_unix' })
		return
	}
	const title = `psychosis.lol — ${unix}`
	const desc = `A tarot clock. Second ${unix}.`
	const og = `/api/og/${unix}`
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
	res.status(200).send(html)
}
