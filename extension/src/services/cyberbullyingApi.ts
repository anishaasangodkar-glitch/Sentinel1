import type { RiskAssessment, RiskDNAKey } from "../types/risk";

const localEndpoint = "http://127.0.0.1:8000/predict";
const defaultEndpoint = import.meta.env.VITE_SENTINEL_API_URL || localEndpoint;

export interface CyberbullyingPrediction {
  label: string;
  confidence: number;
  harmful: boolean;
}

export async function classifyCyberbullying(text: string): Promise<CyberbullyingPrediction | null> {
  if (!text.trim()) return null;

  const usesSentinelApi = /\/api\/analyze\/text(?:$|\?)/.test(defaultEndpoint);
  const response = await fetch(defaultEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(
      usesSentinelApi
        ? { content: text.slice(0, 12000) }
        : { request_id: crypto.randomUUID(), text: text.slice(0, 4000) }
    )
  });

  if (!response.ok) {
    throw new Error(`Cyberbullying API returned ${response.status}`);
  }

  return normalizePrediction(await response.json());
}

export function applyCyberbullyingPrediction(
  assessment: RiskAssessment,
  prediction: CyberbullyingPrediction | null
): RiskAssessment {
  if (!prediction || !prediction.harmful) return assessment;

  const confidenceScore = Math.round(prediction.confidence * 100);
  const boostedScore = Math.max(assessment.score, 80, Math.min(100, 72 + Math.round(prediction.confidence * 24)));
  const dnaBoosts: Partial<Record<RiskDNAKey, number>> = {
    manipulation: 36,
    targeting: 24,
    privacyExposure: 18
  };

  return {
    ...assessment,
    score: boostedScore,
    severity: boostedScore >= 70 ? "high" : assessment.severity,
    category: "grooming_or_manipulation",
    headline: `HIGH RISK - Potential harmful online interaction`,
    explanation: `A cyberbullying model flagged this text as ${prediction.label} with ${confidenceScore}% confidence. Sentinel also checks for grooming, secrecy, privacy, and pressure signals.`,
    dna: {
      ...assessment.dna,
      manipulation: Math.min(100, assessment.dna.manipulation + (dnaBoosts.manipulation ?? 0)),
      targeting: Math.min(100, assessment.dna.targeting + (dnaBoosts.targeting ?? 0)),
      privacyExposure: Math.min(100, assessment.dna.privacyExposure + (dnaBoosts.privacyExposure ?? 0))
    },
    signals: [
      {
        key: "manipulation",
        label: "ML harmful-text classifier",
        evidence: `Cyberbullying detector returned ${prediction.label} at ${confidenceScore}% confidence.`,
        score: Math.round(prediction.confidence * 40)
      },
      ...assessment.signals
    ]
  };
}

function normalizePrediction(payload: unknown): CyberbullyingPrediction | null {
  const candidate = Array.isArray(payload) ? payload[0] : payload;
  if (!candidate || typeof candidate !== "object") return null;

  const record = candidate as Record<string, unknown>;
  if ("riskScore" in record || "riskDNA" in record) {
    const category = String(record.category ?? "Safety risk");
    const summary = String(record.summary ?? record.explanation ?? "");
    const severity = String(record.severity ?? "").toUpperCase();
    const riskScore = toConfidence(record.riskScore);
    const harmful =
      /critical|high/.test(severity) ||
      riskScore >= 0.7 ||
      /cyberbullying|harassment|threat|abuse|grooming|self-harm|suicide/i.test(
        `${category} ${summary}`
      );

    return {
      label: category,
      confidence: Math.max(toConfidence(record.confidence), riskScore),
      harmful
    };
  }

  const sentiments = readLabels(record.sentiment);

  // The bundled FastAPI model returns `sentiment` as an array. An empty array
  // explicitly means that it found no harmful categories, so do not let it
  // fall through to the generic response handling below.
  if (Array.isArray(record.sentiment)) {
    return {
      label: sentiments.length > 0 ? sentiments.join(", ") : "No harmful content",
      confidence: getSentimentConfidence(record.confidence, sentiments),
      harmful: sentiments.length > 0
    };
  }

  const label = String(
    record.label ??
      record.prediction ??
      record.class ??
      record.category ??
      record.result ??
      "unknown"
  );
  const confidence = toConfidence(record.confidence ?? record.score ?? record.probability ?? record.confidence_level);
  const harmful = isHarmfulLabel(label) || confidence >= 0.75;

  return {
    label,
    confidence,
    harmful
  };
}

function readLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSentimentConfidence(value: unknown, labels: string[]): number {
  const confidenceByLabel = new Map<string, number>();

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!Array.isArray(entry) || typeof entry[0] !== "string") continue;
      confidenceByLabel.set(entry[0], toConfidence(entry[1]));
    }
  } else if (value && typeof value === "object") {
    for (const [label, score] of Object.entries(value as Record<string, unknown>)) {
      confidenceByLabel.set(label, toConfidence(score));
    }
  }

  const predictedScores = labels
    .map((label) => confidenceByLabel.get(label))
    .filter((score): score is number => score !== undefined);

  return predictedScores.length > 0 ? Math.max(...predictedScores) : 0;
}

function toConfidence(value: unknown): number {
  if (typeof value === "number") return value > 1 ? value / 100 : value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace("%", ""));
    if (Number.isFinite(parsed)) return parsed > 1 ? parsed / 100 : parsed;
  }

  return 0;
}

function isHarmfulLabel(label: string): boolean {
  return !/not|none|safe|normal|neutral|non[-_\s]?cyber/i.test(label);
}
