import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'

interface CorsOptions {
  allowedOrigins?: string[]
  allowedMethods?: string[]
  allowedHeaders?: string[]
  exposedHeaders?: string[]
  credentials?: boolean
  maxAge?: number
}

const defaultCorsOptions: CorsOptions = {
  allowedOrigins: config.security.corsOrigins.length > 0 
    ? config.security.corsOrigins 
    : ['*'],
  allowedMethods: [...config.security.allowedMethods],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-CSRF-Token',
  ],
  exposedHeaders: [
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Request-ID',
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
}

export function getCorsHeaders(
  request: NextRequest,
  options: CorsOptions = defaultCorsOptions
): Record<string, string> {
  const origin = request.headers.get('origin') || ''
  const headers: Record<string, string> = {}

  // Check if origin is allowed
  const isAllowed = options.allowedOrigins?.includes('*') || 
    options.allowedOrigins?.includes(origin)

  if (isAllowed && origin) {
    headers['Access-Control-Allow-Origin'] = origin
  } else if (options.allowedOrigins?.includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*'
  }

  if (options.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  if (options.allowedMethods?.length) {
    headers['Access-Control-Allow-Methods'] = options.allowedMethods.join(', ')
  }

  if (options.allowedHeaders?.length) {
    headers['Access-Control-Allow-Headers'] = options.allowedHeaders.join(', ')
  }

  if (options.exposedHeaders?.length) {
    headers['Access-Control-Expose-Headers'] = options.exposedHeaders.join(', ')
  }

  if (options.maxAge) {
    headers['Access-Control-Max-Age'] = options.maxAge.toString()
  }

  return headers
}

export function handleCors(
  request: NextRequest,
  options: CorsOptions = defaultCorsOptions
): NextResponse | null {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const corsHeaders = getCorsHeaders(request, options)
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  return null
}

export function addCorsHeaders(
  response: NextResponse,
  request: NextRequest,
  options: CorsOptions = defaultCorsOptions
): NextResponse {
  const corsHeaders = getCorsHeaders(request, options)
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}
