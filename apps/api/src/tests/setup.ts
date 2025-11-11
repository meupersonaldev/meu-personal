import { supabase } from '../lib/supabase'
import { runMigrationsIfNeeded } from './utils/runMigrations'

// Setup global test environment
beforeAll(async () => {
  // Ensure test database is clean
  console.log('Setting up test environment...')
  
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  // JWT secret com 32+ caracteres para satisfazer validação do middleware
  process.env.JWT_SECRET = 'test-jwt-secret-0123456789-abcdef-XYZ'
  process.env.ASAAS_ENV = 'sandbox'

  // Ensure required tables exist for integration tests
  await runMigrationsIfNeeded()
})

afterAll(async () => {
  // Cleanup test environment
  console.log('Cleaning up test environment...')
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

