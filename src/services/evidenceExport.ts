import JSZip from 'jszip'
import type { Incident } from '../types/risk'
import { getIncidentLive } from './liveApi'
import { isSupabaseConfigured } from './supabase'

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] || character))

export async function downloadEvidenceBundle(incidents: Incident[]) {
  const zip = new JSZip()
  for (const incident of incidents) {
    let full: any = incident
    if (isSupabaseConfigured) { try { full = await getIncidentLive(incident.id) } catch { full = incident } }
    const analysis = Array.isArray(full.analysis_results) ? full.analysis_results[0] : full.analysis_results
    const evidence = full.evidence
    const folder = zip.folder(`incident-${incident.id}`)!
    const content = String(full.metadata?.originalContent || incident.content || '')
    const consequences = analysis?.possible_consequences || incident.consequences || []
    const signals = analysis?.detected_signals || incident.detectedSignals || []
    const actions = analysis?.recommended_actions || incident.recommendedActions || []
    folder.file('incident.json', JSON.stringify({ id: incident.id, createdAt: incident.createdAt, sourceType: incident.inputType, originalContent: content, riskScore: incident.riskScore, category: incident.category, severity: incident.severity, explanation: incident.explanation, signals, consequences, actions, riskDNA: incident.riskDNA, evidence: evidence ? { originalFilename: evidence.original_filename, sha256Hash: evidence.sha256_hash, createdAt: evidence.created_at } : null }, null, 2))
    folder.file('incident.html', `<!doctype html><meta charset="utf-8"><title>Sentinel incident ${escapeHtml(incident.id)}</title><h1>${escapeHtml(incident.category)}</h1><p>Saved ${escapeHtml(new Date(incident.createdAt).toLocaleString())}</p><h2>Original submitted content</h2><pre>${escapeHtml(content || 'No text or URL submitted.')}</pre><h2>Assessment</h2><p>${escapeHtml(incident.explanation)}</p><h2>Detected signals</h2><ul>${signals.map((item: string) => `<li>${escapeHtml(item)}</li>`).join('')}</ul><h2>Possible consequences</h2><ol>${consequences.map((item: string) => `<li>${escapeHtml(item)}</li>`).join('')}</ol><h2>Recommended actions</h2><ol>${actions.map((item: string) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>${evidence ? `<p>Integrity hash: ${escapeHtml(evidence.sha256_hash)}</p><p>Preserved timestamp: ${escapeHtml(new Date(evidence.created_at).toLocaleString())}</p>` : ''}`)
    if (evidence?.signed_url) { try { const response = await fetch(evidence.signed_url); if (response.ok) folder.file(evidence.original_filename || 'screenshot', await response.blob()) } catch { /* keep the structured incident export even when an image cannot be fetched */ } }
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `sentinel-evidence-${new Date().toISOString().slice(0, 10)}.zip`; anchor.click(); URL.revokeObjectURL(url)
}
