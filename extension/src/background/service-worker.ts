import { analyzeWithMl } from "../services/analysisPipeline";
import { saveEvidence, saveLatestAssessment } from "../services/storage";
import type { PageSnapshot, RiskAssessment } from "../types/risk";

const pageOrigins = ["<all_urls>"];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sentinel-analyze-selection",
    title: "Analyze with Sentinel",
    contexts: ["selection"]
  });

  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  // Start both browser operations directly from the toolbar gesture so the
  // permissions prompt is allowed by Chrome.
  const panelPromise = chrome.sidePanel.open({ tabId: tab.id });
  const permissionPromise = requestPageAccess();
  const [_, granted] = await Promise.all([panelPromise, permissionPromise]);
  if (granted) {
    await analyzeCurrentTab(tab.id, "page", tab);
  } else {
    publishStatus("SENTINEL_PERMISSION_REQUIRED");
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "sentinel-analyze-selection" || !tab?.id) return;
  await chrome.sidePanel.open({ tabId: tab.id });

  const snapshot: PageSnapshot = {
    mode: "selection",
    url: info.pageUrl ?? tab.url ?? "",
    title: tab.title ?? "",
    selectedText: info.selectionText ?? ""
  };

  await publishAssessment(await analyzeWithMl(snapshot));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SENTINEL_GET_PERMISSION_STATE") {
    chrome.permissions.contains({ origins: pageOrigins }).then((granted) => sendResponse({ granted }));
    return true;
  }

  if (message?.type === "SENTINEL_REQUEST_PAGE_PERMISSION") {
    requestPageAccess().then((granted) => sendResponse({ granted }));
    return true;
  }

  if (message?.type === "SENTINEL_ANALYZE_CURRENT_TAB") {
    analyzeActiveTab().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message?.type === "SENTINEL_SAVE_EVIDENCE") {
    saveEvidence(message.assessment).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === "SENTINEL_ANALYZE_URL") {
    const snapshot: PageSnapshot = {
      mode: "url",
      url: message.url,
      title: message.url
    };
    analyzeWithMl(snapshot).then(publishAssessment).then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});

async function analyzeCurrentTab(tabId: number, mode: PageSnapshot["mode"], tab: chrome.tabs.Tab): Promise<void> {
  let snapshot: PageSnapshot;

  try {
    snapshot = (await chrome.tabs.sendMessage(tabId, {
      type: "SENTINEL_COLLECT_PAGE",
      mode
    })) as PageSnapshot;
  } catch {
    snapshot = await collectPageWithScripting(tabId, mode, tab);
  }

  await publishAssessment(await analyzeWithMl(snapshot));
}

async function analyzeActiveTab(): Promise<void> {
  const granted = await ensurePageAccess();
  if (!granted) {
    publishStatus("SENTINEL_PERMISSION_REQUIRED");
    return;
  }

  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const tab = tabs[0];
  if (tab?.id) await analyzeCurrentTab(tab.id, "page", tab);
}

async function ensurePageAccess(): Promise<boolean> {
  if (await chrome.permissions.contains({ origins: pageOrigins })) return true;
  return requestPageAccess();
}

async function requestPageAccess(): Promise<boolean> {
  return chrome.permissions.request({ origins: pageOrigins });
}

async function collectPageWithScripting(
  tabId: number,
  mode: PageSnapshot["mode"],
  tab: chrome.tabs.Tab
): Promise<PageSnapshot> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (requestedMode) => ({
        mode: requestedMode,
        url: location.href,
        title: document.title,
        selectedText: window.getSelection()?.toString().trim() || undefined,
        pageText: document.body?.innerText?.replace(/\s+/g, " ").trim().slice(0, 8000) ?? "",
        links: Array.from(document.links).slice(0, 30).map((link) => link.href)
      }),
      args: [mode]
    });

    if (results[0]?.result) return results[0].result as PageSnapshot;
  } catch {
    // Browser-protected pages such as chrome:// cannot be scripted.
  }

  return {
    mode: "url",
    url: tab.url ?? "",
    title: tab.title ?? ""
  };
}

async function publishAssessment(assessment: RiskAssessment): Promise<void> {
  await saveLatestAssessment(assessment);
  chrome.runtime.sendMessage({ type: "SENTINEL_ASSESSMENT_UPDATED", assessment });
}

function publishStatus(type: string): void {
  chrome.runtime.sendMessage({ type });
}
