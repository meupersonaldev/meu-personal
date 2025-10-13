export declare const FRANQUEADORA_CONTACTS_USER_FIELDS: string;
export declare const FRANQUEADORA_CONTACTS_SELECT: string;
export interface ContactUser {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    cpf?: string | null;
    role: string;
    is_active?: boolean | null;
    credits?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
    avatar_url?: string | null;
    last_login_at?: string | null;
    email_verified?: boolean | null;
    phone_verified?: boolean | null;
    franchisor_id?: string | null;
    franchise_id?: string | null;
}
export interface FranqueadoraContactRow {
    id: string;
    franqueadora_id: string;
    user_id: string;
    role: string;
    status?: string | null;
    origin?: string | null;
    assigned_academy_ids?: string[] | null;
    last_assignment_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    user: ContactUser | null;
}
//# sourceMappingURL=franqueadora-contacts.d.ts.map