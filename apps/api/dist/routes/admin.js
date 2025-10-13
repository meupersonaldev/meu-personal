"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const supabase_1 = require("../lib/supabase");
const booking_scheduler_1 = require("../jobs/booking-scheduler");
const router = express_1.default.Router();
router.get('/scheduler/status', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'ADMIN']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    try {
        const { data: expiredStudentLocks, error: studentError } = await supabase_1.supabase
            .from('student_class_tx')
            .select(`
        *,
        student:users!student_class_tx_student_id_fkey(name, email),
        unit:units(name)
      `)
            .eq('type', 'LOCK')
            .lte('unlock_at', new Date().toISOString())
            .is('booking_id', null)
            .limit(10);
        const { data: expiredProfessorLocks, error: professorError } = await supabase_1.supabase
            .from('hour_tx')
            .select(`
        *,
        professor:users!hour_tx_professor_id_fkey(name, email),
        unit:units(name)
      `)
            .eq('type', 'BONUS_LOCK')
            .lte('unlock_at', new Date().toISOString())
            .is('booking_id', null)
            .limit(10);
        const { data: activeStudentLocks, error: activeStudentError } = await supabase_1.supabase
            .from('student_class_tx')
            .select('id')
            .eq('type', 'LOCK')
            .gt('unlock_at', new Date().toISOString());
        const { data: activeProfessorLocks, error: activeProfessorError } = await supabase_1.supabase
            .from('hour_tx')
            .select('id')
            .eq('type', 'BONUS_LOCK')
            .gt('unlock_at', new Date().toISOString());
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const { data: recentProcessed, error: recentError } = await supabase_1.supabase
            .from('student_class_tx')
            .select('created_at, meta_json')
            .eq('source', 'SYSTEM')
            .in('type', ['CONSUME'])
            .gte('created_at', yesterday.toISOString());
        const { data: recentBonusProcessed, error: recentBonusError } = await supabase_1.supabase
            .from('hour_tx')
            .select('created_at, meta_json')
            .eq('source', 'SYSTEM')
            .in('type', ['BONUS_UNLOCK'])
            .gte('created_at', yesterday.toISOString());
        res.json({
            scheduler: {
                status: 'active',
                last_check: new Date().toISOString()
            },
            locks: {
                expired_student: expiredStudentLocks?.length || 0,
                expired_professor: expiredProfessorLocks?.length || 0,
                active_student: activeStudentLocks?.length || 0,
                active_professor: activeProfessorLocks?.length || 0
            },
            recent_processing: {
                consumed_locks_24h: recentProcessed?.length || 0,
                bonus_unlocks_24h: recentBonusProcessed?.length || 0
            },
            expired_locks: {
                student: expiredStudentLocks || [],
                professor: expiredProfessorLocks || []
            }
        });
    }
    catch (error) {
        console.error('Erro ao buscar status do scheduler:', error);
        res.status(500).json({ error: 'Erro ao buscar status do scheduler' });
    }
}));
router.post('/scheduler/trigger', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'ADMIN']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    try {
        const result = await booking_scheduler_1.bookingScheduler.processExpiredLocks();
        res.json({
            message: 'Processamento do scheduler disparado manualmente',
            result: {
                processed: result.processed,
                errors: result.errors,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('Erro ao disparar scheduler manualmente:', error);
        res.status(500).json({ error: 'Erro ao processar scheduler manualmente' });
    }
}));
router.get('/system/health', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'ADMIN']), (0, errorHandler_1.asyncErrorHandler)(async (req, res) => {
    try {
        const now = new Date();
        const health = {
            timestamp: now.toISOString(),
            server: {
                status: 'healthy',
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                node_version: process.version
            },
            database: {
                status: 'unknown',
                tables: {}
            },
            scheduler: {
                status: 'unknown',
                locks_pending: 0
            }
        };
        try {
            const { data, error } = await supabase_1.supabase
                .from('users')
                .select('count')
                .limit(1);
            if (error) {
                health.database.status = 'error';
                health.database.error = error.message;
            }
            else {
                health.database.status = 'connected';
            }
        }
        catch (dbError) {
            health.database.status = 'error';
            health.database.error = 'Connection failed';
        }
        const criticalTables = [
            'users',
            'franchises',
            'units',
            'bookings',
            'student_class_balance',
            'prof_hour_balance',
            'student_class_tx',
            'hour_tx'
        ];
        for (const table of criticalTables) {
            try {
                const { error } = await supabase_1.supabase
                    .from(table)
                    .select('id')
                    .limit(1);
                health.database.tables[table] = error ? 'error' : 'ok';
            }
            catch (err) {
                health.database.tables[table] = 'error';
            }
        }
        try {
            const { data: pendingLocks } = await supabase_1.supabase
                .from('student_class_tx')
                .select('id')
                .eq('type', 'LOCK')
                .lte('unlock_at', now.toISOString());
            const { data: pendingBonusLocks } = await supabase_1.supabase
                .from('hour_tx')
                .select('id')
                .eq('type', 'BONUS_LOCK')
                .lte('unlock_at', now.toISOString());
            health.scheduler.locks_pending = (pendingLocks?.length || 0) + (pendingBonusLocks?.length || 0);
            health.scheduler.status = health.scheduler.locks_pending > 0 ? 'needs_processing' : 'up_to_date';
        }
        catch (err) {
            health.scheduler.status = 'error';
        }
        const dbHealthy = health.database.status === 'connected' &&
            Object.values(health.database.tables).every(status => status === 'ok');
        const overallStatus = dbHealthy ? 'healthy' : 'degraded';
        health.overall_status = overallStatus;
        const statusCode = overallStatus === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
    }
    catch (error) {
        console.error('Erro ao verificar health do sistema:', error);
        res.status(500).json({
            overall_status: 'error',
            error: 'Erro ao verificar health do sistema'
        });
    }
}));
exports.default = router;
//# sourceMappingURL=admin.js.map