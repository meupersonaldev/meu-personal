'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  User,
  Edit,
  Camera,
  Star,
  DollarSign,
  MapPin,
  Clock,
  Award,
  MessageSquare,
  Save,
  X,
  Plus,
  Trash2
} from 'lucide-react'
import { teachersAPI } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

// Especialidades disponíveis
const specialties = [
  'Emagrecimento',
  'Hipertrofia',
  'Condicionamento',
  'Musculação',
  'Funcional',
  'CrossFit',
  'Pilates',
  'Reabilitação',
  'Força',
  'Powerlifting',
  'Preparação Atlética',
  'Yoga',
  'Dança',
  'Boxe',
  'Muay Thai'
]

// Interface para perfil do professor
interface TeacherProfile {
  id: string
  name: string
  bio: string
  specialties: string[]
  hourlyRate: number
  rating: number
  totalReviews: number
  availability: Record<string, any>
  isAvailable: boolean
}

export default function ProfessorPerfil() {
  const { user, token } = useAuthStore()
  const [editando, setEditando] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [formData, setFormData] = useState({
    bio: '',
    specialties: [] as string[],
    hourly_rate: 0,
    is_available: true
  })

  // Carregar dados do perfil
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return

      try {
        setLoading(true)
        const response = await teachersAPI.getById(user.id)
        const teacherData = response.teacher

        setProfile(teacherData)
        setFormData({
          bio: teacherData.bio || '',
          specialties: teacherData.specialties || [],
          hourly_rate: teacherData.hourlyRate || 0,
          is_available: teacherData.isAvailable || true
        })
      } catch (error) {
        console.error('Erro ao carregar perfil:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user?.id])

  const handleSave = async () => {
    if (!user?.id || !token) return

    try {
      await teachersAPI.update(user.id, formData, token)

      // Atualizar estado local
      if (profile) {
        setProfile({
          ...profile,
          bio: formData.bio,
          specialties: formData.specialties,
          hourlyRate: formData.hourly_rate,
          isAvailable: formData.is_available
        })
      }

      setEditando(false)
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      alert('Erro ao salvar perfil. Tente novamente.')
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        bio: profile.bio,
        specialties: profile.specialties,
        hourly_rate: profile.hourlyRate,
        is_available: profile.isAvailable
      })
    }
    setEditando(false)
  }

  const addSpecialty = (specialty: string) => {
    if (!formData.specialties.includes(specialty)) {
      setFormData({
        ...formData,
        specialties: [...formData.specialties, specialty]
      })
    }
  }

  const removeSpecialty = (specialty: string) => {
    setFormData({
      ...formData,
      specialties: formData.specialties.filter(s => s !== specialty)
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto pt-20">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto pt-20">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Perfil não encontrado
            </h2>
            <p className="text-gray-600">
              Não foi possível carregar os dados do seu perfil.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto pt-20">
        {/* Header do Perfil */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-white" />
                </div>
                <button className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1.5 text-white hover:bg-blue-700">
                  <Camera className="w-3 h-3" />
                </button>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-800">{user?.name}</h1>
                <p className="text-gray-600">Personal Trainer</p>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{profile.rating.toFixed(1)}</span>
                    <span className="text-gray-500">({profile.totalReviews} avaliações)</span>
                  </div>
                  <div className="flex items-center space-x-1 text-green-600">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-medium">{formatCurrency(profile.hourlyRate)}/hora</span>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={() => editando ? handleSave() : setEditando(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editando ? <Save className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
              {editando ? 'Salvar' : 'Editar Perfil'}
            </Button>
          </div>
        </div>

        {/* Bio */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Sobre Mim
          </h2>

          {editando ? (
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="Conte um pouco sobre sua experiência, formação e especialidades..."
            />
          ) : (
            <p className="text-gray-700 leading-relaxed">
              {profile.bio || 'Adicione uma descrição sobre sua experiência e especialidades.'}
            </p>
          )}
        </div>

        {/* Especialidades */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2" />
            Especialidades
          </h2>

          <div className="flex flex-wrap gap-2 mb-4">
            {formData.specialties.map((specialty) => (
              <span
                key={specialty}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
              >
                {specialty}
                {editando && (
                  <button
                    onClick={() => removeSpecialty(specialty)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>

          {editando && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Adicionar especialidade:</h3>
              <div className="flex flex-wrap gap-2">
                {specialties
                  .filter(s => !formData.specialties.includes(s))
                  .map((specialty) => (
                    <button
                      key={specialty}
                      onClick={() => addSpecialty(specialty)}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm hover:bg-gray-200 flex items-center"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {specialty}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Configurações */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Configurações
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor por Hora
              </label>
              {editando ? (
                <input
                  type="number"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: Number(e.target.value) })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="80"
                />
              ) : (
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(profile.hourlyRate)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              {editando ? (
                <select
                  value={formData.is_available ? 'available' : 'unavailable'}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.value === 'available' })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="available">Disponível</option>
                  <option value="unavailable">Indisponível</option>
                </select>
              ) : (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  profile.isAvailable
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {profile.isAvailable ? 'Disponível' : 'Indisponível'}
                </span>
              )}
            </div>
          </div>

          {editando && (
            <div className="flex justify-end space-x-4 mt-6">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex items-center"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}