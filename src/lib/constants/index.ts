// Application-wide constants

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

// Error Messages (Indonesian)
export const ERROR_MESSAGES = {
  // Auth
  UNAUTHORIZED: 'Anda harus login untuk mengakses fitur ini',
  INVALID_CREDENTIALS: 'Email atau password salah',
  TOKEN_EXPIRED: 'Sesi Anda telah berakhir. Silakan login kembali',
  FORBIDDEN: 'Anda tidak memiliki akses ke resource ini',

  // Validation
  VALIDATION_ERROR: 'Data yang dikirim tidak valid',
  MISSING_REQUIRED_FIELD: 'Field yang diperlukan tidak ditemukan',
  INVALID_FORMAT: 'Format data tidak valid',

  // Rate Limit
  RATE_LIMIT_EXCEEDED: 'Terlalu banyak permintaan. Silakan coba lagi nanti',

  // Server
  INTERNAL_ERROR: 'Terjadi kesalahan pada server. Silakan coba lagi',
  SERVICE_UNAVAILABLE: 'Layanan sedang tidak tersedia. Silakan coba lagi nanti',

  // Business
  BUSINESS_NOT_FOUND: 'Bisnis tidak ditemukan',
  BUSINESS_CREATE_FAILED: 'Gagal membuat data bisnis',
  BUSINESS_UPDATE_FAILED: 'Gagal memperbarui data bisnis',
  BUSINESS_DELETE_FAILED: 'Gagal menghapus data bisnis',

  // AI Consultant
  AI_ERROR: 'Gagal mendapatkan respons dari AI. Silakan coba lagi',
  SESSION_NOT_FOUND: 'Sesi konsultasi tidak ditemukan',
} as const

// Success Messages (Indonesian)
export const SUCCESS_MESSAGES = {
  // Auth
  LOGIN_SUCCESS: 'Login berhasil!',
  LOGOUT_SUCCESS: 'Logout berhasil!',
  REGISTER_SUCCESS: 'Akun berhasil dibuat!',
  VERIFY_EMAIL: 'Silakan cek email Anda untuk verifikasi',

  // Business
  BUSINESS_CREATED: 'Bisnis berhasil ditambahkan!',
  BUSINESS_UPDATED: 'Bisnis berhasil diperbarui!',
  BUSINESS_DELETED: 'Bisnis berhasil dihapus!',

  // Analytics
  REVENUE_ADDED: 'Pendapatan berhasil ditambahkan!',
  EXPENSE_ADDED: 'Pengeluaran berhasil ditambahkan!',
  RECORD_DELETED: 'Record berhasil dihapus!',
} as const

// Business Types
export const BUSINESS_TYPES = {
  retail: 'Retail',
  fnb: 'Food & Beverage',
  jasa: 'Jasa',
  manufaktur: 'Manufaktur',
  pertanian: 'Pertanian',
  lainnya: 'Lainnya',
} as const

// Consultation Topics
export const CONSULTATION_TOPICS = {
  umum: 'Umum',
  keuangan: 'Keuangan',
  pemasaran: 'Pemasaran',
  operasional: 'Operasional',
  sdm: 'Sumber Daya Manusia',
  teknologi: 'Teknologi',
} as const

// Expense Categories
export const EXPENSE_CATEGORIES = {
  bahan_baku: 'Bahan Baku',
  gaji: 'Gaji',
  sewa: 'Sewa',
  listrik: 'Listrik',
  transport: 'Transport',
  marketing: 'Marketing',
  lainnya: 'Lainnya',
} as const

// Security Headers
export const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const

// Content Security Policy
export const CONTENT_SECURITY_POLICY = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.openai.com"
