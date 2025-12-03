import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SECURITY_HEADERS } from '@/lib/constants'
import { handleCors, addCorsHeaders } from '@/lib/security/cors'
import { generateRequestId } from '@/lib/helpers/response'
import { config as appConfig } from '@/lib/config'

export async function middleware(request: NextRequest) {
  // Handle CORS preflight requests
  const corsResponse = handleCors(request)
  if (corsResponse) {
    return corsResponse
  }

  // Generate unique request ID for tracking
  const requestId = generateRequestId()

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    appConfig.supabase.url,
    appConfig.supabase.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshing the auth token
  await supabase.auth.getUser()

  // Add security headers from constants
  const response = supabaseResponse
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Add request ID header for tracking
  response.headers.set('X-Request-ID', requestId)

  // Add CORS headers
  addCorsHeaders(response, request)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
