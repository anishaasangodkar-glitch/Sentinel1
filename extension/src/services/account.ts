import { createClient, type Session, type User } from "@supabase/supabase-js";
import type { RiskAssessment } from "../types/risk";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const apiBaseUrl = (import.meta.env.VITE_SENTINEL_WEB_API_BASE_URL as string | undefined)?.replace(/\/$/, "");

export const authConfigured = Boolean(supabaseUrl && supabaseAnonKey && apiBaseUrl);
export const extensionSupabase = authConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    })
  : null;

export function watchAuth(callback: (session: Session | null) => void): () => void {
  if (!extensionSupabase) return () => undefined;
  const { data } = extensionSupabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function getCurrentUser(): Promise<User | null> {
  if (!extensionSupabase) return null;
  const { data } = await extensionSupabase.auth.getUser();
  return data.user;
}

export async function signIn(email: string, password: string): Promise<User> {
  if (!extensionSupabase) throw new Error("Login is not configured for this extension build.");
  const { data, error } = await extensionSupabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw error ?? new Error("Login failed.");
  return data.user;
}

export async function signUp(email: string, password: string): Promise<{ user: User | null; needsConfirmation: boolean }> {
  if (!extensionSupabase) throw new Error("Login is not configured for this extension build.");
  const { data, error } = await extensionSupabase.auth.signUp({ email, password });
  if (error) throw error;
  return { user: data.user, needsConfirmation: !data.session };
}

export async function saveAssessmentToAccount(assessment: RiskAssessment, screenshot: File | null): Promise<string> {
  if (!extensionSupabase || !apiBaseUrl) throw new Error("Login is not configured for this extension build.");
  const { data: sessionData } = await extensionSupabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Please sign in before saving evidence.");

  const analysis = toApiAnalysis(assessment);
  const incidentResponse = await fetch(`${apiBaseUrl}/api/incidents`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ analysis })
  });
  const incidentBody = await incidentResponse.json().catch(() => ({}));
  if (!incidentResponse.ok || typeof incidentBody.incidentId !== "string") {
    throw new Error(String(incidentBody.error ?? "The incident could not be saved."));
  }

  if (screenshot) {
    const form = new FormData();
    form.append("evidence", screenshot, screenshot.name || "sentinel-screenshot.png");
    const evidenceResponse = await fetch(`${apiBaseUrl}/api/incidents/${incidentBody.incidentId}/evidence`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form
    });
    const evidenceBody = await evidenceResponse.json().catch(() => ({}));
    if (!evidenceResponse.ok) throw new Error(String(evidenceBody.error ?? "The screenshot could not be uploaded."));
  }

  return incidentBody.incidentId;
}

function toApiAnalysis(assessment: RiskAssessment) {
  const severity = assessment.severity === "high" ? "HIGH" : assessment.severity === "medium" ? "MEDIUM" : "LOW";
  return {
    id: assessment.id,
    riskScore: assessment.score,
    severity,
    category: assessment.category,
    summary: assessment.headline,
    riskDNA: {
      urgency: assessment.dna.urgency,
      secrecy: assessment.dna.secrecy,
      manipulation: assessment.dna.manipulation,
      threat: assessment.dna.abuse,
      privacy: assessment.dna.privacyExposure,
      financialPressure: assessment.dna.financialPressure,
      isolation: assessment.dna.targeting,
      targeting: assessment.dna.targeting
    },
    detectedSignals: assessment.signals.map((signal) => signal.label),
    explanation: assessment.explanation,
    consequences: assessment.consequences.map((step) => `${step.title}: ${step.detail}`),
    recommendedActions: assessment.actions,
    confidence: assessment.signals.length ? Math.max(...assessment.signals.map((signal) => signal.score)) : 0,
    inputType: assessment.source.mode === "screenshot" ? "screenshot" : assessment.source.mode === "url" ? "website" : "message",
    content: assessment.source.pageText || assessment.source.selectedText || assessment.source.url,
    provider: "sentinel-model",
    modelName: "Sentinel shared safety model",
    analysisVersion: "1.0",
    mode: "live"
  };
}
