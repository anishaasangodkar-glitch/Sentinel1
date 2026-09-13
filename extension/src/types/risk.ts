export type RiskSeverity = "low" | "medium" | "high";

export type RiskCategory =
  | "financial_scam"
  | "phishing"
  | "grooming_or_manipulation"
  | "suspicious_url"
  | "general_risk";

export type RiskDNAKey =
  | "urgency"
  | "financialPressure"
  | "manipulation"
  | "targeting"
  | "secrecy"
  | "privacyExposure"
  | "abuse";

export type RiskDNA = Record<RiskDNAKey, number>;

export interface PageSnapshot {
  url: string;
  title: string;
  selectedText?: string;
  pageText?: string;
  links?: string[];
  mode: "page" | "selection" | "url" | "screenshot";
}

export interface RiskSignal {
  key: RiskDNAKey;
  label: string;
  evidence: string;
  score: number;
}

export interface ConsequenceStep {
  title: string;
  detail: string;
}

export interface RiskAssessment {
  id: string;
  createdAt: string;
  source: PageSnapshot;
  score: number;
  severity: RiskSeverity;
  category: RiskCategory;
  headline: string;
  explanation: string;
  dna: RiskDNA;
  signals: RiskSignal[];
  consequences: ConsequenceStep[];
  actions: string[];
  analysisSource?: "model";
}
