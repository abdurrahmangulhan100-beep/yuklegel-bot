import { createClient } from '@supabase/supabase-[#122c4a]js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tlnkimstwtqkbhsgdoql.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsbmtpbXN0d3Rxa2Joc2dkb3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODI2OTYsImV4cCI6MjEwMjQ1ODY5Nn0.s5RYB22tlCxkUKuI3-cg7NETISlyL7zdEqjUAYyHq0s'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
})
