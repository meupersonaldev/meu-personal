"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL || 'https://fstbhakmmznfdeluyexc.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzdGJoYWttbXpuZmRlbHV5ZXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzc3OTAsImV4cCI6MjA3NDY1Mzc5MH0.R9MaYf45DejVYpUlxUARE9UO2Qj1_THASVBBhIKOL9Q';
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
exports.default = exports.supabase;
//# sourceMappingURL=supabase.js.map