import { createClient } from '@supabase/supabase-js'

// Read with exact paths so Vite's define() inlines values at build time
const env = (import.meta as any).env || {}
const supabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || env.REACT_APP_SUPABASE_URL) as string
const supabaseAnonKey = (env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.REACT_APP_SUPABASE_ANON_KEY) as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})


