import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middlewares
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(compression())
app.use(morgan('dev'))
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
import plansRoutes from './routes/plans'
import approvalsRoutes from './routes/approvals'
import paymentsRoutes from './routes/payments'
import franchisesRoutes from './routes/franchises'
import webhooksRoutes from './routes/webhooks'
import checkoutRoutes from './routes/checkout'

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/academies', academiesRoutes)
app.use('/api/teachers', teachersRoutes)
app.use('/api/teachers', teacherStudentsRoutes)
app.use('/api/teachers', teacherPreferencesRoutes)
app.use('/api/students', studentsRoutes)
app.use('/api/bookings', bookingsRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/plans', plansRoutes)
app.use('/api/approvals', approvalsRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/franchises', franchisesRoutes)
app.use('/api/webhooks', webhooksRoutes)
app.use('/api/checkout', checkoutRoutes)

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})