import { type SupabaseClient } from '@supabase/supabase-js';
declare const rawSql: (strings: TemplateStringsArray, ...values: unknown[]) => {
    toPostgrest: () => string;
};
export declare const supabase: SupabaseClient & {
    sql: typeof rawSql;
};
export {};
//# sourceMappingURL=supabase.d.ts.map