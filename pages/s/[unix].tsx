// Next/Vercel Pages route for share URLs with OG/Twitter tags
import Head from 'next/head'

export default function SharePage(): JSX.Element {
  // This file is only meant to be copied into a separate Vercel repo.
  // At runtime, Next.js will provide params; we keep a simple placeholder here.
  const unix = 0
  const title = `psychosis.lol — ${unix}`
  const desc = `A tarot clock. Second ${unix}.`
  const og = `/api/og/${unix}`
  return (
    <html>
      <Head>
        <title>{title}</title>
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        <meta property="og:image" content={og} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={desc} />
        <meta name="twitter:image" content={og} />
      </Head>
      <body>
        <script dangerouslySetInnerHTML={{__html:`location.replace('/'+${unix})`}} />
      </body>
    </html>
  )
}


