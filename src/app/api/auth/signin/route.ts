import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { signInSchema } from '@/lib/validations'
import { checkRateLimit, rateLimitResponse, addRateLimitHeaders } from '@/lib/security/rate-limit'
import { sanitizeObject } from '@/lib/security/sanitize'
import { addSecurityHeaders } from '@/lib/security/auth'

export async function POST(request: NextRequest) {
  // Rate limiting for auth endpoints
  const rateLimit = checkRateLimit(request, 'auth')
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetTime)
  }

  try {
    const body = await request.json()
    
    // Sanitize input
    const sanitizedBody = sanitizeObject(body)
    
    // Validate input
    const validation = signInSchema.safeParse(sanitizedBody)
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(', ')
      const response = NextResponse.json(
        { success: false, error: errors },
        { status: 400 }
      )
      return addSecurityHeaders(addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime))
    }

    const { email, password } = validation.data

    // Create Supabase client
    const supabase = await createClient()

    // Sign in user
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Signin error:', error)
      // Generic error message to prevent email enumeration
      const response = NextResponse.json(
        { success: false, error: 'Email atau password salah' },
        { status: 401 }
      )
      return addSecurityHeaders(addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime))
    }

    const response = NextResponse.json(
      { 
        success: true, 
        message: 'Login berhasil!',
        data: { 
          userId: data.user.id,
          email: data.user.email
        }
      },
      { status: 200 }
    )
    return addSecurityHeaders(addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime))

  } catch (error) {
    console.error('Signin error:', error)
    const response = NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat login. Silakan coba lagi.' },
      { status: 500 }
    )
    return addSecurityHeaders(addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime))
  }
}
