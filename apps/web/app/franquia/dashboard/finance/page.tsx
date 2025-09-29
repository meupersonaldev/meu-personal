'use client'

import { useState } from 'react'
import { DollarSign, CreditCard, TrendingUp, Users, Plus, Edit, Eye, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFranquiaStore } from '@/lib/stores/franquia-supabase-store'
import PlanModal from '@/components/modals/plan-modal'

export default function FinancePage() {
  const { plans, students, analytics, deletePlan } = useFranquiaStore()
  const [planModal, setPlanModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create')

  // Calcular métricas financeiras
  const totalRevenue = students.reduce((sum, student) => {
    const plan = plans.find(p => p.id === student.planId)
    return sum + (plan?.price || 0)
  }, 0)

  const activeSubscriptions = students.filter(s => s.status === 'active').length

  const planSubscriptions = plans.map(plan => ({
    ...plan,
    subscribers: students.filter(s => s.planId === plan.id && s.status === 'active').length
  }))

  const openModal = (mode: 'create' | 'edit' | 'view', plan?: any) => {
    setModalMode(mode)
    setSelectedPlan(plan || null)
    setPlanModal(true)
  }

  const handleDeletePlan = (planId: string) => {
    const subscribersCount = students.filter(s => s.planId === planId).length

    if (subscribersCount > 0) {
      alert(`Não é possível excluir este plano pois há ${subscribersCount} aluno(s) inscrito(s).`)
      return
    }

    if (confirm('Tem certeza que deseja excluir este plano?')) {
      deletePlan(planId)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Financeiro</h1>
            <p className="text-gray-600">Gerencie pacotes de horas e acompanhe a receita</p>
          </div>
          <Button onClick={() => openModal('create')} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Novo Pacote
          </Button>
        </div>
      </div>

      {/* Métricas Financeiras */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Receita Total</div>
              <div className="text-2xl font-bold text-green-600">
                R$ {totalRevenue.toLocaleString('pt-BR')}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Pacotes Ativos</div>
              <div className="text-2xl font-bold text-blue-600">
                {activeSubscriptions}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Valor por Hora</div>
              <div className="text-2xl font-bold text-purple-600">
                R$ 50
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Total de Pacotes</div>
              <div className="text-2xl font-bold text-amber-600">
                {plans.length}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Planos */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Pacotes Disponíveis</h2>
        </div>
        <div className="p-6">
          {plans.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Nenhum pacote cadastrado</p>
              <Button onClick={() => openModal('create')} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Pacote
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {planSubscriptions.map((plan) => (
                <Card key={plan.id} className="border-2 hover:border-blue-200 transition-colors">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                      <Badge className={`${
                        plan.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {plan.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>

                    <div className="mb-4">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        R$ {plan.price}
                        <span className="text-sm font-normal text-gray-600"> / {plan.hoursIncluded}h</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                    </div>

                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-2">Benefícios:</div>
                      <ul className="text-sm space-y-1">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center text-gray-700">
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Horas:</span>
                        <span className="font-semibold text-gray-900">{plan.hoursIncluded}h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Vendidos:</span>
                        <span className="font-semibold text-gray-900">{plan.subscribers}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openModal('view', plan)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openModal('edit', plan)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePlan(plan.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={plan.subscribers > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Plan Modal */}
      <PlanModal
        isOpen={planModal}
        onClose={() => setPlanModal(false)}
        mode={modalMode}
        plan={selectedPlan}
      />
    </div>
  )
}