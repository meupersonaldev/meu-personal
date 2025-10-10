export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Função helper para fazer requests
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`

  const config: RequestInit = {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  }

  try {
    const response = await fetch(url, config)
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: `Erro na requisição: ${response.status} ${response.statusText}` }))
      throw new Error(error.message || `Erro na requisição: ${response.status}`)
    }

    return response.json()
  } catch (error) {
    if (error instanceof Error && error.message.includes('fetch')) {
      throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando.')
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
    role?: 'STUDENT' | 'TEACHER'
  }) {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },

  async me(token: string) {
    return apiRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async logout() {
    return apiRequest('/api/auth/logout', { method: 'POST' })
  },
}

// Teachers API
export const teachersAPI = {
  async getAll(params?: { academy_id?: string }) {
    const query = new URLSearchParams()
    if (params?.academy_id) query.append('academy_id', params.academy_id)
    const path = `/api/teachers${query.toString() ? `?${query.toString()}` : ''}`
    return apiRequest(path)
  },

  async getById(id: string) {
    return apiRequest(`/api/teachers/${id}`)
  },

  async getAcademies(id: string) {
    return apiRequest(`/api/teachers/${id}/academies`)
  },
}

// Academies API
export const academiesAPI = {
  async getAll() {
    return apiRequest('/api/academies')
  },

  async getAvailableSlots(academyId: string, date: string, teacherId?: string) {
    const query = new URLSearchParams({ date })
    if (teacherId) query.append('teacher_id', teacherId)
    return apiRequest(`/api/academies/${academyId}/available-slots?${query.toString()}`)
  }
}

// Bookings API
export const bookingsAPI = {
  async getAll(params?: {
    student_id?: string
    teacher_id?: string
    status?: string
  }) {
    const queryParams = new URLSearchParams()
    if (params?.student_id) queryParams.append('student_id', params.student_id)
    if (params?.teacher_id) queryParams.append('teacher_id', params.teacher_id)
    if (params?.status) queryParams.append('status', params.status)
    const endpoint = `/api/bookings${queryParams.toString() ? '?' + queryParams.toString() : ''}`
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
  }, token: string) {
    return apiRequest('/api/bookings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
  },

  async update(id: string, data: {
    status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
    notes?: string
  }, token: string) {
    return apiRequest(`/api/bookings/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
  },

  async cancel(id: string, token: string) {
    return apiRequest(`/api/bookings/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
  }, token?: string) {
    return apiRequest('/api/bookings/student', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: JSON.stringify(data),
    })
  },

  // Cancelamento com política (>= 4h reembolsa aluno se student_credits)
  async cancelWithPolicy(id: string, token?: string) {
    return apiRequest(`/api/bookings/${id}/cancel`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
  }
}

export default {
  auth: authAPI,
  teachers: teachersAPI,
  bookings: bookingsAPI,
  academies: academiesAPI,
}
