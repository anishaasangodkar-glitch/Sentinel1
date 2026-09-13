import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Request } from 'express'
import { config, hasSupabase } from './config.js'

let admin: SupabaseClient | null = null
type AuthUser = { id: string; email?: string | null; user_metadata?: Record<string, unknown> }
export const getAdmin = () => {
  if (!hasSupabase) return null
  admin ??= createClient(config.supabaseUrl, config.supabaseServiceRoleKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } })
  return admin
}

export async function requireUser(req: Request): Promise<AuthUser> {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  const client = getAdmin()
  if (!token || !client) throw Object.assign(new Error('Authentication is required for this action.'), { status: 401 })
  const authClient = client.auth as unknown as { getUser: (jwt: string) => Promise<{ data: { user: AuthUser | null }; error: Error | null }> }
  const { data, error } = await authClient.getUser(token)
  if (error || !data.user) throw Object.assign(new Error('Your session is invalid or has expired.'), { status: 401 })
  return data.user
}

export function isLiveDataConfigured() { return hasSupabase }
