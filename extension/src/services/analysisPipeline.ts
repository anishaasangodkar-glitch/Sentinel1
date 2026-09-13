import { analyzeSnapshot } from './analyzer'
import { applyCyberbullyingPrediction, classifyCyberbullying } from './cyberbullyingApi'
import type { PageSnapshot, RiskAssessment } from '../types/risk'

export async function analyzeWithMl(snapshot: PageSnapshot): Promise<RiskAssessment> {
  const ruleAssessment = analyzeSnapshot(snapshot)
  const text = [snapshot.selectedText, snapshot.pageText, snapshot.title, snapshot.url].filter(Boolean).join('\n')
  const prediction = await classifyCyberbullying(text)
  return { ...applyCyberbullyingPrediction(ruleAssessment, prediction), analysisSource: 'model' }
}
