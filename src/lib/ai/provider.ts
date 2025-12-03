// AI Provider abstraction for flexibility
// Allows switching between different AI providers easily

import OpenAI from 'openai'
import type { Business, ConsultationMessage } from '@/types/database'
import { config } from '@/lib/config'
import { logger } from '@/lib/utils/logger'
import { ExternalServiceError } from '@/lib/errors'

// AI Provider interface for flexibility
export interface AIProvider {
  chat(
    systemPrompt: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    options?: AIProviderOptions
  ): Promise<string>
}

export interface AIProviderOptions {
  maxTokens?: number
  temperature?: number
  model?: string
}

// OpenAI Provider implementation
class OpenAIProvider implements AIProvider {
  private client: OpenAI | null = null

  private getClient(): OpenAI {
    if (!this.client) {
      if (!config.openai.apiKey) {
        throw new ExternalServiceError('OpenAI', 'Kunci API OpenAI tidak ditemukan. Pastikan OPENAI_API_KEY sudah diatur.')
      }
      this.client = new OpenAI({
        apiKey: config.openai.apiKey,
      })
    }
    return this.client
  }

  async chat(
    systemPrompt: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    options: AIProviderOptions = {}
  ): Promise<string> {
    const client = this.getClient()
    const startTime = Date.now()

    try {
      const completion = await client.chat.completions.create({
        model: options.model || config.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: options.maxTokens || config.openai.maxTokens,
        temperature: options.temperature || config.openai.temperature,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      })

      const duration = Date.now() - startTime
      logger.external('OpenAI', 'chat.completions', { 
        model: options.model || config.openai.model,
        duration: `${duration}ms`
      })

      return completion.choices[0]?.message?.content || 
        'Maaf, saya tidak dapat memproses permintaan Anda saat ini.'

    } catch (error) {
      logger.error('OpenAI API Error', error)
      throw new ExternalServiceError('OpenAI', 'Gagal mendapatkan respons dari AI')
    }
  }
}

// Factory to get AI provider
let aiProvider: AIProvider | null = null

export function getAIProvider(): AIProvider {
  if (!aiProvider) {
    // Default to OpenAI, but can be extended to support other providers
    aiProvider = new OpenAIProvider()
  }
  return aiProvider
}

// System prompt for the business consultant AI
const SYSTEM_PROMPT = `Anda adalah konsultan bisnis AI yang ramah dan ahli, khusus membantu UMKM (Usaha Mikro, Kecil, dan Menengah) di Indonesia.

PERAN ANDA:
- Memberikan saran bisnis yang praktis dan mudah dipahami
- Membantu pemilik usaha yang mungkin tidak terlalu familiar dengan teknologi
- Berkomunikasi dalam Bahasa Indonesia yang sederhana dan mudah dimengerti
- Memberikan contoh konkret dan langkah-langkah yang jelas

KEAHLIAN ANDA:
1. Keuangan: Pengelolaan keuangan, pembukuan sederhana, perencanaan anggaran
2. Pemasaran: Strategi pemasaran online dan offline, media sosial, branding
3. Operasional: Efisiensi operasi, manajemen inventori, supply chain
4. SDM: Manajemen karyawan, rekrutmen, pengembangan tim
5. Teknologi: Digitalisasi bisnis, tools yang mudah digunakan
6. Legal: Perizinan, pajak UMKM, perlindungan usaha

PANDUAN KOMUNIKASI:
- Gunakan bahasa yang sederhana, hindari jargon teknis
- Berikan jawaban yang terstruktur dengan poin-poin yang jelas
- Tawarkan solusi yang realistis sesuai skala UMKM
- Jika ada data bisnis tersedia, berikan saran yang dipersonalisasi
- Selalu tanyakan jika butuh klarifikasi untuk memberikan saran yang lebih tepat
- Berikan semangat dan motivasi kepada pemilik usaha

BATASAN:
- Jangan memberikan saran legal atau pajak yang spesifik (sarankan konsultasi profesional)
- Jangan membuat janji hasil tertentu
- Fokus pada saran yang dapat diterapkan secara langsung`

export interface ConsultantResponse {
  message: string
  suggestions?: string[]
}

// Build business context message
function buildBusinessContext(business: Business): string {
  return `

KONTEKS BISNIS PENGGUNA:
- Nama Bisnis: ${business.business_name}
- Jenis Usaha: ${business.business_type}
- Deskripsi: ${business.description || 'Tidak tersedia'}
- Pendapatan Bulanan: ${business.monthly_revenue ? `Rp ${business.monthly_revenue.toLocaleString('id-ID')}` : 'Tidak tersedia'}
- Pengeluaran Bulanan: ${business.monthly_expenses ? `Rp ${business.monthly_expenses.toLocaleString('id-ID')}` : 'Tidak tersedia'}
- Jumlah Karyawan: ${business.employee_count || 'Tidak tersedia'}
- Lama Operasi: ${business.years_in_operation ? `${business.years_in_operation} tahun` : 'Tidak tersedia'}
- Lokasi: ${business.location || 'Tidak tersedia'}
- Tantangan: ${business.challenges?.join(', ') || 'Tidak tersedia'}
- Tujuan: ${business.goals?.join(', ') || 'Tidak tersedia'}

Gunakan informasi ini untuk memberikan saran yang lebih personal dan relevan.`
}

// Main function to get AI consultant response
export async function getAIConsultantResponse(
  userMessage: string,
  conversationHistory: ConsultationMessage[],
  businessContext?: Business | null
): Promise<ConsultantResponse> {
  const provider = getAIProvider()
  
  // Build system prompt with optional business context
  let systemPrompt = SYSTEM_PROMPT
  if (businessContext) {
    systemPrompt += buildBusinessContext(businessContext)
  }

  // Prepare messages (limit to last 10 for token efficiency)
  const messages = [
    ...conversationHistory.slice(-10).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    { role: 'user' as const, content: userMessage }
  ]

  const response = await provider.chat(systemPrompt, messages)
  const suggestions = extractSuggestions(response)

  return { message: response, suggestions }
}

// Extract potential follow-up questions/suggestions from the response
function extractSuggestions(response: string): string[] {
  const suggestions: string[] = []
  
  const patterns = [
    /apakah anda ingin tahu lebih lanjut tentang (.+?)\?/gi,
    /mau saya jelaskan tentang (.+?)\?/gi,
    /perlu bantuan dengan (.+?)\?/gi,
  ]

  for (const pattern of patterns) {
    const matches = response.matchAll(pattern)
    for (const match of matches) {
      if (match[1] && suggestions.length < 3) {
        suggestions.push(match[1].trim())
      }
    }
  }

  return suggestions
}

// Generate quick tips based on business type
export function getQuickTips(businessType: string): string[] {
  const tips: Record<string, string[]> = {
    retail: [
      'Bagaimana cara meningkatkan penjualan?',
      'Tips mengelola inventori',
      'Strategi promo yang efektif',
    ],
    fnb: [
      'Cara menekan food cost',
      'Tips marketing di media sosial',
      'Mengelola kualitas bahan baku',
    ],
    jasa: [
      'Cara mendapatkan klien baru',
      'Tips membangun reputasi',
      'Strategi pricing yang tepat',
    ],
    manufaktur: [
      'Efisiensi produksi',
      'Manajemen supply chain',
      'Quality control yang baik',
    ],
    pertanian: [
      'Akses pasar yang lebih luas',
      'Mengurangi kerugian pasca panen',
      'Diversifikasi produk',
    ],
    lainnya: [
      'Tips memulai usaha',
      'Cara mengelola keuangan bisnis',
      'Strategi pemasaran dasar',
    ],
  }

  return tips[businessType] || tips.lainnya
}
