import React, { useState } from 'react';
import {
  Volume2,
  Search,
  Trash2,
  BookOpen,
  RotateCw,
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { HindiWordLookupResult, SavedVocabularyItem } from '../types/writebetter';
import { speakEnglishText } from '../services/apiClient';

interface VocabularyVaultViewProps {
  vocabulary: SavedVocabularyItem[];
  onToggleMastery: (id: string) => void;
  onDeleteWord: (id: string) => void;
  onManualLookup: (word: string, contextSentence: string) => Promise<void>;
  manualLookupLoading: boolean;
  lastLookupResult: HindiWordLookupResult | null;
  onSaveLookupResult: (item: HindiWordLookupResult) => void;
}

const CONTEXT_TEST_PRESETS = [
  {
    label: 'Nevertheless (Transition)',
    word: 'Nevertheless',
    context: 'He was tired; nevertheless, he continued working.',
  },
  {
    label: 'Fine (Traffic Penalty — जुर्माना)',
    word: 'fine',
    context: 'He had to pay a heavy fine for parking in a no-parking zone.',
  },
  {
    label: 'Fine (Subtle Detail — बारीक)',
    word: 'fine',
    context: 'There is a fine line between confidence and arrogance.',
  },
  {
    label: 'Fine (Good Quality — अच्छा)',
    word: 'fine',
    context: 'The project schedule looks fine to me.',
  },
  {
    label: 'Pragmatic (Engineering)',
    word: 'pragmatic',
    context: 'Successful engineering leaders take a pragmatic approach to technical debt.',
  },
];

export const VocabularyVaultView: React.FC<VocabularyVaultViewProps> = ({
  vocabulary,
  onToggleMastery,
  onDeleteWord,
  onManualLookup,
  manualLookupLoading,
  lastLookupResult,
  onSaveLookupResult,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMastery, setFilterMastery] = useState<'all' | 'new' | 'learning' | 'mastered'>('all');
  const [testWordInput, setTestWordInput] = useState('Nevertheless');
  const [testContextInput, setTestContextInput] = useState(
    'He was tired; nevertheless, he continued working.'
  );
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredVocab = vocabulary.filter((item) => {
    const matchesSearch =
      item.cleanWord.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.hindiMeaningDevanagari.includes(searchQuery) ||
      item.simpleEnglishMeaning.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMastery = filterMastery === 'all' || item.masteryLevel === filterMastery;
    return matchesSearch && matchesMastery;
  });

  const handleCopyItem = (item: SavedVocabularyItem) => {
    navigator.clipboard.writeText(
      `${item.cleanWord}: ${item.hindiMeaningDevanagari} (${item.contextualMeaningHindi}) — ${item.simpleEnglishMeaning}`
    );
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  return (
    <div className="space-y-6">
      {/* Context-Aware English-to-Hindi Tester & Phrase Translator */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Contextual English-to-Hindi Learning Assistant
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Double-click any English word anywhere in the app, or test how surrounding sentence context changes Hindi meanings below.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {CONTEXT_TEST_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setTestWordInput(preset.word);
                  setTestContextInput(preset.context);
                  onManualLookup(preset.word, preset.context);
                }}
                className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (testWordInput.trim()) {
              onManualLookup(testWordInput, testContextInput);
            }
          }}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-3">
            <label
              htmlFor="vocab-word-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              English Word or Short Phrase
            </label>
            <input
              id="vocab-word-input"
              type="text"
              value={testWordInput}
              onChange={(e) => setTestWordInput(e.target.value)}
              placeholder="e.g., Nevertheless, fine, ubiquitous"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <div className="md:col-span-6">
            <label
              htmlFor="vocab-context-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Surrounding Sentence Context (Determines exact Hindi sense)
            </label>
            <input
              id="vocab-context-input"
              type="text"
              value={testContextInput}
              onChange={(e) => setTestContextInput(e.target.value)}
              placeholder="Enter the sentence where the word appears..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={manualLookupLoading || !testWordInput.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{manualLookupLoading ? 'Translating...' : 'Explain in Hindi'}</span>
            </button>
          </div>
        </form>

        {/* Instant Result Preview */}
        {lastLookupResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-5 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {lastLookupResult.cleanWord}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  · {lastLookupResult.partOfSpeech} · {lastLookupResult.pronunciationIPA}
                </span>
                <button
                  type="button"
                  onClick={() => speakEnglishText(lastLookupResult.cleanWord)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Listen</span>
                </button>
              </div>
              <div className="text-base font-bold text-indigo-700 dark:text-indigo-300 font-hindi">
                {lastLookupResult.hindiMeaningDevanagari}
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300 font-hindi">
                प्रसंग के अनुसार अर्थ: <strong>{lastLookupResult.contextualMeaningHindi}</strong>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Simple English: {lastLookupResult.simpleEnglishMeaning}
              </div>
            </div>

            <div className="lg:col-span-5 text-xs space-y-1.5 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-3 lg:pt-0 lg:pl-4">
              <div className="text-slate-800 dark:text-slate-200 font-medium">
                Example: &ldquo;{lastLookupResult.exampleSentenceEnglish}&rdquo;
              </div>
              <div className="text-slate-600 dark:text-slate-300 font-hindi">
                हिंदी अनुवाद: &ldquo;{lastLookupResult.exampleSentenceHindi}&rdquo;
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                Everyday Use: &ldquo;{lastLookupResult.everydayConversationExample}&rdquo;
              </div>
            </div>

            <div className="lg:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={() => onSaveLookupResult(lastLookupResult)}
                className="px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Save to Collection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Personal Vocabulary Vault Header & Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              My Saved Vocabulary Collection ({vocabulary.length} words)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Revisit difficult English words saved while browsing X, LinkedIn, and articles
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setReviewMode(!reviewMode);
                setReviewIndex(0);
                setShowFlashcardAnswer(false);
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                reviewMode
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{reviewMode ? 'Exit Flashcard Revision' : 'Practice Flashcards'}</span>
            </button>
          </div>
        </div>

        {/* Interactive Flashcard Review Mode */}
        {reviewMode && vocabulary.length > 0 && (
          <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Flashcard {reviewIndex + 1} of {vocabulary.length} ·{' '}
              {vocabulary[reviewIndex].partOfSpeech}
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {vocabulary[reviewIndex].cleanWord}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Context: &ldquo;{vocabulary[reviewIndex].surroundingContext}&rdquo;
            </div>

            {showFlashcardAnswer ? (
              <div className="max-w-lg mx-auto p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-hindi">
                  {vocabulary[reviewIndex].hindiMeaningDevanagari}
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300">
                  {vocabulary[reviewIndex].simpleEnglishMeaning}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-hindi">
                  {vocabulary[reviewIndex].exampleSentenceHindi}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowFlashcardAnswer(true)}
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
              >
                Reveal Hindi Meaning & Example
              </button>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowFlashcardAnswer(false);
                  setReviewIndex((prev) => (prev + 1) % vocabulary.length);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Next Word</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleMastery(vocabulary[reviewIndex].id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Status: {vocabulary[reviewIndex].masteryLevel}</span>
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Search saved vocabulary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search English word, Hindi Devanagari, or meaning..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {(['all', 'new', 'learning', 'mastered'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setFilterMastery(level)}
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filterMastery === level
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Vocabulary Grid */}
        {filteredVocab.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500 dark:text-slate-400">
            No matching words found. Double-click any English word in the simulator or use the lookup bar above to add words.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="saved-vocabulary-grid">
            {filteredVocab.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {item.cleanWord}
                        </h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          · {item.partOfSpeech} · {item.pronunciationIPA}
                        </span>
                        <button
                          type="button"
                          onClick={() => speakEnglishText(item.cleanWord)}
                          aria-label={`Pronounce ${item.cleanWord}`}
                          className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300 font-hindi mt-0.5">
                        {item.hindiMeaningDevanagari} — {item.contextualMeaningHindi}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleMastery(item.id)}
                        className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium capitalize text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        {item.masteryLevel}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyItem(item)}
                        aria-label={`Copy ${item.cleanWord}`}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteWord(item.id)}
                        aria-label={`Delete ${item.cleanWord}`}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {item.simpleEnglishMeaning}
                  </p>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-xs space-y-1">
                    <div className="text-slate-800 dark:text-slate-200">
                      &ldquo;{item.exampleSentenceEnglish}&rdquo;
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 font-hindi">
                      &ldquo;{item.exampleSentenceHindi}&rdquo;
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span>Synonyms: {item.synonyms.slice(0, 3).join(' · ')}</span>
                  <span className="tabular-nums">Transliteration: {item.hindiTransliteration}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
