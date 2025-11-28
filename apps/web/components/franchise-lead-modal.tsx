'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Building, Mail, Phone, MapPin, DollarSign, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

interface FranchiseLeadModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FranchiseLeadModal({ isOpen, onClose }: FranchiseLeadModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    investment_capacity: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${API_URL}/api/franqueadora/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar solicitação')
      }

      toast.success(data.message || 'Sua solicitação foi enviada com sucesso! Entraremos em contato em breve.')
      
      // Limpar formulário
      setFormData({
        name: '',
        email: '',
        phone: '',
        city: '',
        investment_capacity: '',
        message: ''
      })
      
      onClose()
    } catch (error: any) {
      console.error('Erro ao enviar lead:', error)
      toast.error(error.message || 'Erro ao enviar solicitação. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-meu-accent/20 rounded-full flex items-center justify-center">
              <Building className="h-6 w-6 text-meu-accent" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Receber Informações sobre Franquias
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-1">
                Preencha o formulário e nossa equipe entrará em contato em breve
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2 text-gray-700">
                <Mail className="h-4 w-4" />
                Nome Completo *
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Seu nome completo"
                required
                className="bg-gray-50 border-gray-200"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-gray-700">
                <Mail className="h-4 w-4" />
                E-mail *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="seu@email.com"
                required
                className="bg-gray-50 border-gray-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Telefone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2 text-gray-700">
                <Phone className="h-4 w-4" />
                Telefone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
                className="bg-gray-50 border-gray-200"
              />
            </div>

            {/* Cidade */}
            <div className="space-y-2">
              <Label htmlFor="city" className="flex items-center gap-2 text-gray-700">
                <MapPin className="h-4 w-4" />
                Cidade de Interesse
              </Label>
              <Input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Cidade onde quer abrir"
                className="bg-gray-50 border-gray-200"
              />
            </div>
          </div>

          {/* Capacidade de Investimento */}
          <div className="space-y-2">
            <Label htmlFor="investment_capacity" className="flex items-center gap-2 text-gray-700">
              <DollarSign className="h-4 w-4" />
              Capacidade de Investimento
            </Label>
            <Input
              id="investment_capacity"
              type="text"
              value={formData.investment_capacity}
              onChange={(e) => setFormData({ ...formData, investment_capacity: e.target.value })}
              placeholder="Ex: R$ 150.000 - R$ 300.000"
              className="bg-gray-50 border-gray-200"
            />
          </div>

          {/* Mensagem */}
          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2 text-gray-700">
              <MessageSquare className="h-4 w-4" />
              Mensagem
            </Label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Conte-nos sobre seu interesse na franquia..."
              rows={4}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-meu-accent focus:border-transparent resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-meu-accent to-yellow-400 hover:from-yellow-400 hover:to-meu-accent text-meu-primary font-bold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  Enviar Solicitação
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

