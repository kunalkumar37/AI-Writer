export type WritingPlatform = 'x' | 'linkedin' | 'general';

export type WritingMode =
  | 'fix_grammar'
  | 'improve_writing'
  | 'make_catchy'
  | 'make_viral'
  | 'professional'
  | 'conversational'
  | 'concise'
  | 'thought_leadership';

export type WritingModifier = 'none' | 'shorter' | 'more_engaging' | 'retry';

export interface GrammarIssue {
  original: string;
  replacement: string;
  reason: string;
  type: 'grammar' | 'spelling' | 'clarity' | 'conciseness';
}

export interface RewriteVariation {
  id: string;
  label:
    | 'Version 1: Natural & Conversational'
    | 'Version 2: Catchy & Engaging'
    | 'Version 3: Professional & Impactful';
  toneTag: string;
  text: string;
  improvements: string[];
  wordCount: number;
  charCount: number;
}

export interface WritingAnalysisResult {
  originalText: string;
  platform: WritingPlatform;
  mode: WritingMode;
  grammarIssuesFixed: GrammarIssue[];
  platformTips: string[];
  variations: [RewriteVariation, RewriteVariation, RewriteVariation];
  timestamp: string;
}

export type ClaimClassification =
  | 'Verifiable Fact'
  | 'Statistical Claim'
  | 'Prediction'
  | 'Personal Opinion'
  | 'Assumption'
  | 'Interpretation';

export type ClaimVerdict =
  | 'Supported'
  | 'Partially Supported'
  | 'Misleading'
  | 'Contradicted'
  | 'Unverified'
  | 'Opinion / Non-Factual';

export interface VerifiedSource {
  title: string;
  url: string;
  publisher: string;
  publishedDate?: string;
  snippet?: string;
}

export interface ExtractedClaimAnalysis {
  id: string;
  claimText: string;
  classification: ClaimClassification;
  verdict: ClaimVerdict;
  confidence: 'High' | 'Medium' | 'Low';
  explanation: string;
  supportingEvidence: string;
  contradictingEvidence: string;
  contextNeeded: string;
  sources: VerifiedSource[];
  suggestedAccuratePhrasing: string;
}

export interface OpinionArgumentAnalysis {
  overallLogicalConsistency: string;
  qualityOfArguments: string;
  detectedBiases: string[];
  missingPerspectives: string[];
  unsupportedAssumptions: string[];
  counterarguments: string[];
  nuancedSuggestion: string;
}

export interface FactCheckResult {
  originalText: string;
  summaryVerdict: string;
  claims: ExtractedClaimAnalysis[];
  opinionAnalysis: OpinionArgumentAnalysis;
  improvedCredibleVersion: string;
  groundingSources: VerifiedSource[];
  timestamp: string;
}

export interface HindiWordLookupResult {
  word: string;
  cleanWord: string;
  surroundingContext: string;
  hindiMeaningDevanagari: string;
  contextualMeaningHindi: string;
  otherMeaningsHindi: { meaning: string; usage: string }[];
  pronunciationIPA: string;
  pronunciationPhonetic: string;
  hindiTransliteration: string;
  simpleEnglishMeaning: string;
  contextExplanation: string;
  exampleSentenceEnglish: string;
  exampleSentenceHindi: string;
  everydayConversationExample: string;
  synonyms: string[];
  antonyms: string[];
  partOfSpeech: string;
  timestamp: string;
}

export interface SavedVocabularyItem extends HindiWordLookupResult {
  id: string;
  masteryLevel: 'new' | 'learning' | 'mastered';
  reviewCount: number;
  savedAt: string;
  sourceDomain?: string;
}

export interface WritingHistoryItem {
  id: string;
  type: 'writing' | 'fact_check';
  originalText: string;
  selectedOutput: string;
  platform: WritingPlatform;
  modeOrVerdict: string;
  createdAt: string;
}

export interface ReportedSuggestion {
  id: string;
  feature: 'writing' | 'fact_check' | 'hindi';
  originalInput: string;
  aiOutput: string;
  reason: string;
  createdAt: string;
}

export interface ExtensionSettings {
  autoDetectEditors: boolean;
  doubleClickHindiEnabled: boolean;
  phraseTranslationEnabled: boolean;
  saveWritingHistory: boolean;
  defaultPlatform: WritingPlatform;
  defaultMode: WritingMode;
  backendApiUrl: string;
  darkMode: boolean;
}
