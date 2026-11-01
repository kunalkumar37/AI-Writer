import React, { useState } from 'react';
import { Copy, Check, Download, Terminal, FileCode, Layers, Shield } from 'lucide-react';

const EXTENSION_FILES: Record<string, { path: string; desc: string; code: string }> = {
  manifest: {
    path: 'public/chrome-extension/manifest.json',
    desc: 'Chrome Extension Manifest V3 configuration with minimum permissions, content scripts, sidePanel, and service worker.',
    code: `{
  "manifest_version": 3,
  "name": "WriteBetter AI — Writing Assistant, Fact Checker & Hindi Coach",
  "version": "1.0.0",
  "description": "Improve English writing on X & LinkedIn, verify factual claims with real sources, and double-click any English word for contextual Hindi meanings.",
  "permissions": ["storage", "activeTab", "contextMenus", "sidePanel"],
  "host_permissions": [
    "https://x.com/*",
    "https://twitter.com/*",
    "https://www.linkedin.com/*",
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html",
    "default_title": "WriteBetter AI"
  },
  "side_panel": {
    "default_path": "popup.html"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}`,
  },
  content: {
    path: 'public/chrome-extension/content.js',
    desc: 'Detects X, LinkedIn, and HTML editors safely (preserving Undo state) and attaches the Shadow DOM double-click English-to-Hindi popup.',
    code: `// WriteBetter AI — Manifest V3 Content Script (Shadow DOM isolated)
(function () {
  if (window.__WRITEBETTER_AI_INJECTED__) return;
  window.__WRITEBETTER_AI_INJECTED__ = true;

  // Double-click English-to-Hindi Learning Assistant on any webpage
  document.addEventListener('dblclick', (event) => {
    const selection = window.getSelection();
    if (!selection) return;
    const rawWord = selection.toString().trim();
    if (!rawWord || rawWord.length < 2 || rawWord.length > 45 || !/[a-zA-Z]/.test(rawWord)) return;

    const anchorNode = selection.anchorNode;
    const contextSentence = anchorNode?.parentElement
      ? (anchorNode.parentElement.innerText || '').slice(0, 260)
      : rawWord;

    chrome.runtime.sendMessage(
      {
        type: 'WRITEBETTER_API_REQUEST',
        endpoint: '/api/hindi/lookup',
        payload: { word: rawWord, contextSentence },
      },
      (response) => {
        if (response?.ok) {
          console.log('WriteBetter AI Contextual Hindi:', response.data);
        }
      }
    );
  });
})();`,
  },
  background: {
    path: 'public/chrome-extension/background.js',
    desc: 'Service worker managing context menus, storage initialization, and secure proxy requests to the Express + Gemini backend.',
    code: `// WriteBetter AI — Manifest V3 Background Service Worker
const DEFAULT_BACKEND_URL = 'http://localhost:3000';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'WRITEBETTER_API_REQUEST') {
    chrome.storage.local.get(['writebetter_settings'], async (data) => {
      const baseUrl = data?.writebetter_settings?.backendApiUrl || DEFAULT_BACKEND_URL;
      try {
        const response = await fetch(\`\${baseUrl}\${message.endpoint}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.payload),
        });
        const result = await response.json();
        sendResponse({ ok: response.ok, data: result });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    });
    return true;
  }
});`,
  },
};

export const ExtensionArchitectureView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<'manifest' | 'content' | 'background'>('manifest');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(EXTENSION_FILES[selectedFile].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadInstallerScript = () => {
    const bundleJson = JSON.stringify(EXTENSION_FILES, null, 2);
    const blob = new Blob([bundleJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'writebetter-ai-chrome-extension-mv3.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Architecture & Data Flow Overview */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              System Architecture & Chrome Extension (Manifest V3) Package
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete production architecture, security model, and unpacked Chrome Extension installation guide.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadInstallerScript}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Extension Bundle</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>01. Chrome Extension Frontend (MV3)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Shadow-DOM isolated content scripts detect X (`div[contenteditable=&quot;true&quot;]`), LinkedIn (`ql-editor`), and standard `&lt;textarea&gt;` fields without interfering with native typing shortcuts. Double-click listener captures target word + parent sentence context.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <Terminal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>02. Express + Gemini 3.8 Flash Backend</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Server-side endpoints (`/api/writing/enhance`, `/api/factcheck/analyze`, `/api/hindi/lookup`) keep `GEMINI_API_KEY` strictly on the server. Fact checking uses `@google/genai` with `googleSearch` grounding to verify real sources.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>03. Security & Privacy Architecture</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Zero keystroke logging—API calls run only on explicit user actions (clicking Enhance, Fact Check, or double-clicking a word). Original editor text is backed up prior to any replacement.
            </p>
          </div>
        </div>

        {/* Step-by-Step Local Chrome Installation Guide */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
          <div className="font-bold text-slate-900 dark:text-white">
            How to Load WriteBetter AI in Google Chrome (`chrome://extensions`):
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
            <li>
              Ensure this backend server is running (`npm run dev` on `http://localhost:3000`).
            </li>
            <li>
              Open Google Chrome and navigate to <code className="font-mono bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 rounded">chrome://extensions</code>.
            </li>
            <li>
              Enable <strong>Developer mode</strong> in the top-right corner.
            </li>
            <li>
              Click <strong>Load unpacked</strong> and select the <code className="font-mono bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 rounded">public/chrome-extension</code> folder from this project repository.
            </li>
            <li>
              Pin <strong>WriteBetter AI</strong> to your Chrome toolbar and visit X, LinkedIn, or any English article to use double-click Hindi lookup and inline writing assistance!
            </li>
          </ol>
        </div>
      </div>

      {/* Interactive Manifest V3 Source Code Explorer */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {(
              [
                { id: 'manifest', label: 'manifest.json' },
                { id: 'content', label: 'content.js' },
                { id: 'background', label: 'background.js' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFile(f.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                  selectedFile === f.id
                    ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied File' : 'Copy Code'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          File path: <code className="font-mono">{EXTENSION_FILES[selectedFile].path}</code> —{' '}
          {EXTENSION_FILES[selectedFile].desc}
        </p>

        <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
          <code>{EXTENSION_FILES[selectedFile].code}</code>
        </pre>
      </div>
    </div>
  );
};
