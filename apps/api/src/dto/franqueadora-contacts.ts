export const FRANQUEADORA_CONTACTS_USER_FIELDS = [
  'id',
  'name',
  'email',
  'phone',
  'cpf',
  'role',
  'is_active',
  'credits',
  'created_at',
  'updated_at',
  'avatar_url',
  'last_login_at',
  'email_verified',
  'phone_verified',
  'franchisor_id',
  'franchise_id'
].join(', ')

export const FRANQUEADORA_CONTACTS_SELECT = [
  'id',
  'franqueadora_id',
  'user_id',
  'role',
  'status',
  'origin',
  'assigned_academy_ids',
  'last_assignment_at',
  'created_at',
  'updated_at',
  `user:users (${FRANQUEADORA_CONTACTS_USER_FIELDS})`
].join(', ')

export interface ContactUser {
  id: string
  name: string
  email: string
  phone?: string | null
  cpf?: string | null
  role: string
  is_active?: boolean | null
  credits?: number | null
  created_at?: string | null
  updated_at?: string | null
  avatar_url?: string | null
  last_login_at?: string | null
  email_verified?: boolean | null
  phone_verified?: boolean | null
  franchisor_id?: string | null
  franchise_id?: string | null
}

export interface FranqueadoraContactRow {
  id: string
  franqueadora_id: string
  user_id: string
  role: string
  status?: string | null
  origin?: string | null
  assigned_academy_ids?: string[] | null
  last_assignment_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  user: ContactUser | null
}
