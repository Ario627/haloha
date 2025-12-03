import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitResponse, addRateLimitHeaders } from './rate-limit'
import { SECURITY_HEADERS, CONTENT_SECURITY_POLICY, ERROR_MESSAGES } from '@/lib/constants'
import { logger } from '@/lib/utils/logger'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
  }
}

// Verify JWT and get user from Supabase session
export async function verifyAuth(): Promise<{ user: { id: string; email: string } } | { error: string; status: number }> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      logger.warn('Authentication failed', { error: error?.message })
      return { error: ERROR_MESSAGES.TOKEN_EXPIRED, status: 401 }
    }

    return {
      user: {
        id: user.id,
        email: user.email!
      }
    }
  } catch (error) {
    logger.error('Error verifying authentication', error)
    return { error: ERROR_MESSAGES.INTERNAL_ERROR, status: 500 }
  }
}

// Middleware wrapper for protected routes
export async function withAuth<T>(
  request: NextRequest,
  handler: (request: NextRequest, user: { id: string; email: string }) => Promise<NextResponse<T>>
): Promise<NextResponse<T | { success: false; error: string }>> {
  const authResult = await verifyAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status }
    ) as NextResponse<{ success: false; error: string }>
  }

  return handler(request, authResult.user)
}

// Middleware wrapper with rate limiting
export async function withRateLimit<T>(
  request: NextRequest,
  handler: () => Promise<NextResponse<T>>,
  endpoint: 'auth' | 'consultant' | 'general' = 'general'
): Promise<NextResponse<T | { success: false; error: string; retryAfter?: number }>> {
  const rateLimit = checkRateLimit(request, endpoint)

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetTime) as NextResponse<{ success: false; error: string; retryAfter: number }>
  }

  const response = await handler()
  return addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime) as NextResponse<T>
}

// Combined middleware for protected + rate limited routes
export async function withProtection<T>(
  request: NextRequest,
  handler: (request: NextRequest, user: { id: string; email: string }) => Promise<NextResponse<T>>,
  endpoint: 'auth' | 'consultant' | 'general' = 'general'
): Promise<NextResponse<T | { success: false; error: string; retryAfter?: number }>> {
  return withRateLimit(
    request,
    () => withAuth(request, handler) as Promise<NextResponse<T>>,
    endpoint
  )
}

// Add security headers to response
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Apply security headers from constants
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  // Content Security Policy from constants
  response.headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY)
  
  return response
}
