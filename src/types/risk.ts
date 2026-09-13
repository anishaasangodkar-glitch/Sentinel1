export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type InputType = 'message' | 'screenshot' | 'website'

export type RiskDNA = {
  urgency: number; secrecy: number; manipulation: number; threat: number
  privacy: number; financialPressure: number; isolation: number; targeting: number
}

export type Analysis = {
  id: string; riskScore: number; severity: Severity; category: string; summary: string
  riskDNA: RiskDNA; detectedSignals: string[]; explanation: string
  consequences: string[]; recommendedActions: string[]; confidence?: number
  inputType: InputType; content: string; createdAt: string; evidenceSaved?: boolean
  provider?: string; modelName?: string; analysisVersion?: string; mode?: 'live'
}

export type Incident = Analysis & { status: 'Saved' | 'Reported' | 'Resolved' }
