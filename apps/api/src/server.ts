import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from apps/api/.env
// IMPORTANTE: Esta deve ser a primeira coisa a ser executada
dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Exibir configuração do Asaas ao iniciar o servidor
const asaasApiKey = process.env.ASAAS_API_KEY
const asaasEnv = process.env.ASAAS_ENV || 'sandbox'
if (asaasApiKey) {
  const maskedKey = asaasApiKey.length > 30 
    ? asaasApiKey.substring(0, 30) + '...' + asaasApiKey.substring(asaasApiKey.length - 15)
    : asaasApiKey.substring(0, 15) + '...'
  console.log('🔑 ASAAS_API_KEY carregada:', {
    ambiente: asaasEnv,
    url: asaasEnv === 'production' ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/api/v3',
    keyPreview: maskedKey,
    keyLength: asaasApiKey.length,
    keyPrefix: asaasApiKey.substring(0, 15)
  })
} else {
  console.warn('⚠️ ASAAS_API_KEY não configurada no .env')
}

import express from 'express'
import cors from 'cors'
import type { CorsOptions } from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'

// SEGURANÇA CRÍTICA: Importar middlewares de segurança
import { authRateLimit, apiRateLimit } from './middleware/rateLimit'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { auditMiddleware } from './middleware/audit'

// Configurar timezone globalmente
process.env.TZ = 'America/Sao_Paulo'

export const app = express()
// Necessário quando rodando atrás de proxy (nginx, traefik, cloud) para que req.secure/x-forwarded-* funcionem
app.set('trust proxy', 1)
const PORT = process.env.PORT || 3001

// SEGURANÇA CRÍTICA: CORS configurado para produção com allowlist restritiva
const isProduction = process.env.NODE_ENV === 'production'
const rawOrigins =
  process.env.CORS_ORIGINS ||
  process.env.FRONTEND_URL ||
  'http://localhost:3000'
const allowedOrigins = rawOrigins
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      if (isProduction) {
        console.warn(
          'CORS allowing request sem origem (provável health-check ou serviço interno)'
        )
      }
      return callback(null, true)
    }

    if (!isProduction) {
      const isLocalhost =
        /^(https?:\/\/)?(localhost|127\.0\.0\.1):(\d+)(\/.*)?$/.test(
          origin || ''
        )
      if (isLocalhost) {
        return callback(null, true)
      }
    }

    if (origin && allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

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
    'Pragma',
    'asaas-access-token'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: isProduction ? 86400 : 3600,
  optionsSuccessStatus: 204
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

// SEGURANÇA CRÍTICA: Headers de segurança aprimorados
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false, // Necessário para alguns recursos
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })
)

// Rate limiting global para todas as APIs
app.use(apiRateLimit)
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
import usersRoutes from './routes/users'
import bookingsRoutes from './routes/bookings'
import notificationsRoutes from './routes/notifications'
import approvalsRoutes from './routes/approvals'
import franchisesRoutes from './routes/franchises'
import webhooksRoutes from './routes/webhooks'
import checkinsRoutes from './routes/checkins'
import financialRoutes from './routes/financial'
import paymentsRoutes from './routes/payments'
import calendarRoutes from './routes/calendar'
import timeSlotsRoutes from './routes/time-slots'
import franqueadoraRoutes from './routes/franqueadora'
import adminRoutes from './routes/admin'
import packagesRoutes from './routes/packages'
import teachersRoutes from './routes/teachers'
import teacherPreferencesRoutes from './routes/teacher-preferences'
import teacherStudentsRoutes from './routes/teacher-students'
import academiesRoutes from './routes/academies'
import studentUnitsRoutes from './routes/student-units'
import studentsRoutes from './routes/students'
import franchisorPoliciesRoutes from './routes/franchisor-policies'
import asaasRoutes from './routes/asaas'
import bookingSeriesRoutes from './routes/booking-series'
import { bookingScheduler } from './jobs/booking-scheduler'
import { reservationScheduler } from './jobs/reservation-processor'
import { teacherAvailabilityScheduler } from './jobs/teacher-availability-scheduler'
import { asaasSyncService } from './services/asaas-sync.service'

// SEGURANÇA CRÍTICA: Rate limit específico para auth (mais restritivo)
app.use('/api/auth', authRateLimit, authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/bookings', bookingsRoutes)
app.use('/api/checkins', checkinsRoutes)
app.use('/api/financial', financialRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/calendar', calendarRoutes)
app.use('/api/franchises', franchisesRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/time-slots', timeSlotsRoutes)
app.use('/api/packages', packagesRoutes)
app.use('/api/academies', academiesRoutes)
app.use('/api/teachers', teachersRoutes)
app.use('/api/teachers', teacherPreferencesRoutes)
app.use('/api/teachers', teacherStudentsRoutes)
app.use('/api/student-units', studentUnitsRoutes)
app.use('/api/students', studentsRoutes)
// Webhooks (pagamentos, etc)
app.use('/api/webhooks', webhooksRoutes)
app.use('/api/franqueadora', franqueadoraRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/franchisor/policies', franchisorPoliciesRoutes)
app.use('/api/asaas', asaasRoutes)
app.use('/api/booking-series', bookingSeriesRoutes)

// SEGURANÇA CRÍTICA: Middleware para rotas não encontradas (deve vir antes do errorHandler)
app.use(notFoundHandler)

// SEGURANÇA CRÍTICA: Middleware de tratamento de erros avançado (deve ser o último)
app.use(errorHandler)

// Usar global para persistir o servidor entre reloads do tsx watch
declare global {
  var __server: import('http').Server | undefined
}

const gracefulShutdown = () => {
  console.log('🔌 Recebido sinal de desligamento, encerrando servidor...')
  if (global.__server) {
    global.__server.close(() => {
      console.log('✅ Servidor encerrado.')
      process.exit(0)
    })
  } else {
    process.exit(0)
  }
}

// Registrar handlers de shutdown (remover duplicados)
process.removeAllListeners('SIGTERM')
process.removeAllListeners('SIGINT')
process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

// Fechar servidor existente antes de criar um novo (hot reload)
if (global.__server) {
  console.log('� FeMchando servidor anterior...')
  global.__server.close()
  global.__server = undefined
}

if (process.env.NODE_ENV !== 'test') {
  global.__server = app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`)
    console.log(`📚 API Documentation: http://localhost:${PORT}/api`)
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`🔒 Modo de segurança: ATIVO`)

    // Iniciar scheduler T-4h para processamento automático de locks
    console.log(
      `⏰ Iniciando scheduler T-4h para processamento automático de locks...`
    )
    const schedulerInterval = process.env.SCHEDULER_INTERVAL_MINUTES
      ? parseInt(process.env.SCHEDULER_INTERVAL_MINUTES)
      : 15

    bookingScheduler.startScheduler(schedulerInterval)
    console.log(
      `✅ Scheduler de bookings configurado para rodar a cada ${schedulerInterval} minutos`
    )

    // Iniciar scheduler de processamento de reservas recorrentes (diário às 08:00)
    console.log('⏰ Iniciando scheduler de reservas recorrentes...')
    const reservationHour = process.env.RESERVATION_SCHEDULER_HOUR
      ? parseInt(process.env.RESERVATION_SCHEDULER_HOUR)
      : 8 // Padrão: 08:00
    reservationScheduler.startDailyScheduler(reservationHour)
    console.log(
      `✅ Scheduler de reservas configurado para rodar às ${reservationHour}:00`
    )

    // Iniciar scheduler de preenchimento de agenda de professores (diário às 02:00)
    console.log('⏰ Iniciando scheduler de disponibilidade de professores...')
    const availabilityHour = process.env.TEACHER_AVAILABILITY_SCHEDULER_HOUR
      ? parseInt(process.env.TEACHER_AVAILABILITY_SCHEDULER_HOUR)
      : 2 // Padrão: 02:00
    teacherAvailabilityScheduler.startDailyScheduler(availabilityHour)
    console.log(
      `✅ Scheduler de disponibilidade configurado para rodar às ${availabilityHour}:00`
    )

    // Sincronizar subcontas Asaas na inicialização (assíncrono, não bloqueia)
    setTimeout(async () => {
      try {
        await asaasSyncService.syncAll()
      } catch (error: any) {
        console.error('Erro na sincronização de subcontas Asaas:', error)
      }
    }, 2000) // Delay de 2s para garantir que o servidor está totalmente iniciado
  })
}
