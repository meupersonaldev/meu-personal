"use client"

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface ContractAdminData {
  contract_start_date: string
  contract_end_date: string
  is_active: boolean
  admin_name: string
  admin_email: string
  admin_password: string
}

interface Props {
  data: ContractAdminData
  errors?: Record<string, string>
  onChange: (field: keyof ContractAdminData, value: string | boolean) => void
  onPrev: () => void
  submitting?: boolean
}

export default function ContractAdminStep({ data, errors, onChange, onPrev, submitting }: Props) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Início do Contrato</label>
          <Input
            type="date"
            value={data.contract_start_date}
            onChange={(e) => onChange('contract_start_date', e.target.value)}
          />
          {errors?.contract_start_date && <p className="text-xs text-red-600 mt-1">{errors.contract_start_date}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Término do Contrato</label>
          <Input
            type="date"
            value={data.contract_end_date}
            onChange={(e) => onChange('contract_end_date', e.target.value)}
          />
          {errors?.contract_end_date && <p className="text-xs text-red-600 mt-1">{errors.contract_end_date}</p>}
        </div>
        <div className="md:col-span-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={data.is_active}
              onChange={(e) => onChange('is_active', e.target.checked)}
              className="h-4 w-4 text-meu-primary focus:ring-meu-primary border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Franquia Ativa</label>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Administrador da Franquia</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Administrador *</label>
            <Input
              value={data.admin_name}
              onChange={(e) => onChange('admin_name', e.target.value)}
              placeholder="João Silva"
            />
            {errors?.admin_name && <p className="text-xs text-red-600 mt-1">{errors.admin_name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email de Login *</label>
            <Input
              type="email"
              value={data.admin_email}
              onChange={(e) => onChange('admin_email', e.target.value)}
              placeholder="admin@franquia.com"
            />
            {errors?.admin_email && <p className="text-xs text-red-600 mt-1">{errors.admin_email}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Senha de Acesso * (mínimo 6 caracteres)</label>
            <Input
              type="password"
              value={data.admin_password}
              onChange={(e) => onChange('admin_password', e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />
            {errors?.admin_password && <p className="text-xs text-red-600 mt-1">{errors.admin_password}</p>}
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button type="submit" disabled={submitting} className="bg-meu-primary text-white">
          {submitting ? 'Salvando...' : 'Salvar Franquia'}
        </Button>
      </div>
    </div>
  )
}
