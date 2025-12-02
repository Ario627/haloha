import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { signUpSchema } from '@/lib/validations'
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
    const validation = signUpSchema.safeParse(sanitizedBody)
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(', ')
      const response = NextResponse.json(
        { success: false, error: errors },
        { status: 400 }
      )
      return addSecurityHeaders(addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime))
    }

    const { email, password, name, phone } = validation.data

    // Create Supabase client
    const supabase = await createClient()

    // Sign up user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone: phone || null,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })

    if (error) {
      console.error('Signup error:', error)
      const response = NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
      return addSecurityHeaders(addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime))
    }

    // Check if email confirmation is required
    if (data.user && !data.session) {
      const response = NextResponse.json(
        { 
          success: true, 
          message: 'Akun berhasil dibuat! Silakan cek email Anda untuk verifikasi.',
          data: { userId: data.user.id }
        },
        { status: 201 }
      )
      return addSecurityHeaders(addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime))
    }

    const response = NextResponse.json(
      { 
        success: true, 
        message: 'Akun berhasil dibuat dan login!',
        data: { 
          userId: data.user?.id,
          email: data.user?.email
        }
      },
      { status: 201 }
    )
    return addSecurityHeaders(addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime))

  } catch (error) {
    console.error('Signup error:', error)
    const response = NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mendaftar. Silakan coba lagi.' },
      { status: 500 }
    )
    return addSecurityHeaders(addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime))
  }
}
