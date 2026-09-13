import type { Analysis, Incident, InputType } from '../types/risk'
import { supabase } from './supabase'

let pendingEvidenceFile: File | null = null
export const setPendingEvidenceFile = (file: File | null) => { pendingEvidenceFile = file }
export const getPendingEvidenceFile = () => pendingEvidenceFile

async function token() { if (!supabase) return null; const { data } = await supabase.auth.getSession(); return data.session?.access_token || null }
async function request<T>(path: string, init: RequestInit = {}) {
  const accessToken = await token()
  const headers = new Headers(init.headers)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const response = await fetch(path, { ...init, headers })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'The Sentinel service could not complete that request.')
  return body as T
}

export async function analyzeLive(content: string, inputType: InputType, file?: File | null): Promise<Analysis> {
  const result = inputType === 'screenshot' && file
    ? await (() => { const form = new FormData(); form.append('image', file); return request<Partial<Analysis>>('/api/analyze/image', { method: 'POST', body: form }) })()
    : inputType === 'website'
      ? await request<Partial<Analysis>>('/api/analyze/url', { method: 'POST', body: JSON.stringify({ url: content }) })
      : await request<Partial<Analysis>>('/api/analyze/text', { method: 'POST', body: JSON.stringify({ content }) })
  const normalized = result as Partial<Analysis> & { possibleConsequences?: string[] }
  return { ...normalized, id: normalized.id || crypto.randomUUID(), createdAt: normalized.createdAt || new Date().toISOString(), inputType: normalized.inputType || inputType, content: normalized.content || content, consequences: normalized.consequences || normalized.possibleConsequences || [] } as Analysis
}
export async function saveIncidentLive(analysis: Analysis, file?: File | null) { const created = await request<{ incidentId: string }>('/api/incidents', { method: 'POST', body: JSON.stringify({ analysis }) }); if (file) { const form = new FormData(); form.append('evidence', file); await request(`/api/incidents/${created.incidentId}/evidence`, { method: 'POST', body: form }) }; const notificationResult = analysis.severity === 'HIGH' || analysis.severity === 'CRITICAL' ? await request<{ notifications: Array<{ contact: string; status: string; shareUrl: string; expiresAt: string }> }>(`/api/incidents/${created.incidentId}/trusted-notify`, { method: 'POST' }).catch(() => ({ notifications: [] as Array<{ contact: string; status: string; shareUrl: string; expiresAt: string }> })) : { notifications: [] as Array<{ contact: string; status: string; shareUrl: string; expiresAt: string }> }; return { ...created, notifications: notificationResult.notifications } }
export const listIncidentsLive = () => request<Incident[]>('/api/incidents')
export const getIncidentLive = (id: string) => request<Record<string, unknown>>(`/api/incidents/${id}`)
export const deleteEvidenceLive = (id: string) => request<{ ok: boolean }>(`/api/evidence/${id}`, { method: 'DELETE' })
export const createReportLive = (incidentId: string, description: string, category = 'Safety concern') => request('/api/reports', { method: 'POST', body: JSON.stringify({ incidentId, description, category }) })
export type TrustedContact = { id: string; name: string; email: string; enabled: boolean; consent_granted: boolean; created_at: string }
export const listTrustedContactsLive = () => request<TrustedContact[]>('/api/trusted-contacts')
export const addTrustedContactLive = (name: string, email: string) => { if (!window.confirm('Please confirm that this trusted person knows and agrees to be listed, and understands they may receive a read-only link for an incident you choose to share.')) return Promise.reject(new Error('Trusted-person consent was not confirmed.')); return request<TrustedContact>('/api/trusted-contacts', { method: 'POST', body: JSON.stringify({ name, email, consentGranted: true }) }) }
export const revokeTrustedContactLive = (id: string) => request<{ ok: boolean }>(`/api/trusted-contacts/${id}`, { method: 'DELETE' })
export const notifyTrustedContactLive = (incidentId: string, contactId: string) => request<{ notifications: Array<{ contact: string; status: string; shareUrl: string; expiresAt: string }> }>(`/api/incidents/${incidentId}/trusted-notify`, { method: 'POST', body: JSON.stringify({ contactId }) })
export const createSharedIncidentLive = (id: string) => request<{ url: string; expiresAt: string }>(`/api/incidents/${id}/share`, { method: 'POST' })
export const revokeSharedIncidentLive = (token: string) => request<{ ok: boolean }>(`/api/shared/${encodeURIComponent(token)}`, { method: 'DELETE' })
export const getSharedIncidentLive = (token: string) => fetch(`/api/shared/${encodeURIComponent(token)}`).then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || 'This shared incident is unavailable.') ; return body })
export const clearAllIncidentsLive = () => request<{ ok: boolean }>('/api/incidents', { method: 'DELETE' })
export const exportAccountDataLive = () => request<Record<string, unknown>>('/api/account/export')
