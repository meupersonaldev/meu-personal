"use client"

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label' // Assuming you have a Label component or will use native label
import { formatCpfCnpj, unformatCpfCnpj, validateCpfCnpj } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

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
    onChange('cpf_cnpj', unformatted)
  }

  const displayCpfCnpj = isCpfCnpjFocused ? data.cpf_cnpj : formatCpfCnpj(data.cpf_cnpj)

  const cpfCnpjDigits = data.cpf_cnpj.replace(/\D/g, '')
  const isCpf = cpfCnpjDigits.length === 11
  const isCnpj = cpfCnpjDigits.length === 14

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-gray-500">Nome da Franquia <span className="text-red-500">*</span></Label>
          <Input
            value={data.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Ex: Academia FitLife - Centro"
            className={cn("h-10", errors?.name && "border-red-500 focus-visible:ring-red-500")}
          />
          {errors?.name && <p className="text-xs text-red-600 font-medium">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-gray-500">Email <span className="text-red-500">*</span></Label>
          <Input
            type="email"
            value={data.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="contato@franquia.com"
            className={cn("h-10", errors?.email && "border-red-500 focus-visible:ring-red-500")}
          />
          {errors?.email && <p className="text-xs text-red-600 font-medium">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-gray-500">Telefone</Label>
          <Input
            value={formatPhone(data.phone)}
            onChange={(e) => onChange('phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="(11) 99999-9999"
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-gray-500">CPF/CNPJ <span className="text-red-500">*</span></Label>
          <Input
            value={displayCpfCnpj}
            onChange={handleCpfCnpjChange}
            onFocus={handleCpfCnpjFocus}
            onBlur={handleCpfCnpjBlur}
            placeholder="000.000.000-00"
            maxLength={18}
            className={cn("h-10", errors?.cpf_cnpj && "border-red-500 focus-visible:ring-red-500")}
          />
          {errors?.cpf_cnpj && <p className="text-xs text-red-600 font-medium">{errors.cpf_cnpj}</p>}
        </div>

        {isCpf && (
          <div className="space-y-2 bg-blue-50/50 p-3 rounded-md border border-blue-100 md:col-span-2">
            <Label className="text-xs font-semibold uppercase text-blue-700">Data de Nascimento <span className="text-red-500">*</span></Label>
            <Input
              type="date"
              value={data.birth_date}
              onChange={(e) => onChange('birth_date', e.target.value)}
              className={cn("h-10 bg-white", errors?.birth_date && "border-red-500")}
              max={new Date().toISOString().split('T')[0]}
            />
            {errors?.birth_date && <p className="text-xs text-red-600 font-medium">{errors.birth_date}</p>}
          </div>
        )}

        {isCnpj && (
          <div className="space-y-2 bg-blue-50/50 p-3 rounded-md border border-blue-100 md:col-span-2">
            <Label className="text-xs font-semibold uppercase text-blue-700">Tipo de Empresa <span className="text-red-500">*</span></Label>
            <select
              value={data.company_type}
              onChange={(e) => onChange('company_type', e.target.value)}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                errors?.company_type && "border-red-500"
              )}
            >
              <option value="">Selecione o tipo de empresa</option>
              <option value="MEI">MEI - Microempreendedor Individual</option>
              <option value="LIMITED">LTDA - Sociedade Limitada</option>
              <option value="ASSOCIATION">Associação</option>
            </select>
            {errors?.company_type && <p className="text-xs text-red-600 font-medium">{errors.company_type}</p>}
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-gray-500">CEP</Label>
          <Input
            value={formatCep(data.zip_code)}
            onChange={(e) => onChange('zip_code', e.target.value.replace(/\D/g, '').slice(0, 8))}
            placeholder="00000-000"
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-gray-500">Endereço <span className="text-red-500">*</span></Label>
          <Input
            value={data.address}
            onChange={(e) => onChange('address', e.target.value)}
            placeholder="Rua Exemplo"
            className={cn("h-10", errors?.address && "border-red-500 focus-visible:ring-red-500")}
          />
          {errors?.address && <p className="text-xs text-red-600 font-medium">{errors.address}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-gray-500">Número <span className="text-red-500">*</span></Label>
            <Input
              value={data.address_number}
              onChange={(e) => onChange('address_number', e.target.value)}
              placeholder="123"
              className={cn("h-10", errors?.address_number && "border-red-500 focus-visible:ring-red-500")}
            />
            {errors?.address_number && <p className="text-xs text-red-600 font-medium">{errors.address_number}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-gray-500">Bairro <span className="text-red-500">*</span></Label>
            <Input
              value={data.province}
              onChange={(e) => onChange('province', e.target.value)}
              placeholder="Centro"
              className={cn("h-10", errors?.province && "border-red-500 focus-visible:ring-red-500")}
            />
            {errors?.province && <p className="text-xs text-red-600 font-medium">{errors.province}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-gray-500">Cidade <span className="text-red-500">*</span></Label>
            <Input
              value={data.city}
              onChange={(e) => onChange('city', e.target.value)}
              placeholder="São Paulo"
              className={cn("h-10", errors?.city && "border-red-500 focus-visible:ring-red-500")}
            />
            {errors?.city && <p className="text-xs text-red-600 font-medium">{errors.city}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-gray-500">Estado <span className="text-red-500">*</span></Label>
            <select
              value={data.state}
              onChange={(e) => onChange('state', e.target.value)}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                errors?.state && "border-red-500"
              )}
            >
              <option value="">UF</option>
              {states.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
            {errors?.state && <p className="text-xs text-red-600 font-medium">{errors.state}</p>}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100">
        <h3 className="text-sm font-bold text-meu-primary mb-4 flex items-center gap-2">
          Dados do Gestor <span className="text-xs font-normal text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">(Opcional)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-lg">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-gray-500">Nome do Gestor</Label>
            <Input
              value={data.manager_name}
              onChange={(e) => onChange('manager_name', e.target.value)}
              placeholder="João Silva"
              className="h-10 bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-gray-500">Email do Gestor</Label>
            <Input
              type="email"
              value={data.manager_email}
              onChange={(e) => onChange('manager_email', e.target.value)}
              placeholder="gestor@franquia.com"
              className="h-10 bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-gray-500">Telefone do Gestor</Label>
            <Input
              value={formatPhone(data.manager_phone)}
              onChange={(e) => onChange('manager_phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="(11) 99999-9999"
              className="h-10 bg-white"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onNext} className="bg-meu-primary hover:bg-meu-primary-dark text-white px-8 h-10 shadow-lg shadow-meu-primary/20 transition-all hover:scale-105 active:scale-95">
          Próximo <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
