// WriteBetter AI — Manifest V3 Content Script
// Supports X (Twitter), LinkedIn, HTML <textarea>, <input>, and contenteditable editors + Double-click Hindi lookup

(function () {
  if (window.__WRITEBETTER_AI_INJECTED__) return;
  window.__WRITEBETTER_AI_INJECTED__ = true;

  let activeEditor = null;
  let originalBackupText = '';
  let floatingRoot = null;
  let shadowRoot = null;

  function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes('x.com') || host.includes('twitter.com')) return 'x';
    if (host.includes('linkedin.com')) return 'linkedin';
    return 'general';
  }

  function isSupportedEditor(el) {
    if (!el || !(el instanceof HTMLElement)) return false;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'INPUT' && ['text', 'search'].includes(el.type)) return true;
    if (el.isContentEditable) return true;
    if (el.getAttribute('role') === 'textbox') return true;
    return false;
  }

  function getEditorText(el) {
    if (!el) return '';
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      return el.value || '';
    }
    return el.innerText || el.textContent || '';
  }

  function replaceEditorTextSafely(el, newText) {
    if (!el) return;
    originalBackupText = getEditorText(el);
    el.focus();
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(el, newText);
      } else {
        el.value = newText;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (el.isContentEditable) {
      // Compatible with Draft.js / Lexical / ProseMirror on X and LinkedIn
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, newText);
    }
  }

  function ensureShadowHost() {
    if (floatingRoot && shadowRoot) return shadowRoot;
    floatingRoot = document.createElement('div');
    floatingRoot.id = 'writebetter-ai-extension-root';
    floatingRoot.style.cssText = 'position:fixed;z-index:2147483646;top:0;left:0;width:0;height:0;';
    document.documentElement.appendChild(floatingRoot);
    shadowRoot = floatingRoot.attachShadow({ mode: 'open' });
    return shadowRoot;
  }

  function removeFloatingPopups() {
    if (!shadowRoot) return;
    shadowRoot.innerHTML = '';
  }

  // Double-click English-to-Hindi Learning Assistant on any webpage
  document.addEventListener('dblclick', (event) => {
    const selection = window.getSelection();
    if (!selection) return;
    const rawWord = selection.toString().trim();
    if (!rawWord || rawWord.length < 2 || rawWord.length > 45 || !/[a-zA-Z]/.test(rawWord)) {
      return;
    }

    const anchorNode = selection.anchorNode;
    const contextSentence =
      anchorNode && anchorNode.parentElement
        ? (anchorNode.parentElement.innerText || '').slice(0, 260)
        : rawWord;

    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const rect = range ? range.getBoundingClientRect() : { left: event.clientX, bottom: event.clientY };

    renderHindiPopup(rawWord, contextSentence, rect.left, rect.bottom + 8);
  });

  function renderHindiPopup(word, contextSentence, x, y) {
    const root = ensureShadowHost();
    const safeX = Math.min(Math.max(16, x), window.innerWidth - 360);
    const safeY = Math.min(Math.max(16, y), window.innerHeight - 320);

    root.innerHTML = `
      <div style="position:fixed;left:${safeX}px;top:${safeY}px;width:336px;background:#ffffff;color:#0f172a;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 16px 36px rgba(15,23,42,0.16);padding:14px;font-family:-apple-system,BlinkMacSystemFont,'DM Sans',sans-serif;font-size:13px;line-height:1.45;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <strong style="font-size:15px;color:#0f172a;">${word}</strong>
          <button id="wb-close" style="border:none;background:transparent;cursor:pointer;color:#64748b;font-size:14px;">✕</button>
        </div>
        <div id="wb-hindi-body" style="color:#475569;">Translating in sentence context...</div>
      </div>
    `;

    root.getElementById('wb-close')?.addEventListener('click', removeFloatingPopups);

    chrome.runtime.sendMessage(
      {
        type: 'WRITEBETTER_API_REQUEST',
        endpoint: '/api/hindi/lookup',
        payload: { word, contextSentence },
      },
      (response) => {
        const bodyEl = root.getElementById('wb-hindi-body');
        if (!bodyEl) return;
        if (!response || !response.ok) {
          bodyEl.textContent = 'Could not reach WriteBetter AI backend.';
          return;
        }
        const d = response.data;
        bodyEl.innerHTML = `
          <div style="font-size:16px;font-weight:600;color:#4338ca;margin-bottom:4px;">${d.contextualMeaningHindi}</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:8px;">${d.pronunciationIPA} · ${d.hindiTransliteration}</div>
          <div style="margin-bottom:6px;color:#1e293b;"><strong>Simple English:</strong> ${d.simpleEnglishMeaning}</div>
          <div style="background:#f8fafc;padding:8px;border-radius:8px;border:1px solid #e2e8f0;font-size:12px;">
            <div style="color:#334155;margin-bottom:3px;">"${d.exampleSentenceEnglish}"</div>
            <div style="color:#475569;">"${d.exampleSentenceHindi}"</div>
          </div>
        `;
      }
    );
  }

  // Track active editor via MutationObserver & focusin
  document.addEventListener('focusin', (e) => {
    const target = e.target;
    if (isSupportedEditor(target)) {
      activeEditor = target;
    }
  });

  document.addEventListener('mousedown', (e) => {
    if (floatingRoot && !floatingRoot.contains(e.target)) {
      removeFloatingPopups();
    }
  });
})();
