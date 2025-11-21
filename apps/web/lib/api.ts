import { useAuthStore } from './stores/auth-store'

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Função helper genérica para chamadas à API
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token
  const url = `${API_BASE_URL}${endpoint}`

  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string> | undefined),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const config: RequestInit = {
    credentials: 'include',
    ...options,
    headers,
  }

  try {
    const response = await fetch(url, config)

    if (!response.ok) {
      if (response.status === 401) {
        console.log('API request returned 401. Logging out.')
        useAuthStore.getState().logout()
        // Interrompe a cadeia de promessas
        return new Promise<never>(() => {})
      }

      const error = await response
        .json()
        .catch(() => ({
          message: `Erro na requisição: ${response.status} ${response.statusText}`,
        }))

      throw new Error(error.message || `Erro na requisição: ${response.status}`)
    }

    return response.json()
  } catch (error) {
    if (error instanceof Error && error.message.includes('fetch')) {
      throw new Error(
        'Não foi possível conectar ao servidor. Verifique se o backend está rodando.',
      )
    }
    throw error
  }
}

// Auth API
export const authAPI = {
  async login(email: string, password: string) {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  async register(userData: {
    name: string
    email: string
    password: string
    phone?: string
    cpf?: string
    gender?: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER' | 'PREFER_NOT_TO_SAY'
    role?: 'STUDENT' | 'TEACHER'
  }) {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },

  async me() {
    return apiRequest('/api/auth/me')
  },

  async logout() {
    return apiRequest('/api/auth/logout', { method: 'POST' })
  },

  async resetPassword(token: string, password: string) {
    return apiRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })
  },
}

// Teachers API
export const teachersAPI = {
  async getAll(params?: { academy_id?: string }) {
    const query = new URLSearchParams()
    if (params?.academy_id) query.append('academy_id', params.academy_id)
    const path = `/api/teachers${
      query.toString() ? `?${query.toString()}` : ''
    }`
    return apiRequest(path)
  },

  async getById(id: string) {
    return apiRequest(`/api/teachers/${id}`)
  },

  async getAcademies(id: string) {
    return apiRequest(`/api/teachers/${id}/academies`)
  },

  async update(id: string, data: any) {
    return apiRequest(`/api/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async getPreferences(id: string) {
    return apiRequest(`/api/teachers/${id}/preferences`)
  },

  async updatePreferences(id: string, data: { academy_ids: string[] }) {
    return apiRequest(`/api/teachers/${id}/preferences`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
}

// Academies API
export const academiesAPI = {
  async getAll() {
    return apiRequest('/api/academies')
  },

  async getAvailableSlots(
    academyId: string,
    date: string,
    teacherId?: string,
  ) {
    const query = new URLSearchParams({ date })
    if (teacherId) query.append('teacher_id', teacherId)
    return apiRequest(
      `/api/academies/${academyId}/available-slots?${query.toString()}`,
    )
  },
}

// Bookings API
export const bookingsAPI = {
  async getAll(params?: {
    student_id?: string
    teacher_id?: string
    status?: string
  }) {
    const queryParams = new URLSearchParams()
    if (params?.student_id)
      queryParams.append('student_id', params.student_id)
    if (params?.teacher_id)
      queryParams.append('teacher_id', params.teacher_id)
    if (params?.status) queryParams.append('status', params.status)
    const endpoint = `/api/bookings${
      queryParams.toString() ? '?' + queryParams.toString() : ''
    }`
    return apiRequest(endpoint)
  },

  async getById(id: string) {
    return apiRequest(`/api/bookings/${id}`)
  },

  async create(data: {
    student_id: string
    teacher_id: string
    date: string
    duration?: number
    notes?: string
    credits_cost: number
  }) {
    return apiRequest('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(
    id: string,
    data: {
      status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
      notes?: string
    },
  ) {
    return apiRequest(`/api/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async cancel(id: string) {
    return apiRequest(`/api/bookings/${id}`, {
      method: 'DELETE',
    })
  },

  // Agendamento feito pelo aluno (confirma e debita créditos do aluno)
  async createStudent(data: {
    student_id: string
    teacher_id: string
    franchise_id: string
    date: string
    duration?: number
    notes?: string
  }) {
    return apiRequest('/api/bookings/student', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Cancelamento com política (>= 4h reembolsa aluno se student_credits)
  async cancelWithPolicy(id: string) {
    return apiRequest(`/api/bookings/${id}/cancel`, {
      method: 'POST',
    })
  },
}

// Users API
export const usersAPI = {
  async update(id: string, data: any) {
    return apiRequest(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async updatePassword(id: string, data: any) {
    return apiRequest(`/api/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async uploadAvatar(id: string, formData: FormData) {
    return apiRequest(`/api/users/${id}/avatar`, {
      method: 'POST',
      body: formData,
    })
  },
}

// Packages API
export const packagesAPI = {
  async getStudentBalance() {
    return apiRequest('/api/packages/student/balance')
  },
}

// Notifications API
export const notificationsAPI = {
  async getAll(params: { user_id: string; unread?: boolean }) {
    const query = new URLSearchParams()
    query.append('user_id', params.user_id)
    if (params.unread) query.append('unread', 'true')
    return apiRequest(`/api/notifications?${query.toString()}`)
  },

  async markAsRead(notificationId: string) {
    return apiRequest(`/api/notifications/${notificationId}/read`, {
      method: 'PUT',
    })
  },
}

// Student Units API
export const studentUnitsAPI = {
  async getUnits() {
    return apiRequest(`/api/student-units?_ts=${Date.now()}`)
  },

  async getAvailableUnits() {
    return apiRequest(`/api/student-units/available?_ts=${Date.now()}`)
  },

  async getActiveUnit() {
    return apiRequest(`/api/student-units/active?_ts=${Date.now()}`)
  },

  async activateUnit(unitId: string) {
    return apiRequest(`/api/student-units/${unitId}/activate`, {
      method: 'POST',
    })
  },

  async joinUnit(unitId: string) {
    return apiRequest('/api/student-units/join', {
      method: 'POST',
      body: JSON.stringify({ unitId }),
    })
  },
}

// Check-ins API
export const checkinsAPI = {
  async getAll(params?: { teacher_id?: string; student_id?: string }) {
    const query = new URLSearchParams()
    if (params?.teacher_id) query.append('teacher_id', params.teacher_id)
    if (params?.student_id) query.append('student_id', params.student_id)
    const path = `/api/checkins${
      query.toString() ? `?${query.toString()}` : ''
    }`
    return apiRequest(path)
  },
}

const api = {
  auth: authAPI,
  teachers: teachersAPI,
  bookings: bookingsAPI,
  academies: academiesAPI,
  checkins: checkinsAPI,
  users: usersAPI,
  packages: packagesAPI,
  notifications: notificationsAPI,
  studentUnits: studentUnitsAPI,
}

export default api

