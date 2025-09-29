import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || 'https://eqsrfyqlrhvlftdqrdjp.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxc3JmeXFscmh2bGZ0ZHFyZGpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjcwODc1MSwiZXhwIjoyMDQ4Mjg0NzUxfQ.2c3i9Tw6D1SgDl49YjDxNyR6S4JFxuBTqNBHFhT11Qo'

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

// Usar Service Role Key para operações do servidor
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})