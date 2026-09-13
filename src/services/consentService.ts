export type PermissionKey = 'textAnalysis' | 'urlAnalysis' | 'screenshotAnalysis' | 'evidencePreservation' | 'trustedSharing'

export type ConsentState = Record<PermissionKey, boolean> & { paused: boolean }

const KEY = 'sentinel-consent'
const LOG_KEY = 'sentinel-transparency-log'
const defaults: ConsentState = { textAnalysis: true, urlAnalysis: true, screenshotAnalysis: true, evidencePreservation: true, trustedSharing: false, paused: false }

export type TransparencyEvent = { id: string; at: string; label: string; detail: string }

export const getConsent = (): ConsentState => {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { ...defaults } }
}

export const updateConsent = (key: keyof ConsentState, value: boolean) => {
  const next = { ...getConsent(), [key]: value }
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('sentinel-consent-changed'))
  return next
}

export const canAnalyze = (type: 'message' | 'website' | 'screenshot') => {
  const consent = getConsent()
  return !consent.paused && (type === 'message' ? consent.textAnalysis : type === 'website' ? consent.urlAnalysis : consent.screenshotAnalysis)
}

export const recordTransparency = (label: string, detail: string) => {
  const event: TransparencyEvent = { id: crypto.randomUUID(), at: new Date().toISOString(), label, detail }
  try {
    const current = JSON.parse(localStorage.getItem(LOG_KEY) || '[]') as TransparencyEvent[]
    localStorage.setItem(LOG_KEY, JSON.stringify([event, ...current].slice(0, 80)))
    window.dispatchEvent(new CustomEvent('sentinel-transparency-changed'))
  } catch { /* local transparency is best-effort and never blocks safety actions */ }
  return event
}

export const getTransparency = (): TransparencyEvent[] => {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]') as TransparencyEvent[] } catch { return [] }
}
