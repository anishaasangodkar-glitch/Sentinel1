import type { Incident } from '../types/risk'
const KEY = 'sentinel-incidents'
export const getIncidents = (): Incident[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
export const saveIncident = (incident: Incident) => { const next = [incident, ...getIncidents().filter(i => i.id !== incident.id)]; localStorage.setItem(KEY, JSON.stringify(next)); return next }
export const deleteIncident = (id: string) => { const next = getIncidents().filter(i => i.id !== id); localStorage.setItem(KEY, JSON.stringify(next)); return next }
export const clearIncidents = () => { localStorage.removeItem(KEY) }
