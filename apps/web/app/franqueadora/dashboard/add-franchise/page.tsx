'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { useFranqueadoraStore } from '@/lib/stores/franqueadora-store'
import FranqueadoraGuard from '@/components/auth/franqueadora-guard'
import WizardStepper from '@/components/franchise-form/WizardStepper'
import BasicStep from '@/components/franchise-form/BasicStep'
import FinancialStep from '@/components/franchise-form/FinancialStep'
import ContractAdminStep from '@/components/franchise-form/ContractAdminStep'
import { validateCpfCnpj } from '@/lib/utils'

interface FranchiseFormData {
  name: string
  email: string
  phone: string
  city: string
  state: string
  address: string
  address_number: string
  province: string
  zip_code: string
  cpf_cnpj: string
  company_type: string
  birth_date: string
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
  const [currentStep, setCurrentStep] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState<FranchiseFormData>({
    name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    address: '',
    address_number: '',
    province: '',
    zip_code: '',
    cpf_cnpj: '',
    company_type: '',
    birth_date: '',
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

  const validateBasic = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const e: Record<string, string> = {}
    if (!formData.name) e.name = 'Nome é obrigatório'
    if (!formData.email) e.email = 'Email é obrigatório'
    else if (!emailRegex.test(formData.email)) e.email = 'Email inválido'
    if (!formData.city) e.city = 'Cidade é obrigatória'
    if (!formData.state) e.state = 'Estado é obrigatório'
    if (!formData.address) e.address = 'Endereço é obrigatório'
    if (!formData.address_number) e.address_number = 'Número é obrigatório'
    if (!formData.province) e.province = 'Bairro é obrigatório'

    // CPF/CNPJ é obrigatório
    if (!formData.cpf_cnpj || formData.cpf_cnpj.trim() === '') {
      e.cpf_cnpj = 'CPF/CNPJ é obrigatório'
    } else if (!validateCpfCnpj(formData.cpf_cnpj)) {
      e.cpf_cnpj = 'CPF ou CNPJ inválido. Verifique os dígitos verificadores.'
    } else {
      // Determinar se é CPF (11 dígitos) ou CNPJ (14 dígitos)
      const cpfCnpjDigits = formData.cpf_cnpj.replace(/\D/g, '')
      const isCpf = cpfCnpjDigits.length === 11
      const isCnpj = cpfCnpjDigits.length === 14

      // Data de nascimento é obrigatória para CPF (pessoa física)
      if (isCpf) {
        if (!formData.birth_date || formData.birth_date.trim() === '') {
          e.birth_date = 'Data de nascimento é obrigatória para pessoa física (CPF)'
        }
      }

      // Tipo de empresa é obrigatório para CNPJ (pessoa jurídica)
      if (isCnpj) {
        if (!formData.company_type || formData.company_type.trim() === '') {
          e.company_type = 'Tipo de empresa é obrigatório para pessoa jurídica (CNPJ)'
        } else if (!['MEI', 'LIMITED', 'ASSOCIATION'].includes(formData.company_type)) {
          e.company_type = 'Tipo de empresa inválido. Para CNPJ, deve ser: MEI, LIMITED ou ASSOCIATION.'
        }
      }
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateFinancial = () => {
    const e: Record<string, string> = {}
    if (formData.franchise_fee < 0) e.franchise_fee = 'Não pode ser negativo'
    if (formData.royalty_percentage < 0 || formData.royalty_percentage > 100) e.royalty_percentage = 'Percentual deve estar entre 0 e 100'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateContractAdmin = () => {
    const e: Record<string, string> = {}
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    // Datas de contrato são opcionais. Se ambas forem informadas, validar ordem.
    if (formData.contract_start_date && formData.contract_end_date) {
      const start = new Date(formData.contract_start_date)
      const end = new Date(formData.contract_end_date)
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end < start) {
        e.contract_end_date = 'Término deve ser ≥ início'
      }
    }
    if (!formData.admin_name) e.admin_name = 'Obrigatório'
    if (!formData.admin_email) e.admin_email = 'Obrigatório'
    else if (!emailRegex.test(formData.admin_email)) e.admin_email = 'Email inválido'
    if (!formData.admin_password || formData.admin_password.length < 6) e.admin_password = 'Mínimo 6 caracteres'
    else {
      if (!/(?=.*[a-z])/.test(formData.admin_password)) e.admin_password = 'Inclua letra minúscula'
      if (!/(?=.*[A-Z])/.test(formData.admin_password)) e.admin_password = 'Inclua letra maiúscula'
      if (!/(?=.*\d)/.test(formData.admin_password)) e.admin_password = 'Inclua número'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validações por etapa
      if (!validateBasic()) { setCurrentStep(0); return }
      if (!validateFinancial()) { setCurrentStep(1); return }
      if (!validateContractAdmin()) { setCurrentStep(2); return }

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
      // CPF/CNPJ já está sem formatação (removida no BasicStep)
      // Mas vamos garantir que não seja null (já validado acima)
      const cpfCnpjValue = formData.cpf_cnpj?.trim() || ''

      if (!cpfCnpjValue) {
        toast.error('CPF/CNPJ é obrigatório')
        setCurrentStep(0)
        return
      }

      const newFranchise = {
        franqueadora_id: franqueadora.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        address: formData.address || null,
        address_number: formData.address_number,
        province: formData.province,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code || null,
        cpf_cnpj: cpfCnpjValue, // Já validado e sem formatação
        company_type: formData.company_type || null,
        birth_date: formData.birth_date || null,
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

    } catch {
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
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-gray-500 hover:text-meu-primary -ml-2 h-10 w-10 rounded-full"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-meu-primary tracking-tight">Nova Franquia</h1>
              <p className="text-sm text-gray-500">Preencha os dados abaixo para cadastrar uma unidade.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <WizardStepper steps={["Básico", "Financeiro", "Contrato & Admin"]} current={currentStep} />

          <Card className="p-6">
            {currentStep === 0 && (
              <BasicStep
                data={{
                  name: formData.name,
                  email: formData.email,
                  phone: formData.phone,
                  address: formData.address,
                  address_number: formData.address_number,
                  province: formData.province,
                  zip_code: formData.zip_code,
                  city: formData.city,
                  state: formData.state,
                  cpf_cnpj: formData.cpf_cnpj,
                  company_type: formData.company_type,
                  birth_date: formData.birth_date,
                  manager_name: formData.manager_name,
                  manager_phone: formData.manager_phone,
                  manager_email: formData.manager_email,
                }}
                states={BRAZILIAN_STATES}
                errors={errors}
                onChange={(field, value) => handleInputChange(field as any, value)}
                onNext={() => { if (validateBasic()) setCurrentStep(1) }}
              />
            )}

            {currentStep === 1 && (
              <FinancialStep
                data={{
                  franchise_fee: formData.franchise_fee,
                  royalty_percentage: formData.royalty_percentage,
                  monthly_revenue: formData.monthly_revenue,
                }}
                errors={errors}
                onChange={(field, value) => handleInputChange(field as any, value)}
                onPrev={() => setCurrentStep(0)}
                onNext={() => { if (validateFinancial()) setCurrentStep(2) }}
              />
            )}

            {currentStep === 2 && (
              <ContractAdminStep
                data={{
                  contract_start_date: formData.contract_start_date,
                  contract_end_date: formData.contract_end_date,
                  is_active: formData.is_active,
                  admin_name: formData.admin_name,
                  admin_email: formData.admin_email,
                  admin_password: formData.admin_password,
                }}
                errors={errors}
                onChange={(field, value) => handleInputChange(field as any, value as any)}
                onPrev={() => setCurrentStep(1)}
                submitting={isLoading}
              />
            )}
          </Card>
        </form>
      </div>
    </FranqueadoraGuard>
  )
}
