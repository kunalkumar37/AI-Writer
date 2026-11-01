import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Check,
  Copy,
  ArrowRightLeft,
  RotateCcw,
  Minimize2,
  Flame,
  Undo2,
  Languages,
  Puzzle,
  Globe,
  BookMarked,
  History,
  Settings,
  ChevronRight,
} from 'lucide-react';
import {
  ExtensionSettings,
  FactCheckResult,
  SavedVocabularyItem,
  WritingAnalysisResult,
  WritingHistoryItem,
  WritingMode,
  WritingModifier,
  WritingPlatform,
} from '../types/writebetter';
import { computeTextMetrics } from '../utils/textEngine';

interface LiveBrowserSimulatorProps {
  draftText: string;
  setDraftText: (text: string) => void;
  platform: WritingPlatform;
  setPlatform: (p: WritingPlatform) => void;
  mode: WritingMode;
  setMode: (m: WritingMode) => void;
  writingResult: WritingAnalysisResult | null;
  writingLoading: boolean;
  onRunEnhance: (modifier?: WritingModifier, overrideMode?: WritingMode) => void;
  factResult: FactCheckResult | null;
  factLoading: boolean;
  onRunInlineFactCheck: (text: string) => void;
  onWordDoubleClick: (e: React.MouseEvent<HTMLElement>, contextText: string) => void;
  onDirectWordLookup: (word: string, contextSentence: string, e: React.MouseEvent<HTMLElement>) => void;
  vocabulary: SavedVocabularyItem[];
  history: WritingHistoryItem[];
  settings: ExtensionSettings;
  onUpdateSettings: (partial: Partial<ExtensionSettings>) => void;
  onNavigateTab: (tab: 'simulator' | 'writing' | 'factcheck' | 'vocabulary' | 'history' | 'architecture') => void;
}

const READING_PASSAGES: Record<
  WritingPlatform,
  {
    url: string;
    siteTitle: string;
    composerLabel: string;
    composerPlaceholder: string;
    articles: {
      author: string;
      role: string;
      title: string;
      paragraphs: string[];
      highlightWords: { word: string; context: string; label: string }[];
    }[];
  }
> = {
  linkedin: {
    url: 'https://www.linkedin.com/feed/',
    siteTitle: 'LinkedIn — Professional Feed & Post Editor',
    composerLabel: 'Start a LinkedIn Post (WriteBetter AI Editor Active)',
    composerPlaceholder: 'Share a professional lesson, engineering insight, or industry question...',
    articles: [
      {
        author: 'Aarav Mehta',
        role: 'VP of Engineering · Distributed Systems',
        title: 'Why Pragmatic Architecture Beats Hype Cycles',
        paragraphs: [
          'He was tired after a twelve-hour migration; nevertheless, he continued working until every customer service was restored.',
          'Successful engineering leaders take a pragmatic approach to technical debt. There is a fine line between shipping fast and creating fragile infrastructure.',
          'While viral social media trends are ephemeral, resilient distributed systems compound value over decades.',
        ],
        highlightWords: [
          {
            word: 'nevertheless',
            context: 'He was tired after a twelve-hour migration; nevertheless, he continued working until every customer service was restored.',
            label: 'nevertheless',
          },
          {
            word: 'pragmatic',
            context: 'Successful engineering leaders take a pragmatic approach to technical debt.',
            label: 'pragmatic',
          },
          {
            word: 'fine',
            context: 'There is a fine line between confidence and arrogance.',
            label: 'fine (बारीक / subtle)',
          },
          {
            word: 'ephemeral',
            context: 'Algorithmic virality is ephemeral, whereas genuine trust compounds over years.',
            label: 'ephemeral',
          },
          {
            word: 'resilient',
            context: 'We designed a resilient distributed architecture that handles traffic spikes gracefully.',
            label: 'resilient',
          },
        ],
      },
    ],
  },
  x: {
    url: 'https://x.com/compose/post',
    siteTitle: 'X (Twitter) — Post Composer & Tech Stream',
    composerLabel: 'Compose X Post / Thread Opener (WriteBetter AI Active)',
    composerPlaceholder: 'What is happening?! Write a sharp hook or thread opener...',
    articles: [
      {
        author: 'Riya Sharma @riyaships',
        role: 'Staff AI Engineer · Open Source',
        title: 'Live X Tech Discussion',
        paragraphs: [
          'Smartphones and AI coding assistants have become ubiquitous in modern daily life. Still, great writers capture the nuance of engineering trade-offs without clickbait.',
          'Yesterday my friend had to pay a heavy fine for parking in a no-parking zone outside the conference venue—but the keynote demo itself looked fine to me!',
        ],
        highlightWords: [
          {
            word: 'ubiquitous',
            context: 'Smartphones and AI assistants have become ubiquitous in modern daily life.',
            label: 'ubiquitous',
          },
          {
            word: 'nuance',
            context: 'Great technical writers capture the nuance of engineering trade-offs without confusing the reader.',
            label: 'nuance',
          },
          {
            word: 'fine',
            context: 'He had to pay a heavy fine for parking in a no-parking zone.',
            label: 'fine (जुर्माना / penalty)',
          },
          {
            word: 'fine',
            context: 'The project schedule looks fine to me.',
            label: 'fine (अच्छा / good)',
          },
        ],
      },
    ],
  },
  general: {
    url: 'https://techreview.example/articles/agentic-software-paradigm',
    siteTitle: 'Web Article & Standard HTML Textarea Editor',
    composerLabel: 'Article Response / Standard Web Editor',
    composerPlaceholder: 'Write a thoughtful comment, essay paragraph, or newsletter draft...',
    articles: [
      {
        author: 'Editorial Desk',
        role: 'Technology & Language Review',
        title: 'The New Paradigm of Human-AI Communication',
        paragraphs: [
          'Agentic workflows represent a major paradigm shift in software engineering. Nevertheless, human judgment remains irreplaceable when verifying empirical claims.',
          'Double-click any word in this paragraph—such as paradigm, nevertheless, pragmatic, or ubiquitous—to see its contextual Hindi meaning in Devanagari.',
        ],
        highlightWords: [
          {
            word: 'paradigm',
            context: 'Agentic workflows represent a major paradigm shift in software engineering.',
            label: 'paradigm',
          },
          {
            word: 'Nevertheless',
            context: 'He was tired; nevertheless, he continued working.',
            label: 'Nevertheless',
          },
        ],
      },
    ],
  },
};

export const LiveBrowserSimulator: React.FC<LiveBrowserSimulatorProps> = ({
  draftText,
  setDraftText,
  platform,
  setPlatform,
  mode,
  setMode,
  writingResult,
  writingLoading,
  onRunEnhance,
  factResult,
  factLoading,
  onRunInlineFactCheck,
  onWordDoubleClick,
  onDirectWordLookup,
  vocabulary,
  history,
  settings,
  onUpdateSettings,
  onNavigateTab,
}) => {
  const [assistantPanelOpen, setAssistantPanelOpen] = useState(true);
  const [inlineTab, setInlineTab] = useState<'rewrite' | 'factcheck'>('rewrite');
  const [popupTab, setPopupTab] = useState<'dashboard' | 'vocab' | 'history' | 'settings'>('dashboard');
  const [originalBackup, setOriginalBackup] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const currentSite = READING_PASSAGES[platform];
  const metrics = computeTextMetrics(draftText, platform);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleReplaceInEditor = (newText: string) => {
    if (originalBackup === null) {
      setOriginalBackup(draftText);
    }
    setDraftText(newText);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 8 Columns: Simulated Chrome Browser Window with Live Content Script Overlay */}
      <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Simulated Chrome Address Bar & Platform Switcher */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate">
              {currentSite.url}
            </span>
          </div>

          <div
            role="group"
            aria-label="Switch Simulated Website"
            className="inline-flex items-center gap-1 p-0.5 bg-slate-200/80 dark:bg-slate-900 rounded-lg"
          >
            {(
              [
                { id: 'linkedin', label: 'LinkedIn' },
                { id: 'x', label: 'X (Twitter)' },
                { id: 'general', label: 'Web Article' },
              ] as const
            ).map((site) => (
              <button
                key={site.id}
                type="button"
                onClick={() => setPlatform(site.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  platform === site.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {site.label}
              </button>
            ))}
          </div>
        </div>

        {/* Simulated Webpage Body */}
        <div className="p-5 space-y-6">
          {/* Section 1: Social Media / Web Editor with Floating WriteBetter AI Trigger */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="simulator-main-editor"
                className="text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                {currentSite.composerLabel}
              </label>

              <div className="flex items-center gap-2">
                {originalBackup !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftText(originalBackup);
                      setOriginalBackup(null);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 cursor-pointer"
                  >
                    <Undo2 className="w-3 h-3" />
                    <span>Undo Replace</span>
                  </button>
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {metrics.wordCount} words · {metrics.platformLimitLabel}
                </span>
              </div>
            </div>

            <div className="relative">
              <textarea
                id="simulator-main-editor"
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onDoubleClick={(e) => onWordDoubleClick(e, draftText)}
                rows={4}
                placeholder={currentSite.composerPlaceholder}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 pr-36 text-sm leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />

              {/* Floating WriteBetter AI Assistant Trigger Icon inside the editor */}
              <button
                type="button"
                onClick={() => setAssistantPanelOpen(!assistantPanelOpen)}
                aria-expanded={assistantPanelOpen}
                className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>WriteBetter AI</span>
              </button>
            </div>

            {/* Compact Floating Assistant Panel (Triggered inside X / LinkedIn Editor) */}
            {assistantPanelOpen && (
              <div
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-sm"
                data-testid="floating-assistant-panel"
              >
                {/* Quick Action Bar: Fix Grammar, Improve Writing, Make Catchy, Make Viral, Professional, Fact Check */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'fix_grammar', label: 'Fix Grammar' },
                        { id: 'improve_writing', label: 'Improve Writing' },
                        { id: 'make_catchy', label: 'Make Catchy' },
                        { id: 'make_viral', label: 'Make Viral' },
                        { id: 'professional', label: 'Professional' },
                        { id: 'thought_leadership', label: 'Thought Leadership' },
                      ] as const
                    ).map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => {
                          setInlineTab('rewrite');
                          setMode(action.id);
                          onRunEnhance('none', action.id);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          inlineTab === 'rewrite' && mode === action.id
                            ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {action.label}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setInlineTab('factcheck');
                        onRunInlineFactCheck(draftText);
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        inlineTab === 'factcheck'
                          ? 'bg-indigo-600 text-white'
                          : 'border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Fact Check</span>
                    </button>
                  </div>
                </div>

                {/* Inline Comparison Output: Rewrite Mode vs Fact Check Mode */}
                {inlineTab === 'rewrite' ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Side-by-Side Suggestions (Original preserved until you click Replace Original)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onRunEnhance('retry')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Try Again</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRunEnhance('shorter')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Minimize2 className="w-3 h-3" />
                          <span>Make Shorter</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRunEnhance('more_engaging')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Flame className="w-3 h-3 text-amber-500" />
                          <span>Make More Engaging</span>
                        </button>
                      </div>
                    </div>

                    {writingLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="h-28 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse"
                          />
                        ))}
                      </div>
                    ) : writingResult ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {writingResult.variations.map((v) => (
                          <div
                            key={v.id}
                            className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex flex-col justify-between gap-3"
                          >
                            <div className="space-y-1.5">
                              <div className="text-xs font-bold text-slate-900 dark:text-white">
                                {v.label}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {v.toneTag} · {v.wordCount}w
                              </div>
                              <p
                                onDoubleClick={(e) => onWordDoubleClick(e, v.text)}
                                className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line select-text"
                              >
                                {v.text}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                              <button
                                type="button"
                                onClick={() => handleCopy(v.id, v.text)}
                                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                              >
                                {copiedId === v.id ? 'Copied' : 'Copy'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReplaceInEditor(v.text)}
                                className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded bg-slate-900 dark:bg-indigo-600 text-white text-xs font-medium hover:bg-slate-800 cursor-pointer"
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                                <span>Replace Original</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {factLoading ? (
                      <div className="h-28 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    ) : factResult ? (
                      <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {factResult.summaryVerdict}
                          </span>
                          <button
                            type="button"
                            onClick={() => onNavigateTab('factcheck')}
                            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            View Full Sources & Opinion Analysis →
                          </button>
                        </div>
                        <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                          <strong>Credible Rewrite:</strong> {factResult.improvedCredibleVersion}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 dark:text-slate-400">
                            Sources:{' '}
                            {factResult.claims[0]?.sources
                              .map((s) => s.publisher)
                              .join(' · ')}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleReplaceInEditor(factResult.improvedCredibleVersion)
                            }
                            className="px-3 py-1 rounded bg-slate-900 dark:bg-indigo-600 text-white font-medium cursor-pointer"
                          >
                            Replace with Credible Version
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Interactive Reading Stream for Double-Click English-to-Hindi Learning */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Languages className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>
                    Double-Click English-to-Hindi Reader ({currentSite.siteTitle})
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Double-click ANY English word below—or click a quick-test vocabulary button—to open the floating contextual Hindi popup.
                </p>
              </div>
            </div>

            {currentSite.articles.map((article, idx) => (
              <article key={idx} className="space-y-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <strong className="text-slate-900 dark:text-white">{article.author}</strong> ·{' '}
                  {article.role}
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {article.title}
                </h4>
                <div className="space-y-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300 select-text">
                  {article.paragraphs.map((para, pIdx) => (
                    <p
                      key={pIdx}
                      onDoubleClick={(e) => onWordDoubleClick(e, para)}
                      className="cursor-text hover:bg-slate-50/80 dark:hover:bg-slate-800/30 p-1.5 -mx-1.5 rounded transition-colors"
                    >
                      {para}
                    </p>
                  ))}
                </div>

                {/* One-Click Contextual Word Triggers for Easy Accessibility & Testing */}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Try Contextual Hindi Popup:
                  </span>
                  {article.highlightWords.map((hw, hIdx) => (
                    <button
                      key={hIdx}
                      type="button"
                      onClick={(e) => onDirectWordLookup(hw.word, hw.context, e)}
                      className="px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/60 dark:bg-indigo-950/40 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
                    >
                      {hw.label}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* Right 4 Columns: Main Chrome Extension Popup Dashboard */}
      <aside
        aria-label="WriteBetter AI Chrome Extension Popup"
        className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs"
      >
        {/* Extension Popup Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              W
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                WriteBetter AI
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Chrome Extension Popup · MV3
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('architecture')}
            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Get Extension
          </button>
        </div>

        {/* Extension Popup Navigation Tabs */}
        <div className="grid grid-cols-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-1 gap-1">
          {(
            [
              { id: 'dashboard', label: 'Dashboard', icon: Puzzle },
              { id: 'vocab', label: 'Vocabulary', icon: BookMarked },
              { id: 'history', label: 'History', icon: History },
              { id: 'settings', label: 'Settings', icon: Settings },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setPopupTab(t.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  popupTab === t.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 mb-1" />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Extension Popup Body */}
        <div className="p-4 space-y-4">
          {popupTab === 'dashboard' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Quick-launch any WriteBetter AI module or configure active page behavior:
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('writing')}
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    AI Writing Assistant
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    8 modes · X & LinkedIn hooks · 3 variations
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('factcheck')}
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    AI Fact Checker & Opinion Analyzer
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Claim detection · Grounded web sources · Nuance
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('vocabulary')}
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    My Vocabulary ({vocabulary.length} saved)
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Double-click English-to-Hindi Devanagari & audio
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">
                    Double-Click Hindi Popup
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        doubleClickHindiEnabled: !settings.doubleClickHindiEnabled,
                      })
                    }
                    className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                      settings.doubleClickHindiEnabled
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {settings.doubleClickHindiEnabled ? 'Enabled' : 'Paused'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {popupTab === 'vocab' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Recent Saved Hindi Vocabulary
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('vocabulary')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline cursor-pointer"
                >
                  Open Full Vault →
                </button>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {vocabulary.slice(0, 5).map((v) => (
                  <div
                    key={v.id}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 text-xs"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
                      <span>{v.cleanWord}</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-hindi">
                        {v.hindiMeaningDevanagari}
                      </span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {v.simpleEnglishMeaning}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {popupTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Recent Activity ({history.length})
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('history')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline cursor-pointer"
                >
                  Manage History →
                </button>
              </div>
              {history.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No writing history recorded yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {history.slice(0, 4).map((h) => (
                    <div
                      key={h.id}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 text-xs space-y-1"
                    >
                      <div className="text-slate-500 dark:text-slate-400">
                        {h.platform.toUpperCase()} · {h.modeOrVerdict}
                      </div>
                      <div className="text-slate-800 dark:text-slate-200 line-clamp-2">
                        {h.selectedOutput}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {popupTab === 'settings' && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Auto-detect X & LinkedIn Editors
                </span>
                <input
                  type="checkbox"
                  aria-label="Auto-detect X and LinkedIn Editors"
                  checked={settings.autoDetectEditors}
                  onChange={(e) =>
                    onUpdateSettings({ autoDetectEditors: e.target.checked })
                  }
                  className="rounded border-slate-300"
                />
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Double-Click Hindi Dictionary
                </span>
                <input
                  type="checkbox"
                  aria-label="Double-Click Hindi Dictionary"
                  checked={settings.doubleClickHindiEnabled}
                  onChange={(e) =>
                    onUpdateSettings({ doubleClickHindiEnabled: e.target.checked })
                  }
                  className="rounded border-slate-300"
                />
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Save Local Writing History
                </span>
                <input
                  type="checkbox"
                  aria-label="Save Local Writing History"
                  checked={settings.saveWritingHistory}
                  onChange={(e) =>
                    onUpdateSettings({ saveWritingHistory: e.target.checked })
                  }
                  className="rounded border-slate-300"
                />
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
