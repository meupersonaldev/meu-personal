'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Calendar, Star, Loader2, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useStudentUnitsStore } from '@/lib/stores/student-units-store'
import { useStudentStore } from '@/lib/stores/student-store'


export default function StudentProfessoresPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const {
    units,
    availableUnits,
    isLoading: isUnitsLoading,
    fetchUnits,
    fetchAvailableUnits,
  } = useStudentUnitsStore()
  const { teachers, loading: isTeachersLoading, loadTeachers } = useStudentStore()
  const [selectedUnitId, setSelectedUnitId] = useState<string>('')

  useEffect(() => {
    if (user?.id) {
      fetchUnits()
      fetchAvailableUnits()
    }
  }, [user?.id, fetchUnits, fetchAvailableUnits])

  useEffect(() => {
    if (selectedUnitId) {
      // Carregar professores usando a unidade vinculada selecionada, sem ativar automaticamente
      loadTeachers(undefined, undefined, selectedUnitId)
    }
  }, [selectedUnitId, loadTeachers])

  // Lista unificada de unidades (vinculadas + disponíveis)
  const allUnits = useMemo(() => {
    const seen = new Set<string>()
    const list: { id: string; name: string; city?: string | null; state?: string | null }[] = []
    for (const su of units) {
      const uid = su.unit?.id || su.unit_id
      if (uid && !seen.has(uid)) {
        seen.add(uid)
        list.push({ id: uid, name: su.unit?.name || '', city: su.unit?.city, state: su.unit?.state })
      }
    }
    for (const u of availableUnits) {
      if (u.id && !seen.has(u.id)) {
        seen.add(u.id)
        list.push({ id: u.id, name: u.name, city: u.city, state: u.state })
      }
    }
    return list
  }, [units, availableUnits])

  const selectedUnit = units.find(u => u.unit_id === selectedUnitId)
  const selectedUnitLabel = useMemo(() => {
    const fromLinked = selectedUnit?.unit?.name
    if (fromLinked) return fromLinked
    const fromAvailable = availableUnits.find(u => u.id === selectedUnitId)?.name
    return fromAvailable || ''
  }, [selectedUnitId, selectedUnit, availableUnits])

  if (!user || !isAuthenticated) {
    return null
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto flex flex-col gap-4 p-3 sm:gap-6 sm:p-6">
        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
            Professores
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Selecione uma unidade e encontre seu professor ideal
          </p>
        </div>

        {/* Seletor de Unidade */}
        <Card className="border border-meu-primary/20 shadow-sm">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-meu-primary/5 to-transparent py-3 px-3 sm:py-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-meu-primary" />
              Selecione sua Unidade
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            {isUnitsLoading ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-meu-primary" />
              </div>
            ) : (
              <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                <SelectTrigger className="w-full h-11 sm:h-12 text-sm sm:text-base">
                  <SelectValue placeholder={allUnits.length ? 'Selecione a unidade...' : 'Nenhuma unidade disponível'} />
                </SelectTrigger>
                <SelectContent className="max-h-60 sm:max-h-72">
                  {allUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-sm sm:text-base">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <span className="font-medium">{u.name}</span>
                        {(u.city || u.state) && (
                          <span className="text-xs sm:text-sm text-gray-500">
                            {u.city ? `${u.city}` : ''}{u.state ? `, ${u.state}` : ''}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Lista de Professores */}
        {selectedUnitId && (
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
              <CardTitle className="text-base sm:text-lg flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-meu-primary" />
                  <span>Professores Disponíveis</span>
                </div>
                {selectedUnitLabel && (
                  <span className="text-xs sm:text-sm font-normal text-gray-500 ml-6 sm:ml-0">
                    em {selectedUnitLabel}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              {isTeachersLoading ? (
                <div className="flex items-center justify-center py-10 sm:py-12">
                  <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-meu-primary" />
                </div>
              ) : teachers.length === 0 ? (
                <div className="text-center py-10 sm:py-12 text-gray-500">
                  <Users className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                  <p className="text-base sm:text-lg font-medium">Nenhum professor disponível</p>
                  <p className="text-xs sm:text-sm mt-1.5 sm:mt-2 px-4">
                    Não há professores cadastrados nesta unidade no momento.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4 md:gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {teachers.map((teacher) => (
                    <Card
                      key={teacher.id}
                      className="border border-gray-200 hover:border-meu-primary/50 hover:shadow-md transition-all"
                    >
                      <CardContent className="p-3 sm:p-4 md:p-5">
                        <div className="flex flex-col gap-3 sm:gap-4">
                          {/* Avatar e Nome */}
                          <div className="flex items-center gap-3">
                            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 sm:border-4 border-meu-primary/20 flex-shrink-0">
                              {teacher.avatar_url && (
                                <AvatarImage src={teacher.avatar_url} alt={teacher.name} />
                              )}
                              <AvatarFallback className="bg-meu-primary text-white font-bold text-lg sm:text-xl">
                                {teacher.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-base sm:text-lg text-gray-900 truncate">{teacher.name}</h3>
                              {teacher.teacher_profiles?.[0]?.is_available && (
                                <Badge className="bg-green-100 text-green-700 border-green-200 mt-1 text-xs">
                                  Disponível
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Especialidades */}
                          {teacher.teacher_profiles?.[0]?.specialties && teacher.teacher_profiles[0].specialties.length > 0 && (
                            <div>
                              <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                                Especialidades
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {teacher.teacher_profiles[0].specialties.slice(0, 3).map((specialty, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {specialty}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Avaliação */}
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
                            <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
                            <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
                            <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
                            <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="text-xs sm:text-sm text-gray-600 ml-0.5">(4.0)</span>
                          </div>

                          {/* Botão Agendar */}
                          <Button
                            className="w-full h-9 sm:h-10 text-sm sm:text-base bg-meu-primary text-white hover:bg-meu-primary-dark"
                            onClick={() => router.push(`/aluno/agendar?teacher_id=${teacher.id}&unit_id=${selectedUnitId}`)}
                          >
                            <Calendar className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Agendar Aula
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
