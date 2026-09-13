import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AlertTriangle, Archive, ExternalLink, Image, LogIn, Shield, Siren, Upload, X } from "lucide-react";
import type { RiskAssessment, RiskDNAKey } from "../types/risk";
import type { User } from "@supabase/supabase-js";
import { analyzeScreenshot } from "../services/screenshotApi";
import { authConfigured, getCurrentUser, saveAssessmentToAccount, signIn, signUp, watchAuth } from "../services/account";
import "./styles.css";

const dnaOrder: RiskDNAKey[] = [
  "urgency",
  "financialPressure",
  "manipulation",
  "targeting",
  "secrecy",
  "privacyExposure",
  "abuse"
];

const dnaLabels: Record<RiskDNAKey, string> = {
  urgency: "Urgency",
  financialPressure: "Financial pressure",
  manipulation: "Manipulation",
  targeting: "Targeting",
  secrecy: "Secrecy",
  privacyExposure: "Privacy exposure",
  abuse: "Abuse or harm"
};

function App() {
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [pageAccess, setPageAccess] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [screenshotBusy, setScreenshotBusy] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    chrome.storage.local.get("sentinel:latestAssessment").then((result) => {
      setAssessment(result["sentinel:latestAssessment"] ?? null);
    });

    const listener = (message: { type?: string; assessment?: RiskAssessment }) => {
      if (message.type === "SENTINEL_ASSESSMENT_UPDATED" && message.assessment) {
        setAssessment(message.assessment);
        setSaved(false);
        setAnalyzing(false);
      }
      if (message.type === "SENTINEL_PERMISSION_REQUIRED") {
        setPageAccess(false);
        setAnalyzing(false);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    void initializePageAnalysis();
    void getCurrentUser().then(setUser);
    const stopWatchingAuth = watchAuth((session) => setUser(session?.user ?? null));
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      stopWatchingAuth();
    };
  }, []);

  async function initializePageAnalysis() {
    const state = await chrome.runtime.sendMessage({ type: "SENTINEL_GET_PERMISSION_STATE" });
    setPageAccess(Boolean(state?.granted));
    if (state?.granted) {
      setAnalyzing(true);
      await chrome.runtime.sendMessage({ type: "SENTINEL_ANALYZE_CURRENT_TAB" });
    }
  }

  async function requestPageAccess() {
    setPermissionError(false);
    const state = await chrome.runtime.sendMessage({ type: "SENTINEL_REQUEST_PAGE_PERMISSION" });
    if (!state?.granted) {
      setPermissionError(true);
      return;
    }
    setPageAccess(true);
    setAnalyzing(true);
    await chrome.runtime.sendMessage({ type: "SENTINEL_ANALYZE_CURRENT_TAB" });
  }

  async function saveEvidence(authenticatedUser = user) {
    if (!assessment) return;
    setSaveError("");
    if (!authenticatedUser) {
      setLoginOpen(true);
      return;
    }
    setSaveBusy(true);
    try {
      await saveAssessmentToAccount(assessment, screenshot);
      await chrome.runtime.sendMessage({ type: "SENTINEL_SAVE_EVIDENCE", assessment });
      setSaved(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Evidence could not be saved.");
    } finally {
      setSaveBusy(false);
    }
  }

  function selectScreenshot(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
    setSaved(false);
    setSaveError("");
  }

  async function analyzeUploadedScreenshot() {
    if (!screenshot) return;
    setScreenshotBusy(true);
    setSaveError("");
    try {
      const result = await analyzeScreenshot(screenshot);
      setAssessment(result);
      await chrome.storage.local.set({ "sentinel:latestAssessment": result });
    } catch (error) {
      setAssessment(null);
      setSaveError(error instanceof Error ? error.message : "AI screenshot analysis was unavailable. No result was generated.");
    } finally {
      setScreenshotBusy(false);
    }
  }

  async function analyzeUrl(event: React.FormEvent) {
    event.preventDefault();
    if (!url.trim()) return;
    await chrome.runtime.sendMessage({ type: "SENTINEL_ANALYZE_URL", url: url.trim() });
  }

  return (
    <main className="shell">
      <header className="header">
        <div className="brand">
          <span className="brandIcon"><Shield size={18} /></span>
          <span>Sentinel</span>
        </div>
        <span className="mode">MV3 MVP</span>
      </header>

      <ScreenshotTools
        file={screenshot}
        preview={screenshotPreview}
        busy={screenshotBusy}
        onSelect={selectScreenshot}
        onAnalyze={() => void analyzeUploadedScreenshot()}
      />

      {pageAccess === false ? (
        <PermissionState onRequest={requestPageAccess} error={permissionError} />
      ) : assessment ? (
        <AssessmentView assessment={assessment} onSave={saveEvidence} saved={saved} saving={saveBusy} />
      ) : (
        <EmptyState analyzing={analyzing} />
      )}

      {saveError && <p className="errorNotice">{saveError}</p>}

      <form className="urlForm" onSubmit={analyzeUrl}>
        <label htmlFor="url">Analyze URL</label>
        <div className="urlRow">
          <input
            id="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/claim"
          />
          <button type="submit" aria-label="Analyze URL">
            <ExternalLink size={16} />
          </button>
        </div>
      </form>
      {loginOpen && (
        <LoginDialog
          configured={authConfigured}
          onClose={() => setLoginOpen(false)}
          onAuthenticated={(nextUser) => {
            setUser(nextUser);
            setLoginOpen(false);
            void saveEvidence(nextUser);
          }}
        />
      )}
    </main>
  );
}

function ScreenshotTools({
  file,
  preview,
  busy,
  onSelect,
  onAnalyze
}: {
  file: File | null;
  preview: string;
  busy: boolean;
  onSelect: (file: File | undefined) => void;
  onAnalyze: () => void;
}) {
  return (
    <section className="screenshotTools">
      <div className="screenshotHeading"><span><Image size={17} /> Analyze a screenshot</span><small>Login is only needed when you save it.</small></div>
      <label className="screenshotPicker">
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => onSelect(event.target.files?.[0])} />
        {preview ? <img src={preview} alt="Selected screenshot preview" /> : <><Upload size={18} /><span>{file ? file.name : "Choose PNG, JPG, or WebP"}</span></>}
      </label>
      {file && <div className="screenshotActions"><span>{file.name}</span><button type="button" onClick={onAnalyze} disabled={busy}>{busy ? "Analyzing…" : "Analyze screenshot"}</button></div>}
    </section>
  );
}

function LoginDialog({ configured, onClose, onAuthenticated }: { configured: boolean; onClose: () => void; onAuthenticated: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (register) {
        const result = await signUp(email, password);
        if (result.user) onAuthenticated(result.user);
        else setMessage("Check your email to confirm the account, then sign in here.");
      } else {
        onAuthenticated(await signIn(email, password));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="loginOverlay" role="dialog" aria-modal="true">
      <div className="loginCard">
        <button className="closeButton" type="button" onClick={onClose} aria-label="Close login"><X size={16} /></button>
        <LogIn size={22} />
        <h2>{register ? "Create a Sentinel account" : "Sign in to save evidence"}</h2>
        <p>Your screenshot is analyzed first. Login is required only to preserve it in your private Sentinel account.</p>
        {!configured ? <p className="errorNotice">This extension build is missing the public Supabase configuration. Add the values from extension/.env.example and rebuild.</p> : <form onSubmit={submit}>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" required />
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" minLength={8} required />
          {message && <p className="errorNotice">{message}</p>}
          <button type="submit" disabled={busy}>{busy ? "Working…" : register ? "Create account" : "Sign in"}</button>
        </form>}
        {configured && <button className="textButton" type="button" onClick={() => setRegister((value) => !value)}>{register ? "Already have an account? Sign in" : "New to Sentinel? Create an account"}</button>}
      </div>
    </div>
  );
}

function EmptyState({ analyzing }: { analyzing: boolean }) {
  return (
    <section className="empty">
      <Shield size={34} />
      <h1>{analyzing ? "Analyzing this page…" : "Ready to analyze"}</h1>
      <p>{analyzing ? "Sentinel is collecting the page and checking it with the safety model." : "Open Sentinel on a webpage to analyze it automatically."}</p>
    </section>
  );
}

function PermissionState({ onRequest, error }: { onRequest: () => void; error: boolean }) {
  return (
    <section className="empty permissionState">
      <Shield size={34} />
      <h1>Allow page analysis</h1>
      <p>Sentinel needs permission to read the current page and analyze it automatically. Page content is only sent when you open Sentinel.</p>
      <button className="saveButton" type="button" onClick={onRequest}>Allow page access</button>
      {error && <p className="permissionError">Permission was not granted. Use the button above to try again.</p>}
    </section>
  );
}

function AssessmentView({
  assessment,
  onSave,
  saved,
  saving
}: {
  assessment: RiskAssessment;
  onSave: () => void;
  saved: boolean;
  saving: boolean;
}) {
  return (
    <section className={`assessment ${assessment.severity}`}>
      <div className="scoreBand">
        <div>
          <p className="severity">{assessment.severity.toUpperCase()} RISK</p>
          <h1>{assessment.score} / 100</h1>
        </div>
        <Siren size={28} />
      </div>

      <h2>{assessment.headline}</h2>
      <p className="explanation">{assessment.explanation}</p>

      <section className="panel">
        <h3>Risk DNA</h3>
        <div className="dnaList">
          {dnaOrder.map((key) => (
            <div className="dnaItem" key={key}>
              <span>{dnaLabels[key]}</span>
              <meter min={0} max={100} value={assessment.dna[key]} />
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>Why Sentinel is concerned</h3>
        {assessment.signals.length > 0 ? (
          <div className="signals">
            {assessment.signals.map((signal, index) => (
              <article className="signal" key={`${signal.key}-${index}`}>
                <strong>{signal.label}</strong>
                <p>{signal.evidence}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No strong warning signals found.</p>
        )}
      </section>

      <section className="panel">
        <h3>What could happen?</h3>
        <ol className="chain">
          {assessment.consequences.map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              <span>{step.detail}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel">
        <h3>Recommended actions</h3>
        <ul className="actions">
          {assessment.actions.map((action) => (
            <li key={action}>
              <AlertTriangle size={14} />
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </section>

      <button className="saveButton" type="button" onClick={onSave}>
        <Archive size={16} />
        {saving ? "Saving…" : saved ? "Evidence saved" : "Save evidence (login required)"}
      </button>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
