'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, User, GraduationCap, CreditCard, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useFranquiaStore } from '@/lib/stores/franquia-store'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const { teachers, students, addClass, updateStudent } = useFranquiaStore()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    teacherId: '',
    studentId: '',
    date: '',
    time: '',
    price: 50
  })

  const activeTeachers = teachers.filter(t => t.status === 'active')
  const activeStudents = students.filter(s => s.status === 'active')

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        teacherId: '',
        studentId: '',
        date: '',
        time: '',
        price: 50
      })
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validações
      if (!formData.teacherId || !formData.studentId || !formData.date || !formData.time) {
        toast.error('Preencha todos os campos obrigatórios')
        setIsLoading(false)
        return
      }

      // Verificar se o aluno tem créditos
      const student = students.find(s => s.id === formData.studentId)
      if (!student || student.credits < 1) {
        toast.error('Aluno não possui créditos suficientes')
        setIsLoading(false)
        return
      }

      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Criar agendamento
      const newClass = {
        teacherId: formData.teacherId,
        studentId: formData.studentId,
        date: formData.date,
        time: formData.time,
        status: 'scheduled' as const,
        price: formData.price
      }

      addClass(newClass)

      // Deduzir 1 crédito do aluno
      updateStudent(formData.studentId, {
        credits: student.credits - 1,
        lastActivity: formData.date
      })

      toast.success('Aula agendada com sucesso!')
      onClose()
    } catch (error) {
      toast.error('Erro ao agendar aula. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 6; hour <= 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
      if (hour < 22) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`)
      }
    }
    return slots
  }

  const getMinDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30) // 30 dias no futuro
    return maxDate.toISOString().split('T')[0]
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Nova Aula</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Professor */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <GraduationCap className="h-4 w-4 inline mr-2" />
              Professor
            </label>
            <select
              value={formData.teacherId}
              onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione um professor</option>
              {activeTeachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} - {teacher.specialty}
                </option>
              ))}
            </select>
          </div>

          {/* Aluno */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <User className="h-4 w-4 inline mr-2" />
              Aluno
            </label>
            <select
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione um aluno</option>
              {activeStudents.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.credits} créditos)
                </option>
              ))}
            </select>
          </div>

          {/* Data */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Calendar className="h-4 w-4 inline mr-2" />
              Data
            </label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              min={getMinDate()}
              max={getMaxDate()}
              required
              className="w-full"
            />
          </div>

          {/* Horário */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Clock className="h-4 w-4 inline mr-2" />
              Horário
            </label>
            <select
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione um horário</option>
              {generateTimeSlots().map(time => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          {/* Preço */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <CreditCard className="h-4 w-4 inline mr-2" />
              Preço (R$)
            </label>
            <Input
              type="number"
              min="10"
              max="200"
              step="5"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 50 })}
              required
              className="w-full"
            />
          </div>

          {/* Resumo */}
          {formData.teacherId && formData.studentId && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-medium text-blue-900">Resumo da Aula</h3>
              <div className="text-sm text-blue-800">
                <p><strong>Professor:</strong> {activeTeachers.find(t => t.id === formData.teacherId)?.name}</p>
                <p><strong>Aluno:</strong> {activeStudents.find(s => s.id === formData.studentId)?.name}</p>
                {formData.date && <p><strong>Data:</strong> {new Date(formData.date).toLocaleDateString('pt-BR')}</p>}
                {formData.time && <p><strong>Horário:</strong> {formData.time}</p>}
                <p><strong>Valor:</strong> R$ {formData.price}</p>
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
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Agendando...
                </>
              ) : (
                'Agendar Aula'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}