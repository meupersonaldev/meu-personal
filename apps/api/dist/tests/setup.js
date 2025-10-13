"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
beforeAll(async () => {
    console.log('Setting up test environment...');
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-0123456789-abcdef-XYZ';
    process.env.ASAAS_ENV = 'sandbox';
});
afterAll(async () => {
    console.log('Cleaning up test environment...');
});
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
//# sourceMappingURL=setup.js.map