export interface StudentPlan {
  id: string
  name: string
  description?: string | null
  price: number
  credits_included: number
  features?: string[]
}

export interface StudentCheckin {
  id: string
  status: 'GRANTED' | 'DENIED' | 'PENDING'
  created_at: string
  unit_name?: string | null
  method?: string | null
}
