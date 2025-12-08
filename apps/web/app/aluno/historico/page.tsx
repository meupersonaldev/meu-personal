'use client'

import { useEffect, useState } from 'react'
import { History, Calendar, User, MapPin, Clock, Loader2, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/lib/stores/auth-store'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface ClassHistory {
  id: string
  date: string
  time: string
  teacher_name: string
  teacher_avatar?: string
  unit_name: string
  status: 'completed' | 'cancelled' | 'no_show'
}

export default function StudentHistoricoPage() {
  const { user, isAuthenticated } = useAuthStore()
  const [classes, setClasses] = useState<ClassHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.id) return

      setIsLoading(true)
      try {
        const response = await fetch(`${API_BASE_URL}/api/students/${user.id}/classes/history`)
        if (response.ok) {
          const data = await response.json()
          setClasses(data.classes || [])
        }
      } catch (error) {
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistory()
  }, [user?.id])

  if (!user || !isAuthenticated) {
    return null
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Concluída</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Cancelada</Badge>
      case 'no_show':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Falta</Badge>
      default:
        return null
    }
  }

  return (
    <div className="w-full flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Histórico de Aulas
        </h1>
        <p className="text-sm text-gray-600">
          Acompanhe todas as suas aulas realizadas
        </p>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-2 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Aulas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {classes.filter(c => c.status === 'completed').length}
                </p>
              </div>
              <History className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Este Mês</p>
                <p className="text-2xl font-bold text-gray-900">
                  {classes.filter(c => {
                    const classDate = new Date(c.date)
                    const now = new Date()
                    return classDate.getMonth() === now.getMonth() && 
                           classDate.getFullYear() === now.getFullYear() &&
                           c.status === 'completed'
                  }).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avaliação Média</p>
                <p className="text-2xl font-bold text-gray-900">4.5</p>
              </div>
              <Star className="h-8 w-8 text-amber-500 fill-current" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Aulas */}
      <Card className="border-2 border-gray-200">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-meu-primary" />
            Histórico Completo
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <History className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Nenhuma aula no histórico</p>
              <p className="text-sm mt-2">
                Suas aulas realizadas aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {classes.map((classItem) => (
                <Card key={classItem.id} className="border border-gray-200 hover:border-meu-primary/30 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar do Professor */}
                      <Avatar className="h-12 w-12 border-2 border-meu-primary/20">
                        {classItem.teacher_avatar && (
                          <AvatarImage src={classItem.teacher_avatar} alt={classItem.teacher_name} />
                        )}
                        <AvatarFallback className="bg-meu-primary text-white font-semibold">
                          {classItem.teacher_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Informações da Aula */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              {classItem.teacher_name}
                            </h3>
                            <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                              <MapPin className="h-3 w-3" />
                              {classItem.unit_name}
                            </p>
                          </div>
                          {getStatusBadge(classItem.status)}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(classItem.date).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {classItem.time}
                          </span>
                        </div>

                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
