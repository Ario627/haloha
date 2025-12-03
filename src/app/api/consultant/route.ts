import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { consultantMessageSchema } from '@/lib/validations'
import { withProtection, addSecurityHeaders } from '@/lib/security/auth'
import { checkRateLimit, rateLimitResponse, addRateLimitHeaders } from '@/lib/security/rate-limit'
import { sanitizeObject } from '@/lib/security/sanitize'
import { getAIConsultantResponse, getQuickTips } from '@/lib/ai/provider'
import { logger } from '@/lib/utils/logger'
import { ERROR_MESSAGES } from '@/lib/constants'
import type { Business, ConsultationMessage, ConsultationSession } from '@/types/database'

// POST - Send message to AI consultant
export async function POST(request: NextRequest) {
  // Special rate limiting for AI consultant
  const rateLimit = checkRateLimit(request, 'consultant')
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetTime)
  }

  return withProtection(
    request,
    async (req, user) => {
      try {
        const body = await req.json()
        const sanitizedBody = sanitizeObject(body)

        // Validate input
        const validation = consultantMessageSchema.safeParse(sanitizedBody)
        if (!validation.success) {
          const errors = validation.error.errors.map(e => e.message).join(', ')
          const response = NextResponse.json(
            { success: false, error: errors },
            { status: 400 }
          )
          return addSecurityHeaders(addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime))
        }

        const { message, context, sessionId } = validation.data
        const supabase = await createClient()

        // Get business context if businessId is provided
        let businessContext: Business | null = null
        if (context?.businessId) {
          const { data: business } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', context.businessId)
            .eq('user_id', user.id)
            .single()

          if (business) {
            businessContext = business as Business
          }
        }

        // Get or create consultation session
        let session: ConsultationSession | null = null

        if (sessionId) {
          const { data: existingSession } = await supabase
            .from('consultation_sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single()

          if (existingSession) {
            session = existingSession as ConsultationSession
          }
        }

        // Get conversation history from session
        const conversationHistory: ConsultationMessage[] = session?.messages || []

        // Get AI response
        const aiResponse = await getAIConsultantResponse(
          message,
          conversationHistory,
          businessContext
        )

        // Update conversation history
        const newMessages: ConsultationMessage[] = [
          ...conversationHistory,
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content: aiResponse.message, timestamp: new Date().toISOString() }
        ]

        // Save or update session
        let responseSessionId = sessionId

        if (session) {
          // Update existing session
          await supabase
            .from('consultation_sessions')
            .update({
              messages: newMessages,
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId)
        } else {
          // Create new session
          const { data: newSession } = await supabase
            .from('consultation_sessions')
            .insert({
              user_id: user.id,
              business_id: context?.businessId || null,
              topic: context?.topic || 'umum',
              messages: newMessages
            })
            .select()
            .single()

          if (newSession) {
            responseSessionId = newSession.id
          }
        }

        const response = NextResponse.json(
          {
            success: true,
            data: {
              message: aiResponse.message,
              suggestions: aiResponse.suggestions,
              sessionId: responseSessionId
            }
          },
          { status: 200 }
        )
        return addSecurityHeaders(addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime))

      } catch (error) {
        logger.error('Error in POST /api/consultant', error)
        const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.AI_ERROR
        const response = NextResponse.json(
          { success: false, error: errorMessage },
          { status: 500 }
        )
        return addSecurityHeaders(addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime))
      }
    },
    'consultant'
  )
}

// GET - Get consultation sessions or quick tips
export async function GET(request: NextRequest) {
  return withProtection(
    request,
    async (req, user) => {
      try {
        const { searchParams } = new URL(req.url)
        const action = searchParams.get('action')

        const supabase = await createClient()

        if (action === 'tips') {
          // Get quick tips based on user's first business type
          const { data: business } = await supabase
            .from('businesses')
            .select('business_type')
            .eq('user_id', user.id)
            .limit(1)
            .single()

          const businessType = business?.business_type || 'lainnya'
          const tips = getQuickTips(businessType)

          const response = NextResponse.json(
            { success: true, data: tips },
            { status: 200 }
          )
          return addSecurityHeaders(response)
        }

        if (action === 'sessions') {
          // Get user's consultation sessions
          const { data: sessions, error } = await supabase
            .from('consultation_sessions')
            .select('id, topic, created_at, updated_at')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(20)

          if (error) {
            throw error
          }

          const response = NextResponse.json(
            { success: true, data: sessions },
            { status: 200 }
          )
          return addSecurityHeaders(response)
        }

        if (action === 'session') {
          // Get specific session
          const sessionId = searchParams.get('id')
          if (!sessionId) {
            const response = NextResponse.json(
              { success: false, error: 'Session ID diperlukan' },
              { status: 400 }
            )
            return addSecurityHeaders(response)
          }

          const { data: session, error } = await supabase
            .from('consultation_sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single()

          if (error || !session) {
            const response = NextResponse.json(
              { success: false, error: 'Sesi tidak ditemukan' },
              { status: 404 }
            )
            return addSecurityHeaders(response)
          }

          const response = NextResponse.json(
            { success: true, data: session },
            { status: 200 }
          )
          return addSecurityHeaders(response)
        }

        const response = NextResponse.json(
          { success: false, error: 'Action tidak valid' },
          { status: 400 }
        )
        return addSecurityHeaders(response)

      } catch (error) {
        console.error('Error in GET /api/consultant:', error)
        const response = NextResponse.json(
          { success: false, error: 'Terjadi kesalahan saat mengambil data' },
          { status: 500 }
        )
        return addSecurityHeaders(response)
      }
    }
  )
}
