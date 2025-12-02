// Input sanitization utilities to prevent XSS and injection attacks

// HTML entities to escape
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
}

// Sanitize string by escaping HTML entities
export function sanitizeHtml(input: string): string {
  return input.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char)
}

// Remove potential SQL injection patterns (basic protection - use parameterized queries for proper protection)
export function sanitizeSqlInput(input: string): string {
  // Remove common SQL injection patterns
  const sqlPatterns = [
    /--/g, // SQL comments
    /;/g,  // Statement terminator
    /'/g,  // Single quotes (will be handled by parameterized queries)
    /\\/g, // Backslashes
  ]
  
  let sanitized = input
  for (const pattern of sqlPatterns) {
    sanitized = sanitized.replace(pattern, '')
  }
  
  return sanitized
}

// Deep sanitize object values
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHtml(value.trim())
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeHtml(item.trim()) : item
      )
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized as T
}

// Validate and sanitize email
export function sanitizeEmail(email: string): string {
  // Lowercase and trim
  const cleaned = email.toLowerCase().trim()
  
  // Remove any characters that aren't valid in emails
  // This is a basic sanitization - actual email validation is done by zod
  return cleaned.replace(/[^\w.@+-]/g, '')
}

// Truncate string to prevent buffer overflow attacks
export function truncate(input: string, maxLength: number): string {
  if (input.length <= maxLength) {
    return input
  }
  return input.slice(0, maxLength)
}

// Validate UUID format
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Sanitize filename to prevent path traversal
export function sanitizeFilename(filename: string): string {
  // Remove path separators and other dangerous characters
  return filename
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[/\\]/g, '') // Remove path separators
    .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
    .trim()
}
