'use client'

import { useState, useEffect } from 'react'
import { useFranquiaStore } from '@/lib/stores/franquia-store'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Download, Copy, Printer, Building2, QrCode, Settings, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import QRCodeSVG from 'react-qr-code'

type DaySchedule = {
  day: string
  dayName: string
  isOpen: boolean
  openingTime: string
  closingTime: string
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
}

export default function ConfiguracoesPage() {
  const { franquiaUser } = useFranquiaStore()
  const [activeTab, setActiveTab] = useState<'geral' | 'qrcode' | 'sistema'>('geral')
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<AcademySettings>({
    name: '',
    email: '',
    address: '',
    phone: '',
    city: '',
    state: '',
    zipCode: '',
    schedule: [
      { day: '0', dayName: 'Domingo', isOpen: false, openingTime: '06:00', closingTime: '22:00' },
      { day: '1', dayName: 'Segunda', isOpen: true, openingTime: '06:00', closingTime: '22:00' },
      { day: '2', dayName: 'Terça', isOpen: true, openingTime: '06:00', closingTime: '22:00' },
      { day: '3', dayName: 'Quarta', isOpen: true, openingTime: '06:00', closingTime: '22:00' },
      { day: '4', dayName: 'Quinta', isOpen: true, openingTime: '06:00', closingTime: '22:00' },
      { day: '5', dayName: 'Sexta', isOpen: true, openingTime: '06:00', closingTime: '22:00' },
      { day: '6', dayName: 'Sábado', isOpen: false, openingTime: '06:00', closingTime: '22:00' }
    ],
    checkinTolerance: 30
  })

  useEffect(() => {
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [franquiaUser?.academyId])

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
          { day: '0', dayName: 'Domingo', isOpen: false, openingTime: '06:00', closingTime: '22:00' },
          { day: '1', dayName: 'Segunda', isOpen: true, openingTime: '06:00', closingTime: '22:00' },
          { day: '2', dayName: 'Terça', isOpen: true, openingTime: '06:00', closingTime: '22:00' },
          { day: '3', dayName: 'Quarta', isOpen: true, openingTime: '06:00', closingTime: '22:00' },
          { day: '4', dayName: 'Quinta', isOpen: true, openingTime: '06:00', closingTime: '22:00' },
          { day: '5', dayName: 'Sexta', isOpen: true, openingTime: '06:00', closingTime: '22:00' },
          { day: '6', dayName: 'Sábado', isOpen: false, openingTime: '06:00', closingTime: '22:00' }
        ]
        
        let schedule = defaultSchedule
        if (academy.schedule) {
          try {
            const parsed = typeof academy.schedule === 'string' 
              ? JSON.parse(academy.schedule) 
              : academy.schedule
            if (Array.isArray(parsed) && parsed.length > 0) {
              schedule = parsed
            }
          } catch (e) {
            console.error('Erro ao parsear schedule:', e)
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
          checkinTolerance: academy.checkin_tolerance || 30
        })
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
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
          zip_code: settings.zipCode
        })
      })

      if (response.ok) {
        toast.success('Informações atualizadas com sucesso!')
      } else {
        toast.error('Erro ao salvar informações')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
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
        checkin_tolerance: Number(settings.checkinTolerance)
      }

      console.log('Salvando configurações:', payload)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/academies/${franquiaUser.academyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      console.log('Resposta:', data)

      if (response.ok) {
        toast.success('Configurações atualizadas com sucesso!')
        loadSettings() // Recarregar dados
      } else {
        toast.error(data.error || 'Erro ao salvar configurações')
        console.error('Erro do servidor:', data)
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
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
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 flex-1">Fechado</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

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
