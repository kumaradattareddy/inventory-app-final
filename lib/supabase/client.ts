import { createBrowserClient } from '@supabase/ssr'

// This helper is specifically for use in Client Components ("use client")
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )