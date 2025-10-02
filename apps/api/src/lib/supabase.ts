import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://fstbhakmmznfdeluyexc.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzdGJoYWttbXpuZmRlbHV5ZXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzc3OTAsImV4cCI6MjA3NDY1Mzc5MH0.R9MaYf45DejVYpUlxUARE9UO2Qj1_THASVBBhIKOL9Q'

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export default supabase