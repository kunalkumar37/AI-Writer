import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  Copy,
  RotateCcw,
  ArrowRightLeft,
  Minimize2,
  Flame,
  Flag,
  Undo2,
  ShieldCheck,
} from 'lucide-react';
import {
  WritingAnalysisResult,
  WritingMode,
  WritingModifier,
  WritingPlatform,
} from '../types/writebetter';
import { computeTextMetrics } from '../utils/textEngine';

interface WritingStudioViewProps {
  draftText: string;
  setDraftText: (text: string) => void;
  platform: WritingPlatform;
  setPlatform: (p: WritingPlatform) => void;
  mode: WritingMode;
  setMode: (m: WritingMode) => void;
  result: WritingAnalysisResult | null;
  loading: boolean;
  onRunEnhance: (modifier?: WritingModifier) => void;
  onSwitchToFactCheck: (textToVerify: string) => void;
  onReportIssue: (feature: 'writing', input: string, output: string) => void;
  onWordDoubleClick: (e: React.MouseEvent<HTMLElement>, contextText: string) => void;
}

export const WRITING_MODES: { id: WritingMode; label: string; desc: string }[] = [
  { id: 'fix_grammar', label: 'Fix Grammar', desc: 'Correct mistakes without changing your voice' },
  { id: 'improve_writing', label: 'Improve Writing', desc: 'More natural, clear, and readable' },
  { id: 'make_catchy', label: 'Make It Catchy', desc: 'Attention-grabbing opening and rhythm' },
  { id: 'make_viral', label: 'Make It Viral', desc: 'Optimize for curiosity, relatability, and shares' },
  { id: 'professional', label: 'Professional', desc: 'Polished tone for business & LinkedIn' },
  { id: 'conversational', label: 'Conversational', desc: 'Warm, authentic, human-sounding English' },
  { id: 'concise', label: 'Powerful & Concise', desc: 'Express the same idea in fewer, stronger words' },
  { id: 'thought_leadership', label: 'Thought Leadership', desc: 'Insightful, credible, and authoritative' },
];

const SAMPLE_DRAFTS: { label: string; platform: WritingPlatform; mode: WritingMode; text: string }[] = [
  {
    label: 'Grammar & Clarity Fix (LinkedIn)',
    platform: 'linkedin',
    mode: 'improve_writing',
    text: 'Me and my team is working hardly since 6 months to launch our new AI product that will make our users life easier.',
  },
  {
    label: 'X (Twitter) Hook & Thread Opener',
    platform: 'x',
    mode: 'make_viral',
    text: 'Artificial intelligence will replace 90% of software engineers in the next five years. Most developers are not preparing for this shift.',
  },
  {
    label: 'Thought Leadership Post (LinkedIn)',
    platform: 'linkedin',
    mode: 'thought_leadership',
    text: 'Remote work makes software engineers less productive because people dont talk enough during the day and meetings takes too much time.',
  },
];

export const WritingStudioView: React.FC<WritingStudioViewProps> = ({
  draftText,
  setDraftText,
  platform,
  setPlatform,
  mode,
  setMode,
  result,
  loading,
  onRunEnhance,
  onSwitchToFactCheck,
  onReportIssue,
  onWordDoubleClick,
}) => {
  const [previousOriginalBackup, setPreviousOriginalBackup] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [replacedId, setReplacedId] = useState<string | null>(null);

  const metrics = computeTextMetrics(draftText, platform);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleReplaceOriginal = (id: string, newText: string) => {
    if (!previousOriginalBackup) {
      setPreviousOriginalBackup(draftText);
    }
    setDraftText(newText);
    setReplacedId(id);
    setTimeout(() => setReplacedId(null), 2000);
  };

  const handleRestoreOriginal = () => {
    if (previousOriginalBackup !== null) {
      setDraftText(previousOriginalBackup);
      setPreviousOriginalBackup(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar: Platform Target + Quick Preset Samples */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Target Platform:
          </span>
          <div
            role="group"
            aria-label="Target Writing Platform"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
          >
            {(
              [
                { id: 'x', label: 'X (Twitter)' },
                { id: 'linkedin', label: 'LinkedIn' },
                { id: 'general', label: 'General Web' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatform(p.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  platform === p.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Load Sample:</span>
          {SAMPLE_DRAFTS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPlatform(sample.platform);
                setMode(sample.mode);
                setDraftText(sample.text);
              }}
              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-colors whitespace-nowrap shrink-0"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* 8 Rewriting Style Modes */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Select AI Writing Enhancement Style
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Generates 3 tailored versions (Natural · Catchy · Professional)
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {WRITING_MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  active
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-800/20 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="text-xs font-semibold whitespace-nowrap truncate">{m.label}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  {m.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Side-by-Side Comparison Grid: Original Editor vs 3 AI Variations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (5 cols): Original Draft Editor + Grammar Breakdown */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <label
                  htmlFor="studio-original-editor"
                  className="text-sm font-semibold text-slate-900 dark:text-white block"
                >
                  Your Original Draft
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Never overwritten without your explicit permission
                </p>
              </div>
              {previousOriginalBackup !== null && (
                <button
                  type="button"
                  onClick={handleRestoreOriginal}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Restore Original</span>
                </button>
              )}
            </div>

            <textarea
              id="studio-original-editor"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onDoubleClick={(e) => onWordDoubleClick(e, draftText)}
              rows={5}
              placeholder="Write or paste your English post, tweet, LinkedIn article, or email here..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 p-3.5 text-sm leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-y"
            />

            {/* Metrics Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <div className="flex items-center gap-2">
                <span>{metrics.wordCount} words</span>
                <span aria-hidden="true">·</span>
                <span>{metrics.sentenceCount} sentences</span>
                <span aria-hidden="true">·</span>
                <span
                  className={
                    metrics.platformLimitStatus === 'over_limit'
                      ? 'text-red-600 dark:text-red-400 font-medium'
                      : metrics.platformLimitStatus === 'near_limit'
                      ? 'text-amber-600 dark:text-amber-400 font-medium'
                      : 'text-emerald-600 dark:text-emerald-400 font-medium'
                  }
                >
                  {metrics.platformLimitLabel}
                </span>
              </div>
              {metrics.detectedFillerWords.length > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  Fillers: {metrics.detectedFillerWords.join(', ')}
                </span>
              )}
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 mt-4">
              <button
                type="button"
                disabled={loading || !draftText.trim()}
                onClick={() => onRunEnhance('none')}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loading ? 'Generating 3 Versions...' : 'Enhance Writing'}</span>
              </button>

              <button
                type="button"
                onClick={() => onSwitchToFactCheck(draftText)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Fact Check Claims</span>
              </button>
            </div>
          </div>

          {/* Grammar & Platform Insights Card */}
          {result && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                  Automatic English Corrections & Platform Optimization
                </h4>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {result.grammarIssuesFixed.length} improvements identified
                </span>
              </div>

              {result.grammarIssuesFixed.length > 0 && (
                <div className="space-y-2">
                  {result.grammarIssuesFixed.map((issue, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="line-through text-red-600 dark:text-red-400">
                          {issue.original}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {issue.replacement}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 dark:text-slate-400 capitalize">
                          {issue.type}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">{issue.reason}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Platform Strategy ({platform === 'x' ? 'X / Twitter' : platform === 'linkedin' ? 'LinkedIn' : 'Web'}):
                </div>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {result.platformTips.map((tip, i) => (
                    <li key={i}>• {tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (7 cols): 3 Alternative Versions Side-by-Side + Global Modifiers */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Global Modifier Bar: Try Again, Make Shorter, Make More Engaging */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              3 Alternative Rewrites (Double-click any word for Hindi meaning)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => onRunEnhance('retry')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => onRunEnhance('shorter')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Make Shorter</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => onRunEnhance('more_engaging')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Make More Engaging</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3"
                >
                  <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  <div className="h-16 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  <div className="h-8 w-64 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : result ? (
            <div className="space-y-4" data-testid="writing-variations-list">
              {result.variations.map((v) => (
                <div
                  key={v.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {v.label}
                      </h4>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        · {v.toneTag}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {v.wordCount} words · {v.charCount} chars
                    </div>
                  </div>

                  <div
                    onDoubleClick={(e) => onWordDoubleClick(e, v.text)}
                    className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800 text-sm leading-relaxed text-slate-900 dark:text-slate-100 whitespace-pre-line select-text cursor-text"
                  >
                    {v.text}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {v.improvements.join(' · ')}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(v.id, v.text)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {copiedId === v.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReplaceOriginal(v.id, v.text)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {replacedId === v.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Replaced Draft</span>
                          </>
                        ) : (
                          <>
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Replace Original</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onReportIssue('writing', draftText, v.text)}
                        aria-label={`Report suggestion for ${v.label}`}
                        title="Report inaccurate AI suggestion"
                        className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg transition-colors"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
