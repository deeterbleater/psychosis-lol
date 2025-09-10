import { createClient } from '@supabase/supabase-js'

// Hardcode values directly for Vercel deployment
// These will be replaced by Vite's define() during build
const supabaseUrl = 'https://aztukfwaezytkiugmcwc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6dHVrZndhZXp5dGtpdWdtY3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTYzOTAsImV4cCI6MjA3MzA3MjM5MH0.FXV8sjfn7FaJoRp3GuFMepvAY5taoxjZp6hOf-oHxAo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})


