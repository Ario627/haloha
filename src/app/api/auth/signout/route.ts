import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addSecurityHeaders } from '@/lib/security/auth'

export async function POST() {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Signout error:', error)
      const response = NextResponse.json(
        { success: false, error: 'Gagal logout. Silakan coba lagi.' },
        { status: 500 }
      )
      return addSecurityHeaders(response)
    }

    const response = NextResponse.json(
      { success: true, message: 'Logout berhasil!' },
      { status: 200 }
    )
    return addSecurityHeaders(response)

  } catch (error) {
    console.error('Signout error:', error)
    const response = NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat logout.' },
      { status: 500 }
    )
    return addSecurityHeaders(response)
  }
}
