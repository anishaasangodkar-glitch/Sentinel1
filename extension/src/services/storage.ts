import type { RiskAssessment } from "../types/risk";

const evidenceKey = "sentinel:evidence";
const latestAssessmentKey = "sentinel:latestAssessment";

export async function saveLatestAssessment(assessment: RiskAssessment): Promise<void> {
  await chrome.storage.local.set({ [latestAssessmentKey]: assessment });
}

export async function getLatestAssessment(): Promise<RiskAssessment | null> {
  const result = await chrome.storage.local.get(latestAssessmentKey);
  return (result[latestAssessmentKey] as RiskAssessment | undefined) ?? null;
}

export async function saveEvidence(assessment: RiskAssessment): Promise<void> {
  const result = await chrome.storage.local.get(evidenceKey);
  const existing = (result[evidenceKey] as RiskAssessment[] | undefined) ?? [];
  await chrome.storage.local.set({ [evidenceKey]: [assessment, ...existing].slice(0, 25) });
}
