import type { ProviderAnalysis } from './gemini.js'

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
export function finalizeRisk(input: ProviderAnalysis, source: string) {
  const dna = Object.fromEntries(Object.entries(input.riskDNA || {}).map(([key, value]) => [key, clamp(value)]))
  const values = Object.values(dna)
  const weighted = values.length ? Math.max(...values) * .62 + values.reduce((a, b) => a + b, 0) / values.length * .38 : 0
  const score = clamp(weighted)
  const severity = score >= 90 ? 'CRITICAL' : score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW'
  return { ...input, riskDNA: dna, riskScore: score, severity, confidence: clamp(input.confidence), sourcePreview: source.slice(0, 160), provider: 'gemini', modelName: process.env.GEMINI_MODEL || 'gemini-3.6-flash', analysisVersion: '1.0' }
}
