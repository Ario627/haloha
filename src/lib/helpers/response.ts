import { NextResponse } from 'next/server'
import { SECURITY_HEADERS, CONTENT_SECURITY_POLICY, HTTP_STATUS } from '@/lib/constants'
import { handleError, isAppError, RateLimitError } from '@/lib/errors'
import { config } from '@/lib/config'

// Standard API response format
export interface ApiResponseData<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  code?: string
  meta?: {
    requestId?: string
    timestamp?: string
    pagination?: PaginationMeta
  }
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// Generate unique request ID
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`
}

// Success response helper
export function successResponse<T>(
  data: T,
  options: {
    status?: number
    message?: string
    pagination?: PaginationMeta
    requestId?: string
  } = {}
): NextResponse {
  const { status = HTTP_STATUS.OK, message, pagination, requestId } = options

  const responseBody: ApiResponseData<T> = {
    success: true,
    data,
    ...(message && { message }),
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
      ...(pagination && { pagination }),
    },
  }

  const response = NextResponse.json(responseBody, { status })
  return addSecurityHeaders(response)
}

// Error response helper
export function errorResponse(
  error: unknown,
  options: {
    requestId?: string
  } = {}
): NextResponse {
  const { requestId } = options
  const { message, statusCode, code } = handleError(error)

  const responseBody: ApiResponseData = {
    success: false,
    error: message,
    code,
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
    },
  }

  const response = NextResponse.json(responseBody, { status: statusCode })
  
  // Add rate limit headers if applicable
  if (isAppError(error) && error instanceof RateLimitError) {
    response.headers.set('Retry-After', error.retryAfter.toString())
    response.headers.set('X-RateLimit-Remaining', '0')
  }

  return addSecurityHeaders(response)
}

// Created response helper
export function createdResponse<T>(
  data: T,
  message?: string,
  requestId?: string
): NextResponse {
  return successResponse(data, {
    status: HTTP_STATUS.CREATED,
    message,
    requestId,
  })
}

// No content response helper
export function noContentResponse(): NextResponse {
  const response = new NextResponse(null, { status: HTTP_STATUS.NO_CONTENT })
  return addSecurityHeaders(response)
}

// Add security headers to response
export function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Add CSP header from constants
  response.headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY)

  return response
}

// Pagination helpers
export function calculatePagination(
  total: number,
  page: number = 1,
  limit: number = config.pagination.defaultLimit
): PaginationMeta {
  const safeLimit = Math.min(limit, config.pagination.maxLimit)
  const totalPages = Math.ceil(total / safeLimit)
  const safePage = Math.max(1, Math.min(page, totalPages || 1))

  return {
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  }
}

export function getPaginationParams(searchParams: URLSearchParams): {
  page: number
  limit: number
  offset: number
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(
    config.pagination.maxLimit,
    Math.max(1, parseInt(searchParams.get('limit') || String(config.pagination.defaultLimit), 10))
  )
  const offset = (page - 1) * limit

  return { page, limit, offset }
}
