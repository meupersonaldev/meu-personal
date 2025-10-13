"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FRANQUEADORA_CONTACTS_SELECT = exports.FRANQUEADORA_CONTACTS_USER_FIELDS = void 0;
exports.FRANQUEADORA_CONTACTS_USER_FIELDS = [
    'id',
    'name',
    'email',
    'phone',
    'cpf',
    'role',
    'is_active',
    'credits',
    'created_at',
    'updated_at',
    'avatar_url',
    'last_login_at',
    'email_verified',
    'phone_verified',
    'franchisor_id',
    'franchise_id'
].join(', ');
exports.FRANQUEADORA_CONTACTS_SELECT = [
    'id',
    'franqueadora_id',
    'user_id',
    'role',
    'status',
    'origin',
    'assigned_academy_ids',
    'last_assignment_at',
    'created_at',
    'updated_at',
    `user:users (${exports.FRANQUEADORA_CONTACTS_USER_FIELDS})`
].join(', ');
//# sourceMappingURL=franqueadora-contacts.js.map