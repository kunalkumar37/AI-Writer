import {
  FactCheckResult,
  HindiWordLookupResult,
  WritingAnalysisResult,
  WritingMode,
  WritingModifier,
  WritingPlatform,
} from '../types/writebetter';
import {
  generateFallbackFactCheckResult,
  generateFallbackWritingResult,
  lookupContextualHindiFallback,
} from '../utils/textEngine';

export async function enhanceWritingApi(params: {
  text: string;
  platform: WritingPlatform;
  mode: WritingMode;
  modifier?: WritingModifier;
}): Promise<WritingAnalysisResult> {
  try {
    const response = await fetch('/api/writing/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as WritingAnalysisResult;
  } catch {
    return generateFallbackWritingResult(
      params.text,
      params.platform,
      params.mode,
      params.modifier || 'none'
    );
  }
}

export async function analyzeFactCheckApi(text: string): Promise<FactCheckResult> {
  try {
    const response = await fetch('/api/factcheck/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as FactCheckResult;
  } catch {
    return generateFallbackFactCheckResult(text);
  }
}

export async function lookupHindiWordApi(
  word: string,
  contextSentence: string
): Promise<HindiWordLookupResult> {
  try {
    const response = await fetch('/api/hindi/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, contextSentence }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as HindiWordLookupResult;
  } catch {
    return lookupContextualHindiFallback(word, contextSentence);
  }
}

export function speakEnglishText(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore speech synthesis errors on headless browsers
  }
}
