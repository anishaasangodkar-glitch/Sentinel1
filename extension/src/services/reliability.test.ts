import { afterEach, describe, expect, it, vi } from 'vitest'
import { analyzeSnapshot } from './analyzer'
import { analyzeWithMl } from './analysisPipeline'
import { applyCyberbullyingPrediction } from './cyberbullyingApi'

const snapshot = (text: string) => ({ mode: 'selection' as const, url: '', title: '', selectedText: text })
afterEach(() => vi.restoreAllMocks())

describe('Sentinel extension reliability', () => {
  it('treats sentiment: [] as safe', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ confidence: { Threat: 0.99 }, sentiment: [] }) }))
    const result = await analyzeWithMl(snapshot('A calm message.'))
    expect(result.severity).toBe('low')
    expect(result.score).toBe(0)
  })

  it('understands the deployed Sentinel API response shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        category: 'Cyberbullying / Harassment',
        severity: 'MEDIUM',
        riskScore: 66,
        confidence: 1,
        summary: 'The message contains explicit abusive language.'
      })
    }))
    const result = await analyzeWithMl(snapshot('I hate you, kill yourself'))
    expect(result.analysisSource).toBe('model')
    expect(result.severity).toBe('high')
    expect(result.score).toBeGreaterThanOrEqual(80)
  })

  it('uses the highest matching harmful label confidence', () => {
    const baseline = analyzeSnapshot(snapshot('ordinary text'))
    const result = applyCyberbullyingPrediction(baseline, { label: 'Insult, Threat', confidence: 0.93, harmful: true })
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.severity).toBe('high')
  })

  it('scores explicit abusive phrases at least 80 locally', () => {
    expect(analyzeSnapshot(snapshot('I hate you')).score).toBeGreaterThanOrEqual(80)
    expect(analyzeSnapshot(snapshot('kill yourself')).score).toBeGreaterThanOrEqual(80)
  })

  it('scores sextortion coercion at least 80 locally', () => {
    const result = analyzeSnapshot(snapshot('you are looking very sexy today,send me ur pic or ill release your nudes'))
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.severity).toBe('high')
  })

  it('scores direct physical threats at least 80 locally', () => {
    const result = analyzeSnapshot(snapshot('I will hurt you if you come here again'))
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.severity).toBe('high')
  })

  it('scores urgent payment or OTP fraud at least 80 locally', () => {
    const result = analyzeSnapshot(snapshot('Urgent: verify now or your account closes. Send the OTP and payment immediately.'))
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.severity).toBe('high')
  })

  it('does not fabricate a result when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await expect(analyzeWithMl(snapshot('kill yourself'))).rejects.toThrow('offline')
  })

  it('does not fabricate a result for invalid API responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error('invalid json') } }))
    await expect(analyzeWithMl(snapshot('I hate you'))).rejects.toThrow('invalid json')
  })
})
