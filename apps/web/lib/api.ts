const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Função helper para fazer requests
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        message: `Erro na requisição: ${response.status} ${response.statusText}` 
      }))
      
      // Log apenas erros críticos (não 404 ou 500 de recursos não encontrados)
      if (response.status !== 404 && response.status !== 500) {
        console.error(`API Error [${response.status}]:`, {
          url,
          status: response.status,
          statusText: response.statusText,
          error
        })
      }
      
      throw new Error(error.message || `Erro na requisição: ${response.status}`)
    }

    return response.json()
  } catch (error) {
    if (error instanceof Error && error.message.includes('fetch')) {
      console.error('Erro de conexão com a API:', url)
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
    role?: 'STUDENT' | 'TEACHER'
  }) {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },

  async me(token: string) {
    return apiRequest('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },

  async logout() {
    return apiRequest('/api/auth/logout', {
      method: 'POST',
    })
  },
}

// Teachers API
export const teachersAPI = {
  async getAll() {
    return apiRequest('/api/teachers')
  },

  async getById(id: string) {
    return apiRequest(`/api/teachers/${id}`)
  },

  async update(id: string, data: any, token: string) {
    return apiRequest(`/api/teachers/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
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
}

export default {
  auth: authAPI,
  teachers: teachersAPI,
  bookings: bookingsAPI,
}