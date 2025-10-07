export interface Teacher {
  id: string
  name: string
  avatar: string
  bio: string
  specialties: string[]
  hourlyRate: number
  availability: {
    [day: string]: { start: string; end: string }[]
  }
  location: string
}

export interface Booking {
  id: string
  teacherId: string
  teacherName: string
  teacherAvatar: string
  studentId: string
  date: string
  time: string
  duration: number
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  checkInCode?: string
  location: string
  notes?: string
  creditsCost: number
}

export interface CreditPackage {
  id: string
  name: string
  credits: number
  price: number
  discount?: number
  popular?: boolean
}

// Dados mockados de professores
export const mockTeachers: Teacher[] = [
  {
    id: '2',
    name: 'Maria Santos',
    avatar: '/images/avatars/maria.jpg',
    bio: 'Personal trainer especializada em emagrecimento e condicionamento físico. 8 anos de experiência.',
    specialties: ['Emagrecimento', 'Condicionamento', 'Musculação'],
    hourlyRate: 80,
    availability: {
      'monday': [{ start: '06:00', end: '12:00' }, { start: '14:00', end: '20:00' }],
      'tuesday': [{ start: '06:00', end: '12:00' }, { start: '14:00', end: '20:00' }],
      'wednesday': [{ start: '06:00', end: '12:00' }, { start: '14:00', end: '20:00' }],
      'thursday': [{ start: '06:00', end: '12:00' }, { start: '14:00', end: '20:00' }],
      'friday': [{ start: '06:00', end: '12:00' }, { start: '14:00', end: '18:00' }],
      'saturday': [{ start: '08:00', end: '14:00' }]
    },
    location: 'Academia FitLife - Unidade Vila Madalena'
  },
  {
    id: '3',
    name: 'Carlos Personal',
    avatar: '/images/avatars/carlos.jpg',
    bio: 'Especialista em hipertrofia e força. Formado em Educação Física com pós em Musculação.',
    specialties: ['Hipertrofia', 'Força', 'Powerlifting'],
    hourlyRate: 100,
    availability: {
      'monday': [{ start: '05:00', end: '11:00' }, { start: '15:00', end: '21:00' }],
      'tuesday': [{ start: '05:00', end: '11:00' }, { start: '15:00', end: '21:00' }],
      'wednesday': [{ start: '05:00', end: '11:00' }, { start: '15:00', end: '21:00' }],
      'thursday': [{ start: '05:00', end: '11:00' }, { start: '15:00', end: '21:00' }],
      'friday': [{ start: '05:00', end: '11:00' }, { start: '15:00', end: '19:00' }],
      'saturday': [{ start: '07:00', end: '13:00' }]
    },
    location: 'Academia FitLife - Unidade Pinheiros'
  },
  {
    id: '5',
    name: 'Ana Fitness',
    avatar: '/images/avatars/ana-fitness.jpg',
    bio: 'Personal especializada em treinamento funcional e reabilitação. Fisioterapeuta e educadora física.',
    specialties: ['Funcional', 'Reabilitação', 'Pilates'],
    hourlyRate: 90,
    availability: {
      'monday': [{ start: '07:00', end: '13:00' }, { start: '16:00', end: '20:00' }],
      'tuesday': [{ start: '07:00', end: '13:00' }, { start: '16:00', end: '20:00' }],
      'wednesday': [{ start: '07:00', end: '13:00' }, { start: '16:00', end: '20:00' }],
      'thursday': [{ start: '07:00', end: '13:00' }, { start: '16:00', end: '20:00' }],
      'friday': [{ start: '07:00', end: '13:00' }, { start: '16:00', end: '18:00' }],
      'saturday': [{ start: '08:00', end: '12:00' }]
    },
    location: 'Academia FitLife - Unidade Itaim'
  },
  {
    id: '6',
    name: 'Roberto Strong',
    avatar: '/images/avatars/roberto.jpg',
    bio: 'Ex-atleta de crossfit, especialista em condicionamento físico e preparação atlética.',
    specialties: ['CrossFit', 'Condicionamento', 'Preparação Atlética'],
    hourlyRate: 85,
    availability: {
      'monday': [{ start: '06:00', end: '10:00' }, { start: '18:00', end: '22:00' }],
      'tuesday': [{ start: '06:00', end: '10:00' }, { start: '18:00', end: '22:00' }],
      'wednesday': [{ start: '06:00', end: '10:00' }, { start: '18:00', end: '22:00' }],
      'thursday': [{ start: '06:00', end: '10:00' }, { start: '18:00', end: '22:00' }],
      'friday': [{ start: '06:00', end: '10:00' }, { start: '18:00', end: '21:00' }],
      'saturday': [{ start: '09:00', end: '15:00' }]
    },
    location: 'Academia FitLife - Unidade Moema'
  }
]

// Dados mockados de agendamentos
export const mockBookings: Booking[] = [
  {
    id: '1',
    teacherId: '2',
    teacherName: 'Maria Santos',
    teacherAvatar: '/images/avatars/maria.jpg',
    studentId: '1',
    date: '2024-01-20',
    time: '08:00',
    duration: 60,
    status: 'CONFIRMED',
    checkInCode: 'MP2024',
    location: 'Academia FitLife - Vila Madalena',
    notes: 'Treino focado em pernas',
    creditsCost: 2
  },
  {
    id: '2',
    teacherId: '3',
    teacherName: 'Carlos Personal',
    teacherAvatar: '/images/avatars/carlos.jpg',
    studentId: '1',
    date: '2024-01-18',
    time: '16:00',
    duration: 60,
    status: 'COMPLETED',
    location: 'Academia FitLife - Pinheiros',
    notes: 'Treino de peito e tríceps',
    creditsCost: 3
  },
  {
    id: '3',
    teacherId: '5',
    teacherName: 'Ana Fitness',
    teacherAvatar: '/images/avatars/ana-fitness.jpg',
    studentId: '1',
    date: '2024-01-22',
    time: '10:00',
    duration: 60,
    status: 'PENDING',
    location: 'Academia FitLife - Itaim',
    notes: 'Treino funcional',
    creditsCost: 2
  }
]

// Pacotes de créditos
export const mockCreditPackages: CreditPackage[] = [
  {
    id: '1',
    name: 'Starter',
    credits: 5,
    price: 150,
    discount: 0
  },
  {
    id: '2',
    name: 'Regular',
    credits: 10,
    price: 280,
    discount: 10,
    popular: true
  },
  {
    id: '3',
    name: 'Premium',
    credits: 20,
    price: 520,
    discount: 15
  },
  {
    id: '4',
    name: 'VIP',
    credits: 50,
    price: 1200,
    discount: 20
  }
]

// Especialidades disponíveis
export const specialties = [
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

// Locais das academias
export const locations = [
  'Academia FitLife - Vila Madalena',
  'Academia FitLife - Pinheiros',
  'Academia FitLife - Itaim',
  'Academia FitLife - Moema',
  'Academia FitLife - Jardins',
  'Academia FitLife - Brooklin'
]
