import { z } from 'zod';
export declare const createFranchiseSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    zipCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    state?: string;
    address?: string;
    zipCode?: string;
}, {
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    state?: string;
    address?: string;
    zipCode?: string;
}>;
export declare const updateFranchiseSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    zipCode: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    state?: string;
    address?: string;
    zipCode?: string;
    isActive?: boolean;
}, {
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    state?: string;
    address?: string;
    zipCode?: string;
    isActive?: boolean;
}>;
export declare const createTeacherSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    specialties: z.ZodArray<z.ZodString, "many">;
    status: z.ZodDefault<z.ZodEnum<["active", "inactive"]>>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    email?: string;
    status?: "active" | "inactive";
    phone?: string;
    specialties?: string[];
}, {
    name?: string;
    email?: string;
    status?: "active" | "inactive";
    phone?: string;
    specialties?: string[];
}>;
export declare const updateTeacherSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    specialties: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    status: z.ZodOptional<z.ZodEnum<["active", "inactive"]>>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    email?: string;
    status?: "active" | "inactive";
    phone?: string;
    specialties?: string[];
}, {
    name?: string;
    email?: string;
    status?: "active" | "inactive";
    phone?: string;
    specialties?: string[];
}>;
export declare const createStudentSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    credits: z.ZodDefault<z.ZodNumber>;
    status: z.ZodDefault<z.ZodEnum<["active", "inactive"]>>;
    planId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    email?: string;
    status?: "active" | "inactive";
    phone?: string;
    credits?: number;
    planId?: string;
}, {
    name?: string;
    email?: string;
    status?: "active" | "inactive";
    phone?: string;
    credits?: number;
    planId?: string;
}>;
export declare const updateStudentSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    credits: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["active", "inactive"]>>;
    planId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    email?: string;
    status?: "active" | "inactive";
    phone?: string;
    credits?: number;
    planId?: string;
}, {
    name?: string;
    email?: string;
    status?: "active" | "inactive";
    phone?: string;
    credits?: number;
    planId?: string;
}>;
export declare const createPlanSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    price: z.ZodNumber;
    creditsIncluded: z.ZodNumber;
    durationDays: z.ZodNumber;
    features: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    description?: string;
    price?: number;
    features?: string[];
    isActive?: boolean;
    creditsIncluded?: number;
    durationDays?: number;
}, {
    name?: string;
    description?: string;
    price?: number;
    features?: string[];
    isActive?: boolean;
    creditsIncluded?: number;
    durationDays?: number;
}>;
export declare const updatePlanSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    price: z.ZodOptional<z.ZodNumber>;
    creditsIncluded: z.ZodOptional<z.ZodNumber>;
    durationDays: z.ZodOptional<z.ZodNumber>;
    features: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    description?: string;
    price?: number;
    features?: string[];
    isActive?: boolean;
    creditsIncluded?: number;
    durationDays?: number;
}, {
    name?: string;
    description?: string;
    price?: number;
    features?: string[];
    isActive?: boolean;
    creditsIncluded?: number;
    durationDays?: number;
}>;
export declare const idParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id?: string;
}, {
    id?: string;
}>;
export declare const paginationQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>;
    limit: z.ZodDefault<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>;
    search: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "inactive"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "inactive";
    limit?: number;
    page?: number;
    search?: string;
}, {
    status?: "active" | "inactive";
    limit?: string;
    page?: string;
    search?: string;
}>;
//# sourceMappingURL=franchise.d.ts.map