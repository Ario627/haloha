import { createClient } from '@supabase/supabase-js'

// Admin client for server-side operations that require elevated privileges
// Only use this for admin operations like user management
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
