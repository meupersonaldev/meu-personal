import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import dotenv from 'dotenv'
import path from 'path'

// SEGURANÇA CRÍTICA: Importar middlewares de segurança
import { authRateLimit, apiRateLimit, uploadRateLimit } from './middleware/rateLimit'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { auditMiddleware } from './middleware/audit'

// Load environment variables from apps/api/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') })


// Configurar timezone globalmente
process.env.TZ = 'America/Sao_Paulo'

const app = express()
const PORT = process.env.PORT || 3001

// SEGURANÇA CRÍTICA: Headers de segurança aprimorados
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Necessário para alguns recursos
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))

// Rate limiting global para todas as APIs
app.use(apiRateLimit)

// SEGURANÇA CRÍTICA: CORS configurado para produção com allowlist restritiva
const isProduction = process.env.NODE_ENV === 'production'
const rawOrigins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000'
const allowedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Em produção, origin é obrigatório
    if (isProduction && !origin) {
      return callback(new Error('Origin header required in production'))
    }
    
    // Permitir requisições sem origin (mobile apps, Postman, etc) apenas em desenvolvimento
    if (!origin && !isProduction) {
      return callback(null, true)
    }
    
    // Em desenvolvimento, permitir localhost
    if (!isProduction) {
      const isLocalhost = /^(https?:\/\/)?(localhost|127\.0\.0\.1):(\d+)(\/.*)?$/.test(origin || '')
      if (isLocalhost) {
        return callback(null, true)
      }
    }
    
    // Verificar se origin está na allowlist
    if (origin && allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    
    // Log de tentativa de acesso não autorizado em produção (sem req.ip nesse escopo)
    if (isProduction && origin) {
      console.warn(`CORS blocked origin: ${origin}`)
    }
    
    return callback(new Error(`Not allowed by CORS: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['X-Total-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: isProduction ? 86400 : 3600, // 24h em produção, 1h em dev
  optionsSuccessStatus: 204
}))
app.use(compression())
app.use(morgan('dev'))

// Middleware de auditoria para capturar informações básicas
app.use(auditMiddleware)

// Middleware para configurar timezone em cada requisição
app.use((req, res, next) => {
  // Adicionar timezone ao request para uso posterior
  req.timezone = 'America/Sao_Paulo'
  next()
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
import authRoutes from './routes/auth'
import teachersRoutes from './routes/teachers'
import teacherStudentsRoutes from './routes/teacher-students'
import teacherPreferencesRoutes from './routes/teacher-preferences'
import usersRoutes from './routes/users'
import academiesRoutes from './routes/academies'
import studentsRoutes from './routes/students'
import bookingsRoutes from './routes/bookings'
import notificationsRoutes from './routes/notifications'
import approvalsRoutes from './routes/approvals'
import franchisesRoutes from './routes/franchises'
import webhooksRoutes from './routes/webhooks'
import checkoutRoutes from './routes/checkout'
import checkinsRoutes from './routes/checkins'
import financialRoutes from './routes/financial'
import calendarRoutes from './routes/calendar'
import timeSlotsRoutes from './routes/time-slots'
import uploadRoutes from './routes/upload'
import studentBookingsRoutes from './routes/student-bookings'
import franqueadoraRoutes from './routes/franqueadora'
import adminRoutes from './routes/admin'
import reviewsRoutes from './routes/reviews'
import packagesRoutes from './routes/packages'
import { bookingScheduler } from './jobs/booking-scheduler'

// Servir arquivos estáticos de uploads
app.use('/uploads', express.static('uploads'))
// SEGURANÇA CRÍTICA: Rate limit específico para auth (mais restritivo)
app.use('/api/auth', authRateLimit, authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/academies', academiesRoutes)
app.use('/api/teachers', teachersRoutes)
app.use('/api/teachers', teacherStudentsRoutes)
app.use('/api/teachers', teacherPreferencesRoutes)
app.use('/api/bookings', studentBookingsRoutes)
app.use('/api/bookings', bookingsRoutes)
app.use('/api/checkins', checkinsRoutes)
app.use('/api/financial', financialRoutes)
app.use('/api/calendar', calendarRoutes)
app.use('/api/franchises', franchisesRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/time-slots', timeSlotsRoutes)
app.use('/api/checkout', checkoutRoutes)
app.use('/api/packages', packagesRoutes)
// SEGURANÇA CRÍTICA: Rate limit específico para uploads
app.use('/api', uploadRateLimit, uploadRoutes)
app.use('/api/franqueadora', franqueadoraRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/reviews', reviewsRoutes)

// SEGURANÇA CRÍTICA: Middleware para rotas não encontradas (deve vir antes do errorHandler)
app.use(notFoundHandler)

// SEGURANÇA CRÍTICA: Middleware de tratamento de erros avançado (deve ser o último)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`)
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔒 Modo de segurança: ATIVO`)

  // Iniciar scheduler T-4h para processamento automático de locks
  console.log(`⏰ Iniciando scheduler T-4h para processamento automático de locks...`)
  const schedulerInterval = process.env.SCHEDULER_INTERVAL_MINUTES ?
    parseInt(process.env.SCHEDULER_INTERVAL_MINUTES) : 15

  bookingScheduler.startScheduler(schedulerInterval)
  console.log(`✅ Scheduler configurado para rodar a cada ${schedulerInterval} minutos`)
})
