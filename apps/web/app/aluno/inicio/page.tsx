'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Wallet,
  CheckCircle,
  Users,
  ArrowRight,
  Loader2,
  CreditCard,
  AlertCircle,
  ShoppingCart,
  Package2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useStudentStore } from '@/lib/stores/student-store'
import { useStudentUnitsStore, StudentUnit, Unit } from '@/lib/stores/student-units-store'
import { API_BASE_URL } from '@/lib/api'


interface PackageType {
  id: string
  title: string
  classes_qty: number
  price_cents: number
  status: string
  unit_id: string
}

interface BalanceType {
  total_purchased: number
  total_consumed: number
  locked_qty: number
  available_classes?: number
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

export default function StudentDashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, token } = useAuthStore()
  const {
    teachers,
    loading: isStudentDataLoading,
    loadTeachers
  } = useStudentStore()
  const {
    units,
    activeUnit,
    isLoading: isUnitsLoading,
    fetchUnits,
    fetchAvailableUnits,
    activateUnit
  } = useStudentUnitsStore()

  const [packages, setPackages] = useState<PackageType[]>([])
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [balance, setBalance] = useState<BalanceType | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)

  // Redirect se não autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  // Carregar unidades
  useEffect(() => {
    if (!isAuthenticated || !token) return
    fetchUnits()
    fetchAvailableUnits()
  }, [isAuthenticated, token, fetchUnits, fetchAvailableUnits])

  // Carregar dados da unidade ativa
  useEffect(() => {
    if (!activeUnit || !user?.id) return
    loadTeachers()
    fetchPackages(activeUnit.unit_id)
    fetchGlobalBalance(activeUnit.unit_id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUnit?.unit_id, user?.id])

  const fetchPackages = async (unitId?: string) => {
    if (!user?.id) return
    setPackagesLoading(true)

    try {
      const params = new URLSearchParams()
      if (unitId) {
        params.append('unit_id', unitId)
      }
      const query = params.toString()
      const response = await fetch(`${API_BASE_URL}/api/packages/student${query ? `?${query}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) throw new Error('Erro ao buscar pacotes')
      const data = await response.json()
      setPackages(data.packages || [])
    } catch (error) {
      setPackages([])
    } finally {
      setPackagesLoading(false)
    }
  }

  const fetchGlobalBalance = async (unitId?: string) => {
    if (!user?.id) return
    setBalanceLoading(true)

    try {
      const params = new URLSearchParams()
      if (unitId) {
        params.append('unit_id', unitId)
      }
      const query = params.toString()
      const response = await fetch(`${API_BASE_URL}/api/packages/student/balance${query ? `?${query}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) throw new Error('Erro ao buscar saldo')
      const data = await response.json()
      setBalance(data.balance || null)
    } catch (error) {
      setBalance(null)
    } finally {
      setBalanceLoading(false)
    }
  }

  const selectedUnit: StudentUnit | null = activeUnit || units.find((u) => u.is_active) || null

  // Usar available_classes da API (fonte única de verdade)
  // Se não estiver disponível, calcular como fallback
  const availableCredits = balance
    ? (balance.available_classes ?? (balance.total_purchased - balance.total_consumed - balance.locked_qty))
    : 0

  const handleActivateUnit = async (unit: StudentUnit | Unit) => {
    if ('unit_id' in unit) {
      await activateUnit(unit.unit_id)
    } else {
      await activateUnit(unit.id)
    }
  }

  const firstName = user?.name?.split(' ')[0] || 'Aluno'

  if (!user || !isAuthenticated) {
    return null
  }

  return (
    <div className="w-full flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-500">Olá, {firstName}! 👋</p>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Seu Painel de Treinos
        </h1>
        <p className="text-sm text-gray-600">
          Selecione uma unidade, compre créditos e agende suas aulas
        </p>
      </div>

      {/* Fluxo: 1. Selecionar Unidade */}
      <Card className="border-2 border-meu-primary/20">
        <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-meu-primary/5 to-transparent p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-meu-primary text-white font-bold text-sm md:text-base">
              1
            </div>
            <div>
              <CardTitle className="text-lg md:text-xl">Selecione sua Unidade</CardTitle>
              <CardDescription className="text-xs md:text-sm">Escolha onde deseja treinar</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {isUnitsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-meu-primary" />
            </div>
          ) : units.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Nenhuma unidade vinculada</p>
                <p className="text-sm text-amber-800 mt-1">
                  Você ainda não está vinculado a nenhuma academia. Entre em contato com uma unidade próxima para se cadastrar.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {units.map((unit) => (
                <Card
                  key={unit.id}
                  className={`border-2 transition-all ${unit.is_active
                      ? 'border-meu-primary bg-meu-primary/5'
                      : 'border-gray-200 hover:border-meu-primary/50'
                    }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{unit.unit.name}</h3>
                        <p className="text-sm text-gray-600">{unit.unit.city}, {unit.unit.state}</p>
                      </div>
                      {unit.is_active && (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          Ativa
                        </Badge>
                      )}
                    </div>
                    {!unit.is_active && (
                      <Button
                        size="sm"
                        className="w-full bg-meu-primary text-white hover:bg-meu-primary-dark"
                        onClick={() => handleActivateUnit(unit)}
                      >
                        Selecionar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fluxo: 2. Comprar Pacote (se unidade selecionada) */}
      {selectedUnit && (
        <Card className="border-2 border-meu-primary/20">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-meu-primary/5 to-transparent p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-meu-primary text-white font-bold text-sm md:text-base">
                2
              </div>
              <div>
                <CardTitle className="text-lg md:text-xl">Seus Créditos</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Compre pacotes de aulas para {selectedUnit.unit.name}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {/* Saldo Atual */}
            <div className="mb-4 md:mb-6 rounded-lg border-2 border-meu-primary/30 bg-gradient-to-br from-meu-primary/10 to-transparent p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600 mb-1">Créditos Disponíveis</p>
                  {balanceLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-meu-primary" />
                  ) : (
                    <p className="text-3xl md:text-4xl font-bold text-gray-900">{availableCredits}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">aulas disponíveis</p>
                </div>
                <Wallet className="h-12 w-12 md:h-16 md:w-16 text-meu-primary opacity-50" />
              </div>
            </div>

            {/* Pacotes Disponíveis */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-meu-primary" />
                Pacotes Disponíveis
              </h3>

              {packagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-meu-primary" />
                </div>
              ) : packages.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
                  <Package2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">
                    Nenhum pacote disponível para esta unidade no momento.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {packages.map((pkg) => (
                    <Card key={pkg.id} className="border border-gray-200 hover:border-meu-primary/50 hover:shadow-lg transition-all">
                      <CardContent className="p-5">
                        <div className="mb-4">
                          <h4 className="text-lg font-semibold text-gray-900">{pkg.title}</h4>
                          <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-3xl font-bold text-meu-primary">
                              {currencyFormatter.format(pkg.price_cents / 100)}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>{pkg.classes_qty} aulas</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>
                              {currencyFormatter.format((pkg.price_cents / 100) / pkg.classes_qty)} por aula
                            </span>
                          </div>
                        </div>
                        <Button
                          className="w-full bg-meu-primary text-white hover:bg-meu-primary-dark"
                          onClick={() => router.push(`/aluno/comprar?package_id=${pkg.id}`)}
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          Comprar Pacote
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fluxo: 3. Professores Disponíveis (se tem créditos) */}
      {selectedUnit && availableCredits > 0 && (
        <Card className="border-2 border-meu-primary/20">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-meu-primary/5 to-transparent p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-meu-primary text-white font-bold text-sm md:text-base">
                3
              </div>
              <div>
                <CardTitle className="text-lg md:text-xl">Professores Disponíveis</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Escolha seu professor e agende sua aula
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {isStudentDataLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-meu-primary" />
              </div>
            ) : teachers.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600">
                  Nenhum professor disponível nesta unidade no momento.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teachers.map((teacher) => (
                  <Card key={teacher.id} className="border border-gray-200 hover:border-meu-primary/50 hover:shadow-lg transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <Avatar className="h-14 w-14 border-2 border-meu-primary/20">
                          {teacher.avatar_url && <AvatarImage src={teacher.avatar_url} alt={teacher.name} />}
                          <AvatarFallback className="bg-meu-primary text-white font-semibold text-lg">
                            {teacher.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{teacher.name}</h4>
                          {teacher.teacher_profiles?.[0]?.is_available && (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs mt-1">
                              Disponível
                            </Badge>
                          )}
                        </div>
                      </div>

                      {teacher.teacher_profiles?.[0]?.specialties && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600">
                            {teacher.teacher_profiles[0].specialties.slice(0, 2).join(' • ')}
                          </p>
                        </div>
                      )}

                      <Button
                        className="w-full bg-meu-primary text-white hover:bg-meu-primary-dark"
                        onClick={() => router.push(`/aluno/agendar?teacher_id=${teacher.id}&unit_id=${selectedUnit.unit_id}`)}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Agendar Aula
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mensagem se não tem créditos */}
      {selectedUnit && availableCredits === 0 && !packagesLoading && (
        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardContent className="p-6 flex gap-4 items-start">
            <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-2">
                Você não tem créditos disponíveis
              </h3>
              <p className="text-sm text-amber-800 mb-4">
                Compre um pacote de aulas acima para começar a agendar com os professores da unidade {selectedUnit.unit.name}.
              </p>
              <Button
                variant="outline"
                className="border-amber-600 text-amber-900 hover:bg-amber-100"
                onClick={() => {
                  const packagesSection = document.querySelector('[data-section="packages"]')
                  packagesSection?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Ver Pacotes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Link rápido para minhas aulas */}
      {selectedUnit && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="lg"
            className="border-2 border-meu-primary text-meu-primary hover:bg-meu-primary hover:text-white"
            onClick={() => router.push('/aluno/dashboard')}
          >
            <Calendar className="mr-2 h-5 w-5" />
            Ver Minhas Aulas Agendadas
          </Button>
        </div>
      )}
    </div>
  )
}
