# psychosis.lol — Vercel deployment scaffold

This folder contains a standalone scaffold you can copy into a new public repo for deployment on Vercel. No secrets are committed.

## What’s included
- api/read/[ids].ts — Serverless function that returns an AI tarot reading. Reads cards from public/card_data.csv. Requires ANTHROPIC_API_KEY in Vercel Project Settings → Environment Variables.
- api/og/[unix].ts — Generates an SVG Open Graph image for the given unix second.
- pages/s/[unix].tsx — Share page that provides OG/Twitter tags. In a real Next.js repo, use dynamic route params to render tags and redirect to /{unix}.
- vercel.json — Function config and sample route.

## Environment
Set in Vercel (do not commit secrets):
- ANTHROPIC_API_KEY — Your Anthropic key
- ANTHROPIC_SYSTEM_PROMPT — Optional system prompt string

## Notes
- Put public/card_data.csv in your repo so both functions can read card names/descriptions.
- The OG endpoint returns an SVG with UTC time and base‑156 digits. You can style it further or switch to PNG via Satori/Sharp.
- For /s/{unix}, in a full Next app you’ll read the dynamic param and emit OG tags on the server, then redirect the user to /{unix}.

## Local dev
- vercel dev or pnpm vercel dev
