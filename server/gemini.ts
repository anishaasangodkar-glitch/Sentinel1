import { config, hasGemini } from './config.js'
import type { InputType } from '../src/types/risk.js'
import { inspectUrl } from './urlIntelligence.js'

export type ProviderAnalysis = {
  category: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; summary: string; riskDNA: Record<string, number>
  detectedSignals: string[]; explanation: string; possibleConsequences: string[]; recommendedActions: string[]; confidence: number
}

const schema = { type: 'OBJECT', properties: {
  category: { type: 'STRING' }, severity: { type: 'STRING', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }, summary: { type: 'STRING' },
  riskDNA: { type: 'OBJECT', properties: { urgency: { type: 'INTEGER' }, secrecy: { type: 'INTEGER' }, manipulation: { type: 'INTEGER' }, threat: { type: 'INTEGER' }, privacy: { type: 'INTEGER' }, financialPressure: { type: 'INTEGER' }, isolation: { type: 'INTEGER' }, targeting: { type: 'INTEGER' } }, required: ['urgency','secrecy','manipulation','threat','privacy','financialPressure','isolation','targeting'] },
  detectedSignals: { type: 'ARRAY', items: { type: 'STRING' } }, explanation: { type: 'STRING' }, possibleConsequences: { type: 'ARRAY', items: { type: 'STRING' } }, recommendedActions: { type: 'ARRAY', items: { type: 'STRING' } }, confidence: { type: 'NUMBER' },
}, required: ['category','severity','summary','riskDNA','detectedSignals','explanation','possibleConsequences','recommendedActions','confidence'] }

function promptFor(content: string, inputType: InputType) {
  const urlContext = inputType === 'website' ? `\nURL intelligence (descriptive only; do not claim reputation): ${JSON.stringify(inspectUrl(content))}` : ''
  return `You are Sentinel, a digital safety analysis service. Analyze the submitted ${inputType} below. Return only the requested JSON object. Use the actual content as evidence: do not mention signals that are not present, do not make claims about a person's identity or intent, and use uncertainty when context is insufficient. Risk DNA values are 0-100 and should reflect only relevant factors. Possible consequences must be framed as possibilities. Recommended actions must be practical and safety-first. A normal conversation should remain LOW risk even if it contains words like urgent, money, private, or location when the context is ordinary.

Use distinct categories when supported: platform-switch manipulation; sextortion/image-based threat (support-first); doxxing/personal information exposure; self-harm or suicide concern (support-first, never a danger score); dangerous challenge/peer pressure; gaming marketplace scam; game cheat/mod malware link; and digital wellbeing/manipulative design (informational, not an emergency). For weak or conflicting evidence, use category "Insufficient context" and explain what additional context would help rather than forcing safe or dangerous. For self-harm and sextortion, use a calm support-first explanation and reassure the person that asking for help or saving evidence does not automatically remove device or internet access. Detect the input language and respond in that same language unless the user clearly asks for another language. Include the exact words or short phrases that support each detected signal in detectedSignals where possible.

SUBMITTED CONTENT:
${content}${urlContext}`
}

const asText = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const asStringArray = (value: unknown) => Array.isArray(value) && value.every(item => typeof item === 'string') ? value.map(item => item.trim()).filter(Boolean) : null
const dnaKeys = ['urgency', 'secrecy', 'manipulation', 'threat', 'privacy', 'financialPressure', 'isolation', 'targeting'] as const

function validateProviderAnalysis(value: unknown): ProviderAnalysis {
  if (!value || typeof value !== 'object') throw new Error('Gemini returned a malformed structured result.')
  const candidate = value as Record<string, unknown>
  const category = asText(candidate.category)
  const severity = asText(candidate.severity).toUpperCase()
  const summary = asText(candidate.summary)
  const explanation = asText(candidate.explanation)
  const detectedSignals = asStringArray(candidate.detectedSignals)
  const possibleConsequences = asStringArray(candidate.possibleConsequences)
  const recommendedActions = asStringArray(candidate.recommendedActions)
  const confidence = Number(candidate.confidence)
  const rawDna = candidate.riskDNA
  if (!category || !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity) || !summary || !explanation || !detectedSignals || !possibleConsequences || !recommendedActions || !Number.isFinite(confidence) || !rawDna || typeof rawDna !== 'object') throw new Error('Gemini returned an incomplete structured result.')
  const dna = rawDna as Record<string, unknown>
  const riskDNA = Object.fromEntries(dnaKeys.map(key => {
    const number = Number(dna[key])
    if (!Number.isFinite(number)) throw new Error('Gemini returned an invalid Risk DNA value.')
    return [key, Math.max(0, Math.min(100, Math.round(number)))]
  }))
  return { category, severity: severity as ProviderAnalysis['severity'], summary, riskDNA, detectedSignals, explanation, possibleConsequences, recommendedActions, confidence: Math.max(0, Math.min(100, confidence)) }
}

async function requestGemini(contents: Array<Record<string, unknown>>) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}:generateContent?key=${encodeURIComponent(config.geminiKey)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: contents }], generationConfig: { temperature: 0.15, responseMimeType: 'application/json', responseSchema: schema } }) })
  if (!response.ok) {
    const providerError = new Error(`Gemini request failed with status ${response.status}.`) as Error & { status?: number }
    providerError.status = response.status === 429 ? 429 : 502
    throw providerError
  }
  const json = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned an empty analysis.')
  return JSON.parse(text) as unknown
}

export async function checkGeminiConnectivity() {
  if (!hasGemini) return false
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}?key=${encodeURIComponent(config.geminiKey)}`, { signal: controller.signal })
    return response.ok
  } catch { return false } finally { clearTimeout(timeout) }
}

export async function analyzeWithGemini(content: string, inputType: InputType, image?: { mimeType: string; data: string }): Promise<ProviderAnalysis> {
  if (!hasGemini) throw new Error('Gemini is not configured.')
  const parts: Array<Record<string, unknown>> = [{ text: promptFor(content, inputType) }]
  if (image) parts.push({ inline_data: { mime_type: image.mimeType, data: image.data } })
  try { return validateProviderAnalysis(await requestGemini(parts)) } catch (firstError) {
    if (firstError instanceof Error && /malformed|incomplete|invalid Risk DNA|Unexpected token/i.test(firstError.message)) {
      const retryParts = [...parts, { text: 'Return the same assessment again as valid JSON matching the required schema exactly. Do not include markdown.' }]
      return validateProviderAnalysis(await requestGemini(retryParts))
    }
    throw firstError
  }
}
