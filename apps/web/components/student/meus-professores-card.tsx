'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { User, DollarSign, Calendar } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useRouter } from 'next/navigation'

interface Teacher {
    id: string
    name: string
    email?: string
    photo_url?: string
    hourly_rate?: number
    hide_free_class?: boolean
    linked_at: string
}

export function MeusProfessoresCard() {
    const { user, token } = useAuthStore()
    const router = useRouter()
    const [teachers, setTeachers] = useState<Teacher[]>([])
    const [loading, setLoading] = useState(true)
    const [firstClassUsed, setFirstClassUsed] = useState(false)

    useEffect(() => {
        const fetchTeachers = async () => {
            if (!user?.id || !token) return

            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

                // Buscar professores vinculados
                const response = await fetch(`${API_URL}/api/students/${user.id}/teachers`, {
                    headers: { Authorization: `Bearer ${token}` }
                })

                if (response.ok) {
                    const data = await response.json()
                    setTeachers(data.teachers || [])
                }

                // Buscar status da primeira aula
                const userResponse = await fetch(`${API_URL}/api/users/${user.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })

                if (userResponse.ok) {
                    const userData = await userResponse.json()
                    setFirstClassUsed(userData.first_class_used || false)
                }
            } catch (error) {
                console.error('Erro ao buscar professores:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchTeachers()
    }, [user?.id, token])

    // Não mostrar nada enquanto carrega ou se não tem professores
    if (loading) {
        return null
    }

    if (teachers.length === 0) {
        return null
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Meus Professores
                    </div>
                    {!firstClassUsed && teachers.some(t => !t.hide_free_class) && (
                        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                            1 aula gratuita
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {teachers.map((teacher) => (
                    <div
                        key={teacher.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={teacher.photo_url} />
                                <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium text-sm">{teacher.name}</p>
                                {teacher.hourly_rate && (
                                    <div className="flex items-center gap-1 text-xs text-gray-600">
                                        <DollarSign className="h-3 w-3" />
                                        R$ {teacher.hourly_rate.toFixed(2)}/h
                                    </div>
                                )}
                                {!firstClassUsed && !teacher.hide_free_class && (
                                    <Badge variant="outline" className="text-[10px] mt-1 bg-green-50 text-green-700 border-green-200">
                                        Aula gratuita disponível
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => router.push(`/aluno/agendar?teacher=${teacher.id}`)}
                            className="bg-meu-primary hover:bg-meu-primary-dark"
                        >
                            <Calendar className="h-4 w-4 mr-1" />
                            Agendar
                        </Button>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
