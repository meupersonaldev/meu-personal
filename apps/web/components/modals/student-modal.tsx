'use client'

import { useState, useEffect } from 'react'
import { X, User, Mail, Phone, CreditCard, Calendar, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useFranquiaStore, Student } from '@/lib/stores/franquia-store'

interface StudentModalProps {
  isOpen: boolean
  onClose: () => void
  student?: Student | null
  mode: 'add' | 'edit' | 'view'
}

export default function StudentModal({ isOpen, onClose, student, mode }: StudentModalProps) {
  const { addStudent, updateStudent } = useFranquiaStore()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    credits: 5, // Créditos iniciais
    status: 'active' as 'active' | 'inactive'
  })

  useEffect(() => {
    if (student && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: student.name,
        email: student.email,
        phone: student.phone,
        credits: student.credits,
        status: student.status
      })
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        credits: 5,
        status: 'active'
      })
    }
  }, [student, mode, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (mode === 'add') {
        const newStudent = {
          ...formData,
          joinDate: new Date().toISOString().split('T')[0],
          lastActivity: new Date().toISOString().split('T')[0]
        }
        addStudent(newStudent)
        toast.success('Aluno adicionado com sucesso!')
      } else if (mode === 'edit' && student) {
        updateStudent(student.id, formData)
        toast.success('Aluno atualizado com sucesso!')
      }

      onClose()
    } catch (error) {
      toast.error('Erro ao salvar aluno. Tente novamente.')
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
            {mode === 'add' ? 'Adicionar Aluno' : mode === 'edit' ? 'Editar Aluno' : 'Detalhes do Aluno'}
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
              placeholder="Digite o nome do aluno"
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
              placeholder="aluno@email.com"
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

          {/* Créditos */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <CreditCard className="h-4 w-4 inline mr-2" />
              Créditos
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.credits}
              onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
              placeholder="0"
              disabled={mode === 'view'}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Cada crédito equivale a uma aula individual
            </p>
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
              </select>
            </div>
          )}

          {/* Informações adicionais (apenas no modo view/edit) */}
          {student && mode !== 'add' && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Informações</h3>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Membro desde:</span>
                  <span className="font-semibold">{new Date(student.joinDate).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Última atividade:</span>
                  <span className="font-semibold">{new Date(student.lastActivity).toLocaleDateString('pt-BR')}</span>
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
                className="bg-emerald-600 hover:bg-emerald-700"
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