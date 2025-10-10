'use client'

import { useState, useEffect } from 'react'
import { useStudentUnitsStore, StudentUnit, Unit } from '@/lib/stores/student-units-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Building2,
  MapPin,
  Users,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface UnitSelectorProps {
  compact?: boolean
  showJoinButton?: boolean
  onUnitChange?: (unit: StudentUnit | null) => void
}

export function UnitSelector({
  compact = false,
  showJoinButton = true,
  onUnitChange
}: UnitSelectorProps) {
  const {
    units,
    activeUnit,
    availableUnits,
    isLoading,
    error,
    fetchUnits,
    fetchAvailableUnits,
    activateUnit,
    joinUnit,
    clearError
  } = useStudentUnitsStore()

  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false)
  const [isActivating, setIsActivating] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState<string | null>(null)

  useEffect(() => {
    fetchUnits()
    if (showJoinButton) {
      fetchAvailableUnits()
    }
  }, [fetchUnits, fetchAvailableUnits, showJoinButton])

  useEffect(() => {
    if (onUnitChange) {
      onUnitChange(activeUnit)
    }
  }, [activeUnit, onUnitChange])

  useEffect(() => {
    const handleUnitChanged = (event: CustomEvent) => {
      if (onUnitChange) {
        onUnitChange(event.detail.activeUnit)
      }
    }

    window.addEventListener('unit:changed', handleUnitChanged as EventListener)
    return () => {
      window.removeEventListener('unit:changed', handleUnitChanged as EventListener)
    }
  }, [onUnitChange])

  const handleActivateUnit = async (unitId: string) => {
    setIsActivating(unitId)
    try {
      await activateUnit(unitId)
      toast.success('Unidade ativada com sucesso!')
    } catch (error) {
      toast.error('Erro ao ativar unidade')
    } finally {
      setIsActivating(null)
    }
  }

  const handleJoinUnit = async (unitId: string) => {
    setIsJoining(unitId)
    try {
      await joinUnit(unitId)
      setIsJoinDialogOpen(false)
      toast.success('Associado à unidade com sucesso!')
    } catch (error) {
      toast.error('Erro ao se associar à unidade')
    } finally {
      setIsJoining(null)
    }
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
            <Button variant="ghost" size="sm" onClick={() => clearError()}>
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!activeUnit && units.length === 0) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              Nenhuma unidade associada. Entre em contato com a academia.
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium">
          {activeUnit?.unit.name || 'Nenhuma unidade ativa'}
        </span>
        {activeUnit && (
          <Badge variant="secondary" className="text-xs">
            Ativa
          </Badge>
        )}
      </div>
    )
  }

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Minha Unidade
          </CardTitle>
          {showJoinButton && (
            <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Associar-se a uma nova unidade</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {availableUnits.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Nenhuma unidade disponível no momento.
                    </p>
                  ) : (
                    availableUnits.map((unit) => (
                      <Card key={unit.id} className="border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <h4 className="font-medium">{unit.name}</h4>
                              {unit.city && unit.state && (
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <MapPin className="h-3 w-3" />
                                  {unit.city}, {unit.state}
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleJoinUnit(unit.id)}
                              disabled={isJoining === unit.id}
                            >
                              {isJoining === unit.id ? (
                                <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                              ) : (
                                'Associar'
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Unit */}
        {activeUnit && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Unidade Ativa</span>
            </div>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-green-800">
                      {activeUnit.unit.name}
                    </h4>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Ativa
                    </Badge>
                  </div>
                  {activeUnit.unit.city && activeUnit.unit.state && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="h-3 w-3" />
                      {activeUnit.unit.city}, {activeUnit.unit.state}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {activeUnit.total_bookings} aulas
                    </div>
                    {activeUnit.last_booking_date && (
                      <span>
                        Última: {new Date(activeUnit.last_booking_date).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Other Units */}
        {units.length > 1 && (
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-700">
              Outras unidades ({units.length - 1})
            </span>
            <div className="space-y-2">
              {units
                .filter(unit => !unit.is_active)
                .map((unit) => (
                  <Card key={unit.id} className="border-gray-200">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h5 className="font-medium">{unit.unit.name}</h5>
                          {unit.unit.city && unit.unit.state && (
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <MapPin className="h-3 w-3" />
                              {unit.unit.city}, {unit.unit.state}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivateUnit(unit.unit_id)}
                          disabled={isActivating === unit.unit_id}
                        >
                          {isActivating === unit.unit_id ? (
                            <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                          ) : (
                            'Ativar'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}