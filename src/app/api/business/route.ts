import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { businessDataSchema, updateBusinessDataSchema } from '@/lib/validations'
import { withProtection, addSecurityHeaders } from '@/lib/security/auth'
import { sanitizeObject } from '@/lib/security/sanitize'
import { logger } from '@/lib/utils/logger'
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/constants'
import type { Business } from '@/types/database'

// GET - Get user's businesses
export async function GET(request: NextRequest) {
  return withProtection(
    request,
    async (_, user) => {
      try {
        const supabase = await createClient()

        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          logger.error('Error fetching businesses', error)
          const response = NextResponse.json(
            { success: false, error: ERROR_MESSAGES.INTERNAL_ERROR },
            { status: 500 }
          )
          return addSecurityHeaders(response)
        }

        const response = NextResponse.json(
          { success: true, data: data as Business[] },
          { status: 200 }
        )
        return addSecurityHeaders(response)

      } catch (error) {
        logger.error('Error in GET /api/business', error)
        const response = NextResponse.json(
          { success: false, error: ERROR_MESSAGES.INTERNAL_ERROR },
          { status: 500 }
        )
        return addSecurityHeaders(response)
      }
    }
  )
}

// POST - Create new business
export async function POST(request: NextRequest) {
  return withProtection(
    request,
    async (req, user) => {
      try {
        const body = await req.json()
        const sanitizedBody = sanitizeObject(body)

        // Validate input
        const validation = businessDataSchema.safeParse(sanitizedBody)
        if (!validation.success) {
          const errors = validation.error.errors.map(e => e.message).join(', ')
          const response = NextResponse.json(
            { success: false, error: errors },
            { status: 400 }
          )
          return addSecurityHeaders(response)
        }

        const supabase = await createClient()

        // Convert camelCase to snake_case for database
        const businessData = {
          user_id: user.id,
          business_name: validation.data.businessName,
          business_type: validation.data.businessType,
          description: validation.data.description,
          monthly_revenue: validation.data.monthlyRevenue,
          monthly_expenses: validation.data.monthlyExpenses,
          employee_count: validation.data.employeeCount,
          years_in_operation: validation.data.yearsInOperation,
          location: validation.data.location,
          challenges: validation.data.challenges,
          goals: validation.data.goals,
        }

        const { data, error } = await supabase
          .from('businesses')
          .insert(businessData)
          .select()
          .single()

        if (error) {
          logger.error('Error creating business', error)
          const response = NextResponse.json(
            { success: false, error: ERROR_MESSAGES.BUSINESS_CREATE_FAILED },
            { status: 500 }
          )
          return addSecurityHeaders(response)
        }

        const response = NextResponse.json(
          { success: true, data: data as Business, message: SUCCESS_MESSAGES.BUSINESS_CREATED },
          { status: 201 }
        )
        return addSecurityHeaders(response)

      } catch (error) {
        logger.error('Error in POST /api/business', error)
        const response = NextResponse.json(
          { success: false, error: ERROR_MESSAGES.INTERNAL_ERROR },
          { status: 500 }
        )
        return addSecurityHeaders(response)
      }
    }
  )
}

// PATCH - Update business
export async function PATCH(request: NextRequest) {
  return withProtection(
    request,
    async (req, user) => {
      try {
        const body = await req.json()
        const { businessId, ...updateData } = body

        if (!businessId) {
          const response = NextResponse.json(
            { success: false, error: 'Business ID diperlukan' },
            { status: 400 }
          )
          return addSecurityHeaders(response)
        }

        const sanitizedBody = sanitizeObject(updateData)

        // Validate input
        const validation = updateBusinessDataSchema.safeParse(sanitizedBody)
        if (!validation.success) {
          const errors = validation.error.errors.map(e => e.message).join(', ')
          const response = NextResponse.json(
            { success: false, error: errors },
            { status: 400 }
          )
          return addSecurityHeaders(response)
        }

        const supabase = await createClient()

        // Verify ownership
        const { data: existing } = await supabase
          .from('businesses')
          .select('user_id')
          .eq('id', businessId)
          .single()

        if (!existing || existing.user_id !== user.id) {
          const response = NextResponse.json(
            { success: false, error: ERROR_MESSAGES.BUSINESS_NOT_FOUND },
            { status: 404 }
          )
          return addSecurityHeaders(response)
        }

        // Convert camelCase to snake_case
        const dbUpdateData: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        }
        
        if (validation.data.businessName !== undefined) dbUpdateData.business_name = validation.data.businessName
        if (validation.data.businessType !== undefined) dbUpdateData.business_type = validation.data.businessType
        if (validation.data.description !== undefined) dbUpdateData.description = validation.data.description
        if (validation.data.monthlyRevenue !== undefined) dbUpdateData.monthly_revenue = validation.data.monthlyRevenue
        if (validation.data.monthlyExpenses !== undefined) dbUpdateData.monthly_expenses = validation.data.monthlyExpenses
        if (validation.data.employeeCount !== undefined) dbUpdateData.employee_count = validation.data.employeeCount
        if (validation.data.yearsInOperation !== undefined) dbUpdateData.years_in_operation = validation.data.yearsInOperation
        if (validation.data.location !== undefined) dbUpdateData.location = validation.data.location
        if (validation.data.challenges !== undefined) dbUpdateData.challenges = validation.data.challenges
        if (validation.data.goals !== undefined) dbUpdateData.goals = validation.data.goals

        const { data, error } = await supabase
          .from('businesses')
          .update(dbUpdateData)
          .eq('id', businessId)
          .select()
          .single()

        if (error) {
          logger.error('Error updating business', error)
          const response = NextResponse.json(
            { success: false, error: ERROR_MESSAGES.BUSINESS_UPDATE_FAILED },
            { status: 500 }
          )
          return addSecurityHeaders(response)
        }

        const response = NextResponse.json(
          { success: true, data: data as Business, message: SUCCESS_MESSAGES.BUSINESS_UPDATED },
          { status: 200 }
        )
        return addSecurityHeaders(response)

      } catch (error) {
        logger.error('Error in PATCH /api/business', error)
        const response = NextResponse.json(
          { success: false, error: ERROR_MESSAGES.INTERNAL_ERROR },
          { status: 500 }
        )
        return addSecurityHeaders(response)
      }
    }
  )
}

// DELETE - Delete business
export async function DELETE(request: NextRequest) {
  return withProtection(
    request,
    async (req, user) => {
      try {
        const { searchParams } = new URL(req.url)
        const businessId = searchParams.get('id')

        if (!businessId) {
          const response = NextResponse.json(
            { success: false, error: 'Business ID diperlukan' },
            { status: 400 }
          )
          return addSecurityHeaders(response)
        }

        const supabase = await createClient()

        // Verify ownership
        const { data: existing } = await supabase
          .from('businesses')
          .select('user_id')
          .eq('id', businessId)
          .single()

        if (!existing || existing.user_id !== user.id) {
          const response = NextResponse.json(
            { success: false, error: ERROR_MESSAGES.BUSINESS_NOT_FOUND },
            { status: 404 }
          )
          return addSecurityHeaders(response)
        }

        const { error } = await supabase
          .from('businesses')
          .delete()
          .eq('id', businessId)

        if (error) {
          logger.error('Error deleting business', error)
          const response = NextResponse.json(
            { success: false, error: ERROR_MESSAGES.BUSINESS_DELETE_FAILED },
            { status: 500 }
          )
          return addSecurityHeaders(response)
        }

        const response = NextResponse.json(
          { success: true, message: SUCCESS_MESSAGES.BUSINESS_DELETED },
          { status: 200 }
        )
        return addSecurityHeaders(response)

      } catch (error) {
        logger.error('Error in DELETE /api/business', error)
        const response = NextResponse.json(
          { success: false, error: ERROR_MESSAGES.INTERNAL_ERROR },
          { status: 500 }
        )
        return addSecurityHeaders(response)
      }
    }
  )
}
