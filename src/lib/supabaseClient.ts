import { createClient } from '@supabase/supabase-js'

// Read directly from import.meta.env so Vite statically inlines at build time
// Prefer REACT_APP_* by default, with VITE_* and NEXT_PUBLIC_* as fallbacks
const supabaseUrl = (
  import.meta.env.REACT_APP_SUPABASE_URL ??
  import.meta.env.VITE_SUPABASE_URL ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL
) as string
const supabaseAnonKey = (
  import.meta.env.REACT_APP_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})


