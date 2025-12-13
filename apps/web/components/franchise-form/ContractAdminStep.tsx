"use client"

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { ChevronLeft, Save, Calendar, User, Mail, Lock } from 'lucide-react'

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
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">

      {/* Dados do Contrato */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-meu-primary flex items-center gap-2 pb-2 border-b border-gray-100">
          <Calendar className="w-4 h-4" /> Vigência do Contrato
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-gray-500">Início do Contrato</Label>
            <Input
              type="date"
              value={data.contract_start_date}
              onChange={(e) => onChange('contract_start_date', e.target.value)}
              className="h-10"
            />
            {errors?.contract_start_date && <p className="text-xs text-red-600 font-medium">{errors.contract_start_date}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-gray-500">Término do Contrato</Label>
            <Input
              type="date"
              value={data.contract_end_date}
              onChange={(e) => onChange('contract_end_date', e.target.value)}
              className="h-10"
            />
            {errors?.contract_end_date && <p className="text-xs text-red-600 font-medium">{errors.contract_end_date}</p>}
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-meu-primary transition-colors cursor-pointer" onClick={() => onChange('is_active', !data.is_active)}>
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={data.is_active}
                  onChange={(e) => onChange('is_active', e.target.checked)}
                  className="h-5 w-5 text-meu-primary focus:ring-meu-primary border-gray-300 rounded cursor-pointer"
                />
              </div>

              <div className="flex flex-col cursor-pointer">
                <label htmlFor="is_active" className="text-sm font-semibold text-gray-900 cursor-pointer">Franquia Ativa</label>
                <span className="text-xs text-gray-500">Ao desativar, o acesso ao painel será bloqueado imediatamente.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dados do Administrador */}
      <div className="space-y-4 pt-4">
        <h3 className="text-sm font-bold text-meu-primary flex items-center gap-2 pb-2 border-b border-gray-100">
          <Lock className="w-4 h-4" /> Acesso do Administrador
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-blue-50/30 rounded-xl border border-blue-50">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-gray-500 flex items-center gap-1"><User className="w-3 h-3" /> Nome do Administrador <span className="text-red-500">*</span></Label>
            <Input
              value={data.admin_name}
              onChange={(e) => onChange('admin_name', e.target.value)}
              placeholder="João Silva"
              className={cn("h-10 bg-white", errors?.admin_name && "border-red-500")}
            />
            {errors?.admin_name && <p className="text-xs text-red-600 font-medium">{errors.admin_name}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" /> Email de Login <span className="text-red-500">*</span></Label>
            <Input
              type="email"
              value={data.admin_email}
              onChange={(e) => onChange('admin_email', e.target.value)}
              placeholder="admin@franquia.com"
              className={cn("h-10 bg-white", errors?.admin_email && "border-red-500")}
            />
            <p className="text-[10px] text-gray-500">Este será o email principal para login no painel da franquia.</p>
            {errors?.admin_email && <p className="text-xs text-red-600 font-medium">{errors.admin_email}</p>}
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label className="text-xs font-semibold uppercase text-gray-500 flex items-center gap-1"><Lock className="w-3 h-3" /> Senha Inicial <span className="text-red-500">*</span></Label>
            <Input
              type="password"
              value={data.admin_password}
              onChange={(e) => onChange('admin_password', e.target.value)}
              placeholder="••••••••"
              minLength={6}
              className={cn("h-10 bg-white", errors?.admin_password && "border-red-500")}
            />
            <p className="text-[10px] text-gray-500">Mínimo de 6 caracteres. Recomendado usar letras maiúsculas, minúsculas e números.</p>
            {errors?.admin_password && <p className="text-xs text-red-600 font-medium">{errors.admin_password}</p>}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t border-gray-100">
        <Button variant="outline" onClick={onPrev} className="h-10 px-6">
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-10 shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
        >
          {submitting ? (
            <>Salvando...</>
          ) : (
            <><Save className="mr-2 h-4 w-4" /> Salvar Franquia</>
          )}
        </Button>
      </div>
    </div>
  )
}
