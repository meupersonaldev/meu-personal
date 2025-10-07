'use client'

import { useState, useEffect } from 'react'
import { X, User, Mail, Phone, Tag, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from 'sonner'
import { useFranquiaStore, Teacher } from '@/lib/stores/franquia-store'

interface TeacherModalProps {
  isOpen: boolean
  onClose: () => void
  teacher?: Teacher | null
  mode: 'add' | 'edit' | 'view'
}

export default function TeacherModal({ isOpen, onClose, teacher, mode }: TeacherModalProps) {
  const { addTeacher, updateTeacher } = useFranquiaStore()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: '',
    status: 'active' as 'active' | 'inactive' | 'pending'
  })

  useEffect(() => {
    if (teacher && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        specialty: teacher.specialty,
        status: teacher.status
      })
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        specialty: '',
        status: 'active'
      })
    }
  }, [teacher, mode, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (mode === 'add') {
        const newTeacher = {
          ...formData,
          studentsCount: 0,
          totalClasses: 0,
          earnings: 0
        }
        addTeacher(newTeacher)
        toast.success('Professor adicionado com sucesso!')
      } else if (mode === 'edit' && teacher) {
        updateTeacher(teacher.id, formData)
        toast.success('Professor atualizado com sucesso!')
      }

      onClose()
    } catch (error) {
      toast.error('Erro ao salvar professor. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'add' ? 'Adicionar Professor' : mode === 'edit' ? 'Editar Professor' : 'Detalhes do Professor'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <User className="h-4 w-4 inline mr-2" />
              Nome Completo
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Digite o nome do professor"
              disabled={mode === 'view'}
              required
              className="w-full"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Mail className="h-4 w-4 inline mr-2" />
              Email
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="professor@email.com"
              disabled={mode === 'view'}
              required
              className="w-full"
            />
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Phone className="h-4 w-4 inline mr-2" />
              Telefone
            </label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(11) 99999-9999"
              disabled={mode === 'view'}
              required
              className="w-full"
            />
          </div>

          {/* Especialidade */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Tag className="h-4 w-4 inline mr-2" />
              Especialidade
            </label>
            <select
              value={formData.specialty}
              onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              disabled={mode === 'view'}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione uma especialidade</option>
              <option value="Musculação e Funcional">Musculação e Funcional</option>
              <option value="Crossfit e HIIT">Crossfit e HIIT</option>
              <option value="Pilates e Yoga">Pilates e Yoga</option>
              <option value="Natação">Natação</option>
              <option value="Boxe e Artes Marciais">Boxe e Artes Marciais</option>
              <option value="Dança e Aeróbicos">Dança e Aeróbicos</option>
              <option value="Reabilitação">Reabilitação</option>
            </select>
          </div>

          {/* Status */}
          {mode !== 'add' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="pending">Pendente</option>
              </select>
            </div>
          )}

          {/* Estatísticas (apenas no modo view/edit) */}
          {teacher && mode !== 'add' && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Estatísticas</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Alunos</p>
                  <p className="font-semibold">{teacher.studentsCount}</p>
                </div>
                <div>
                  <p className="text-gray-600">Aulas</p>
                  <p className="font-semibold">{teacher.totalClasses}</p>
                </div>
                <div>
                  <p className="text-gray-600">Ganhos</p>
                  <p className="font-semibold">R$ {teacher.earnings}</p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <p className="font-semibold">
                    {teacher.status === 'active'
                      ? 'Ativo'
                      : teacher.status === 'pending'
                        ? 'Pendente'
                        : 'Inativo'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {mode === 'view' ? 'Fechar' : 'Cancelar'}
            </Button>
            {mode !== 'view' && (
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  mode === 'add' ? 'Adicionar' : 'Salvar'
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
