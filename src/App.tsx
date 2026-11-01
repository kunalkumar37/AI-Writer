/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Sun, Moon, Sparkles, ShieldCheck, Languages, Puzzle } from 'lucide-react';
import {
  ExtensionSettings,
  FactCheckResult,
  HindiWordLookupResult,
  ReportedSuggestion,
  SavedVocabularyItem,
  WritingAnalysisResult,
  WritingHistoryItem,
  WritingMode,
  WritingModifier,
  WritingPlatform,
} from './types/writebetter';
import {
  cleanSelectedWord,
  extractSurroundingSentence,
  generateFallbackFactCheckResult,
  generateFallbackWritingResult,
  lookupContextualHindiFallback,
} from './utils/textEngine';
import {
  analyzeFactCheckApi,
  enhanceWritingApi,
  lookupHindiWordApi,
} from './services/apiClient';
import { HindiFloatingPopup } from './components/HindiFloatingPopup';
import { LiveBrowserSimulator } from './components/LiveBrowserSimulator';
import { WritingStudioView } from './components/WritingStudioView';
import { FactCheckerView } from './components/FactCheckerView';
import { VocabularyVaultView } from './components/VocabularyVaultView';
import { ExtensionArchitectureView } from './components/ExtensionArchitectureModal';
import { HistoryAndPrivacyView } from './components/HistoryAndPrivacyView';

type ActiveTab =
  | 'simulator'
  | 'writing'
  | 'factcheck'
  | 'vocabulary'
  | 'history'
  | 'architecture';

const INITIAL_DRAFT =
  'Me and my team is working hardly since 6 months to launch our new AI product that will make our users life easier.';

const INITIAL_FACT_DRAFT =
  'Artificial intelligence will replace 90% of software engineers in the next five years.';

const INITIAL_VOCABULARY: SavedVocabularyItem[] = [
  {
    ...lookupContextualHindiFallback(
      'Nevertheless',
      'He was tired; nevertheless, he continued working.'
    ),
    id: 'vocab-nevertheless',
    masteryLevel: 'learning',
    reviewCount: 2,
    savedAt: new Date().toISOString(),
  },
  {
    ...lookupContextualHindiFallback(
      'fine',
      'He had to pay a heavy fine for parking in a no-parking zone.'
    ),
    id: 'vocab-fine-penalty',
    masteryLevel: 'mastered',
    reviewCount: 4,
    savedAt: new Date().toISOString(),
  },
  {
    ...lookupContextualHindiFallback(
      'pragmatic',
      'Successful engineering leaders take a pragmatic approach to technical debt.'
    ),
    id: 'vocab-pragmatic',
    masteryLevel: 'new',
    reviewCount: 1,
    savedAt: new Date().toISOString(),
  },
  {
    ...lookupContextualHindiFallback(
      'ubiquitous',
      'Smartphones and AI assistants have become ubiquitous in modern daily life.'
    ),
    id: 'vocab-ubiquitous',
    masteryLevel: 'learning',
    reviewCount: 3,
    savedAt: new Date().toISOString(),
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('simulator');
  const [settings, setSettings] = useState<ExtensionSettings>(() => {
    try {
      const saved = localStorage.getItem('writebetter_settings');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      autoDetectEditors: true,
      doubleClickHindiEnabled: true,
      phraseTranslationEnabled: true,
      saveWritingHistory: true,
      defaultPlatform: 'linkedin',
      defaultMode: 'improve_writing',
      backendApiUrl: 'http://localhost:3000',
      darkMode: false,
    };
  });

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('writebetter_settings', JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // Writing Assistant State
  const [draftText, setDraftText] = useState<string>(INITIAL_DRAFT);
  const [platform, setPlatform] = useState<WritingPlatform>('linkedin');
  const [mode, setMode] = useState<WritingMode>('improve_writing');
  const [writingResult, setWritingResult] = useState<WritingAnalysisResult | null>(() =>
    generateFallbackWritingResult(INITIAL_DRAFT, 'linkedin', 'improve_writing')
  );
  const [writingLoading, setWritingLoading] = useState(false);

  // Fact Checker State
  const [factDraft, setFactDraft] = useState<string>(INITIAL_FACT_DRAFT);
  const [factResult, setFactResult] = useState<FactCheckResult | null>(() =>
    generateFallbackFactCheckResult(INITIAL_FACT_DRAFT)
  );
  const [factLoading, setFactLoading] = useState(false);

  // Double-Click Hindi Floating Popup & Vocabulary Vault State
  const [vocabulary, setVocabulary] = useState<SavedVocabularyItem[]>(() => {
    try {
      const saved = localStorage.getItem('writebetter_vocab');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_VOCABULARY;
  });

  useEffect(() => {
    try {
      localStorage.setItem('writebetter_vocab', JSON.stringify(vocabulary));
    } catch {
      // ignore
    }
  }, [vocabulary]);

  const [floatingHindiLookup, setFloatingHindiLookup] =
    useState<HindiWordLookupResult | null>(null);
  const [floatingHindiLoading, setFloatingHindiLoading] = useState(false);
  const [floatingPopupPos, setFloatingPopupPos] = useState<{ x: number; y: number } | null>(
    null
  );

  // Manual Lookup in Vocabulary Vault Tab
  const [manualLookupResult, setManualLookupResult] =
    useState<HindiWordLookupResult | null>(() =>
      lookupContextualHindiFallback(
        'Nevertheless',
        'He was tired; nevertheless, he continued working.'
      )
    );
  const [manualLookupLoading, setManualLookupLoading] = useState(false);

  // History & Feedback Reports
  const [history, setHistory] = useState<WritingHistoryItem[]>([
    {
      id: 'hist-1',
      type: 'writing',
      originalText: INITIAL_DRAFT,
      selectedOutput:
        "My team and I have been working hard for the past six months to launch our new AI product. It's built to make our users' lives genuinely easier.",
      platform: 'linkedin',
      modeOrVerdict: 'improve_writing',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [reports, setReports] = useState<ReportedSuggestion[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  const updateSettings = (partial: Partial<ExtensionSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  // Run AI Writing Enhancement
  const handleRunEnhance = async (
    modifier: WritingModifier = 'none',
    overrideMode?: WritingMode
  ) => {
    const activeMode = overrideMode || mode;
    setWritingLoading(true);
    const res = await enhanceWritingApi({
      text: draftText,
      platform,
      mode: activeMode,
      modifier,
    });
    setWritingResult(res);
    setWritingLoading(false);

    if (settings.saveWritingHistory && res.variations[0]) {
      setHistory((prev) => [
        {
          id: `hist-${Date.now()}`,
          type: 'writing',
          originalText: draftText,
          selectedOutput: res.variations[0].text,
          platform,
          modeOrVerdict: activeMode,
          createdAt: new Date().toISOString(),
        },
        ...prev.slice(0, 29),
      ]);
    }
  };

  // Run AI Fact Check & Opinion Analysis
  const handleRunFactCheck = async (customText?: string) => {
    const target = (customText ?? factDraft).trim();
    if (!target) return;
    setFactLoading(true);
    const res = await analyzeFactCheckApi(target);
    setFactResult(res);
    setFactLoading(false);

    if (settings.saveWritingHistory) {
      setHistory((prev) => [
        {
          id: `fact-${Date.now()}`,
          type: 'fact_check',
          originalText: target,
          selectedOutput: res.improvedCredibleVersion,
          platform,
          modeOrVerdict: res.claims[0]?.verdict || 'Analyzed',
          createdAt: new Date().toISOString(),
        },
        ...prev.slice(0, 29),
      ]);
    }
  };

  // Double-Click Word or Short Phrase Handler across any text area / reader
  const handleWordDoubleClick = async (
    e: React.MouseEvent<HTMLElement>,
    fullContextText: string
  ) => {
    if (!settings.doubleClickHindiEnabled) return;
    const selection = window.getSelection();
    const rawSelected = selection ? selection.toString().trim() : '';
    const cleaned = cleanSelectedWord(rawSelected);
    if (!cleaned || cleaned.length < 2 || cleaned.length > 160) return;

    const sentenceContext = extractSurroundingSentence(fullContextText, cleaned);
    setFloatingPopupPos({ x: e.clientX - 40, y: e.clientY + 14 });
    setFloatingHindiLoading(true);
    // Show instant contextual fallback first, then refine if needed
    const immediate = lookupContextualHindiFallback(cleaned, sentenceContext);
    setFloatingHindiLookup(immediate);

    const apiResult = await lookupHindiWordApi(cleaned, sentenceContext);
    setFloatingHindiLookup(apiResult);
    setFloatingHindiLoading(false);
  };

  // Direct Button Trigger for Hindi Popup (great for accessibility & deterministic verification)
  const handleDirectWordLookup = async (
    word: string,
    contextSentence: string,
    e: React.MouseEvent<HTMLElement>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setFloatingPopupPos({ x: rect.left, y: rect.bottom + 8 });
    setFloatingHindiLoading(true);
    const immediate = lookupContextualHindiFallback(word, contextSentence);
    setFloatingHindiLookup(immediate);

    const apiResult = await lookupHindiWordApi(word, contextSentence);
    setFloatingHindiLookup(apiResult);
    setFloatingHindiLoading(false);
  };

  // Manual Lookup in Vocabulary Vault Tab
  const handleManualVocabLookup = async (word: string, contextSentence: string) => {
    setManualLookupLoading(true);
    const res = await lookupHindiWordApi(word, contextSentence);
    setManualLookupResult(res);
    setManualLookupLoading(false);
  };

  // Save Word to Vocabulary Vault
  const handleSaveWord = (item: HindiWordLookupResult) => {
    const exists = vocabulary.some(
      (v) =>
        v.cleanWord.toLowerCase() === item.cleanWord.toLowerCase() &&
        v.contextualMeaningHindi === item.contextualMeaningHindi
    );
    if (exists) {
      showToast(`"${item.cleanWord}" is already in your Vocabulary Collection.`);
      return;
    }
    const newItem: SavedVocabularyItem = {
      ...item,
      id: `vocab-${Date.now()}`,
      masteryLevel: 'new',
      reviewCount: 1,
      savedAt: new Date().toISOString(),
    };
    setVocabulary((prev) => [newItem, ...prev]);
    showToast(`Saved "${item.cleanWord}" (${item.hindiMeaningDevanagari}) to My Vocabulary.`);
  };

  const handleToggleMastery = (id: string) => {
    const order: SavedVocabularyItem['masteryLevel'][] = ['new', 'learning', 'mastered'];
    setVocabulary((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextLevel = order[(order.indexOf(item.masteryLevel) + 1) % order.length];
        return { ...item, masteryLevel: nextLevel, reviewCount: item.reviewCount + 1 };
      })
    );
  };

  const handleDeleteWord = (id: string) => {
    setVocabulary((prev) => prev.filter((item) => item.id !== id));
  };

  const handleReportIssue = (
    feature: 'writing' | 'fact_check' | 'hindi',
    originalInput: string,
    aiOutput: string
  ) => {
    setReports((prev) => [
      {
        id: `rep-${Date.now()}`,
        feature,
        originalInput,
        aiOutput,
        reason: 'User flagged suggestion for accuracy review',
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    showToast('Thank you — AI suggestion flagged for quality review.');
  };

  const isCurrentLookupSaved = Boolean(
    floatingHindiLookup &&
      vocabulary.some(
        (v) =>
          v.cleanWord.toLowerCase() === floatingHindiLookup.cleanWord.toLowerCase() &&
          v.contextualMeaningHindi === floatingHindiLookup.contextualMeaningHindi
      )
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('simulator');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 font-display"
        >
          WriteBetter AI
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          <a
            href="#simulator"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('simulator');
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'simulator'
                ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-indigo-600'
                : ''
            }`}
          >
            Live Simulator
          </a>
          <a
            href="#writing"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('writing');
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'writing'
                ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-indigo-600'
                : ''
            }`}
          >
            Writing Assistant
          </a>
          <a
            href="#factcheck"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('factcheck');
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'factcheck'
                ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-indigo-600'
                : ''
            }`}
          >
            Fact Checker
          </a>
          <a
            href="#vocabulary"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('vocabulary');
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'vocabulary'
                ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-indigo-600'
                : ''
            }`}
          >
            My Vocabulary
          </a>
          <a
            href="#history"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('history');
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'history'
                ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-indigo-600'
                : ''
            }`}
          >
            History & Privacy
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('architecture')}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-indigo-600 rounded-lg hover:bg-slate-800 dark:hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Chrome Extension MV3
          </button>
        </div>
      </header>

      {/* Workspace Subbar: Mobile Navigation + Theme Switch + Core Capabilities Overview */}
      <div className="bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/80 dark:border-slate-800 px-6 py-2.5">
        <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-medium text-slate-900 dark:text-slate-200">
              Active Capabilities:
            </span>
            <span>X & LinkedIn Writing Optimizer</span>
            <span aria-hidden="true">·</span>
            <span>Grounded Fact & Opinion Analyzer</span>
            <span aria-hidden="true">·</span>
            <span>Double-Click English-to-Hindi (Devanagari)</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile / Quick Tab Switcher */}
            <div className="flex md:hidden items-center gap-1 overflow-x-auto">
              {(
                [
                  { id: 'simulator', label: 'Simulator' },
                  { id: 'writing', label: 'Writing' },
                  { id: 'factcheck', label: 'Fact Check' },
                  { id: 'vocabulary', label: 'Vocabulary' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white dark:bg-indigo-600'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => updateSettings({ darkMode: !settings.darkMode })}
              aria-label={settings.darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {settings.darkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-6 py-6">
        {toastMessage && (
          <div
            role="status"
            className="mb-4 px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-indigo-600 text-white text-xs font-medium flex items-center justify-between shadow-sm"
          >
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-300 hover:text-white ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {activeTab === 'simulator' && (
          <LiveBrowserSimulator
            draftText={draftText}
            setDraftText={setDraftText}
            platform={platform}
            setPlatform={setPlatform}
            mode={mode}
            setMode={setMode}
            writingResult={writingResult}
            writingLoading={writingLoading}
            onRunEnhance={handleRunEnhance}
            factResult={factResult}
            factLoading={factLoading}
            onRunInlineFactCheck={handleRunFactCheck}
            onWordDoubleClick={handleWordDoubleClick}
            onDirectWordLookup={handleDirectWordLookup}
            vocabulary={vocabulary}
            history={history}
            settings={settings}
            onUpdateSettings={updateSettings}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'writing' && (
          <WritingStudioView
            draftText={draftText}
            setDraftText={setDraftText}
            platform={platform}
            setPlatform={setPlatform}
            mode={mode}
            setMode={setMode}
            result={writingResult}
            loading={writingLoading}
            onRunEnhance={handleRunEnhance}
            onSwitchToFactCheck={(textToVerify) => {
              setFactDraft(textToVerify);
              setActiveTab('factcheck');
              handleRunFactCheck(textToVerify);
            }}
            onReportIssue={handleReportIssue}
            onWordDoubleClick={handleWordDoubleClick}
          />
        )}

        {activeTab === 'factcheck' && (
          <FactCheckerView
            factDraft={factDraft}
            setFactDraft={setFactDraft}
            result={factResult}
            loading={factLoading}
            onRunFactCheck={handleRunFactCheck}
            onReportIssue={handleReportIssue}
            onWordDoubleClick={handleWordDoubleClick}
          />
        )}

        {activeTab === 'vocabulary' && (
          <VocabularyVaultView
            vocabulary={vocabulary}
            onToggleMastery={handleToggleMastery}
            onDeleteWord={handleDeleteWord}
            onManualLookup={handleManualVocabLookup}
            manualLookupLoading={manualLookupLoading}
            lastLookupResult={manualLookupResult}
            onSaveLookupResult={handleSaveWord}
          />
        )}

        {activeTab === 'history' && (
          <HistoryAndPrivacyView
            history={history}
            reports={reports}
            settings={settings}
            onUpdateSettings={updateSettings}
            onClearHistory={() => {
              setHistory([]);
              showToast('Writing and verification history cleared.');
            }}
            onDeleteAllUserData={() => {
              setHistory([]);
              setVocabulary([]);
              setReports([]);
              localStorage.removeItem('writebetter_vocab');
              localStorage.removeItem('writebetter_settings');
              showToast('All local vocabulary, history, and settings have been deleted.');
            }}
          />
        )}

        {activeTab === 'architecture' && <ExtensionArchitectureView />}
      </main>

      {/* Floating Double-Click English-to-Hindi Learning Assistant Popup */}
      <HindiFloatingPopup
        lookup={floatingHindiLookup}
        loading={floatingHindiLoading}
        position={floatingPopupPos}
        isSaved={isCurrentLookupSaved}
        onClose={() => {
          setFloatingPopupPos(null);
          setFloatingHindiLookup(null);
        }}
        onSaveWord={handleSaveWord}
        onReportIssue={handleReportIssue}
      />

      {/* Quiet Minimal Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 mt-12">
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            WriteBetter AI — Personal English Writing Coach, Grounded Fact Checker & Contextual Hindi Teacher
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('architecture')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Manifest V3 Source & Unpacked Setup
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Privacy & Data Controls
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
