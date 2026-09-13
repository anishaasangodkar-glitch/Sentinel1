import type { PageSnapshot } from "../types/risk";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "SENTINEL_COLLECT_PAGE") return false;

  const snapshot: PageSnapshot = {
    mode: message.mode ?? "page",
    url: location.href,
    title: document.title,
    selectedText: window.getSelection()?.toString().trim() || undefined,
    pageText: document.body?.innerText?.replace(/\s+/g, " ").trim().slice(0, 8000) ?? "",
    links: Array.from(document.links).slice(0, 30).map((link) => link.href)
  };

  sendResponse(snapshot);
  return true;
});
