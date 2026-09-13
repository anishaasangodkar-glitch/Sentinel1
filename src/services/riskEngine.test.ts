// @ts-nocheck
import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeContent } from './riskEngine.js'

test('analyze flow identifies a payment phishing pattern', () => {
  const result = analyzeContent('Your account is suspended. Verify at https://example.com and enter your password now.', 'message')
  assert.equal(result.category, 'Phishing / Credential Theft')
  assert.ok(result.detectedSignals.length > 0)
  assert.ok(result.consequences.length > 0)
})

test('support-first categories do not collapse into generic scam labels', () => {
  const result = analyzeContent('Do not tell anyone. Send this or I will share the intimate photo.', 'message')
  assert.equal(result.category, 'Sextortion / Image-based threat')
  assert.match(result.explanation, /not at fault/i)
})

test('screenshot submissions are accepted by the local engine', () => {
  const result = analyzeContent('Uploaded screenshot for review', 'screenshot')
  assert.equal(result.inputType, 'screenshot')
  assert.equal(result.category, 'Screenshot review')
})

test('short ambiguous samples use the insufficient-context state', () => {
  const result = analyzeContent('hi', 'message')
  assert.equal(result.category, 'Insufficient context')
  assert.ok(result.confidence < 50)
  assert.match(result.explanation, /not enough context/i)
})
