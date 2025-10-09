"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
}
const baseClient = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
const rawSql = (strings, ...values) => {
    let text = '';
    strings.forEach((part, index) => {
        text += part;
        if (index < values.length) {
            const value = values[index];
            if (typeof value === 'object' && value !== null) {
                text += JSON.stringify(value);
            }
            else {
                text += String(value);
            }
        }
    });
    return {
        toPostgrest: () => text
    };
};
exports.supabase = Object.assign(baseClient, {
    sql: rawSql
});
//# sourceMappingURL=supabase.js.map