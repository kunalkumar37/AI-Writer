// WriteBetter AI — Manifest V3 Background Service Worker
const DEFAULT_BACKEND_URL = 'http://localhost:3000';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['writebetter_settings', 'writebetter_vocab'], (res) => {
    if (!res.writebetter_settings) {
      chrome.storage.local.set({
        writebetter_settings: {
          autoDetectEditors: true,
          doubleClickHindiEnabled: true,
          phraseTranslationEnabled: true,
          saveWritingHistory: true,
          defaultPlatform: 'linkedin',
          defaultMode: 'improve_writing',
          backendApiUrl: DEFAULT_BACKEND_URL,
          darkMode: false,
        },
      });
    }
    if (!res.writebetter_vocab) {
      chrome.storage.local.set({ writebetter_vocab: [] });
    }
  });

  chrome.contextMenus.create({
    id: 'writebetter-rewrite',
    title: 'WriteBetter AI: Enhance Selected Writing',
    contexts: ['selection', 'editable'],
  });

  chrome.contextMenus.create({
    id: 'writebetter-factcheck',
    title: 'WriteBetter AI: Fact-Check Selected Claim',
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    id: 'writebetter-hindi',
    title: 'WriteBetter AI: Contextual Hindi Meaning',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id || !info.selectionText) return;
  chrome.tabs.sendMessage(tab.id, {
    type: 'WRITEBETTER_CONTEXT_ACTION',
    actionId: info.menuItemId,
    selectionText: info.selectionText,
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'WRITEBETTER_API_REQUEST') {
    chrome.storage.local.get(['writebetter_settings'], async (data) => {
      const baseUrl =
        data?.writebetter_settings?.backendApiUrl || DEFAULT_BACKEND_URL;
      try {
        const response = await fetch(`${baseUrl}${message.endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.payload),
        });
        const result = await response.json();
        sendResponse({ ok: response.ok, data: result });
      } catch (err) {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : 'Backend connection error',
        });
      }
    });
    return true; // Async response
  }
});
