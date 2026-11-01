import React, { useEffect, useRef, useState } from 'react';
import {
  Volume2,
  Copy,
  Check,
  BookmarkPlus,
  BookmarkCheck,
  X,
  Flag,
  Sparkles,
} from 'lucide-react';
import { HindiWordLookupResult } from '../types/writebetter';
import { speakEnglishText } from '../services/apiClient';

interface HindiFloatingPopupProps {
  lookup: HindiWordLookupResult | null;
  loading: boolean;
  position: { x: number; y: number } | null;
  isSaved: boolean;
  onClose: () => void;
  onSaveWord: (item: HindiWordLookupResult) => void;
  onReportIssue: (feature: 'hindi', input: string, output: string) => void;
}

export const HindiFloatingPopup: React.FC<HindiFloatingPopupProps> = ({
  lookup,
  loading,
  position,
  isSaved,
  onClose,
  onSaveWord,
  onReportIssue,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onClose]);

  if (!position && !lookup && !loading) return null;

  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 900;

  const safeLeft = position
    ? Math.min(Math.max(16, position.x), Math.max(16, viewportW - 396))
    : 40;
  const safeTop = position
    ? Math.min(Math.max(16, position.y), Math.max(16, viewportH - 520))
    : 80;

  const handleCopy = () => {
    if (!lookup) return;
    const textToCopy = `${lookup.cleanWord} — ${lookup.hindiMeaningDevanagari} (${lookup.contextualMeaningHindi})\nMeaning: ${lookup.simpleEnglishMeaning}\nExample: "${lookup.exampleSentenceEnglish}"\nHindi: "${lookup.exampleSentenceHindi}"`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      ref={popupRef}
      role="dialog"
      aria-label="English to Hindi Contextual Dictionary Popup"
      data-testid="hindi-floating-popup"
      style={{ left: `${safeLeft}px`, top: `${safeTop}px` }}
      className="fixed z-50 w-[376px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-4 text-slate-900 dark:text-slate-100 transition-opacity duration-150"
    >
      {loading && !lookup ? (
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Analyzing word in sentence context...
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Hindi popup"
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="h-5 w-2/3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-14 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        </div>
      ) : lookup ? (
        <div className="space-y-3">
          {/* Header Row: Word, Pronunciation, Actions */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  {lookup.cleanWord}
                </h4>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  · {lookup.partOfSpeech}
                </span>
                <button
                  type="button"
                  onClick={() => speakEnglishText(lookup.cleanWord)}
                  aria-label={`Pronounce ${lookup.cleanWord}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-md transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span className="font-mono">{lookup.pronunciationIPA}</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pronunciation: {lookup.pronunciationPhonetic} · Transliteration:{' '}
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {lookup.hindiTransliteration}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Hindi popup"
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary & Contextual Devanagari Meaning */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200/80 dark:border-slate-700/70">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
              Hindi Meaning (Devanagari) · Contextual Match
            </div>
            <div
              className="text-base font-bold text-indigo-700 dark:text-indigo-300 font-hindi leading-snug"
              data-testid="hindi-popup-devanagari"
            >
              {lookup.hindiMeaningDevanagari}
            </div>
            <div className="text-xs font-medium text-slate-700 dark:text-slate-200 font-hindi mt-1">
              इस वाक्य के प्रसंग में: {lookup.contextualMeaningHindi}
            </div>
          </div>

          {/* Simple English & Context Note */}
          <div className="space-y-1.5 text-xs leading-relaxed">
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Simple English:{' '}
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                {lookup.simpleEnglishMeaning}
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Context Note:{' '}
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                {lookup.contextExplanation}
              </span>
            </div>
          </div>

          {/* Polysemy / Alternative Meanings if applicable */}
          {lookup.otherMeaningsHindi && lookup.otherMeaningsHindi.length > 1 && (
            <div className="text-xs border-t border-slate-100 dark:border-slate-800 pt-2">
              <div className="text-slate-500 dark:text-slate-400 mb-1">
                Meanings by Context:
              </div>
              <div className="space-y-1">
                {lookup.otherMeaningsHindi.map((om, idx) => (
                  <div
                    key={idx}
                    className="flex items-baseline justify-between gap-2 text-slate-700 dark:text-slate-300"
                  >
                    <span className="font-semibold font-hindi shrink-0">{om.meaning}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-right truncate">
                      {om.usage}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Example Sentence + Hindi Translation */}
          <div className="rounded-lg bg-slate-50/70 dark:bg-slate-800/40 p-2.5 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1">
            <div className="text-slate-800 dark:text-slate-200 font-medium">
              Example: &ldquo;{lookup.exampleSentenceEnglish}&rdquo;
            </div>
            <div className="text-slate-600 dark:text-slate-300 font-hindi">
              हिंदी अनुवाद: &ldquo;{lookup.exampleSentenceHindi}&rdquo;
            </div>
          </div>

          {/* Synonyms & Antonyms */}
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
            <div className="truncate">
              <span className="font-medium text-slate-700 dark:text-slate-300">Synonyms: </span>
              {lookup.synonyms.slice(0, 3).join(' · ')}
            </div>
            {lookup.antonyms.length > 0 && (
              <div className="truncate shrink-0">
                <span className="font-medium text-slate-700 dark:text-slate-300">Antonym: </span>
                {lookup.antonyms[0]}
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onSaveWord(lookup)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isSaved
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-900 dark:bg-indigo-600 text-white hover:bg-slate-800 dark:hover:bg-indigo-500'
                }`}
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    <span>Saved in Vocabulary</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>Save Word</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                onReportIssue(
                  'hindi',
                  lookup.cleanWord,
                  `${lookup.hindiMeaningDevanagari} (${lookup.contextualMeaningHindi})`
                )
              }
              aria-label="Report inaccurate Hindi meaning"
              className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg transition-colors"
              title="Report inaccurate suggestion"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
