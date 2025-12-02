// Database types matching Supabase schema
export interface Profile {
  id: string
  email: string
  name: string
  phone?: string
  created_at: string
  updated_at: string
}

export interface Business {
  id: string
  user_id: string
  business_name: string
  business_type: 'retail' | 'fnb' | 'jasa' | 'manufaktur' | 'pertanian' | 'lainnya'
  description?: string
  monthly_revenue?: number
  monthly_expenses?: number
  employee_count?: number
  years_in_operation?: number
  location?: string
  challenges?: string[]
  goals?: string[]
  created_at: string
  updated_at: string
}

export interface RevenueRecord {
  id: string
  business_id: string
  amount: number
  date: string
  category?: string
  notes?: string
  created_at: string
}

export interface ExpenseRecord {
  id: string
  business_id: string
  amount: number
  date: string
  category: 'bahan_baku' | 'gaji' | 'sewa' | 'listrik' | 'transport' | 'marketing' | 'lainnya'
  notes?: string
  created_at: string
}

export interface ConsultationSession {
  id: string
  user_id: string
  business_id?: string
  topic?: string
  messages: ConsultationMessage[]
  created_at: string
  updated_at: string
}

export interface ConsultationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Analytics types
export interface BusinessAnalytics {
  businessId: string
  period: {
    start: string
    end: string
  }
  revenue: {
    total: number
    average: number
    trend: 'up' | 'down' | 'stable'
    byCategory: Record<string, number>
  }
  expenses: {
    total: number
    average: number
    trend: 'up' | 'down' | 'stable'
    byCategory: Record<string, number>
  }
  profit: {
    total: number
    margin: number
    trend: 'up' | 'down' | 'stable'
  }
  insights: string[]
}
