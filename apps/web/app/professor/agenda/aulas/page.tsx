'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useProfessorData } from '@/hooks/use-professor-data'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ProfessorLayout from '@/components/layout/professor-layout'
import {
  Clock,
  Calendar,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  Plus,
  Filter,
  Search,
  Edit,
  Trash2
} from 'lucide-react'

export default function MinhasAulasPage() {
  const { user } = useAuthStore()
  const { data, updateAula, deleteAula } = useProfessorData()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todas')
  
  // Filtrar aulas
  const aulasFiltradas = data.aulas.filter(aula => {
    const matchSearch = aula.aluno.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = statusFilter === 'todas' || aula.status === statusFilter
    return matchSearch && matchStatus
  })
  
  // Estatísticas
  const stats = {
    confirmadas: data.aulas.filter(a => a.status === 'confirmado').length,
    pendentes: data.aulas.filter(a => a.status === 'pendente').length,
    canceladas: data.aulas.filter(a => a.status === 'cancelado').length,
    total: data.aulas.length
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmada':
        return 'bg-green-500'
      case 'pendente':
        return 'bg-yellow-500'
      case 'cancelada':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmada':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelada':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (!user) {
    return null
  }

  return (
    <ProfessorLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        {/* Header da Página */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Minhas Aulas
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gerencie todas as suas aulas agendadas
          </p>
        </div>

        {/* Filtros e Ações */}
        <Card className="bg-white dark:bg-gray-800 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                {/* Busca */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Buscar por aluno..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-meu-cyan focus:border-transparent"
                  />
                </div>

                {/* Filtros */}
                <Button variant="outline" className="dark:border-gray-600 dark:text-gray-300">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
              </div>

              {/* Botão Nova Aula */}
              <Button className="bg-[#27DFFF] hover:bg-[#27DFFF]/90 text-[#04243D] font-semibold">
                <Plus className="h-4 w-4 mr-2" />
                Nova Aula
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Aulas */}
        <div className="space-y-4">
          {aulasFiltradas.map((aula) => (
            <Card key={aula.id} className="bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  {/* Informações da Aula */}
                  <div className="flex items-center space-x-4">
                    {/* Avatar do Aluno */}
                    <div className="w-12 h-12 bg-[#04243D] dark:bg-[#27DFFF] rounded-lg flex items-center justify-center">
                      <User className="h-6 w-6 text-white dark:text-[#04243D]" />
                    </div>

                    {/* Detalhes */}
                    <div>
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                          {aula.aluno}
                        </h3>
                        <Badge 
                          className={`${getStatusColor(aula.status)} text-white flex items-center space-x-1`}
                        >
                          {getStatusIcon(aula.status)}
                          <span className="capitalize">{aula.status}</span>
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(aula.data).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{aula.hora}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>{aula.unidade}</span>
                        </div>
                      </div>
                      
                      <div className="mt-1">
                        <span className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">
                          {aula.tipo}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center space-x-2">
                    {aula.status === 'confirmado' && (
                      <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Check-in
                      </Button>
                    )}
                    {aula.status === 'pendente' && (
                      <>
                        <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
                          Confirmar
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
                          Cancelar
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" className="dark:border-gray-600 dark:text-gray-300">
                      Detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Resumo */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500 mb-1">{stats.confirmadas}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Confirmadas</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-500 mb-1">{stats.pendentes}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Pendentes</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-500 mb-1">{stats.canceladas}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Canceladas</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-meu-cyan mb-1">{stats.total}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProfessorLayout>
  )
}
