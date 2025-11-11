"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
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
exports.app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
exports.app.use((0, helmet_1.default)({
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
exports.app.use(rateLimit_1.apiRateLimit);
const isProduction = process.env.NODE_ENV === 'production';
const rawOrigins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);
exports.app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin) {
            if (isProduction) {
                console.warn('CORS allowing request sem origem (provável health-check ou serviço interno)');
            }
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
        'Pragma',
        'asaas-access-token'
    ],
    exposedHeaders: ['X-Total-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: isProduction ? 86400 : 3600,
    optionsSuccessStatus: 204
}));
exports.app.use((0, compression_1.default)());
exports.app.use((0, morgan_1.default)('dev'));
exports.app.use(audit_1.auditMiddleware);
exports.app.use((req, res, next) => {
    req.timezone = 'America/Sao_Paulo';
    next();
});
exports.app.use(express_1.default.json());
exports.app.use(express_1.default.urlencoded({ extended: true }));
exports.app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const bookings_1 = __importDefault(require("./routes/bookings"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const franchises_1 = __importDefault(require("./routes/franchises"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
const checkins_1 = __importDefault(require("./routes/checkins"));
const financial_1 = __importDefault(require("./routes/financial"));
const payments_1 = __importDefault(require("./routes/payments"));
const calendar_1 = __importDefault(require("./routes/calendar"));
const time_slots_1 = __importDefault(require("./routes/time-slots"));
const franqueadora_1 = __importDefault(require("./routes/franqueadora"));
const admin_1 = __importDefault(require("./routes/admin"));
const packages_1 = __importDefault(require("./routes/packages"));
const teachers_1 = __importDefault(require("./routes/teachers"));
const teacher_preferences_1 = __importDefault(require("./routes/teacher-preferences"));
const teacher_students_1 = __importDefault(require("./routes/teacher-students"));
const academies_1 = __importDefault(require("./routes/academies"));
const student_units_1 = __importDefault(require("./routes/student-units"));
const franchisor_policies_1 = __importDefault(require("./routes/franchisor-policies"));
const booking_scheduler_1 = require("./jobs/booking-scheduler");
exports.app.use('/api/auth', rateLimit_1.authRateLimit, auth_1.default);
exports.app.use('/api/users', users_1.default);
exports.app.use('/api/bookings', bookings_1.default);
exports.app.use('/api/checkins', checkins_1.default);
exports.app.use('/api/financial', financial_1.default);
exports.app.use('/api/payments', payments_1.default);
exports.app.use('/api/calendar', calendar_1.default);
exports.app.use('/api/franchises', franchises_1.default);
exports.app.use('/api/notifications', notifications_1.default);
exports.app.use('/api/time-slots', time_slots_1.default);
exports.app.use('/api/packages', packages_1.default);
exports.app.use('/api/academies', academies_1.default);
exports.app.use('/api/teachers', teachers_1.default);
exports.app.use('/api/teachers', teacher_preferences_1.default);
exports.app.use('/api/teachers', teacher_students_1.default);
exports.app.use('/api/student-units', student_units_1.default);
exports.app.use('/api/webhooks', webhooks_1.default);
exports.app.use('/api/franqueadora', franqueadora_1.default);
exports.app.use('/api/admin', admin_1.default);
exports.app.use('/api/franchisor/policies', franchisor_policies_1.default);
exports.app.use(errorHandler_1.notFoundHandler);
exports.app.use(errorHandler_1.errorHandler);
if (process.env.NODE_ENV !== 'test')
    exports.app.listen(PORT, () => {
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