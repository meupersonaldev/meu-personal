'use client'

import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'

export type FranqueadoraRole = 'SUPER_ADMIN' | 'ADMIN' | 'ANALYST' | 'FRANCHISE_ADMIN'

export const FRANQUEADORA_ALLOWED_ROLES: FranqueadoraRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'FRANCHISE_ADMIN'
]

export function hasFranqueadoraAccess(role?: FranqueadoraRole | null, allowed: FranqueadoraRole[] = FRANQUEADORA_ALLOWED_ROLES) {
  if (!role) return false
  return allowed.includes(role)
}

export function useFranqueadoraPermissions(allowed: FranqueadoraRole[] = FRANQUEADORA_ALLOWED_ROLES) {
  const { isAuthenticated, user } = useFranqueadoraStore()
  return {
    isAuthenticated,
    role: user?.role ?? null,
    allowed,
    canAccess: isAuthenticated && hasFranqueadoraAccess(user?.role, allowed)
  }
}
