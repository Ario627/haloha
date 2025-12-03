import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants'

// Custom error classes for better error handling

export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly code: string

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.code = code

    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  public readonly errors: string[]

  constructor(message: string, errors: string[] = []) {
    super(message, HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR')
    this.errors = errors
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = ERROR_MESSAGES.UNAUTHORIZED) {
    super(message, HTTP_STATUS.UNAUTHORIZED, 'AUTHENTICATION_ERROR')
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = ERROR_MESSAGES.FORBIDDEN) {
    super(message, HTTP_STATUS.FORBIDDEN, 'AUTHORIZATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource tidak ditemukan') {
    super(message, HTTP_STATUS.NOT_FOUND, 'NOT_FOUND')
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter: number

  constructor(retryAfter: number) {
    super(ERROR_MESSAGES.RATE_LIMIT_EXCEEDED, HTTP_STATUS.TOO_MANY_REQUESTS, 'RATE_LIMIT_EXCEEDED')
    this.retryAfter = retryAfter
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, HTTP_STATUS.CONFLICT, 'CONFLICT')
  }
}

export class ExternalServiceError extends AppError {
  public readonly service: string

  constructor(service: string, message: string = 'External service error') {
    super(message, HTTP_STATUS.SERVICE_UNAVAILABLE, 'EXTERNAL_SERVICE_ERROR')
    this.service = service
  }
}

// Error type guard
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

// Error handler utility
export function handleError(error: unknown): {
  message: string
  statusCode: number
  code: string
} {
  if (isAppError(error)) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
    }
  }

  return {
    message: ERROR_MESSAGES.INTERNAL_ERROR,
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code: 'UNKNOWN_ERROR',
  }
}
