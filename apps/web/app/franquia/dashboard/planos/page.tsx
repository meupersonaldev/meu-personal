'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, DollarSign, Clock, Users, Package, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { API_BASE_URL } from '@/lib/api'

interface StudentPlan {
  id: string
  name: string
  description: string
  price: number
  credits_included: number
  validity_days: number
  features: string[]
  is_active: boolean
  asaas_plan_id?: string
}

interface TeacherPlan {
  id: string
  name: string
  description: string
  price: number
  hours_included: number
  validity_days: number
  commission_rate: number
  features: string[]
  is_active: boolean
  asaas_plan_id?: string
}

export default function PlanosPage() {
  const { academy } = useFranquiaStore()
  const { token } = useAuthStore()
  const [studentPlans, setStudentPlans] = useState<StudentPlan[]>([])
  const [teacherPlans, setTeacherPlans] = useState<TeacherPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student')
  const [editingPlan, setEditingPlan] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    planId: string | null
    planName: string
    planType: 'student' | 'teacher' | null
  }>({
    isOpen: false,
    planId: null,
    planName: '',
    planType: null
  })

  // Verificar se academia está carregada
  useEffect(() => {
    if (!academy) {
    }
  }, [academy])

  // Carregar planos quando academy estiver disponível
  useEffect(() => {
    if (academy?.id) {
      loadPlans()
    }
  }, [academy?.id])

  const loadPlans = async () => {
    setLoading(true)
    try {
      if (!academy?.id || !token) {
        setLoading(false)
        return
      }

      const headers = { Authorization: `Bearer ${token}` }
      const [studentRes, teacherRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/packages/student/manage`, { headers }),
        fetch(`${API_BASE_URL}/api/packages/professor/manage`, { headers })
      ])

      const isJson = (res: Response) => String(res.headers.get('content-type') || '').includes('application/json')

      const studentData = studentRes.ok && isJson(studentRes) ? await studentRes.json() : { packages: [] }
      const teacherData = teacherRes.ok && isJson(teacherRes) ? await teacherRes.json() : { packages: [] }

      const mappedStudent: StudentPlan[] = (studentData.packages || []).map((p: any) => ({
        id: p.id,
        name: p.title ?? 'Plano',
        description: p.metadata_json?.description ?? '',
        price: (p.price_cents ?? 0) / 100,
        credits_included: p.classes_qty ?? 0,
        validity_days: p.metadata_json?.validity_days ?? 30,
        features: Array.isArray(p.metadata_json?.features) ? p.metadata_json.features : [],
        is_active: p.status === 'active',
        asaas_plan_id: p.metadata_json?.asaas_plan_id,
      }))

      const mappedTeacher: TeacherPlan[] = (teacherData.packages || []).map((p: any) => ({
        id: p.id,
        name: p.title ?? 'Pacote',
        description: p.metadata_json?.description ?? '',
        price: (p.price_cents ?? 0) / 100,
        hours_included: p.hours_qty ?? 0,
        validity_days: p.metadata_json?.validity_days ?? 90,
        commission_rate: p.metadata_json?.commission_rate ?? 0,
        features: Array.isArray(p.metadata_json?.features) ? p.metadata_json.features : [],
        is_active: p.status === 'active',
        asaas_plan_id: p.metadata_json?.asaas_plan_id,
      }))

      setStudentPlans(mappedStudent)
      setTeacherPlans(mappedTeacher)
    } catch (error) {
      toast.error('Erro ao carregar planos', {
        description: 'Verifique se o backend está rodando em http://localhost:3001'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlan = (type: 'student' | 'teacher') => {
    if (type === 'student') {
      setEditingPlan({
        type: 'student',
        name: '',
        description: '',
        price: 0,
        credits_included: 1,
        validity_days: 30,
        features: [''],
        is_active: true
      })
    } else {
      setEditingPlan({
        type: 'teacher',
        name: '',
        description: '',
        price: 0,
        hours_included: 10,
        validity_days: 90,
        commission_rate: 0.70,
        features: [''],
        is_active: true
      })
    }
    setShowModal(true)
  }

  const handleEditPlan = (plan: any, type: 'student' | 'teacher') => {
    setEditingPlan({ ...plan, type })
    setShowModal(true)
  }

  const handleSavePlan = async () => {
    if (!editingPlan) return

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const endpoint = editingPlan.type === 'student'
        ? `${API_URL}/api/plans/students`
        : `${API_URL}/api/plans/teachers`

      const method = editingPlan.id ? 'PUT' : 'POST'
      const url = editingPlan.id ? `${endpoint}/${editingPlan.id}` : endpoint

      // Remover campo 'type' antes de enviar
      const { type, validity_days, ...planData } = editingPlan

      // Obter academy_id do store Zustand
      const academy_id = academy?.id


      if (!academy_id) {
        toast.error('Erro: academia não identificada. Faça login novamente.')
        return
      }

      // Converter validity_days para duration_days e adicionar academy_id
      const finalPlanData = {
        ...planData,
        academy_id,
        ...(editingPlan.type === 'student' && {
          duration_days: validity_days || 30
        })
      }


      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPlanData)
      })

      const result = await response.json()

      if (response.ok) {
        await loadPlans()
        setShowModal(false)
        setEditingPlan(null)
        toast.success('Plano salvo com sucesso!')
      } else {
        toast.error('Erro ao salvar plano', {
          description: result.error || 'Erro desconhecido'
        })
      }
    } catch (error) {
      toast.error('Erro ao salvar plano', {
        description: String(error)
      })
    }
  }

  const handleToggleActive = async (plan: any, type: 'student' | 'teacher') => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const endpoint = type === 'student' 
        ? `${API_URL}/api/plans/students/${plan.id}` 
        : `${API_URL}/api/plans/teachers/${plan.id}`

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !plan.is_active })
      })

      if (response.ok) {
        await loadPlans()
      }
    } catch (error) {
    }
  }

  const handleDeletePlan = (plan: any, type: 'student' | 'teacher') => {
    setDeleteConfirm({
      isOpen: true,
      planId: plan.id,
      planName: plan.name,
      planType: type
    })
  }

  const confirmDeletePlan = async () => {
    if (!deleteConfirm.planId || !deleteConfirm.planType) return

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const endpoint = deleteConfirm.planType === 'student'
        ? `${API_URL}/api/plans/students/${deleteConfirm.planId}`
        : `${API_URL}/api/plans/teachers/${deleteConfirm.planId}`

      const response = await fetch(endpoint, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadPlans()
        toast.success('Plano excluído com sucesso!')
      } else {
        toast.error('Erro ao excluir plano')
      }
    } catch (error) {
      toast.error('Erro ao excluir plano')
    } finally {
      setDeleteConfirm({ isOpen: false, planId: null, planName: '', planType: null })
    }
  }

  const copyPaymentLink = (plan: any, type: 'student' | 'teacher') => {
    const baseUrl = window.location.origin
    const link = type === 'student' 
      ? `${baseUrl}/aluno/comprar?plan=${plan.id}`
      : `${baseUrl}/professor/comprar-horas?plan=${plan.id}`
    
    navigator.clipboard.writeText(link)
    toast.success('Link copiado!', {
      description: 'Link de pagamento copiado para a área de transferência'
    })
  }

  const addFeature = () => {
    if (editingPlan) {
      setEditingPlan({
        ...editingPlan,
        features: [...editingPlan.features, '']
      })
    }
  }

  const updateFeature = (index: number, value: string) => {
    if (editingPlan) {
      const newFeatures = [...editingPlan.features]
      newFeatures[index] = value
      setEditingPlan({ ...editingPlan, features: newFeatures })
    }
  }

  const removeFeature = (index: number) => {
    if (editingPlan) {
      setEditingPlan({
        ...editingPlan,
        features: editingPlan.features.filter((_: any, i: number) => i !== index)
      })
    }
  }

  const syncWithAsaas = async (planId: string, type: 'student' | 'teacher') => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const endpoint = type === 'student'
        ? `${API_URL}/api/plans/students/${planId}/sync-asaas`
        : `${API_URL}/api/plans/teachers/${planId}/sync-asaas`

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Falha ao sincronizar')

      const data = await response.json()
      toast.success('Plano sincronizado com Asaas!', {
        description: `ID Asaas: ${data.asaas_plan_id}`
      })
      loadPlans()
    } catch (error) {
      toast.error('Erro ao sincronizar com Asaas')
    }
  }

  return (
    <div className="p-6 ml-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciar Planos</h1>
        <p className="text-gray-600">Crie e gerencie planos para alunos e professores</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('student')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'student'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Users className="inline h-5 w-5 mr-2" />
          Planos de Alunos
        </button>
        <button
          onClick={() => setActiveTab('teacher')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'teacher'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Package className="inline h-5 w-5 mr-2" />
          Planos de Professores
        </button>
      </div>

      {/* Planos de Alunos */}
      {activeTab === 'student' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Planos de Alunos ({studentPlans.length})
            </h2>
            <Button
              onClick={() => handleCreatePlan('student')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Plano
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">Carregando...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studentPlans.map((plan) => (
                <Card key={plan.id} className="p-6 hover:shadow-xl transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                      <p className="text-sm text-gray-600">{plan.description}</p>
                    </div>
                    <Badge className={plan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {plan.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>

                  <div className="mb-4">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      R$ {plan.price.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {plan.credits_included} créditos
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {plan.validity_days} dias
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEditPlan(plan, 'student')}
                        variant="outline"
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        onClick={() => handleToggleActive(plan, 'student')}
                        variant="outline"
                        className={plan.is_active ? 'text-red-600' : 'text-green-600'}
                      >
                        {plan.is_active ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => copyPaymentLink(plan, 'student')}
                        variant="outline"
                        className="flex-1 text-blue-600"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Copiar Link
                      </Button>
                      <Button
                        onClick={() => handleDeletePlan(plan, 'student')}
                        variant="outline"
                        className="text-red-600"
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
      )}

      {/* Planos de Professores */}
      {activeTab === 'teacher' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Planos de Professores ({teacherPlans.length})
            </h2>
            <Button
              onClick={() => handleCreatePlan('teacher')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Plano
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">Carregando...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teacherPlans.map((plan) => (
                <Card key={plan.id} className="p-6 hover:shadow-xl transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                      <p className="text-sm text-gray-600">{plan.description}</p>
                    </div>
                    <Badge className={plan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {plan.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>

                  <div className="mb-4">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      R$ {plan.price.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {plan.hours_included}h
                      </span>
                      <span className="text-xs">
                        R$ {(plan.price / plan.hours_included).toFixed(2)}/hora
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Validade: {plan.validity_days} dias
                    </div>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEditPlan(plan, 'teacher')}
                        variant="outline"
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        onClick={() => handleToggleActive(plan, 'teacher')}
                        variant="outline"
                        className={plan.is_active ? 'text-red-600' : 'text-green-600'}
                      >
                        {plan.is_active ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => copyPaymentLink(plan, 'teacher')}
                        variant="outline"
                        className="flex-1 text-blue-600"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Copiar Link
                      </Button>
                      <Button
                        onClick={() => handleDeletePlan(plan, 'teacher')}
                        variant="outline"
                        className="text-red-600"
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
      )}

      {/* Modal de Edição/Criação */}
      {showModal && editingPlan && (
        <div className="fixed inset-0 left-0 top-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {editingPlan.id ? 'Editar' : 'Criar'} Plano {editingPlan.type === 'student' ? 'de Aluno' : 'de Professor'}
              </h3>
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Plano</label>
                <input
                  type="text"
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Ex: Plano Básico"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  rows={3}
                  placeholder="Descrição do plano"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingPlan.price}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>

                {editingPlan.type === 'student' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Créditos Incluídos</label>
                    <input
                      type="number"
                      value={editingPlan.credits_included}
                      onChange={(e) => setEditingPlan({ ...editingPlan, credits_included: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Horas Incluídas</label>
                    <input
                      type="number"
                      value={editingPlan.hours_included}
                      onChange={(e) => setEditingPlan({ ...editingPlan, hours_included: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Validade (dias)</label>
                <input
                  type="number"
                  value={editingPlan.validity_days}
                  onChange={(e) => setEditingPlan({ ...editingPlan, validity_days: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recursos</label>
                {editingPlan.features.map((feature: string, index: number) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => updateFeature(index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      placeholder="Ex: Acesso à academia"
                    />
                    <Button
                      onClick={() => removeFeature(index)}
                      variant="outline"
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button onClick={addFeature} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Recurso
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingPlan.is_active}
                  onChange={(e) => setEditingPlan({ ...editingPlan, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="text-sm font-medium text-gray-700">Plano Ativo</label>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <Button
                onClick={() => setShowModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSavePlan}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Plano
              </Button>
            </div>
          </Card>
        </div>
      )}

        {/* Modal de Confirmação de Exclusão */}
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, planId: null, planName: '', planType: null })}
          onConfirm={confirmDeletePlan}
          title="Excluir Plano"
          description={`Tem certeza que deseja excluir o plano "${deleteConfirm.planName}"? Esta ação não poderá ser desfeita.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          type="danger"
        />
    </div>
  )
}
