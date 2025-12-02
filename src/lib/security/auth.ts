import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitResponse, addRateLimitHeaders } from './rate-limit'

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
      return { error: 'Unauthorized - Token tidak valid atau sudah expired', status: 401 }
    }

    return {
      user: {
        id: user.id,
        email: user.email!
      }
    }
  } catch {
    return { error: 'Error verifying authentication', status: 500 }
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
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // Enable XSS filter
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Strict transport security (HTTPS only)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.openai.com"
  )
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions policy
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  return response
}
