import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revenueDataSchema, expenseDataSchema } from '@/lib/validations'
import { withProtection, addSecurityHeaders } from '@/lib/security/auth'
import { sanitizeObject } from '@/lib/security/sanitize'
import type { BusinessAnalytics, RevenueRecord, ExpenseRecord } from '@/types/database'

// GET - Get analytics data for a business
export async function GET(request: NextRequest) {
  return withProtection(
    request,
    async (req, user) => {
      try {
        const { searchParams } = new URL(req.url)
        const businessId = searchParams.get('businessId')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        if (!businessId) {
          const response = NextResponse.json(
            { success: false, error: 'Business ID diperlukan' },
            { status: 400 }
          )
          return addSecurityHeaders(response)
        }

        const supabase = await createClient()

        // Verify business ownership
        const { data: business } = await supabase
          .from('businesses')
          .select('user_id')
          .eq('id', businessId)
          .single()

        if (!business || business.user_id !== user.id) {
          const response = NextResponse.json(
            { success: false, error: 'Bisnis tidak ditemukan atau Anda tidak memiliki akses' },
            { status: 404 }
          )
          return addSecurityHeaders(response)
        }

        // Default to last 30 days if no date range provided
        const end = endDate || new Date().toISOString().split('T')[0]
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        // Fetch revenue data
        const { data: revenues, error: revenueError } = await supabase
          .from('revenue_records')
          .select('*')
          .eq('business_id', businessId)
          .gte('date', start)
          .lte('date', end)
          .order('date', { ascending: false })

        if (revenueError) {
          console.error('Error fetching revenue:', revenueError)
        }

        // Fetch expense data
        const { data: expenses, error: expenseError } = await supabase
          .from('expense_records')
          .select('*')
          .eq('business_id', businessId)
          .gte('date', start)
          .lte('date', end)
          .order('date', { ascending: false })

        if (expenseError) {
          console.error('Error fetching expenses:', expenseError)
        }

        // Calculate analytics
        const analytics = calculateAnalytics(
          businessId,
          { start, end },
          revenues || [],
          expenses || []
        )

        const response = NextResponse.json(
          {
            success: true,
            data: {
              revenues: revenues as RevenueRecord[] || [],
              expenses: expenses as ExpenseRecord[] || [],
              analytics
            }
          },
          { status: 200 }
        )
        return addSecurityHeaders(response)

      } catch (error) {
        console.error('Error in GET /api/analytics:', error)
        const response = NextResponse.json(
          { success: false, error: 'Terjadi kesalahan saat mengambil data analytics' },
          { status: 500 }
        )
        return addSecurityHeaders(response)
      }
    }
  )
}

// POST - Add revenue or expense record
export async function POST(request: NextRequest) {
  return withProtection(
    request,
    async (req, user) => {
      try {
        const body = await req.json()
        const { type, ...data } = body

        if (!type || !['revenue', 'expense'].includes(type)) {
          const response = NextResponse.json(
            { success: false, error: 'Tipe record harus "revenue" atau "expense"' },
            { status: 400 }
          )
          return addSecurityHeaders(response)
        }

        const sanitizedData = sanitizeObject(data)
        const supabase = await createClient()

        // Verify business ownership
        const businessId = sanitizedData.businessId
        const { data: business } = await supabase
          .from('businesses')
          .select('user_id')
          .eq('id', businessId)
          .single()

        if (!business || business.user_id !== user.id) {
          const response = NextResponse.json(
            { success: false, error: 'Bisnis tidak ditemukan atau Anda tidak memiliki akses' },
            { status: 404 }
          )
          return addSecurityHeaders(response)
        }

        if (type === 'revenue') {
          const validation = revenueDataSchema.safeParse(sanitizedData)
          if (!validation.success) {
            const errors = validation.error.errors.map(e => e.message).join(', ')
            const response = NextResponse.json(
              { success: false, error: errors },
              { status: 400 }
            )
            return addSecurityHeaders(response)
          }

          const { data: newRevenue, error } = await supabase
            .from('revenue_records')
            .insert({
              business_id: validation.data.businessId,
              amount: validation.data.amount,
              date: validation.data.date,
              category: validation.data.category,
              notes: validation.data.notes
            })
            .select()
            .single()

          if (error) {
            console.error('Error creating revenue record:', error)
            const response = NextResponse.json(
              { success: false, error: 'Gagal menambahkan data pendapatan' },
              { status: 500 }
            )
            return addSecurityHeaders(response)
          }

          const response = NextResponse.json(
            { success: true, data: newRevenue, message: 'Pendapatan berhasil ditambahkan!' },
            { status: 201 }
          )
          return addSecurityHeaders(response)
        }

        if (type === 'expense') {
          const validation = expenseDataSchema.safeParse(sanitizedData)
          if (!validation.success) {
            const errors = validation.error.errors.map(e => e.message).join(', ')
            const response = NextResponse.json(
              { success: false, error: errors },
              { status: 400 }
            )
            return addSecurityHeaders(response)
          }

          const { data: newExpense, error } = await supabase
            .from('expense_records')
            .insert({
              business_id: validation.data.businessId,
              amount: validation.data.amount,
              date: validation.data.date,
              category: validation.data.category,
              notes: validation.data.notes
            })
            .select()
            .single()

          if (error) {
            console.error('Error creating expense record:', error)
            const response = NextResponse.json(
              { success: false, error: 'Gagal menambahkan data pengeluaran' },
              { status: 500 }
            )
            return addSecurityHeaders(response)
          }

          const response = NextResponse.json(
            { success: true, data: newExpense, message: 'Pengeluaran berhasil ditambahkan!' },
            { status: 201 }
          )
          return addSecurityHeaders(response)
        }

        const response = NextResponse.json(
          { success: false, error: 'Tipe record tidak valid' },
          { status: 400 }
        )
        return addSecurityHeaders(response)

      } catch (error) {
        console.error('Error in POST /api/analytics:', error)
        const response = NextResponse.json(
          { success: false, error: 'Terjadi kesalahan saat menambahkan data' },
          { status: 500 }
        )
        return addSecurityHeaders(response)
      }
    }
  )
}

// DELETE - Delete revenue or expense record
export async function DELETE(request: NextRequest) {
  return withProtection(
    request,
    async (req, user) => {
      try {
        const { searchParams } = new URL(req.url)
        const recordId = searchParams.get('id')
        const type = searchParams.get('type')

        if (!recordId || !type || !['revenue', 'expense'].includes(type)) {
          const response = NextResponse.json(
            { success: false, error: 'Record ID dan tipe diperlukan' },
            { status: 400 }
          )
          return addSecurityHeaders(response)
        }

        const supabase = await createClient()
        const tableName = type === 'revenue' ? 'revenue_records' : 'expense_records'

        // Get the record to verify ownership through business
        const { data: record } = await supabase
          .from(tableName)
          .select('business_id')
          .eq('id', recordId)
          .single()

        if (!record) {
          const response = NextResponse.json(
            { success: false, error: 'Record tidak ditemukan' },
            { status: 404 }
          )
          return addSecurityHeaders(response)
        }

        // Verify business ownership
        const { data: business } = await supabase
          .from('businesses')
          .select('user_id')
          .eq('id', record.business_id)
          .single()

        if (!business || business.user_id !== user.id) {
          const response = NextResponse.json(
            { success: false, error: 'Anda tidak memiliki akses untuk menghapus record ini' },
            { status: 403 }
          )
          return addSecurityHeaders(response)
        }

        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', recordId)

        if (error) {
          console.error('Error deleting record:', error)
          const response = NextResponse.json(
            { success: false, error: 'Gagal menghapus record' },
            { status: 500 }
          )
          return addSecurityHeaders(response)
        }

        const response = NextResponse.json(
          { success: true, message: 'Record berhasil dihapus!' },
          { status: 200 }
        )
        return addSecurityHeaders(response)

      } catch (error) {
        console.error('Error in DELETE /api/analytics:', error)
        const response = NextResponse.json(
          { success: false, error: 'Terjadi kesalahan saat menghapus record' },
          { status: 500 }
        )
        return addSecurityHeaders(response)
      }
    }
  )
}

// Helper function to calculate analytics
function calculateAnalytics(
  businessId: string,
  period: { start: string; end: string },
  revenues: RevenueRecord[],
  expenses: ExpenseRecord[]
): BusinessAnalytics {
  // Revenue calculations
  const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0)
  const avgRevenue = revenues.length > 0 ? totalRevenue / revenues.length : 0
  const revenueByCategory: Record<string, number> = {}
  revenues.forEach(r => {
    const category = r.category || 'Lainnya'
    revenueByCategory[category] = (revenueByCategory[category] || 0) + r.amount
  })

  // Expense calculations
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const avgExpenses = expenses.length > 0 ? totalExpenses / expenses.length : 0
  const expenseByCategory: Record<string, number> = {}
  expenses.forEach(e => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount
  })

  // Profit calculations
  const totalProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  // Trend calculations (comparing older half to newer half)
  // Note: revenues are ordered by date descending, so first half = newer data, second half = older data
  const midPoint = Math.floor(revenues.length / 2)
  const newerHalfRevenue = revenues.slice(0, midPoint).reduce((sum, r) => sum + r.amount, 0)
  const olderHalfRevenue = revenues.slice(midPoint).reduce((sum, r) => sum + r.amount, 0)
  const revenueTrend: 'up' | 'down' | 'stable' = 
    newerHalfRevenue > olderHalfRevenue * 1.05 ? 'up' :
    newerHalfRevenue < olderHalfRevenue * 0.95 ? 'down' : 'stable'

  const expenseMidPoint = Math.floor(expenses.length / 2)
  const newerHalfExpenses = expenses.slice(0, expenseMidPoint).reduce((sum, e) => sum + e.amount, 0)
  const olderHalfExpenses = expenses.slice(expenseMidPoint).reduce((sum, e) => sum + e.amount, 0)
  const expenseTrend: 'up' | 'down' | 'stable' = 
    newerHalfExpenses > olderHalfExpenses * 1.05 ? 'up' :
    newerHalfExpenses < olderHalfExpenses * 0.95 ? 'down' : 'stable'

  const profitTrend: 'up' | 'down' | 'stable' = 
    revenueTrend === 'up' && expenseTrend !== 'up' ? 'up' :
    revenueTrend === 'down' || expenseTrend === 'up' ? 'down' : 'stable'

  // Generate insights
  const insights = generateInsights(
    totalRevenue,
    totalExpenses,
    profitMargin,
    revenueTrend,
    expenseTrend,
    expenseByCategory
  )

  return {
    businessId,
    period,
    revenue: {
      total: totalRevenue,
      average: avgRevenue,
      trend: revenueTrend,
      byCategory: revenueByCategory
    },
    expenses: {
      total: totalExpenses,
      average: avgExpenses,
      trend: expenseTrend,
      byCategory: expenseByCategory
    },
    profit: {
      total: totalProfit,
      margin: profitMargin,
      trend: profitTrend
    },
    insights
  }
}

// Generate business insights based on data
function generateInsights(
  totalRevenue: number,
  totalExpenses: number,
  profitMargin: number,
  revenueTrend: string,
  expenseTrend: string,
  expenseByCategory: Record<string, number>
): string[] {
  const insights: string[] = []

  // Profit margin insights
  if (profitMargin < 10) {
    insights.push('⚠️ Margin keuntungan rendah (<10%). Pertimbangkan untuk mengurangi biaya atau meningkatkan harga.')
  } else if (profitMargin > 30) {
    insights.push('✅ Margin keuntungan sangat baik (>30%). Bisnis Anda berjalan dengan efisien.')
  }

  // Trend insights
  if (revenueTrend === 'up') {
    insights.push('📈 Pendapatan menunjukkan tren naik. Pertahankan strategi yang sedang berjalan!')
  } else if (revenueTrend === 'down') {
    insights.push('📉 Pendapatan menurun. Pertimbangkan untuk evaluasi strategi pemasaran.')
  }

  if (expenseTrend === 'up') {
    insights.push('⚠️ Pengeluaran meningkat. Review dan optimalkan biaya operasional.')
  }

  // Expense distribution insights
  const totalExp = Object.values(expenseByCategory).reduce((a, b) => a + b, 0)
  for (const [category, amount] of Object.entries(expenseByCategory)) {
    const percentage = totalExp > 0 ? (amount / totalExp) * 100 : 0
    if (percentage > 40) {
      insights.push(`💡 Kategori "${category}" mengambil ${percentage.toFixed(0)}% dari total pengeluaran. Pertimbangkan untuk mengoptimalkan.`)
    }
  }

  // No data insights
  if (totalRevenue === 0 && totalExpenses === 0) {
    insights.push('📊 Belum ada data keuangan. Mulai catat pendapatan dan pengeluaran untuk mendapatkan insight.')
  }

  return insights.length > 0 ? insights : ['✨ Bisnis Anda berjalan stabil. Terus pantau dan catat transaksi secara rutin.']
}
