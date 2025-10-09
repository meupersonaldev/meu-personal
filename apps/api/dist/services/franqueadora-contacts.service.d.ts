export declare function resolveDefaultFranqueadoraId(): Promise<string>;
export declare function ensureFranqueadoraContact(params: {
    userId: string;
    role: string;
    origin?: string;
}): Promise<void>;
export declare function addAcademyToContact(userId: string, academyId: string): Promise<void>;
export declare function syncContactAcademies(userId: string, academyIds: string[]): Promise<void>;
//# sourceMappingURL=franqueadora-contacts.service.d.ts.map