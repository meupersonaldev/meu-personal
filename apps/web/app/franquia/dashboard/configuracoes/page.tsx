'use client'

import { useState, useEffect, useRef } from 'react'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Download, Copy, Printer, Building2, QrCode, Settings, Loader2, User, Upload, Camera, Save } from 'lucide-react'
import { toast } from 'sonner'
import QRCodeSVG from 'react-qr-code'

type DaySchedule = {
  day: string
  dayName: string
  isOpen: boolean
  openingTime: string
  closingTime: string
  slotsPerHour?: number
}

type TimeSlot = {
  id?: string
  academy_id: string
  day_of_week: number
  time: string
  is_available: boolean
  max_capacity: number
}

type AcademySettings = {
  name: string
  email: string
  address: string
  phone: string
  city: string
  state: string
  zipCode: string
  schedule: DaySchedule[]
  checkinTolerance: number
  creditsPerClass: number
  classDurationMinutes: number
}

export default function ConfiguracoesPage() {
  const { franquiaUser, setFranquiaUser } = useFranquiaStore()
  const [activeTab, setActiveTab] = useState<'perfil' | 'geral' | 'qrcode' | 'sistema'>('perfil')
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [profileData, setProfileData] = useState({
    name: '',
    email: ''
  })
  const [settings, setSettings] = useState<AcademySettings>({
    name: '',
    email: '',
    address: '',
    phone: '',
    city: '',
    state: '',
    zipCode: '',
    schedule: [
      { day: '0', dayName: 'Domingo', isOpen: false, openingTime: '06:00', closingTime: '22:00', slotsPerHour: 1 },
      { day: '1', dayName: 'Segunda', isOpen: true, openingTime: '06:00', closingTime: '22:00', slotsPerHour: 1 },
      { day: '2', dayName: 'Terça', isOpen: true, openingTime: '06:00', closingTime: '22:00', slotsPerHour: 1 },
      { day: '3', dayName: 'Quarta', isOpen: true, openingTime: '06:00', closingTime: '22:00', slotsPerHour: 1 },
      { day: '4', dayName: 'Quinta', isOpen: true, openingTime: '06:00', closingTime: '22:00', slotsPerHour: 1 },
      { day: '5', dayName: 'Sexta', isOpen: true, openingTime: '06:00', closingTime: '22:00', slotsPerHour: 1 },
      { day: '6', dayName: 'Sábado', isOpen: false, openingTime: '06:00', closingTime: '22:00', slotsPerHour: 1 }
    ],
    checkinTolerance: 30,
    creditsPerClass: 1,
    classDurationMinutes: 60,
  })
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])

  useEffect(() => {
    loadSettings()
    loadTimeSlots()
    if (franquiaUser) {
      setProfileData({
        name: franquiaUser.name || '',
        email: franquiaUser.email || ''
      })

      // Se academyName não está definido, buscar do banco
      if (!franquiaUser.academyName && franquiaUser.academyId) {
        loadAcademyName()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [franquiaUser?.academyId])

  async function loadAcademyName() {
    if (!franquiaUser?.academyId) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/academies/${franquiaUser.academyId}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const { academy } = await response.json()

        // Atualizar store com o nome da academia
        if (franquiaUser) {
          setFranquiaUser({
            ...franquiaUser,
            academyName: academy.name
          })
        }
      }
    } catch (error) {
    }
  }

  async function loadSettings() {
    if (!franquiaUser?.academyId) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/academies/${franquiaUser.academyId}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const { academy } = await response.json()
        
        // Parse schedule do banco (se existir) ou usa padrão
        const defaultSchedule = [
          { day: '0', dayName: 'Domingo', isOpen: false, openingTime: '06:00', closingTime: '22:00', slotsPerHour: 1 },
          { day: '1', dayName: 'Segunda', isOpen: true, openingTime: '06:00', closingTime: '22:00', slotsPerHour: 1 },
          { day: '2', dayName: 'Terça', isOpen: true, openingTime: '06:00', closingTime: '22:00', slotsPerHour: 1 },
          { day: '3', dayName: 'Quarta', isOpen: true, openingTime: '06:00', closingTime: '22:00', slotsPerHour: 1 },
          { day: '4', dayName: 'Quinta', isOpen: true, openingTime: '06:00', closingTime: '22:00', slotsPerHour: 1 },
          { day: '5', dayName: 'Sexta', isOpen: true, openingTime: '06:00', closingTime: '22:00', slotsPerHour: 1 },
          { day: '6', dayName: 'Sábado', isOpen: false, openingTime: '06:00', closingTime: '22:00', slotsPerHour: 1 }
        ]
        
        let schedule = defaultSchedule
        if (academy.schedule) {
          try {
            const parsed = typeof academy.schedule === 'string' 
              ? JSON.parse(academy.schedule) 
              : academy.schedule
            if (Array.isArray(parsed) && parsed.length > 0) {
              schedule = parsed.map(day => ({
                ...day,
                slotsPerHour: day.slotsPerHour || 1
              }))
            }
          } catch (e) {
          }
        }
        
        setSettings({
          name: academy.name || '',
          email: academy.email || franquiaUser.email || '',
          address: academy.address || '',
          phone: academy.phone || '',
          city: academy.city || '',
          state: academy.state || '',
          zipCode: academy.zip_code || '',
          schedule,
          checkinTolerance: academy.checkin_tolerance || 30,
          creditsPerClass: typeof academy.credits_per_class === 'number' ? academy.credits_per_class : 1,
          classDurationMinutes: typeof academy.class_duration_minutes === 'number' ? academy.class_duration_minutes : 60,
        })
      }
    } catch (error) {
    }
  }

  async function loadTimeSlots() {
    if (!franquiaUser?.academyId) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/time-slots?academy_id=${franquiaUser.academyId}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const { slots } = await response.json()
        setTimeSlots(slots || [])
      }
    } catch (error) {
    }
  }

  async function generateTimeSlots() {
    if (!franquiaUser?.academyId) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/time-slots/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          academy_id: franquiaUser.academyId
        })
      })

      if (response.ok) {
        const { slots } = await response.json()
        setTimeSlots(slots || [])
      }
    } catch (error) {
    }
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Tamanho máximo: 2MB')
      return
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast.error('Formato inválido. Use JPG ou PNG')
      return
    }

    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${franquiaUser?.id}/avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      if (response.ok) {
        const { avatar_url } = await response.json()

        // Atualizar store
        if (franquiaUser) {
          setFranquiaUser({
            ...franquiaUser,
            avatar_url
          })
        }

        toast.success('Avatar atualizado com sucesso!')
      } else {
        toast.error('Erro ao fazer upload do avatar')
      }
    } catch (error) {
      toast.error('Erro ao fazer upload do avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function saveProfileData() {
    if (!franquiaUser?.id) return

    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${franquiaUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: profileData.name,
          email: profileData.email
        })
      })

      if (response.ok) {
        const { user } = await response.json()

        // Atualizar store
        setFranquiaUser({
          ...franquiaUser,
          name: user.name,
          email: user.email
        })

        toast.success('Perfil atualizado com sucesso!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao atualizar perfil')
      }
    } catch (error) {
      toast.error('Erro ao atualizar perfil')
    } finally {
      setLoading(false)
    }
  }

  async function saveGeneralSettings() {
    if (!franquiaUser?.academyId) return

    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/academies/${franquiaUser.academyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: settings.name,
          email: settings.email,
          address: settings.address,
          phone: settings.phone,
          city: settings.city,
          state: settings.state,
          zip_code: settings.zipCode,
          credits_per_class: Number(settings.creditsPerClass || 1)
        })
      })

      if (response.ok) {
        toast.success('Informações atualizadas com sucesso!')
      } else {
        toast.error('Erro ao salvar informações')
      }
    } catch (error) {
      toast.error('Erro ao salvar informações')
    } finally {
      setLoading(false)
    }
  }

  async function saveSystemSettings() {
    if (!franquiaUser?.academyId) {
      toast.error('ID da academia não encontrado')
      return
    }

    // Validações
    if (settings.checkinTolerance < 0 || settings.checkinTolerance > 180) {
      toast.error('Tolerância deve estar entre 0 e 180 minutos')
      return
    }

    setLoading(true)
    try {
      const payload = {
        schedule: JSON.stringify(settings.schedule),
        checkin_tolerance: Number(settings.checkinTolerance),
        class_duration_minutes: Number(settings.classDurationMinutes || 60)
      }


      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/academies/${franquiaUser!.academyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        // Gerar slots automaticamente após salvar configurações
        await generateTimeSlots()
        toast.success('Configurações e slots atualizados com sucesso!')
        loadSettings() // Recarregar dados
        loadTimeSlots() // Recarregar slots
      } else {
        toast.error(data.error || 'Erro ao salvar configurações')
      }
    } catch (error) {
      toast.error('Erro ao salvar configurações')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="pb-4 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-600 mt-2">Gerencie as configurações da sua unidade</p>
        </div>

      {/* Navegação por Abas */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-1 -mb-px">
          <Button
            onClick={() => setActiveTab('perfil')}
            variant={activeTab === 'perfil' ? 'default' : 'ghost'}
            className="flex-1"
          >
            <User className="h-4 w-4 mr-2" />
            Meu Perfil
          </Button>
          <Button
            onClick={() => setActiveTab('geral')}
            variant={activeTab === 'geral' ? 'default' : 'ghost'}
            className="flex-1"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Informações Gerais
          </Button>
          <Button
            onClick={() => setActiveTab('qrcode')}
            variant={activeTab === 'qrcode' ? 'default' : 'ghost'}
            className="flex-1"
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR Code Check-in
          </Button>
          <Button
            onClick={() => setActiveTab('sistema')}
            variant={activeTab === 'sistema' ? 'default' : 'ghost'}
            className="flex-1"
          >
            <Settings className="h-4 w-4 mr-2" />
            Sistema
          </Button>
        </div>
      </div>

      {/* Conteúdo das Abas */}
      <div className="pb-8">
        {/* Aba: Meu Perfil */}
        {activeTab === 'perfil' && (
          <Card className="p-8 border-t-4 border-t-meu-primary shadow-sm">
            <div className="flex items-center space-x-3 mb-8">
              <User className="h-6 w-6 text-meu-primary" />
              <h3 className="text-xl font-bold text-gray-900">Meu Perfil</h3>
            </div>

            <div className="space-y-8">
              {/* Avatar Section */}
              <div className="flex items-start space-x-6">
                <div className="relative group">
                  {franquiaUser?.avatar_url ? (
                    <img
                      src={franquiaUser.avatar_url}
                      alt={franquiaUser.name}
                      className="w-24 h-24 rounded-full object-cover shadow-lg ring-4 ring-meu-cyan/20"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-meu-primary to-meu-cyan flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                      {franquiaUser?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-meu-primary hover:bg-meu-cyan hover:text-white transition-all border-2 border-white disabled:opacity-50"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>

                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">{franquiaUser?.name}</h4>
                  <p className="text-sm text-gray-600 mb-4">{franquiaUser?.email}</p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    variant="outline"
                    size="sm"
                    className="border-meu-cyan text-meu-primary hover:bg-meu-cyan/10"
                  >
                    {uploadingAvatar ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Alterar foto
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Formatos aceitos: JPG, PNG. Tamanho máximo: 2MB
                  </p>
                </div>
              </div>

              {/* Parâmetros do Sistema */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tolerância de check-in (minutos)</label>
                  <Input
                    value={settings.checkinTolerance}
                    onChange={(e) => setSettings({ ...settings, checkinTolerance: Number(e.target.value) || 0 })}
                    type="number"
                    min={0}
                    max={180}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duração padrão de aula (minutos)</label>
                  <Input
                    value={settings.classDurationMinutes}
                    onChange={(e) => setSettings({ ...settings, classDurationMinutes: Math.max(15, Number(e.target.value) || 60) })}
                    type="number"
                    min={15}
                    max={240}
                  />
                  <p className="text-xs text-gray-500 mt-1">Usado para calcular o tempo dos agendamentos e os intervalos dos slots.</p>
                </div>
              </div>

              {/* User Info */}
              <div className="space-y-6 pt-6 border-t">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                    <Input
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <Input
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      placeholder="seu@email.com"
                      type="email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Academia</label>
                    <Input
                      value={franquiaUser?.academyName || 'Carregando...'}
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Função</label>
                    <Input
                      value={franquiaUser?.role === 'FRANCHISE_ADMIN' ? 'Administrador' : franquiaUser?.role || 'Usuário'}
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={saveProfileData}
                    disabled={loading}
                    className="w-full md:w-auto"
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
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Aba: Informações Gerais */}
        {activeTab === 'geral' && (
          <Card className="p-8 border-t-4 border-t-meu-primary shadow-sm">
            <div className="flex items-center space-x-3 mb-8">
              <Building2 className="h-6 w-6 text-meu-primary" />
              <h3 className="text-xl font-bold text-gray-900">Informações da Academia</h3>
            </div>
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Academia</label>
                  <Input 
                    value={settings.name} 
                    onChange={(e) => setSettings({...settings, name: e.target.value})}
                    placeholder="Nome da academia"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Administrativo</label>
                  <Input 
                    value={settings.email}
                    onChange={(e) => setSettings({...settings, email: e.target.value})}
                    placeholder="email@academia.com"
                    type="email"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
                  <Input 
                    value={settings.address}
                    onChange={(e) => setSettings({...settings, address: e.target.value})}
                    placeholder="Rua da Academia, 123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                  <Input 
                    value={settings.phone}
                    onChange={(e) => setSettings({...settings, phone: e.target.value})}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Créditos por aula (60 min)</label>
                  <Input 
                    value={settings.creditsPerClass}
                    onChange={(e) => setSettings({...settings, creditsPerClass: Number(e.target.value) || 1})}
                    placeholder="1"
                    type="number"
                    min={1}
                  />
                  <p className="text-xs text-gray-500 mt-1">Usado para cobrar o aluno ao confirmar uma aula.</p>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                  <Input 
                    value={settings.city}
                    onChange={(e) => setSettings({...settings, city: e.target.value})}
                    placeholder="São Paulo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                  <Input 
                    value={settings.state}
                    onChange={(e) => setSettings({...settings, state: e.target.value.toUpperCase()})}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CEP</label>
                  <Input 
                    value={settings.zipCode}
                    onChange={(e) => setSettings({...settings, zipCode: e.target.value})}
                    placeholder="00000-000"
                  />
                </div>
              </div>
              <div className="pt-4">
                <Button 
                  onClick={saveGeneralSettings}
                  disabled={loading}
                  className="w-full md:w-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Aba: QR Code Check-in */}
        {activeTab === 'qrcode' && (
          <Card className="p-8 border-t-4 border-t-meu-accent-cyan shadow-sm">
            <div className="flex items-center space-x-3 mb-8">
              <QrCode className="h-6 w-6 text-meu-accent-cyan" />
              <h3 className="text-xl font-bold text-gray-900">QR Code para Check-in</h3>
            </div>
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 mb-6">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Como funciona:</strong>
              </p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Imprima e fixe este QR Code na portaria da unidade</li>
                <li>Professores escaneiam o código ao chegar</li>
                <li>Sistema valida automaticamente se há aula agendada</li>
                <li>Acesso liberado ou negado em tempo real</li>
              </ul>
            </div>
            <div className="flex flex-col items-center space-y-6">
              <div className="bg-white p-6 rounded-xl border-2 border-meu-accent-cyan/30 shadow-lg">
                <QRCodeSVG
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/checkin/a/${franquiaUser?.academyId || ''}`}
                  size={240}
                  level="H"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                <Button
                  variant="outline"
                  className="border-meu-accent-cyan text-meu-accent-cyan hover:bg-meu-accent-cyan hover:text-white"
                  onClick={() => {
                    const url = `${window.location.origin}/checkin/a/${franquiaUser?.academyId}`
                    navigator.clipboard.writeText(url)
                    toast.success('Link copiado!')
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Link
                </Button>
                <Button
                  variant="outline"
                  className="border-meu-accent-cyan text-meu-accent-cyan hover:bg-meu-accent-cyan hover:text-white"
                  onClick={() => {
                    const svg = document.querySelector('svg')
                    if (svg) {
                      const svgData = new XMLSerializer().serializeToString(svg)
                      const canvas = document.createElement('canvas')
                      const ctx = canvas.getContext('2d')
                      const img = new Image()
                      img.onload = () => {
                        canvas.width = img.width
                        canvas.height = img.height
                        ctx?.drawImage(img, 0, 0)
                        const pngFile = canvas.toDataURL('image/png')
                        const downloadLink = document.createElement('a')
                        downloadLink.download = 'qrcode-checkin.png'
                        downloadLink.href = pngFile
                        downloadLink.click()
                      }
                      img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PNG
                </Button>
                <Button
                  variant="outline"
                  className="border-meu-accent-cyan text-meu-accent-cyan hover:bg-meu-accent-cyan hover:text-white"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Aba: Configurações do Sistema */}
        {activeTab === 'sistema' && (
          <Card className="p-8 border-t-4 border-t-meu-accent-yellow shadow-sm">
            <div className="flex items-center space-x-3 mb-8">
              <Settings className="h-6 w-6 text-meu-accent-yellow" />
              <h3 className="text-xl font-bold text-gray-900">Configurações do Sistema</h3>
            </div>
            <div className="space-y-6">
              <div className="bg-yellow-50 rounded-xl p-6">
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Horário de Funcionamento</p>
                    <p className="text-sm text-gray-600 mb-4">Configure os horários para cada dia da semana</p>
                  </div>
                  
                  {settings.schedule?.map((daySchedule, index) => (
                    <div key={daySchedule.day} className="flex items-center space-x-4 py-2 border-b border-yellow-100 last:border-0">
                      <div className="flex items-center space-x-3 w-32">
                        <input
                          type="checkbox"
                          checked={daySchedule.isOpen}
                          onChange={(e) => {
                            const newSchedule = [...settings.schedule]
                            newSchedule[index].isOpen = e.target.checked
                            setSettings({...settings, schedule: newSchedule})
                          }}
                          className="w-4 h-4 text-meu-primary rounded focus:ring-meu-primary"
                        />
                        <span className={`font-medium ${daySchedule.isOpen ? 'text-gray-900' : 'text-gray-400'}`}>
                          {daySchedule.dayName}
                        </span>
                      </div>
                      
                      {daySchedule.isOpen ? (
                        <div className="flex items-center space-x-2 flex-1">
                          <Input 
                            className="w-24" 
                            value={daySchedule.openingTime}
                            onChange={(e) => {
                              const newSchedule = [...settings.schedule]
                              newSchedule[index].openingTime = e.target.value
                              setSettings({...settings, schedule: newSchedule})
                            }}
                            type="time"
                          />
                          <span className="text-gray-600">até</span>
                          <Input 
                            className="w-24" 
                            value={daySchedule.closingTime}
                            onChange={(e) => {
                              const newSchedule = [...settings.schedule]
                              newSchedule[index].closingTime = e.target.value
                              setSettings({...settings, schedule: newSchedule})
                            }}
                            type="time"
                          />
                          <div className="flex items-center space-x-2 ml-4">
                            <span className="text-sm text-gray-600">Capacidade:</span>
                            <Input 
                              className="w-16 text-center" 
                              value={daySchedule.slotsPerHour || 1}
                              onChange={(e) => {
                                const val = Number(e.target.value)
                                if (val >= 1 && val <= 20) {
                                  const newSchedule = [...settings.schedule]
                                  newSchedule[index].slotsPerHour = val
                                  setSettings({...settings, schedule: newSchedule})
                                }
                              }}
                              type="number"
                              min="1"
                              max="20"
                            />
                            <span className="text-xs text-gray-500">reservas/hora</span>
                          </div>
                         
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 flex-1">Fechado</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumo dos Slots */}
              {timeSlots.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-blue-900">Slots de Horários disponíveis</p>
                      <p className="text-sm text-blue-700">Total de {timeSlots.length} slots criados</p>
                    </div>
                    <Button
                      onClick={generateTimeSlots}
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      Regenerar Slots
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-2 text-xs">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, dayIndex) => {
                      const daySlots = timeSlots.filter(slot => slot.day_of_week === dayIndex)
                      return (
                        <div key={day} className="text-center">
                          <div className="font-medium text-blue-900 mb-1">{day}</div>
                          <div className={`px-2 py-1 rounded text-xs ${
                            daySlots.length > 0 
                              ? 'bg-blue-200 text-blue-800' 
                              : 'bg-gray-200 text-gray-500'
                          }`}>
                            {daySlots.length} slots
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Tolerância Check-in</p>
                    <p className="text-sm text-gray-600">Minutos de antecedência/atraso permitidos (0-180)</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input 
                      className="w-20 text-center" 
                      value={settings.checkinTolerance}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        if (val >= 0 && val <= 180) {
                          setSettings({...settings, checkinTolerance: val})
                        }
                      }}
                      type="number"
                      min="0"
                      max="180"
                    />
                    <span className="text-sm text-gray-600">min</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={saveSystemSettings}
                  disabled={loading}
                  className="w-full md:w-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Configurações'
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}

      </div>
      </div>
    </div>
  )
}
