import dotenv from 'dotenv'

// Load the private local file first, then allow normal .env values as a fallback.
dotenv.config({ path: '.env.local' })
dotenv.config()

export const config = {
  port: Number(process.env.PORT || 8787),
  nodeEnv: process.env.NODE_ENV || 'development',
  appOrigin: process.env.APP_ORIGIN || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''),
  geminiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  notificationFrom: process.env.NOTIFICATION_FROM || 'Sentinel <onboarding@resend.dev>',
  maxUploadBytes: 8 * 1024 * 1024,
}

export const hasSupabase = Boolean(config.supabaseUrl && config.supabaseServiceRoleKey && config.supabaseAnonKey)
export const hasGemini = Boolean(config.geminiKey)
