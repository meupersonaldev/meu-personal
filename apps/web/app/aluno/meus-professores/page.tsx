'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { User, DollarSign, Calendar, Loader2, ChevronLeft, Gift, Phone, Mail, MessageCircle, Star, Check, X, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Teacher {
    id: string
    name: string
    email?: string
    phone?: string
    photo_url?: string
    hourly_rate?: number
    hide_free_class?: boolean
    linked_at: string
}

interface PendingRequest {
    request_id: string
    teacher_id: string
    name: string
    email?: string
    phone?: string
    photo_url?: string
    hourly_rate?: number
    requested_at: string
}

export default function MeusProfessoresPage() {
    const { user, token } = useAuthStore()
    const router = useRouter()
    const [teachers, setTeachers] = useState<Teacher[]>([])
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [firstClassUsed, setFirstClassUsed] = useState(false)
    const [respondingId, setRespondingId] = useState<string | null>(null)

    const fetchTeachers = async () => {
        if (!user?.id || !token) return

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

            // Buscar professores vinculados e solicitações pendentes
            const response = await fetch(`${API_URL}/api/students/${user.id}/teachers`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (response.ok) {
                const data = await response.json()
                setTeachers(data.teachers || [])
                setPendingRequests(data.pendingRequests || [])
            }

            // Buscar status da primeira aula
            const userResponse = await fetch(`${API_URL}/api/users/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (userResponse.ok) {
                const userData = await userResponse.json()
                setFirstClassUsed(userData.user?.first_class_used || false)
            }
        } catch (error) {
            console.error('Erro ao buscar professores:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleRespondRequest = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
        if (!token) return
        setRespondingId(requestId)

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
            const response = await fetch(`${API_URL}/api/teachers/requests/${requestId}/respond`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            })

            if (response.ok) {
                // Recarregar dados
                await fetchTeachers()
            } else {
                console.error('Erro ao responder solicitação')
            }
        } catch (error) {
            console.error('Erro ao processar resposta:', error)
        } finally {
            setRespondingId(null)
        }
    }

    useEffect(() => {
        fetchTeachers()
    }, [user?.id, token])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-meu-primary" />
                    <p className="text-sm text-gray-500 animate-pulse">Carregando seus professores...</p>
                </div>
            </div>
        )
    }

    // Se não tem professores vinculados E não tem solicitações pendentes
    if (teachers.length === 0 && pendingRequests.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                    <CardContent className="py-16 px-8 text-center flex flex-col items-center">
                        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-bounce-slow">
                            <User className="h-12 w-12 text-blue-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">
                            Nenhum professor vinculado
                        </h3>
                        <p className="text-gray-500 mb-8 leading-relaxed">
                            Você ainda não possui professores particulares vinculados.
                            <br />
                            Peça ao seu professor para adicionar você à carteira de alunos dele.
                        </p>
                        <Button
                            onClick={() => router.push('/aluno/dashboard')}
                            className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                        >
                            Voltar ao Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="fixed top-0 left-0 w-full h-[40vh] bg-gradient-to-br from-blue-600 to-meu-primary -z-10 rounded-b-[40px] opacity-10" />
            <div className="fixed top-20 right-0 w-64 h-64 bg-blue-400/20 blur-3xl rounded-full -z-10" />
            <div className="fixed bottom-0 left-0 w-96 h-96 bg-indigo-400/10 blur-3xl rounded-full -z-10" />

            <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
                {/* Header Section */}
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-fit -ml-2 text-gray-600 hover:text-meu-primary hover:bg-blue-50 pl-2 pr-4 rounded-full transition-all"
                        onClick={() => router.push('/aluno/dashboard')}
                    >
                        <ChevronLeft className="h-5 w-5 mr-1" />
                        Voltar ao início
                    </Button>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                                Meus Professores
                            </h1>
                            <p className="text-gray-500 mt-2 text-lg">
                                Gerencie suas aulas com seus professores particulares
                            </p>
                        </div>

                        {!firstClassUsed && teachers.some(t => !t.hide_free_class) && (
                            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm animate-pulse-slow">
                                <div className="bg-green-100 p-2 rounded-full text-green-600">
                                    <Gift className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-green-800 uppercase tracking-wider">Benefício Ativo</p>
                                    <p className="text-sm font-medium text-green-700">Você tem 1 aula gratuita disponível</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Solicitações Pendentes */}
                {pendingRequests.length > 0 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-full">
                                <Bell className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Solicitações de Fidelização</h2>
                                <p className="text-sm text-gray-500">Professores que querem adicionar você à carteira deles</p>
                            </div>
                            <Badge className="ml-auto bg-amber-100 text-amber-700 border-amber-200">
                                {pendingRequests.length} pendente{pendingRequests.length > 1 ? 's' : ''}
                            </Badge>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {pendingRequests.map((request) => (
                                <Card key={request.request_id} className="border-2 border-amber-200 bg-amber-50/50 rounded-2xl overflow-hidden">
                                    <CardContent className="p-5">
                                        <div className="flex items-start gap-4">
                                            <Avatar className="h-14 w-14 border-2 border-white shadow-md">
                                                <AvatarImage src={request.photo_url} className="object-cover" />
                                                <AvatarFallback className="bg-amber-100 text-amber-700 text-lg font-bold">
                                                    {request.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-gray-900 truncate">{request.name}</h3>
                                                <p className="text-sm text-gray-500">Personal Trainer</p>
                                                {request.hourly_rate && (
                                                    <p className="text-sm text-amber-700 font-medium mt-1">
                                                        R$ {request.hourly_rate.toFixed(2)}/hora
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-600 mt-4 mb-4">
                                            Este professor quer adicionar você à carteira de alunos dele. 
                                            Ao aceitar, vocês poderão fazer transações por fora da plataforma.
                                        </p>

                                        <div className="flex gap-3">
                                            <Button
                                                onClick={() => handleRespondRequest(request.request_id, 'REJECTED')}
                                                variant="outline"
                                                className="flex-1 h-10 rounded-xl border-gray-300 text-gray-600 hover:bg-gray-100"
                                                disabled={respondingId === request.request_id}
                                            >
                                                {respondingId === request.request_id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <X className="h-4 w-4 mr-2" />
                                                        Recusar
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                onClick={() => handleRespondRequest(request.request_id, 'APPROVED')}
                                                className="flex-1 h-10 rounded-xl bg-green-600 hover:bg-green-700 text-white"
                                                disabled={respondingId === request.request_id}
                                            >
                                                {respondingId === request.request_id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Check className="h-4 w-4 mr-2" />
                                                        Aceitar
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Grid - Professores Fidelizados */}
                {teachers.length > 0 && (
                    <div className="space-y-4">
                        {pendingRequests.length > 0 && (
                            <h2 className="text-xl font-bold text-gray-900">Meus Professores Particulares</h2>
                        )}
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {teachers.map((teacher, index) => (
                        <Card
                            key={teacher.id}
                            className={cn(
                                "group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white rounded-[24px]",
                                "animate-in fade-in slide-in-from-bottom-8 fill-mode-backwards"
                            )}
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            {/* Card Header Background */}
                            <div className="h-32 bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden rounded-t-[24px]">
                                <div className="absolute inset-0 bg-white/5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '16px 16px' }} />

                                {/* Free Class Badge */}
                                {!firstClassUsed && !teacher.hide_free_class && (
                                    <Badge className="absolute top-4 right-4 bg-green-500 hover:bg-green-600 text-white border-0 shadow-lg px-3 py-1.5 text-xs font-bold animate-bounce-slow">
                                        <Gift className="h-3 w-3 mr-1.5" />
                                        AULA GRÁTIS
                                    </Badge>
                                )}
                            </div>

                            {/* Avatar Section */}
                            <div className="absolute top-16 left-1/2 transform -translate-x-1/2">
                                <div className="relative">
                                    <Avatar className="h-28 w-28 border-[6px] border-white shadow-xl ring-1 ring-gray-100 bg-white">
                                        <AvatarImage src={teacher.photo_url} className="object-cover" />
                                        <AvatarFallback className="bg-blue-50 text-blue-600 text-3xl font-bold">
                                            {teacher.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute bottom-2 right-2 bg-green-500 w-5 h-5 rounded-full border-4 border-white" title="Online" />
                                </div>
                            </div>

                            <CardContent className="pt-16 pb-6 px-6 flex flex-col items-center text-center mt-2">

                                {/* Name & Role */}
                                <h3 className="text-xl font-bold text-gray-900 leading-tight mb-1">
                                    {teacher.name}
                                </h3>
                                <p className="text-sm text-gray-500 font-medium mb-6">
                                    Personal Trainer
                                </p>

                                {/* Quick Info Specs */}
                                <div className="grid grid-cols-2 w-full gap-2 mb-6">
                                    <div className="bg-gray-50 rounded-xl p-3 flex flex-col items-center justify-center border border-gray-100">
                                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Valor</span>
                                        <div className="flex items-center text-gray-900 font-bold">
                                            <span className="text-xs mr-0.5">R$</span>
                                            <span>{teacher.hourly_rate ? teacher.hourly_rate.toFixed(0) : '-'}</span>
                                            <span className="text-xs text-gray-400 font-normal ml-1">/h</span>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3 flex flex-col items-center justify-center border border-gray-100">
                                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Desde</span>
                                        <div className="text-sm font-bold text-gray-900">
                                            {new Date(teacher.linked_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Actions Row */}
                                <div className="flex items-center justify-center gap-3 w-full mb-6">
                                    {teacher.phone && (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="rounded-full w-10 h-10 border-green-200 bg-green-50 text-green-600 hover:bg-green-100 hover:border-green-300"
                                            onClick={() => window.open(`https://wa.me/55${teacher.phone?.replace(/\D/g, '')}`, '_blank')}
                                            title="WhatsApp"
                                        >
                                            <MessageCircle className="h-5 w-5" />
                                        </Button>
                                    )}
                                    {teacher.email && (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="rounded-full w-10 h-10 border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:border-blue-300"
                                            onClick={() => window.location.href = `mailto:${teacher.email}`}
                                            title="Email"
                                        >
                                            <Mail className="h-5 w-5" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="rounded-full w-10 h-10 border-gray-200 text-gray-600 hover:bg-gray-100"
                                        title="Ver Perfil"
                                    >
                                        <User className="h-5 w-5" />
                                    </Button>
                                </div>

                                {/* Main Action Button */}
                                <Button
                                    onClick={() => router.push(`/aluno/agendar?teacher=${teacher.id}`)}
                                    className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-meu-primary text-white font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 group-hover:scale-[1.02]"
                                >
                                    <Calendar className="h-5 w-5 mr-2" />
                                    Agendar Aula
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                        </div>
                    </div>
                )}

                {/* Helper Tip */}
                <div className="mt-8 bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="bg-yellow-100 p-2 rounded-full text-yellow-600 shrink-0">
                            <Star className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 text-sm mb-1">Como funcionam os vínculos?</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Esta lista mostra apenas os professores que adicionaram você manualmente à carteira de alunos deles.
                                Eles são seus professores "particulares" dentro da plataforma. Você pode agendar aulas diretamente com eles e usar seus pacotes de créditos específicos.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
