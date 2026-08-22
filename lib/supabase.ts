import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqeaakpyqesxewvkxptf.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWFha3B5cWVzeGV3dmt4cHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDMwMzMsImV4cCI6MjEwMjcxOTAzM30.QUi3fYgcJUVzMyldFUtjXLRTa6v2XshO-756aMfruxI'

const globalForSupabase = globalThis as unknown as { supabase: ReturnType<typeof createClient> }

export const supabase =
  globalForSupabase.supabase ||
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,       // Oturumu localStorage'da saklar
      autoRefreshToken: true,     // Token süresi bitince otomatik yeniler
      detectSessionInUrl: true
    }
  })

if (process.env.NODE_ENV !== 'production') globalForSupabase.supabase = supabase

export default supabase
