"use client"

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCpfCnpj, unformatCpfCnpj, validateCpfCnpj } from '@/lib/utils'

export interface BasicStepData {
  name: string
  email: string
  phone: string
  address: string
  address_number: string
  province: string
  zip_code: string
  city: string
  state: string
  cpf_cnpj: string
  company_type: string
  birth_date: string
  manager_name: string
  manager_phone: string
  manager_email: string
}

interface Props {
  data: BasicStepData
  states: string[]
  errors?: Record<string, string>
  onChange: (field: keyof BasicStepData, value: string) => void
  onNext: () => void
}

const formatPhone = (value: string) => {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim().replace(/[- ]$/, '')
  }
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim().replace(/[- ]$/, '')
}

const formatCep = (value: string) => {
  const d = value.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return d.replace(/(\d{5})(\d{0,3})/, '$1-$2')
}

export default function BasicStep({ data, states, errors, onChange, onNext }: Props) {
  const [isCpfCnpjFocused, setIsCpfCnpjFocused] = useState<boolean>(false)

  const handleCpfCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value
    newValue = unformatCpfCnpj(newValue)
    // Limita a 14 dígitos (CNPJ)
    newValue = newValue.slice(0, 14)
    onChange('cpf_cnpj', newValue)
  }

  const handleCpfCnpjFocus = () => {
    setIsCpfCnpjFocused(true)
  }

  const handleCpfCnpjBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsCpfCnpjFocused(false)
    const currentValue = e.target.value
    const unformatted = unformatCpfCnpj(currentValue)
    
    // Validar apenas se tiver valor
    if (unformatted && unformatted.length > 0) {
      const isValid = validateCpfCnpj(unformatted)
      if (!isValid) {
        // Trigger error via onChange com valor especial ou usar callback de erro
        // Por enquanto, vamos apenas não atualizar se inválido
        // O erro será mostrado na validação do formulário
      }
    }
    
    onChange('cpf_cnpj', unformatted)
  }

  const displayCpfCnpj = isCpfCnpjFocused ? data.cpf_cnpj : formatCpfCnpj(data.cpf_cnpj)
  
  // Determinar se é CPF (11 dígitos) ou CNPJ (14 dígitos)
  const cpfCnpjDigits = data.cpf_cnpj.replace(/\D/g, '')
  const isCpf = cpfCnpjDigits.length === 11
  const isCnpj = cpfCnpjDigits.length === 14

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Franquia *</label>
          <Input
            value={data.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Ex: Academia FitLife - Centro"
          />
          {errors?.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
          <Input
            type="email"
            value={data.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="contato@franquia.com"
          />
          {errors?.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
          <Input
            value={formatPhone(data.phone)}
            onChange={(e) => onChange('phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="(11) 99999-9999"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Endereço *</label>
          <Input
            value={data.address}
            onChange={(e) => onChange('address', e.target.value)}
            placeholder="Rua Exemplo"
            className={errors?.address ? 'border-red-500' : ''}
          />
          {errors?.address && <p className="text-xs text-red-600 mt-1">{errors.address}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Número *</label>
          <Input
            value={data.address_number}
            onChange={(e) => onChange('address_number', e.target.value)}
            placeholder="123"
            className={errors?.address_number ? 'border-red-500' : ''}
          />
          {errors?.address_number && <p className="text-xs text-red-600 mt-1">{errors.address_number}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Bairro *</label>
          <Input
            value={data.province}
            onChange={(e) => onChange('province', e.target.value)}
            placeholder="Centro"
            className={errors?.province ? 'border-red-500' : ''}
          />
          {errors?.province && <p className="text-xs text-red-600 mt-1">{errors.province}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">CEP</label>
          <Input
            value={formatCep(data.zip_code)}
            onChange={(e) => onChange('zip_code', e.target.value.replace(/\D/g, '').slice(0, 8))}
            placeholder="00000-000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cidade *</label>
          <Input
            value={data.city}
            onChange={(e) => onChange('city', e.target.value)}
            placeholder="São Paulo"
          />
          {errors?.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">CPF/CNPJ *</label>
          <Input
            value={displayCpfCnpj}
            onChange={handleCpfCnpjChange}
            onFocus={handleCpfCnpjFocus}
            onBlur={handleCpfCnpjBlur}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            maxLength={18}
            className={errors?.cpf_cnpj ? 'border-red-500' : ''}
          />
          {errors?.cpf_cnpj && <p className="text-xs text-red-600 mt-1">{errors.cpf_cnpj}</p>}
        </div>
        {isCpf && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data de Nascimento *</label>
            <Input
              type="date"
              value={data.birth_date}
              onChange={(e) => onChange('birth_date', e.target.value)}
              className={errors?.birth_date ? 'border-red-500' : ''}
              max={new Date().toISOString().split('T')[0]}
            />
            {errors?.birth_date && <p className="text-xs text-red-600 mt-1">{errors.birth_date}</p>}
          </div>
        )}
        {isCnpj && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Empresa *</label>
            <select
              value={data.company_type}
              onChange={(e) => onChange('company_type', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-meu-primary ${
                errors?.company_type ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Selecione o tipo de empresa</option>
              <option value="MEI">MEI - Microempreendedor Individual</option>
              <option value="LIMITED">LTDA - Sociedade Limitada</option>
              <option value="ASSOCIATION">Associação</option>
            </select>
            {errors?.company_type && <p className="text-xs text-red-600 mt-1">{errors.company_type}</p>}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Estado *</label>
          <select
            value={data.state}
            onChange={(e) => onChange('state', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-meu-primary"
          >
            <option value="">Selecione o estado</option>
            {states.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
          {errors?.state && <p className="text-xs text-red-600 mt-1">{errors.state}</p>}
        </div>
      </div>

      <div className="pt-2">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Dados do Gestor (opcional)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Gestor</label>
            <Input
              value={data.manager_name}
              onChange={(e) => onChange('manager_name', e.target.value)}
              placeholder="João Silva"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email do Gestor</label>
            <Input
              type="email"
              value={data.manager_email}
              onChange={(e) => onChange('manager_email', e.target.value)}
              placeholder="gestor@franquia.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Telefone do Gestor</label>
            <Input
              value={formatPhone(data.manager_phone)}
              onChange={(e) => onChange('manager_phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} className="bg-meu-primary text-white">Próximo</Button>
      </div>
    </div>
  )
}
