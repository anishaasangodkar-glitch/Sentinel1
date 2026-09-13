import type { PageSnapshot, RiskAssessment, RiskDNA } from "../types/risk";

const apiBaseUrl = (import.meta.env.VITE_SENTINEL_WEB_API_BASE_URL as string | undefined)?.replace(/\/$/, "");

export async function analyzeScreenshot(file: File): Promise<RiskAssessment> {
  if (!apiBaseUrl) throw new Error("Screenshot analysis is not configured for this extension build.");
  const form = new FormData();
  form.append("image", file, file.name || "sentinel-screenshot.png");
  const response = await fetch(`${apiBaseUrl}/api/analyze/image`, { method: "POST", body: form });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(payload.error ?? "Screenshot analysis failed."));
  return normalizeScreenshotResult(payload, file);
}

function normalizeScreenshotResult(payload: unknown, file: File): RiskAssessment {
  const result = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const dna = (result.riskDNA && typeof result.riskDNA === "object" ? result.riskDNA : {}) as Record<string, unknown>;
  const source: PageSnapshot = { mode: "screenshot", url: "screenshot://uploaded", title: file.name };
  const score = numberValue(result.riskScore);
  const severityValue = String(result.severity ?? "LOW").toLowerCase();
  const severity = severityValue === "critical" || severityValue === "high" ? "high" : severityValue === "medium" ? "medium" : "low";
  const signalLabels = Array.isArray(result.detectedSignals) ? result.detectedSignals.filter((item): item is string => typeof item === "string") : [];
  const consequences = Array.isArray(result.consequences) ? result.consequences.filter((item): item is string => typeof item === "string") : [];
  const actions = Array.isArray(result.recommendedActions) ? result.recommendedActions.filter((item): item is string => typeof item === "string") : [];
  const normalizedDna: RiskDNA = {
    urgency: numberValue(dna.urgency),
    financialPressure: numberValue(dna.financialPressure),
    manipulation: numberValue(dna.manipulation),
    targeting: numberValue(dna.targeting),
    secrecy: numberValue(dna.secrecy),
    privacyExposure: numberValue(dna.privacy ?? dna.privacyExposure),
    abuse: numberValue(dna.threat ?? dna.abuse)
  };

  return {
    id: String(result.id ?? crypto.randomUUID()),
    createdAt: String(result.createdAt ?? new Date().toISOString()),
    source,
    score,
    severity,
    category: String(result.category ?? "general_risk") as RiskAssessment["category"],
    headline: `${severity.toUpperCase()} RISK - ${String(result.summary ?? "Screenshot safety assessment")}`,
    explanation: String(result.explanation ?? result.summary ?? "Sentinel completed a screenshot safety review."),
    dna: normalizedDna,
    signals: signalLabels.map((label) => ({ key: "manipulation", label, evidence: label, score: score })),
    consequences: consequences.map((detail) => ({ title: "Possible consequence", detail })),
    actions,
    analysisSource: "model"
  };
}

function numberValue(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100, numeric)) : 0;
}
