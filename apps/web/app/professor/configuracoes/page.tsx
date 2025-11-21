'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import ProfessorLayout from '@/components/layout/professor-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Lock,
  MapPin,
  Camera,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Building2,
  Star,
  DollarSign,
  Award,
  Plus,
  Trash2,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

type TabType = 'dados' | 'perfil' | 'seguranca' | 'preferencias'

interface Academy {
  id: string
  name: string
  city: string
  state: string
}

// Especialidades disponíveis
const specialties = [
  'Musculação',
  'CrossFit',
  'Yoga',
  'Pilates',
  'Treinamento Funcional',
  'Boxe',
  'Muay Thai',
  'Jiu-Jitsu',
  'Natação',
  'Corrida',
  'Ciclismo',
  'Dança',
  'Zumba',
  'FitDance',
  'Alongamento',
  'Reabilitação',
  'Idosos',
  'Gestantes',
  'Nutrição Esportiva',
  'Consultoria Online'
]

export default function ConfiguracoesPage() {
  const { user, updateUser, token } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabType>('dados')
  const [loading, setLoading] = useState(false)
  const [academies, setAcademies] = useState<Academy[]>([])
  const [selectedAcademies, setSelectedAcademies] = useState<string[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [customSpecialty, setCustomSpecialty] = useState('')

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  })

  const [professionalProfile, setProfessionalProfile] = useState({
    bio: '',
    specialties: [] as string[],
    hourly_rate: 0,
    is_available: true
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)


  useEffect(() => {
    if (user?.id) {
      fetchAcademies()
      fetchTeacherPreferences()
      fetchProfessionalProfile()
    }
  }, [user?.id])

  const fetchProfessionalProfile = async () => {
    if (!user?.id) {
      return
    }

    try {
      const data = await api.teachers.getById(user.id)
      const profileData = data.teacher_profiles?.[0] || data.teacher_profiles || {}

      setProfessionalProfile({
        bio: profileData.bio || '',
        specialties: profileData.specialties || [],
        hourly_rate: profileData.hourly_rate || 0,
        is_available: profileData.is_available ?? true
      })
    } catch (error) {
      // Silenciosamente define valores padrão - o perfil pode não existir ainda
      setProfessionalProfile({
        bio: '',
        specialties: [],
        hourly_rate: 0,
        is_available: true
      })
    }
  }

  const fetchAcademies = async () => {
    if (!token) {
      setAcademies([])
      return
    }

    try {
      const data = await api.academies.getAll()
      setAcademies(data.academies || [])
    } catch (error) {
      console.error('Erro ao buscar academias:', error)
    }
  }

  const fetchTeacherPreferences = async () => {
    if (!token || !user?.id) return

    if (!token) return
    try {
      const data = await api.teachers.getPreferences(user.id)
      setSelectedAcademies(data.academy_ids || [])
    } catch (error) {
      console.error('Erro ao buscar preferências:', error)
    }
  }
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAvatarUpload = async () => {
    if (!avatarFile || !user?.id) return

    setLoading(true)

    try {
      // Criar FormData
      const formData = new FormData()
      formData.append('avatar', avatarFile)
      formData.append('userId', user.id)

      if (!token) throw new Error('Token não encontrado')
      const data = await api.users.uploadAvatar(user.id, formData)

      // Atualizar estado local
      updateUser({ ...user, avatar_url: data.avatar_url })
      toast.success('Foto atualizada com sucesso!')
      setAvatarFile(null)
      setAvatarPreview(data.avatar_url)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer upload da foto')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!user?.id || !token) return
    try {
      const data = await api.users.update(user.id, profileData)
      updateUser(data.user)
      toast.success('Perfil atualizado com sucesso!')
    } catch (error) {
      toast.error('Erro ao atualizar perfil')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres')
      return
    }

    setLoading(true)

    if (!user?.id || !token) return
    try {
      await api.users.updatePassword(user.id, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })
      toast.success('Senha alterada com sucesso!')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      toast.error('Senha atual incorreta')
    } finally {
      setLoading(false)
    }
  }

  const handleAcademiesUpdate = async () => {
    setLoading(true)

    if (!user?.id || !token) return
    try {
      await api.teachers.updatePreferences(user.id, { academy_ids: selectedAcademies })
      toast.success('Preferências atualizadas!')
    } catch (error) {
      toast.error('Erro ao atualizar preferências')
    } finally {
      setLoading(false)
    }
  }

  const toggleAcademy = (academyId: string) => {
    setSelectedAcademies(prev =>
      prev.includes(academyId)
        ? prev.filter(id => id !== academyId)
        : [...prev, academyId]
    )
  }

  const addSpecialty = (specialty: string) => {
    if (!professionalProfile.specialties.includes(specialty)) {
      setProfessionalProfile({
        ...professionalProfile,
        specialties: [...professionalProfile.specialties, specialty]
      })
    }
  }

  const handleAddCustomSpecialty = () => {
    if (customSpecialty.trim() && !professionalProfile.specialties.includes(customSpecialty.trim())) {
      addSpecialty(customSpecialty.trim())
      setCustomSpecialty('')
    }
  }

  const removeSpecialty = (specialty: string) => {
    setProfessionalProfile({
      ...professionalProfile,
      specialties: professionalProfile.specialties.filter(s => s !== specialty)
    })
  }

  const handleProfessionalProfileUpdate = async () => {
    setLoading(true)

    try {
      if (!user?.id) throw new Error('Usuário não autenticado')

      // Obter token da sessão do Supabase se não estiver no store
      let authToken = token
      if (!authToken) {
        const { data: { session } } = await supabase.auth.getSession()
        authToken = session?.access_token || null
      }

      if (!authToken) {
        toast.error('Sessão expirada. Faça login novamente.')
        return
      }

      await api.teachers.update(user.id, professionalProfile)
      toast.success('Perfil profissional atualizado!')
    } catch (error) {
      toast.error('Erro ao atualizar perfil profissional')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  const tabs = [
    { id: 'dados' as TabType, label: 'Dados Pessoais', icon: User },
    { id: 'perfil' as TabType, label: 'Perfil Profissional', icon: Award },
    { id: 'seguranca' as TabType, label: 'Segurança', icon: Lock },
    { id: 'preferencias' as TabType, label: 'Preferências', icon: MapPin }
  ]

  return (
    <ProfessorLayout>
      <div className="px-4 py-6 space-y-6 md:px-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Configurações</h1>
          <p className="text-sm text-gray-600 md:text-base">Gerencie suas informações e preferências</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:gap-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-shrink-0 items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors sm:py-4 ${activeTab === tab.id
                    ? 'border-meu-primary text-meu-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'dados' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Coluna Esquerda - Dados Pessoais */}
            <div className="order-2 lg:order-1 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="mr-2 h-5 w-5 text-meu-primary" />
                    Dados Pessoais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telefone
                      </label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                        placeholder="(11) 99999-9999"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-meu-primary hover:bg-meu-primary-dark text-white"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Coluna Direita - Avatar */}
            <div className="order-1 max-w-lg lg:order-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Camera className="mr-2 h-5 w-5 text-meu-primary" />
                    Foto de Perfil
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-meu-primary text-4xl font-bold text-white">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                        ) : user.avatar_url ? (
                          <img src={user.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          user.name?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-meu-primary p-2 transition-colors hover:bg-meu-primary-dark">
                        <Camera className="h-4 w-4 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="mt-4 text-center text-sm text-gray-500">
                      Clique no ícone para alterar sua foto
                    </p>
                  </div>

                  {avatarFile && (
                    <Button
                      onClick={handleAvatarUpload}
                      disabled={loading}
                      className="w-full bg-meu-primary text-white hover:bg-meu-primary-dark"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Salvar nova foto
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Aba Perfil Profissional */}
        {activeTab === 'perfil' && (
          <div className="mx-auto max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2 text-meu-primary" />
                  Perfil Profissional
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bio Profissional */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sobre Você (Profissional)
                  </label>
                  <textarea
                    value={professionalProfile.bio}
                    onChange={(e) => setProfessionalProfile({ ...professionalProfile, bio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent resize-none"
                    rows={4}
                    placeholder="Conte sobre sua experiência, certificações e metodologia de trabalho..."
                  />
                </div>

                {/* Especialidades */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Especialidades
                  </label>
                  <div className="space-y-3">
                    {/* Especialidades Selecionadas */}
                    {professionalProfile.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {professionalProfile.specialties.map((spec) => (
                          <Badge
                            key={spec}
                            className="bg-meu-primary text-white px-3 py-1 flex items-center space-x-2"
                          >
                            <span>{spec}</span>
                            <button
                              type="button"
                              onClick={() => removeSpecialty(spec)}
                              className="hover:bg-meu-primary-dark rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}


                    {/* Adicionar Especialidade */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-3">Adicionar especialidade da lista:</p>
                        <div className="flex flex-wrap gap-2">
                          {specialties
                            .filter((spec) => !professionalProfile.specialties.includes(spec))
                            .map((spec) => (
                              <button
                                key={spec}
                                type="button"
                                onClick={() => addSpecialty(spec)}
                                className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:border-meu-primary hover:bg-meu-primary/5 transition-colors"
                              >
                                <Plus className="h-3 w-3 inline mr-1" />
                                {spec}
                              </button>
                            ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-sm text-gray-600 mb-2">Ou adicione uma personalizada:</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customSpecialty}
                            onChange={(e) => setCustomSpecialty(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddCustomSpecialty()
                              }
                            }}
                            placeholder="Digite uma especialidade..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent text-sm"
                          />
                          <Button
                            type="button"
                            onClick={handleAddCustomSpecialty}
                            disabled={!customSpecialty.trim()}
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Valor por Hora */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor por Hora
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      value={professionalProfile.hourly_rate}
                      onChange={(e) => setProfessionalProfile({ ...professionalProfile, hourly_rate: Number(e.target.value) })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  {professionalProfile.hourly_rate > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      {formatCurrency(professionalProfile.hourly_rate)} por hora
                    </p>
                  )}
                </div>

                {/* Disponibilidade */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Aceitar Novos Alunos</h4>
                    <p className="text-sm text-gray-600">Permitir que novos alunos agendem aulas com você</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfessionalProfile({ ...professionalProfile, is_available: !professionalProfile.is_available })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${professionalProfile.is_available ? 'bg-meu-primary' : 'bg-gray-300'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${professionalProfile.is_available ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>

                <Button
                  onClick={handleProfessionalProfileUpdate}
                  disabled={loading}
                  className="w-full bg-meu-primary hover:bg-meu-primary-dark text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Perfil Profissional
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Aba Segurança */}
        {activeTab === 'seguranca' && (
          <div className="mx-auto max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="h-5 w-5 mr-2 text-meu-primary" />
                  Alterar Senha
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Senha Atual
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nova Senha
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirmar Nova Senha
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-meu-primary focus:border-transparent"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-meu-primary hover:bg-meu-primary-dark text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Alterando...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Alterar Senha
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Aba Preferências */}
        {activeTab === 'preferencias' && (
          <div className="mx-auto max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-meu-primary" />
                    Unidades de Trabalho
                  </div>
                  <Badge variant="outline">{selectedAcademies.length} selecionada{selectedAcademies.length !== 1 ? 's' : ''}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Selecione as unidades onde você deseja trabalhar. Você será recomendado apenas para alunos dessas localidades.
                </p>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {academies.map((academy) => (
                    <div
                      key={academy.id}
                      onClick={() => toggleAcademy(academy.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedAcademies.includes(academy.id)
                        ? 'border-meu-primary bg-meu-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${selectedAcademies.includes(academy.id)
                            ? 'border-meu-primary bg-meu-primary'
                            : 'border-gray-300'
                            }`}>
                            {selectedAcademies.includes(academy.id) && (
                              <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M5 13l4 4L19 7"></path>
                              </svg>
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{academy.name}</h4>
                            <p className="text-sm text-gray-500">{academy.city} - {academy.state}</p>
                          </div>
                        </div>
                        <Building2 className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleAcademiesUpdate}
                  disabled={loading}
                  className="w-full bg-meu-primary hover:bg-meu-primary-dark text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Preferências
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProfessorLayout >
  )
}
