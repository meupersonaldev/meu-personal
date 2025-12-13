'use client'

import { X, Mail, Phone, MapPin, DollarSign, MessageSquare, Calendar, User } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface FranchiseLead {
  id: string
  name: string
  email: string
  phone?: string
  city?: string
  investment_capacity?: string
  message?: string
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL_SENT' | 'NEGOTIATING' | 'CLOSED_WON' | 'CLOSED_LOST'
  created_at: string
  updated_at?: string
}

interface FranchiseLeadDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  lead: FranchiseLead | null
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Novo',
  CONTACTED: 'Contatado',
  QUALIFIED: 'Qualificado',
  PROPOSAL_SENT: 'Proposta Enviada',
  NEGOTIATING: 'Em Negociação',
  CLOSED_WON: 'Fechado - Ganho',
  CLOSED_LOST: 'Fechado - Perdido'
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800 border-blue-200',
  CONTACTED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  QUALIFIED: 'bg-green-100 text-green-800 border-green-200',
  PROPOSAL_SENT: 'bg-purple-100 text-purple-800 border-purple-200',
  NEGOTIATING: 'bg-orange-100 text-orange-800 border-orange-200',
  CLOSED_WON: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CLOSED_LOST: 'bg-red-100 text-red-800 border-red-200'
}

export default function FranchiseLeadDetailsModal({
  isOpen,
  onClose,
  lead
}: FranchiseLeadDetailsModalProps) {
  if (!isOpen || !lead) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <Card className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-meu-primary/10 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-meu-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{lead.name}</h2>
                <Badge className={`mt-1 ${STATUS_COLORS[lead.status] || STATUS_COLORS.NEW}`}>
                  {STATUS_LABELS[lead.status] || lead.status}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações de Contato</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 mb-1">Email</p>
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-sm font-medium text-gray-900 hover:text-meu-primary transition-colors break-all"
                    >
                      {lead.email}
                    </a>
                  </div>
                </div>

                {lead.phone && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-500 mb-1">Telefone</p>
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-sm font-medium text-gray-900 hover:text-meu-primary transition-colors"
                      >
                        {lead.phone}
                      </a>
                    </div>
                  </div>
                )}

                {lead.city && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-500 mb-1">Cidade</p>
                      <p className="text-sm font-medium text-gray-900">{lead.city}</p>
                    </div>
                  </div>
                )}

                {lead.investment_capacity && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-500 mb-1">Capacidade de Investimento</p>
                      <p className="text-sm font-medium text-gray-900">{lead.investment_capacity}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Message */}
            {lead.message && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Mensagem</h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{lead.message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Dates */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Registro</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Data de Cadastro</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(lead.created_at)}</p>
                  </div>
                </div>
                {lead.updated_at && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Última Atualização</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(lead.updated_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-3 pt-6 border-t">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            {lead.email && (
              <Button
                onClick={() => window.location.href = `mailto:${lead.email}`}
                className="bg-meu-primary hover:bg-meu-primary/90"
              >
                <Mail className="h-4 w-4 mr-2" />
                Enviar Email
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

