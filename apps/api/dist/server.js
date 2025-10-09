"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const rateLimit_1 = require("./middleware/rateLimit");
const errorHandler_1 = require("./middleware/errorHandler");
const audit_1 = require("./middleware/audit");
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
process.env.TZ = 'America/Sao_Paulo';
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, helmet_1.default)({
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
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));
app.use(rateLimit_1.apiRateLimit);
const isProduction = process.env.NODE_ENV === 'production';
const rawOrigins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (isProduction && !origin) {
            return callback(new Error('Origin header required in production'));
        }
        if (!origin && !isProduction) {
            return callback(null, true);
        }
        if (!isProduction) {
            const isLocalhost = /^(https?:\/\/)?(localhost|127\.0\.0\.1):(\d+)(\/.*)?$/.test(origin || '');
            if (isLocalhost) {
                return callback(null, true);
            }
        }
        if (origin && allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        if (isProduction && origin) {
            console.warn(`CORS blocked origin: ${origin}`);
        }
        return callback(new Error(`Not allowed by CORS: ${origin}`));
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
    maxAge: isProduction ? 86400 : 3600,
    optionsSuccessStatus: 204
}));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(audit_1.auditMiddleware);
app.use((req, res, next) => {
    req.timezone = 'America/Sao_Paulo';
    next();
});
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const bookings_1 = __importDefault(require("./routes/bookings"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const franchises_1 = __importDefault(require("./routes/franchises"));
const checkout_1 = __importDefault(require("./routes/checkout"));
const checkins_1 = __importDefault(require("./routes/checkins"));
const financial_1 = __importDefault(require("./routes/financial"));
const calendar_1 = __importDefault(require("./routes/calendar"));
const time_slots_1 = __importDefault(require("./routes/time-slots"));
const upload_1 = __importDefault(require("./routes/upload"));
const franqueadora_1 = __importDefault(require("./routes/franqueadora"));
const admin_1 = __importDefault(require("./routes/admin"));
const packages_1 = __importDefault(require("./routes/packages"));
const teachers_1 = __importDefault(require("./routes/teachers"));
const teacher_preferences_1 = __importDefault(require("./routes/teacher-preferences"));
const teacher_students_1 = __importDefault(require("./routes/teacher-students"));
const academies_1 = __importDefault(require("./routes/academies"));
const booking_scheduler_1 = require("./jobs/booking-scheduler");
app.use('/uploads', express_1.default.static('uploads'));
app.use('/api/auth', rateLimit_1.authRateLimit, auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/bookings', bookings_1.default);
app.use('/api/checkins', checkins_1.default);
app.use('/api/financial', financial_1.default);
app.use('/api/calendar', calendar_1.default);
app.use('/api/franchises', franchises_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/time-slots', time_slots_1.default);
app.use('/api/checkout', checkout_1.default);
app.use('/api/packages', packages_1.default);
app.use('/api/academies', academies_1.default);
app.use('/api/teachers', teachers_1.default);
app.use('/api/teachers', teacher_preferences_1.default);
app.use('/api/teachers', teacher_students_1.default);
app.use('/api', rateLimit_1.uploadRateLimit, upload_1.default);
app.use('/api/franqueadora', franqueadora_1.default);
app.use('/api/admin', admin_1.default);
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 Modo de segurança: ATIVO`);
    console.log(`⏰ Iniciando scheduler T-4h para processamento automático de locks...`);
    const schedulerInterval = process.env.SCHEDULER_INTERVAL_MINUTES ?
        parseInt(process.env.SCHEDULER_INTERVAL_MINUTES) : 15;
    booking_scheduler_1.bookingScheduler.startScheduler(schedulerInterval);
    console.log(`✅ Scheduler configurado para rodar a cada ${schedulerInterval} minutos`);
});
//# sourceMappingURL=server.js.map