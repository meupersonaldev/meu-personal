'use client'

import { useEffect, useState } from 'react'
import { Plus, CreditCard, Users, GraduationCap, DollarSign, Clock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useFranquiaStore, TeacherPlan, StudentPlan } from '@/lib/stores/franquia-store'
import { toast } from 'sonner'

export default function PlansPage() {
  const {
    teacherPlans,
    studentPlans,
    fetchTeacherPlans,
    fetchStudentPlans,
    createTeacherPlan,
    createStudentPlan
  } = useFranquiaStore()

  const [activeTab, setActiveTab] = useState<'teacher' | 'student'>('teacher')
  const [showTeacherModal, setShowTeacherModal] = useState(false)
  const [showStudentModal, setShowStudentModal] = useState(false)

  // Teacher plan form
  const [teacherPlanForm, setTeacherPlanForm] = useState({
    name: '',
    description: '',
    price: '',
    commission_rate: '',
    features: ['']
  })

  // Student plan form
  const [studentPlanForm, setStudentPlanForm] = useState({
    name: '',
    description: '',
    price: '',
    credits_included: '',
    validity_days: '',
    features: ['']
  })

  useEffect(() => {
    fetchTeacherPlans()
    fetchStudentPlans()
  }, [fetchTeacherPlans, fetchStudentPlans])

  const handleCreateTeacherPlan = async () => {
    if (!teacherPlanForm.name || !teacherPlanForm.price || !teacherPlanForm.commission_rate) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    const success = await createTeacherPlan({
      name: teacherPlanForm.name,
      description: teacherPlanForm.description,
      price: parseFloat(teacherPlanForm.price),
      commission_rate: parseFloat(teacherPlanForm.commission_rate),
      features: teacherPlanForm.features.filter(f => f.trim() !== ''),
      is_active: true
    })

    if (success) {
      toast.success('Plano de professor criado com sucesso!')
      setShowTeacherModal(false)
      setTeacherPlanForm({
        name: '',
        description: '',
        price: '',
        commission_rate: '',
        features: ['']
      })
    } else {
      toast.error('Erro ao criar plano')
    }
  }

  const handleCreateStudentPlan = async () => {
    if (!studentPlanForm.name || !studentPlanForm.price || !studentPlanForm.credits_included || !studentPlanForm.validity_days) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    const success = await createStudentPlan({
      name: studentPlanForm.name,
      description: studentPlanForm.description,
      price: parseFloat(studentPlanForm.price),
      credits_included: parseInt(studentPlanForm.credits_included),
      duration_days: parseInt(studentPlanForm.validity_days),
      features: studentPlanForm.features.filter(f => f.trim() !== ''),
      is_active: true
    })

    if (success) {
      toast.success('Plano de aluno criado com sucesso!')
      setShowStudentModal(false)
      setStudentPlanForm({
        name: '',
        description: '',
        price: '',
        credits_included: '',
        validity_days: '',
        features: ['']
      })
    } else {
      toast.error('Erro ao criar plano')
    }
  }

  const addFeature = (type: 'teacher' | 'student') => {
    if (type === 'teacher') {
      setTeacherPlanForm(prev => ({
        ...prev,
        features: [...prev.features, '']
      }))
    } else {
      setStudentPlanForm(prev => ({
        ...prev,
        features: [...prev.features, '']
      }))
    }
  }

  const updateFeature = (type: 'teacher' | 'student', index: number, value: string) => {
    if (type === 'teacher') {
      setTeacherPlanForm(prev => ({
        ...prev,
        features: prev.features.map((f, i) => i === index ? value : f)
      }))
    } else {
      setStudentPlanForm(prev => ({
        ...prev,
        features: prev.features.map((f, i) => i === index ? value : f)
      }))
    }
  }

  const removeFeature = (type: 'teacher' | 'student', index: number) => {
    if (type === 'teacher') {
      setTeacherPlanForm(prev => ({
        ...prev,
        features: prev.features.filter((_, i) => i !== index)
      }))
    } else {
      setStudentPlanForm(prev => ({
        ...prev,
        features: prev.features.filter((_, i) => i !== index)
      }))
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Planos</h1>
            <p className="text-gray-600">Gerencie planos para professores e alunos</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('teacher')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'teacher'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <GraduationCap className="h-4 w-4 inline mr-2" />
              Planos Professores ({teacherPlans.length})
            </button>
            <button
              onClick={() => setActiveTab('student')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'student'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Planos Alunos ({studentPlans.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Teacher Plans */}
      {activeTab === 'teacher' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Planos para Professores</h2>
            <Button
              onClick={() => setShowTeacherModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Plano
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teacherPlans.map((plan) => (
              <Card key={plan.id} className="p-6 border-2 hover:border-blue-200 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <Badge className="bg-green-100 text-green-800">
                    Ativo
                  </Badge>
                </div>

                <div className="mb-4">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    R$ {plan.price.toFixed(2)}
                    <span className="text-sm font-normal text-gray-600"> / mês</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    {plan.commission_rate}% de comissão
                  </div>
                  {plan.description && (
                    <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                  )}
                </div>

                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-2">Benefícios:</div>
                  <ul className="text-sm space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-gray-700">
                        <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="text-xs text-gray-500">
                  Criado em {new Date(plan.created_at).toLocaleDateString('pt-BR')}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Student Plans */}
      {activeTab === 'student' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Planos para Alunos</h2>
            <Button
              onClick={() => setShowStudentModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Plano
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studentPlans.map((plan) => (
              <Card key={plan.id} className="p-6 border-2 hover:border-blue-200 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <Badge className="bg-green-100 text-green-800">
                    Ativo
                  </Badge>
                </div>

                <div className="mb-4">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    R$ {plan.price.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    {plan.credits_included} créditos • {plan.duration_days} dias
                  </div>
                  {plan.description && (
                    <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                  )}
                </div>

                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-2">Benefícios:</div>
                  <ul className="text-sm space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-gray-700">
                        <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="text-xs text-gray-500">
                  Criado em {new Date(plan.created_at).toLocaleDateString('pt-BR')}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Teacher Plan Modal */}
      {showTeacherModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-hide">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Novo Plano Professor</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Plano *
                </label>
                <Input
                  value={teacherPlanForm.name}
                  onChange={(e) => setTeacherPlanForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Plano Básico"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <Textarea
                  value={teacherPlanForm.description}
                  onChange={(e) => setTeacherPlanForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição do plano..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço (R$) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={teacherPlanForm.price}
                    onChange={(e) => setTeacherPlanForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="99.90"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comissão (%) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={teacherPlanForm.commission_rate}
                    onChange={(e) => setTeacherPlanForm(prev => ({ ...prev, commission_rate: e.target.value }))}
                    placeholder="70.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Benefícios
                </label>
                {teacherPlanForm.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <Input
                      value={feature}
                      onChange={(e) => updateFeature('teacher', index, e.target.value)}
                      placeholder="Digite um benefício"
                    />
                    {teacherPlanForm.features.length > 1 && (
                      <Button
                        onClick={() => removeFeature('teacher', index)}
                        variant="outline"
                        size="sm"
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  onClick={() => addFeature('teacher')}
                  variant="outline"
                  size="sm"
                >
                  + Adicionar Benefício
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-6">
              <Button
                onClick={handleCreateTeacherPlan}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Criar Plano
              </Button>
              <Button
                onClick={() => setShowTeacherModal(false)}
                variant="outline"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Student Plan Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-hide">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Novo Plano Aluno</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Plano *
                </label>
                <Input
                  value={studentPlanForm.name}
                  onChange={(e) => setStudentPlanForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Pacote 8 Aulas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <Textarea
                  value={studentPlanForm.description}
                  onChange={(e) => setStudentPlanForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição do plano..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço (R$) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={studentPlanForm.price}
                    onChange={(e) => setStudentPlanForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="200.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Créditos *
                  </label>
                  <Input
                    type="number"
                    value={studentPlanForm.credits_included}
                    onChange={(e) => setStudentPlanForm(prev => ({ ...prev, credits_included: e.target.value }))}
                    placeholder="8"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Validade *
                  </label>
                  <Input
                    type="number"
                    value={studentPlanForm.validity_days}
                    onChange={(e) => setStudentPlanForm(prev => ({ ...prev, validity_days: e.target.value }))}
                    placeholder="30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Benefícios
                </label>
                {studentPlanForm.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <Input
                      value={feature}
                      onChange={(e) => updateFeature('student', index, e.target.value)}
                      placeholder="Digite um benefício"
                    />
                    {studentPlanForm.features.length > 1 && (
                      <Button
                        onClick={() => removeFeature('student', index)}
                        variant="outline"
                        size="sm"
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  onClick={() => addFeature('student')}
                  variant="outline"
                  size="sm"
                >
                  + Adicionar Benefício
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-6">
              <Button
                onClick={handleCreateStudentPlan}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Criar Plano
              </Button>
              <Button
                onClick={() => setShowStudentModal(false)}
                variant="outline"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}