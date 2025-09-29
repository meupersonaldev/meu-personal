'use client'

import { useState, useEffect } from 'react'
import { X, CreditCard, Plus, Minus, Eye, Edit, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useFranquiaStore, Plan } from '@/lib/stores/franquia-supabase-store'

interface PlanModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'create' | 'edit' | 'view'
  plan?: Plan | null
}

export default function PlanModal({ isOpen, onClose, mode, plan }: PlanModalProps) {
  const { addPlan, updatePlan } = useFranquiaStore()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 50,
    type: 'package' as 'package',
    features: [''],
    status: 'active' as 'active' | 'inactive',
    hoursIncluded: 1
  })

  useEffect(() => {
    if (isOpen) {
      if (plan) {
        setFormData({
          name: plan.name,
          description: plan.description,
          price: plan.price,
          type: plan.type,
          features: [...plan.features],
          status: plan.status,
          hoursIncluded: plan.hoursIncluded
        })
      } else {
        setFormData({
          name: '',
          description: '',
          price: 50,
          type: 'package',
          features: [''],
          status: 'active',
          hoursIncluded: 1
        })
      }
    }
  }, [isOpen, plan])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validações
      if (!formData.name.trim() || !formData.description.trim()) {
        toast.error('Preencha nome e descrição')
        setIsLoading(false)
        return
      }

      if (formData.price < 30 || formData.price > 1000) {
        toast.error('Preço deve estar entre R$ 30 e R$ 1000')
        setIsLoading(false)
        return
      }

      const validFeatures = formData.features.filter(f => f.trim())
      if (validFeatures.length === 0) {
        toast.error('Adicione pelo menos um benefício')
        setIsLoading(false)
        return
      }

      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 1200))

      const planData = {
        ...formData,
        features: validFeatures
      }

      if (mode === 'edit' && plan) {
        updatePlan(plan.id, planData)
        toast.success('Pacote atualizado com sucesso!')
      } else {
        addPlan(planData)
        toast.success('Pacote criado com sucesso!')
      }

      onClose()
    } catch (error) {
      toast.error('Erro ao salvar pacote. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }))
  }

  const removeFeature = (index: number) => {
    if (formData.features.length > 1) {
      setFormData(prev => ({
        ...prev,
        features: prev.features.filter((_, i) => i !== index)
      }))
    }
  }

  const updateFeature = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((feature, i) =>
        i === index ? value : feature
      )
    }))
  }

  const isViewMode = mode === 'view'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            {mode === 'view' ? (
              <Eye className="h-5 w-5 text-blue-600" />
            ) : mode === 'edit' ? (
              <Edit className="h-5 w-5 text-blue-600" />
            ) : (
              <CreditCard className="h-5 w-5 text-blue-600" />
            )}
            <h2 className="text-xl font-bold text-gray-900">
              {mode === 'view' ? 'Visualizar Pacote' :
               mode === 'edit' ? 'Editar Pacote' : 'Novo Pacote'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome do Pacote */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Nome do Pacote *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Pacote Básico"
                required
                disabled={isViewMode}
                className="w-full"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Descrição *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o que o pacote oferece"
                required
                disabled={isViewMode}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Preço e Horas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Preço Total (R$) *
                </label>
                <Input
                  type="number"
                  min="30"
                  max="1000"
                  step="5"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                  required
                  disabled={isViewMode}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Horas Incluídas *
                </label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.hoursIncluded}
                  onChange={(e) => setFormData({ ...formData, hoursIncluded: parseInt(e.target.value) || 1 })}
                  required
                  disabled={isViewMode}
                  className="w-full"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={formData.status === 'active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    disabled={isViewMode}
                    className="text-blue-600"
                  />
                  <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="status"
                    value="inactive"
                    checked={formData.status === 'inactive'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    disabled={isViewMode}
                    className="text-blue-600"
                  />
                  <Badge className="bg-gray-100 text-gray-800">Inativo</Badge>
                </label>
              </div>
            </div>

            {/* Benefícios */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Benefícios do Pacote *
                </label>
                {!isViewMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addFeature}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {formData.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={feature}
                      onChange={(e) => updateFeature(index, e.target.value)}
                      placeholder="Ex: 1 hora de treino personalizado"
                      disabled={isViewMode}
                      className="flex-1"
                    />
                    {!isViewMode && formData.features.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeFeature(index)}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview do Pacote */}
            {(formData.name || formData.price) && (
              <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-medium text-blue-900">Preview do Pacote</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-900">{formData.name || 'Nome do Pacote'}</span>
                    <Badge className={formData.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {formData.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-sm text-blue-800">{formData.description}</p>
                  <div className="text-lg font-bold text-blue-600">
                    R$ {formData.price}
                    <span className="text-sm font-normal"> / {formData.hoursIncluded}h</span>
                  </div>
                  <div className="text-sm text-blue-800">
                    <strong>R$ {formData.hoursIncluded > 0 ? Math.round(formData.price / formData.hoursIncluded) : 0} por hora</strong>
                  </div>
                  {formData.features.filter(f => f.trim()).length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-blue-900 mb-1">Benefícios:</div>
                      <ul className="text-sm space-y-0.5">
                        {formData.features.filter(f => f.trim()).map((feature, index) => (
                          <li key={index} className="flex items-center text-blue-800">
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Actions */}
        {!isViewMode && (
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {mode === 'edit' ? 'Atualizar' : 'Criar'} Pacote
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}