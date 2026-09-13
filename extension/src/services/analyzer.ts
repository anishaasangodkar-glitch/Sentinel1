import type {
  ConsequenceStep,
  PageSnapshot,
  RiskAssessment,
  RiskCategory,
  RiskDNA,
  RiskDNAKey,
  RiskSeverity,
  RiskSignal
} from "../types/risk";

const signalLabels: Record<RiskDNAKey, string> = {
  urgency: "Urgency",
  financialPressure: "Financial pressure",
  manipulation: "Manipulation",
  targeting: "Targeting",
  secrecy: "Secrecy",
  privacyExposure: "Privacy exposure",
  abuse: "Abuse or harm"
};

const patterns: Array<{
  key: RiskDNAKey;
  score: number;
  expressions: RegExp[];
  evidence: string;
}> = [
  {
    key: "urgency",
    score: 24,
    expressions: [/act now/i, /urgent/i, /immediately/i, /limited time/i, /last chance/i, /verify now/i],
    evidence: "Language pressures the user to act quickly."
  },
  {
    key: "financialPressure",
    score: 30,
    expressions: [/pay/i, /payment/i, /card/i, /upi/i, /bank/i, /transfer/i, /claim your prize/i, /refund/i],
    evidence: "The content asks for money, payment details, or financial action."
  },
  {
    key: "manipulation",
    score: 22,
    expressions: [/winner/i, /prize/i, /guaranteed/i, /trust me/i, /do not miss/i, /free gift/i],
    evidence: "The message uses reward framing or persuasion pressure."
  },
  {
    key: "targeting",
    score: 18,
    expressions: [/you have been selected/i, /your account/i, /dear customer/i, /exclusive/i, /only for you/i],
    evidence: "The content appears tailored to push a specific action."
  },
  {
    key: "secrecy",
    score: 38,
    expressions: [/do not tell/i, /don't tell/i, /keep this secret/i, /private chat/i, /between us/i, /don't tell your parents/i],
    evidence: "The message asks the user to hide the interaction from trusted people."
  },
  {
    key: "privacyExposure",
    score: 34,
    expressions: [/phone number/i, /otp/i, /password/i, /address/i, /photo/i, /personal details/i, /login/i],
    evidence: "The content requests personal information or account access."
  },
  {
    key: "abuse",
    score: 72,
    expressions: [
      /\bi hate you\b/i,
      /\bdie\b/i,
      /\bkill yourself\b/i,
      /\bkys\b/i,
      /\bworthless\b/i,
      /\bgo die\b/i,
      /\bi will hurt you\b/i,
      /\bi'll hurt you\b/i,
      /\bi will kill you\b/i,
      /\bi'll kill you\b/i,
      /\bshoot you\b/i,
      /\bstab you\b/i,
      /\bcome after you\b/i
    ],
    evidence: "The text contains abusive or self-harm-directed language."
  }
];

export function analyzeSnapshot(snapshot: PageSnapshot): RiskAssessment {
  const text = [snapshot.url, snapshot.title, snapshot.selectedText, snapshot.pageText].filter(Boolean).join("\n");
  const dna = createEmptyDNA();
  const signals: RiskSignal[] = [];

  for (const pattern of patterns) {
    if (pattern.expressions.some((expression) => expression.test(text))) {
      dna[pattern.key] = Math.min(100, dna[pattern.key] + pattern.score);
      signals.push({
        key: pattern.key,
        label: signalLabels[pattern.key],
        evidence: pattern.evidence,
        score: pattern.score
      });
    }
  }

  const sextortion = /sextortion|release (your|ur) nudes|(?:send me|send) .*?(?:nude|nudes|pic|photo).*?(?:release|post|share)/i.test(text);
  if (sextortion) {
    dna.abuse = Math.max(dna.abuse, 72);
    dna.manipulation = Math.max(dna.manipulation, 60);
    dna.privacyExposure = Math.max(dna.privacyExposure, 60);
    signals.push({
      key: "abuse",
      label: signalLabels.abuse,
      evidence: "The content uses sexual-image pressure or a threat to release private images.",
      score: 72
    });
  }

  const urgentFinancial =
    /urgent|immediately|act now|verify now|last chance/i.test(text) &&
    /pay|payment|card|bank|transfer|otp|one-time password|one time password/i.test(text);
  if (urgentFinancial) {
    dna.urgency = Math.max(dna.urgency, 60);
    dna.financialPressure = Math.max(dna.financialPressure, 70);
    dna.privacyExposure = Math.max(dna.privacyExposure, 50);
    signals.push({
      key: "financialPressure",
      label: signalLabels.financialPressure,
      evidence: "Urgency is combined with a payment, bank, or OTP request.",
      score: 70
    });
  }

  if (isSuspiciousUrl(snapshot.url)) {
    dna.targeting += 20;
    dna.privacyExposure += 12;
    signals.push({
      key: "targeting",
      label: signalLabels.targeting,
      evidence: "The URL has characteristics commonly seen in suspicious links.",
      score: 20
    });
  }

  if (dna.secrecy > 0 && dna.privacyExposure > 0) {
    dna.manipulation += 24;
    dna.targeting += 18;
    signals.push({
      key: "manipulation",
      label: signalLabels.manipulation,
      evidence: "Secrecy plus personal-information requests can indicate grooming or coercive manipulation.",
      score: 24
    });
  }

  const weightedScore = Math.round(Object.values(dna).reduce((total, value) => total + value, 0) * 0.72);
  // Explicit abuse or self-harm-directed language needs an immediate high-risk
  // assessment, even when it is the only signal on the page.
  const score = clamp(Math.max(weightedScore, dna.abuse >= 50 ? 80 : 0), 0, 100);
  const severity = getSeverity(score);
  const category = getCategory(dna, snapshot.url);

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source: snapshot,
    score,
    severity,
    category,
    headline: getHeadline(severity, category),
    explanation: getExplanation(signals, category),
    dna,
    signals,
    consequences: getConsequences(category),
    actions: getActions(category, severity)
  };
}

function createEmptyDNA(): RiskDNA {
  return {
    urgency: 0,
    financialPressure: 0,
    manipulation: 0,
    targeting: 0,
    secrecy: 0,
    privacyExposure: 0,
    abuse: 0
  };
}

function getSeverity(score: number): RiskSeverity {
  if (score >= 70) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function getCategory(dna: RiskDNA, url: string): RiskCategory {
  if (dna.abuse >= 50) return "grooming_or_manipulation";
  if (dna.secrecy >= 20 || dna.privacyExposure >= 25) return "grooming_or_manipulation";
  if (dna.financialPressure >= 25) return "financial_scam";
  if (/login|verify|account|secure/i.test(url)) return "phishing";
  if (isSuspiciousUrl(url)) return "suspicious_url";
  return "general_risk";
}

function getHeadline(severity: RiskSeverity, category: RiskCategory): string {
  const categoryLabel: Record<RiskCategory, string> = {
    financial_scam: "Potential financial scam",
    phishing: "Potential phishing attempt",
    grooming_or_manipulation: "Potential grooming or manipulation",
    suspicious_url: "Suspicious URL pattern",
    general_risk: "Risk signals detected"
  };

  return `${severity.toUpperCase()} RISK - ${categoryLabel[category]}`;
}

function getExplanation(signals: RiskSignal[], category: RiskCategory): string {
  if (signals.length === 0) {
    return "No strong scam or manipulation signals were found in the provided content.";
  }

  const leadingSignals = signals.slice(0, 3).map((signal) => signal.label.toLowerCase()).join(", ");
  return `Sentinel detected ${leadingSignals}, which can indicate ${category.replaceAll("_", " ")}.`;
}

function getConsequences(category: RiskCategory): ConsequenceStep[] {
  const consequenceMap: Record<RiskCategory, ConsequenceStep[]> = {
    financial_scam: [
      { title: "Suspicious request", detail: "The page may ask for payment to unlock a promised reward." },
      { title: "Payment step", detail: "The user could be moved to a fake or unsafe payment flow." },
      { title: "Potential loss", detail: "Money or payment details may be exposed." }
    ],
    phishing: [
      { title: "Credential prompt", detail: "The page may ask the user to sign in or verify an account." },
      { title: "Information capture", detail: "Login details or OTPs could be collected." },
      { title: "Account exposure", detail: "The account may be accessed by someone else." }
    ],
    grooming_or_manipulation: [
      { title: "Private pressure", detail: "The user may be pushed away from trusted people." },
      { title: "Personal request", detail: "The conversation may ask for contact details, images, or secrets." },
      { title: "Safety risk", detail: "The user could become easier to manipulate or contact privately." }
    ],
    suspicious_url: [
      { title: "Unknown destination", detail: "The link may redirect or imitate a trusted site." },
      { title: "Unsafe interaction", detail: "The user may be asked to enter details or download something." },
      { title: "Exposure", detail: "Personal or device safety may be affected." }
    ],
    general_risk: [
      { title: "Risk signal", detail: "The content includes language Sentinel treats as cautionary." },
      { title: "User action", detail: "The user may be pushed to act before verifying." },
      { title: "Possible harm", detail: "There may be financial, privacy, or safety impact." }
    ]
  };

  return consequenceMap[category];
}

function getActions(category: RiskCategory, severity: RiskSeverity): string[] {
  const shared = ["Pause before acting", "Verify through an official channel", "Ask a trusted person to review it"];

  if (severity === "low") return ["Review carefully", ...shared.slice(1)];
  if (category === "financial_scam") return ["Do not pay or enter card details", ...shared];
  if (category === "grooming_or_manipulation") return ["Do not move to a private chat", "Do not share personal details", ...shared];
  if (category === "phishing") return ["Do not enter passwords or OTPs", ...shared];
  return shared;
}

function isSuspiciousUrl(url: string): boolean {
  return /bit\.ly|tinyurl|claim|prize|free|verify|login|secure|\.xyz|\.top/i.test(url);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
