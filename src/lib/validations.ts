import { z } from 'zod'

// Auth schemas
export const signUpSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung huruf kapital')
    .regex(/[a-z]/, 'Password harus mengandung huruf kecil')
    .regex(/[0-9]/, 'Password harus mengandung angka'),
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
  phone: z.string().regex(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, 'Nomor telepon tidak valid').optional(),
})

export const signInSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

// Business data schemas
export const businessDataSchema = z.object({
  businessName: z.string().min(2, 'Nama bisnis minimal 2 karakter').max(200, 'Nama bisnis maksimal 200 karakter'),
  businessType: z.enum(['retail', 'fnb', 'jasa', 'manufaktur', 'pertanian', 'lainnya']),
  description: z.string().max(1000, 'Deskripsi maksimal 1000 karakter').optional(),
  monthlyRevenue: z.number().min(0, 'Pendapatan tidak boleh negatif').optional(),
  monthlyExpenses: z.number().min(0, 'Pengeluaran tidak boleh negatif').optional(),
  employeeCount: z.number().int().min(0, 'Jumlah karyawan tidak boleh negatif').optional(),
  yearsInOperation: z.number().min(0, 'Tahun operasi tidak boleh negatif').optional(),
  location: z.string().max(200, 'Lokasi maksimal 200 karakter').optional(),
  challenges: z.array(z.string()).max(10, 'Maksimal 10 tantangan').optional(),
  goals: z.array(z.string()).max(10, 'Maksimal 10 tujuan').optional(),
})

export const updateBusinessDataSchema = businessDataSchema.partial()

// Consultant message schema
export const consultantMessageSchema = z.object({
  message: z.string().min(1, 'Pesan tidak boleh kosong').max(5000, 'Pesan maksimal 5000 karakter'),
  sessionId: z.string().uuid().optional(),
  context: z.object({
    businessId: z.string().uuid().optional(),
    topic: z.enum(['umum', 'keuangan', 'pemasaran', 'operasional', 'sdm', 'teknologi']).optional(),
  }).optional(),
})

// Analytics query schema
export const analyticsQuerySchema = z.object({
  businessId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
  metrics: z.array(z.enum(['revenue', 'expenses', 'profit', 'growth', 'efficiency'])).optional(),
})

// Revenue data schema for analytics
export const revenueDataSchema = z.object({
  businessId: z.string().uuid(),
  amount: z.number().min(0, 'Amount tidak boleh negatif'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  category: z.string().max(100, 'Kategori maksimal 100 karakter').optional(),
  notes: z.string().max(500, 'Catatan maksimal 500 karakter').optional(),
})

// Expense data schema for analytics
export const expenseDataSchema = z.object({
  businessId: z.string().uuid(),
  amount: z.number().min(0, 'Amount tidak boleh negatif'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  category: z.enum(['bahan_baku', 'gaji', 'sewa', 'listrik', 'transport', 'marketing', 'lainnya']),
  notes: z.string().max(500, 'Catatan maksimal 500 karakter').optional(),
})

// Type exports
export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type BusinessDataInput = z.infer<typeof businessDataSchema>
export type UpdateBusinessDataInput = z.infer<typeof updateBusinessDataSchema>
export type ConsultantMessageInput = z.infer<typeof consultantMessageSchema>
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>
export type RevenueDataInput = z.infer<typeof revenueDataSchema>
export type ExpenseDataInput = z.infer<typeof expenseDataSchema>
