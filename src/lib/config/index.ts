// Centralized configuration management
// All configuration values are validated and typed

// Helper to get required env variable with fallback for build time
function getRequiredEnv(key: string, fallback: string = ''): string {
  const value = process.env[key]
  if (!value && process.env.NODE_ENV === 'production') {
    console.warn(`Warning: ${key} is not set`)
  }
  return value || fallback
}

export const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Site
  site: {
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    name: 'Haloha - Konsultan Bisnis UMKM',
  },

  // Supabase
  supabase: {
    url: getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: {
      general: parseInt(process.env.RATE_LIMIT_MAX_GENERAL || '60', 10),
      auth: parseInt(process.env.RATE_LIMIT_MAX_AUTH || '10', 10),
      consultant: parseInt(process.env.RATE_LIMIT_MAX_CONSULTANT || '20', 10),
    },
  },

  // Security
  security: {
    corsOrigins: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    csrfSecret: process.env.CSRF_SECRET || '',
  },

  // Pagination defaults
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enabled: process.env.DISABLE_LOGGING !== 'true',
  },
} as const

// Validate required configuration
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config.supabase.url) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required')
  }
  if (!config.supabase.anonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export type Config = typeof config
