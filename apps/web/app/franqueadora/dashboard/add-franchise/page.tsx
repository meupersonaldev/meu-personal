'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft, Building, Save, X } from 'lucide-react'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'

interface FranchiseFormData {
  name: string
  email: string
  phone: string
  city: string
  state: string
  address: string
  zip_code: string
  franchise_fee: number
  royalty_percentage: number
  monthly_revenue: number
  contract_start_date: string
  contract_end_date: string
  is_active: boolean
  manager_name: string
  manager_phone: string
  manager_email: string
  notes: string
  // Campos de login
  admin_email: string
  admin_password: string
  admin_name: string
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

export default function AddFranchisePage() {
  const router = useRouter()
  const { addAcademy, franqueadora } = useFranqueadoraStore()
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState<FranchiseFormData>({
    name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    address: '',
    zip_code: '',
    franchise_fee: 0,
    royalty_percentage: 0,
    monthly_revenue: 0,
    contract_start_date: '',
    contract_end_date: '',
    is_active: true,
    manager_name: '',
    manager_phone: '',
    manager_email: '',
    notes: '',
    // Campos de login
    admin_email: '',
    admin_password: '',
    admin_name: ''
  })

  const handleInputChange = (field: keyof FranchiseFormData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validações básicas
      if (!formData.name || !formData.email || !formData.city || !formData.state) {
        toast.error('Preencha todos os campos obrigatórios')
        return
      }

      // Validações de formato
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        toast.error('Email da franquia inválido')
        return
      }

      if (formData.admin_email && !emailRegex.test(formData.admin_email)) {
        toast.error('Email do administrador inválido')
        return
      }

      // Validar campos de admin
      if (!formData.admin_email || !formData.admin_password || !formData.admin_name) {
        toast.error('Preencha email, senha e nome do administrador da franquia')
        return
      }

      if (formData.admin_password.length < 6) {
        toast.error('A senha deve ter no mínimo 6 caracteres')
        return
      }

      if (formData.admin_password.length > 50) {
        toast.error('A senha deve ter no máximo 50 caracteres')
        return
      }

      // Validações de segurança para senha
      const password = formData.admin_password
      if (!/(?=.*[a-z])/.test(password)) {
        toast.error('A senha deve conter pelo menos uma letra minúscula')
        return
      }
      if (!/(?=.*[A-Z])/.test(password)) {
        toast.error('A senha deve conter pelo menos uma letra maiúscula')
        return
      }
      if (!/(?=.*\d)/.test(password)) {
        toast.error('A senha deve conter pelo menos um número')
        return
      }

      // Validações financeiras
      if (formData.franchise_fee < 0 || formData.royalty_percentage < 0) {
        toast.error('Valores financeiros não podem ser negativos')
        return
      }

      if (formData.royalty_percentage > 100) {
        toast.error('Percentual de royalty não pode ser maior que 100%')
        return
      }

      if (formData.franchise_fee > 1000000) {
        toast.error('Taxa de franquia não pode ser maior que R$ 1.000.000')
        return
      }

      // Validar se tem franqueadora
      if (!franqueadora) {
        toast.error('Franqueadora não identificada. Faça login novamente.')
        return
      }

      // Validar se email do admin já existe
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const checkResponse = await fetch(`${API_URL}/api/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.admin_email })
      })

      if (checkResponse.ok) {
        const { exists } = await checkResponse.json()
        if (exists) {
          toast.error('Email do administrador já está em uso')
          return
        }
      }

      // Criar objeto da franquia
      const newFranchise = {
        franqueadora_id: franqueadora.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code || null,
        franchise_fee: formData.franchise_fee,
        royalty_percentage: formData.royalty_percentage,
        monthly_revenue: formData.monthly_revenue,
        contract_start_date: formData.contract_start_date || null,
        contract_end_date: formData.contract_end_date || null,
        is_active: formData.is_active,
        // Dados do admin
        admin_email: formData.admin_email,
        admin_password: formData.admin_password,
        admin_name: formData.admin_name
      }

      // Adicionar via store (Supabase) - agora cria usuário também
      const success = await addAcademy(newFranchise)

      if (!success) {
        toast.error('Erro ao salvar franquia no banco de dados')
        return
      }

      toast.success('Franquia e usuário admin criados com sucesso!')
      router.push('/franqueadora/dashboard')
      
    } catch (error) {
      console.error('Erro ao adicionar franquia:', error)
      toast.error('Erro ao adicionar franquia. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/franqueadora/dashboard')
  }

  return (
    <FranqueadoraGuard requiredPermission="canCreateFranchise">
      <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Adicionar Nova Franquia</h1>
                <p className="text-sm text-gray-600">Cadastre uma nova franquia no sistema</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
          {/* Informações Básicas */}
          <Card className="p-6">
            <div className="flex items-center mb-6">
              <Building className="h-5 w-5 text-meu-primary mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Informações Básicas</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Franquia *
                </label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ex: Academia FitLife - Centro"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="contato@franquia.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  Cidade *
                </label>
                <Input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="São Paulo"
                  required
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                  Estado *
                </label>
                <select
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-meu-primary"
                  required
                >
                  <option value="">Selecione o estado</option>
                  {BRAZILIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="franchise_fee" className="block text-sm font-medium text-gray-700 mb-2">
                  Taxa de Franquia (R$)
                </label>
                <Input
                  id="franchise_fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.franchise_fee}
                  onChange={(e) => handleInputChange('franchise_fee', parseFloat(e.target.value) || 0)}
                  placeholder="50000.00"
                />
              </div>
            </div>
          </Card>

          {/* Dados do Administrador da Franquia */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Administrador da Franquia</h2>
            <p className="text-sm text-gray-600 mb-6">
              Crie o login para o administrador gerenciar a franquia no sistema
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="admin_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Administrador *
                </label>
                <Input
                  id="admin_name"
                  type="text"
                  value={formData.admin_name}
                  onChange={(e) => handleInputChange('admin_name', e.target.value)}
                  placeholder="João Silva"
                  required
                />
              </div>

              <div>
                <label htmlFor="admin_email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email de Login *
                </label>
                <Input
                  id="admin_email"
                  type="email"
                  value={formData.admin_email}
                  onChange={(e) => handleInputChange('admin_email', e.target.value)}
                  placeholder="admin@franquia.com"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="admin_password" className="block text-sm font-medium text-gray-700 mb-2">
                  Senha de Acesso * (mínimo 6 caracteres)
                </label>
                <Input
                  id="admin_password"
                  type="password"
                  value={formData.admin_password}
                  onChange={(e) => handleInputChange('admin_password', e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Esta senha será usada pelo administrador para acessar o painel da franquia
                </p>
              </div>
            </div>
          </Card>

          {/* Informações Financeiras */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Informações Financeiras</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="royalty_percentage" className="block text-sm font-medium text-gray-700 mb-2">
                  Percentual de Royalty (%)
                </label>
                <Input
                  id="royalty_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.royalty_percentage}
                  onChange={(e) => handleInputChange('royalty_percentage', parseFloat(e.target.value) || 0)}
                  placeholder="8.5"
                />
              </div>

              <div>
                <label htmlFor="monthly_revenue" className="block text-sm font-medium text-gray-700 mb-2">
                  Receita Mensal Estimada (R$)
                </label>
                <Input
                  id="monthly_revenue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthly_revenue}
                  onChange={(e) => handleInputChange('monthly_revenue', parseFloat(e.target.value) || 0)}
                  placeholder="25000.00"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="h-4 w-4 text-meu-primary focus:ring-meu-primary border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Franquia Ativa
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Marque se a franquia está atualmente operando
                </p>
              </div>
            </div>
          </Card>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            
            <Button
              type="submit"
              className="bg-meu-primary hover:bg-meu-primary/90 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Franquia
                </>
              )}
            </Button>
          </div>
          </form>
      </div>
    </FranqueadoraGuard>
  )
}
