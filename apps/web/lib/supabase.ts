import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types para TypeScript
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          phone: string | null
          role: 'STUDENT' | 'TEACHER'
          credits: number
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          phone?: string | null
          role?: 'STUDENT' | 'TEACHER'
          credits?: number
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          phone?: string | null
          role?: 'STUDENT' | 'TEACHER'
          credits?: number
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      teacher_profiles: {
        Row: {
          id: string
          user_id: string
          bio: string | null
          specialties: string[]
          hourly_rate: number
          availability: Record<string, any>
          is_available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bio?: string | null
          specialties?: string[]
          hourly_rate?: number
          availability?: any
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bio?: string | null
          specialties?: string[]
          hourly_rate?: number
          availability?: Record<string, any>
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          student_id: string
          teacher_id: string
          date: string
          duration: number
          status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
          notes: string | null
          credits_cost: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          teacher_id: string
          date: string
          duration?: number
          status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
          notes?: string | null
          credits_cost: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          teacher_id?: string
          date?: string
          duration?: number
          status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
          notes?: string | null
          credits_cost?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
