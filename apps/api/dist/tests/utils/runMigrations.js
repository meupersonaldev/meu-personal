"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrationsIfNeeded = runMigrationsIfNeeded;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pg_1 = require("pg");
function getMigrationsDir() {
    return path_1.default.resolve(__dirname, '../../../migrations');
}
async function tableExists(client, table) {
    const res = await client.query(`SELECT to_regclass($1) AS exists`, [`public.${table}`]);
    return !!res.rows[0]?.exists;
}
async function acquireLock(client) {
    const res = await client.query('SELECT pg_try_advisory_lock($1, $2) AS locked', [54123, 1337]);
    return !!res.rows[0]?.locked;
}
async function releaseLock(client) {
    try {
        await client.query('SELECT pg_advisory_unlock($1, $2)', [54123, 1337]);
    }
    catch { }
}
async function runMigrationsIfNeeded() {
    if (process.env.SKIP_DB_MIGRATIONS === 'true')
        return;
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const refMatch = supabaseUrl.match(/^https?:\/\/([a-z0-9]+)\.supabase\.co/i);
    const projectRef = refMatch?.[1];
    const dbUrlEnv = process.env.DATABASE_URL || '';
    let hostPortPath = 'aws-0-sa-east-1.pooler.supabase.com:6543/postgres?schema=public';
    try {
        if (dbUrlEnv.startsWith('postgresql://')) {
            const afterAt = dbUrlEnv.split('@')[1];
            if (afterAt) {
                const firstSlash = afterAt.indexOf('/');
                hostPortPath = firstSlash >= 0 ? afterAt.substring(0) : afterAt;
            }
        }
    }
    catch { }
    if (!projectRef || !serviceKey) {
        console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set; skipping migrations');
        return;
    }
    const connectionString = `postgresql://postgres.${projectRef}:${serviceKey}@${hostPortPath}`;
    const client = new pg_1.Client({ connectionString });
    try {
        await client.connect();
    }
    catch (err) {
        console.warn(`Could not connect to database for migrations: ${err?.message || err}`);
        return;
    }
    try {
        const locked = await acquireLock(client);
        if (!locked) {
            let attempts = 0;
            while (attempts < 60) {
                const s = await tableExists(client, 'student_packages');
                const h = await tableExists(client, 'hour_packages');
                if (s && h)
                    return;
                await new Promise(r => setTimeout(r, 500));
                attempts++;
            }
            return;
        }
        const hasStudent = await tableExists(client, 'student_packages');
        const hasHour = await tableExists(client, 'hour_packages');
        if (hasStudent && hasHour) {
            return;
        }
        const migrationsDir = getMigrationsDir();
        const files = fs_1.default
            .readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();
        for (const file of files) {
            const fullPath = path_1.default.join(migrationsDir, file);
            const sql = fs_1.default.readFileSync(fullPath, 'utf8');
            try {
                await client.query(sql);
            }
            catch (err) {
                const msg = err?.message || String(err);
                console.warn(`Migration '${file}' failed: ${msg}`);
                throw err;
            }
        }
    }
    finally {
        await releaseLock(client);
        await client.end();
    }
}
//# sourceMappingURL=runMigrations.js.map