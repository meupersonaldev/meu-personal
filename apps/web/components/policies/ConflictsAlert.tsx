"use client"

import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Conflict {
  academyId: string
  academyName: string
  field: string
  fieldLabel: string
  currentValue: number
  policyMin?: number
  policyMax?: number
  error: string
}

interface ConflictsAlertProps {
  token?: string | null
  apiUrl?: string
  useDraft?: boolean
  onConflictsChange?: (hasConflicts: boolean, count: number) => void
}

export default function ConflictsAlert({ token, apiUrl, useDraft = true, onConflictsChange }: ConflictsAlertProps) {
  const API_URL = apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const [loading, setLoading] = useState(false)
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [academiesChecked, setAcademiesChecked] = useState(0)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    async function checkConflicts() {
      setLoading(true)
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
        const res = await fetch(
          `${API_URL}/api/franchisor/policies/validate-conflicts?use_draft=${useDraft}`,
          { credentials: 'include', headers }
        )
        if (res.ok) {
          const data = await res.json()
          setConflicts(data.conflicts || [])
          setAcademiesChecked(data.academiesChecked || 0)
          onConflictsChange?.(data.conflicts?.length > 0, data.conflicts?.length || 0)
        }
      } catch (err) {
        console.error('Erro ao verificar conflitos:', err)
      } finally {
        setLoading(false)
      }
    }
    checkConflicts()
  }, [API_URL, token, useDraft, onConflictsChange])

  if (loading) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-48"></div>
      </div>
    )
  }

  if (conflicts.length === 0) {
    return null
  }

  // Agrupar conflitos por academia
  const conflictsByAcademy = conflicts.reduce((acc, c) => {
    if (!acc[c.academyId]) {
      acc[c.academyId] = { name: c.academyName, conflicts: [] }
    }
    acc[c.academyId].conflicts.push(c)
    return acc
  }, {} as Record<string, { name: string; conflicts: Conflict[] }>)

  const academyCount = Object.keys(conflictsByAcademy).length

  return (
    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-amber-800">
              {conflicts.length} conflito{conflicts.length > 1 ? 's' : ''} detectado{conflicts.length > 1 ? 's' : ''}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 h-7 px-2"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Ocultar
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Ver detalhes
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-amber-700 mt-1">
            {academyCount} unidade{academyCount > 1 ? 's' : ''} com overrides fora dos limites permitidos.
            Você pode publicar mesmo assim, mas os valores serão ignorados.
          </p>

          {expanded && (
            <div className="mt-4 space-y-3">
              {Object.entries(conflictsByAcademy).map(([academyId, { name, conflicts: academyConflicts }]) => (
                <div key={academyId} className="bg-white rounded-lg p-3 border border-amber-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{name}</span>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                      {academyConflicts.length} conflito{academyConflicts.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {academyConflicts.map((c, idx) => (
                      <div key={idx} className="text-sm flex items-center justify-between text-gray-600">
                        <span>{c.fieldLabel}</span>
                        <span className="text-red-600 font-medium">
                          {c.currentValue} 
                          <span className="text-gray-400 font-normal ml-1">
                            (limite: {c.policyMin !== undefined && c.policyMax !== undefined 
                              ? `${c.policyMin}-${c.policyMax}`
                              : c.policyMin !== undefined 
                                ? `≥${c.policyMin}`
                                : `≤${c.policyMax}`
                            })
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
