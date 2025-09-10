import React, { useMemo, useState } from 'react'
import { Home } from './features/tarot/Home'
import { AuthProvider, useAuth } from './lib/auth'

function AuthHeader(): JSX.Element {
  const { user, loading, signInWithMagicLink, signOut } = useAuth()
  const [email, setEmail] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const disabled = useMemo(() => loading || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), [loading, email])

  return (
    <div style={{ position: 'fixed', top: 8, right: 8, zIndex: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      {user ? (
        <>
          <div className="bg-[var(--card)] text-[var(--card-foreground)] border-2 border-[var(--border)] rounded-[var(--radius)]" style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 12 }}>
            {user.email}
          </div>
          <button
            onClick={() => { void signOut() }}
            className="bg-[var(--card)] text-[var(--card-foreground)] border-2 border-[var(--border)] rounded-[var(--radius)] shadow-none px-3 py-2 font-mono text-[12px] tracking-[0.1em] uppercase cursor-pointer select-none hover:opacity-95 active:translate-y-[1px] transition-[transform,opacity]"
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="bg-[var(--card)] text-[var(--card-foreground)] border-2 border-[var(--border)] rounded-[var(--radius)] px-3 py-2 font-mono text-[12px] tracking-[0.05em]"
            style={{ minWidth: 220 }}
            aria-label="Email"
            type="email"
          />
          <button
            onClick={async () => {
              setStatus('')
              const { error } = await signInWithMagicLink(email.trim())
              setStatus(error ? `Error: ${error}` : 'Check your email for the magic link')
            }}
            disabled={disabled}
            className="bg-[var(--card)] text-[var(--card-foreground)] border-2 border-[var(--border)] rounded-[var(--radius)] shadow-none px-3 py-2 font-mono text-[12px] tracking-[0.1em] uppercase cursor-pointer select-none hover:opacity-95 active:translate-y-[1px] transition-[transform,opacity] disabled:opacity-60"
            aria-disabled={disabled}
          >
            Send link
          </button>
          {status ? (
            <div className="bg-[var(--card)] text-[var(--card-foreground)] border-2 border-[var(--border)] rounded-[var(--radius)]" style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 12 }}>
              {status}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

export function App(): JSX.Element {
  return (
    <AuthProvider>
      <AuthHeader />
      <Home />
    </AuthProvider>
  )
}


