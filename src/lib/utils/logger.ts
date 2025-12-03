import { config } from '@/lib/config'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  requestId?: string
  userId?: string
  action?: string
  duration?: number | string
  [key: string]: unknown
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function shouldLog(level: LogLevel): boolean {
  if (!config.logging.enabled) return false
  const configLevel = config.logging.level as LogLevel
  return LOG_LEVELS[level] >= LOG_LEVELS[configLevel]
}

function formatLogMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const contextStr = context ? ` | ${JSON.stringify(context)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (shouldLog('debug')) {
      console.debug(formatLogMessage('debug', message, context))
    }
  },

  info(message: string, context?: LogContext): void {
    if (shouldLog('info')) {
      console.info(formatLogMessage('info', message, context))
    }
  },

  warn(message: string, context?: LogContext): void {
    if (shouldLog('warn')) {
      console.warn(formatLogMessage('warn', message, context))
    }
  },

  error(message: string, error?: unknown, context?: LogContext): void {
    if (shouldLog('error')) {
      const errorDetails = error instanceof Error 
        ? { errorMessage: error.message, stack: error.stack }
        : { error }
      console.error(formatLogMessage('error', message, { ...context, ...errorDetails }))
    }
  },

  // Log API request
  request(
    method: string,
    path: string,
    context?: LogContext
  ): void {
    this.info(`${method} ${path}`, context)
  },

  // Log API response
  response(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
    this[level](`${method} ${path} - ${statusCode}`, { ...context, duration: `${duration}ms` })
  },

  // Log database operation
  db(operation: string, table: string, context?: LogContext): void {
    this.debug(`DB: ${operation} on ${table}`, context)
  },

  // Log external service call
  external(service: string, operation: string, context?: LogContext): void {
    this.info(`External: ${service} - ${operation}`, context)
  },
}

export default logger
