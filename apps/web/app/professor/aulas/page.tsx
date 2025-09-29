'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { 
  QrCode,
  Clock,
  MapPin,
  Users,
  Filter,
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Share2
} from 'lucide-react'
import QRCode from 'react-qr-code'

// Dados mockados para aulas
const mockAulas = [
  {
    id: 1,
    aluno: 'João Silva',
    data: '2024-01-20',
    horario: '08:00',
    local: 'Academia FitLife - Vila Madalena',
    status: 'agendada',
    checkInCode: 'MP240120001',
    tipo: 'Musculação',
    observacoes: 'Foco em pernas e glúteos'
  },
  {
    id: 2,
    aluno: 'Maria Santos',
    data: '2024-01-20',
    horario: '10:00',
    local: 'Academia FitLife - Vila Madalena',
    status: 'em_andamento',
    checkInCode: 'MP240120002',
    tipo: 'Funcional',
    observacoes: 'Treino cardiovascular'
  },
  {
    id: 3,
    aluno: 'Carlos Lima',
    data: '2024-01-19',
    horario: '14:00',
    local: 'Academia FitLife - Pinheiros',
    status: 'concluida',
    checkInCode: 'MP240119001',
    tipo: 'Hipertrofia',
    observacoes: 'Treino de peito e tríceps'
  },
  {
    id: 4,
    aluno: 'Ana Costa',
    data: '2024-01-18',
    horario: '16:00',
    local: 'Academia FitLife - Vila Madalena',
    status: 'cancelada',
    checkInCode: 'MP240118001',
    tipo: 'Emagrecimento',
    observacoes: 'Cancelada pelo aluno'
  }
]

const statusConfig = {
  agendada: {
    label: 'Agendada',
    color: 'bg-blue-100 text-blue-800',
    icon: Clock
  },
  em_andamento: {
    label: 'Em Andamento',
    color: 'bg-yellow-100 text-yellow-800',
    icon: AlertCircle
  },
  concluida: {
    label: 'Concluída',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  cancelada: {
    label: 'Cancelada',
    color: 'bg-red-100 text-red-800',
    icon: XCircle
  }
}

export default function ProfessorAulas() {
  const { user } = useAuthStore()
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [busca, setBusca] = useState('')
  const [aulaQRCode, setAulaQRCode] = useState<any>(null)
  const [showQRModal, setShowQRModal] = useState(false)

  const aulasFiltradas = mockAulas.filter(aula => {
    const matchStatus = filtroStatus === 'todos' || aula.status === filtroStatus
    const matchBusca = aula.aluno.toLowerCase().includes(busca.toLowerCase()) ||
                      aula.tipo.toLowerCase().includes(busca.toLowerCase())
    return matchStatus && matchBusca
  })

  const gerarQRCode = (aula: any) => {
    setAulaQRCode(aula)
    setShowQRModal(true)
  }

  const qrData = aulaQRCode ? JSON.stringify({
    aulaId: aulaQRCode.id,
    checkInCode: aulaQRCode.checkInCode,
    professor: user?.name,
    aluno: aulaQRCode.aluno,
    data: aulaQRCode.data,
    horario: aulaQRCode.horario,
    local: aulaQRCode.local
  }) : ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="container-app py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">Minhas Aulas</h1>
              <p className="text-gray-600">Gerencie suas aulas e gere QR Codes</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container-app py-6 space-y-6">
        {/* Filtros e Busca */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por aluno ou tipo de treino..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              {['todos', 'agendada', 'em_andamento', 'concluida', 'cancelada'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFiltroStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filtroStatus === status
                      ? 'bg-accent text-primary'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status === 'todos' ? 'Todas' : statusConfig[status as keyof typeof statusConfig]?.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de Aulas */}
        <div className="space-y-4">
          {aulasFiltradas.length === 0 ? (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma aula encontrada</h3>
              <p className="text-gray-600">Tente ajustar os filtros ou buscar por outros termos.</p>
            </div>
          ) : (
            aulasFiltradas.map((aula) => {
              const config = statusConfig[aula.status as keyof typeof statusConfig]
              const StatusIcon = config.icon
              const podeGerarQR = aula.status === 'agendada' || aula.status === 'em_andamento'
              
              return (
                <div key={aula.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{aula.aluno}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${config.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-2">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            {new Date(aula.data).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            {aula.horario}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            {aula.local.split(' - ')[1]}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="font-medium text-accent">{aula.tipo}</span>
                          <span className="text-gray-500">Código: {aula.checkInCode}</span>
                        </div>
                        {aula.observacoes && (
                          <p className="text-sm text-gray-600 mt-2 italic">{aula.observacoes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      {podeGerarQR && (
                        <Button
                          onClick={() => gerarQRCode(aula)}
                          size="sm"
                          className="whitespace-nowrap"
                        >
                          <QrCode className="mr-2 h-4 w-4" />
                          QR Code
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        Detalhes
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal QR Code */}
      {showQRModal && aulaQRCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-primary mb-2">QR Code de Check-in</h2>
              <p className="text-gray-600">
                Aula com {aulaQRCode.aluno} - {aulaQRCode.horario}
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border-2 border-gray-100 mb-6">
              <div className="flex justify-center">
                <QRCode
                  value={qrData}
                  size={200}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              </div>
            </div>

            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Código:</span>
                <span className="font-mono font-medium">{aulaQRCode.checkInCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data/Hora:</span>
                <span className="font-medium">
                  {new Date(aulaQRCode.data).toLocaleDateString('pt-BR')} às {aulaQRCode.horario}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Local:</span>
                <span className="font-medium">{aulaQRCode.local.split(' - ')[1]}</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowQRModal(false)}
              >
                Fechar
              </Button>
              <Button className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Baixar
              </Button>
              <Button variant="outline">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
