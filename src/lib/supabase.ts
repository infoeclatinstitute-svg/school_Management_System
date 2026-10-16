import { createClient } from '@supabase/supabase-js'

const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const envSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const FALLBACK_URL = 'https://mxfuivzgcnxwyslrmzqa.supabase.co'
const FALLBACK_KEY = 'sb_publishable_WDU0daQwIsyyjx28HakaMA_I2lmQ7F9'

const supabaseUrl = envSupabaseUrl || FALLBACK_URL
const supabaseAnonKey = envSupabaseAnonKey || FALLBACK_KEY

export const isUsingFallbackCredentials = (): boolean => {
  return !envSupabaseUrl || !envSupabaseAnonKey
}

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

if (isUsingFallbackCredentials()) {
  if (import.meta.env.PROD) {
    console.warn(
      '⚠️ Security Warning: Running with default Supabase credentials in production. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    )
  } else {
    console.info('Supabase: Running with configured sandbox credentials.')
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

/**
 * Validates active connection to Supabase cloud database
 */
export async function checkSupabaseHealth(): Promise<{ ok: boolean; message: string }> {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1)
    if (error && error.code !== 'PGRST116') {
      return { ok: false, message: error.message }
    }
    return { ok: true, message: 'Cloud database connected successfully.' }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Connection failed'
    return { ok: false, message: msg }
  }
}
