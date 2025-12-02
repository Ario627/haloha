import { NextRequest, NextResponse } from 'next/server'

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory rate limiter (for production, use Redis or similar)
const rateLimitMap = new Map<string, RateLimitEntry>()

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 60, // Maximum requests per window
  authMaxRequests: 10, // Stricter limit for auth endpoints
  consultantMaxRequests: 20, // Limit for AI consultant to prevent abuse
}

function getClientIP(request: NextRequest): string {
  // Check various headers that might contain the real IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback - use a hash of user-agent as a weak fallback identifier
  // In production, configure your reverse proxy to set x-forwarded-for correctly
  const userAgent = request.headers.get('user-agent') || ''
  return `fallback-${hashCode(userAgent)}`
}

// Simple hash function for fallback IP identification
function hashCode(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16)
}

// Track last cleanup time for deterministic cleanup
let lastCleanupTime = Date.now()
const CLEANUP_INTERVAL = 60000 // Clean up every minute

function cleanupExpiredEntries(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key)
    }
  }
  lastCleanupTime = now
}

export function checkRateLimit(
  request: NextRequest,
  endpoint: 'auth' | 'consultant' | 'general' = 'general'
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  
  // Deterministic cleanup based on time interval
  if (now - lastCleanupTime > CLEANUP_INTERVAL) {
    cleanupExpiredEntries()
  }

  const clientIP = getClientIP(request)
  const key = `${clientIP}:${endpoint}`

  // Determine max requests based on endpoint type
  let maxRequests: number
  switch (endpoint) {
    case 'auth':
      maxRequests = RATE_LIMIT_CONFIG.authMaxRequests
      break
    case 'consultant':
      maxRequests = RATE_LIMIT_CONFIG.consultantMaxRequests
      break
    default:
      maxRequests = RATE_LIMIT_CONFIG.maxRequests
  }

  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetTime) {
    // New window
    const resetTime = now + RATE_LIMIT_CONFIG.windowMs
    rateLimitMap.set(key, { count: 1, resetTime })
    return { allowed: true, remaining: maxRequests - 1, resetTime }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime }
  }

  entry.count++
  return { allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime }
}

export function rateLimitResponse(resetTime: number): NextResponse {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)
  
  return NextResponse.json(
    {
      success: false,
      error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.',
      retryAfter
    },
    {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(resetTime).toISOString()
      }
    }
  )
}

export function addRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  resetTime: number
): NextResponse {
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString())
  return response
}
