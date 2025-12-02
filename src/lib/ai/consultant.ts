import OpenAI from 'openai'
import type { Business, ConsultationMessage } from '@/types/database'

// Lazy initialization of OpenAI client
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
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

export async function getAIConsultantResponse(
  userMessage: string,
  conversationHistory: ConsultationMessage[],
  businessContext?: Business | null
): Promise<ConsultantResponse> {
  // Build context message if business data is available
  let contextMessage = ''
  if (businessContext) {
    contextMessage = `\n\nKONTEKS BISNIS PENGGUNA:
- Nama Bisnis: ${businessContext.business_name}
- Jenis Usaha: ${businessContext.business_type}
- Deskripsi: ${businessContext.description || 'Tidak tersedia'}
- Pendapatan Bulanan: ${businessContext.monthly_revenue ? `Rp ${businessContext.monthly_revenue.toLocaleString('id-ID')}` : 'Tidak tersedia'}
- Pengeluaran Bulanan: ${businessContext.monthly_expenses ? `Rp ${businessContext.monthly_expenses.toLocaleString('id-ID')}` : 'Tidak tersedia'}
- Jumlah Karyawan: ${businessContext.employee_count || 'Tidak tersedia'}
- Lama Operasi: ${businessContext.years_in_operation ? `${businessContext.years_in_operation} tahun` : 'Tidak tersedia'}
- Lokasi: ${businessContext.location || 'Tidak tersedia'}
- Tantangan: ${businessContext.challenges?.join(', ') || 'Tidak tersedia'}
- Tujuan: ${businessContext.goals?.join(', ') || 'Tidak tersedia'}

Gunakan informasi ini untuk memberikan saran yang lebih personal dan relevan.`
  }

  // Build messages array for OpenAI
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: SYSTEM_PROMPT + contextMessage
    },
    // Add conversation history (limit to last 10 messages to save tokens)
    ...conversationHistory.slice(-10).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    {
      role: 'user',
      content: userMessage
    }
  ]

  try {
    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective model suitable for consultations
      messages,
      max_tokens: 1000,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    })

    const responseContent = completion.choices[0]?.message?.content || 'Maaf, saya tidak dapat memproses permintaan Anda saat ini. Silakan coba lagi.'

    // Extract any follow-up suggestions from the response
    const suggestions = extractSuggestions(responseContent)

    return {
      message: responseContent,
      suggestions
    }
  } catch (error) {
    console.error('OpenAI API Error:', error)
    throw new Error('Gagal mendapatkan respons dari AI. Silakan coba lagi nanti.')
  }
}

// Extract potential follow-up questions/suggestions from the response
function extractSuggestions(response: string): string[] {
  const suggestions: string[] = []
  
  // Look for common patterns that suggest follow-up questions
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
