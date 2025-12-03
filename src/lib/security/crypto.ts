import crypto from 'crypto'
import { config } from '@/lib/config'

// CSRF Token utilities
const CSRF_TOKEN_LENGTH = 32

// Get CSRF secret from config or generate a development fallback
function getCsrfSecret(): string {
  if (config.security.csrfSecret) {
    return config.security.csrfSecret
  }
  
  // In development, warn about missing secret
  if (config.isDev) {
    console.warn('Warning: CSRF_SECRET not set. Using generated secret (not persistent across restarts)')
  }
  
  // Generate a consistent secret based on environment (not cryptographically ideal but functional)
  return crypto.createHash('sha256').update(config.site.url + 'csrf-fallback').digest('hex')
}

const CSRF_SECRET = getCsrfSecret()

// Generate CSRF token
export function generateCsrfToken(): string {
  const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
  const timestamp = Date.now().toString(36)
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(`${token}:${timestamp}`)
    .digest('hex')
    .substring(0, 16)
  
  return `${token}:${timestamp}:${signature}`
}

// Verify CSRF token
export function verifyCsrfToken(token: string): boolean {
  if (!token) return false
  
  const parts = token.split(':')
  if (parts.length !== 3) return false
  
  const [tokenPart, timestamp, signature] = parts
  
  // Check if token is not too old (1 hour)
  const tokenTime = parseInt(timestamp, 36)
  if (Date.now() - tokenTime > 3600000) return false
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(`${tokenPart}:${timestamp}`)
    .digest('hex')
    .substring(0, 16)
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

// Hash sensitive data (like API keys for logging)
export function hashSensitiveData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 8)
}

// Generate secure random string
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

// Constant-time string comparison to prevent timing attacks
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

// Mask sensitive data for logging (show first and last 4 chars)
export function maskSensitiveData(data: string, showChars: number = 4): string {
  if (data.length <= showChars * 2) {
    return '*'.repeat(data.length)
  }
  const start = data.substring(0, showChars)
  const end = data.substring(data.length - showChars)
  const masked = '*'.repeat(Math.min(data.length - showChars * 2, 10))
  return `${start}${masked}${end}`
}

// IP Address utilities
export function isValidIP(ip: string): boolean {
  // IPv4
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  // IPv6
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

// Check if IP is private/internal
export function isPrivateIP(ip: string): boolean {
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^::1$/,
    /^fe80:/i,
  ]
  
  return privateRanges.some(range => range.test(ip))
}
