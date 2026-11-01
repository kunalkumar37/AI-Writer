import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  generateFallbackWritingResult,
  generateFallbackFactCheckResult,
  lookupContextualHindiFallback,
  applyModifierToText,
} from './src/utils/textEngine.ts';
import type {
  WritingPlatform,
  WritingMode,
  WritingModifier,
  WritingAnalysisResult,
  FactCheckResult,
  HindiWordLookupResult,
  VerifiedSource,
} from './src/types/writebetter.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Track temporary quota exhaustion cooldown to avoid hammering the API when rate-limited
let geminiQuotaCooldownUntil = 0;

function isQuotaOrRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('quota') ||
    msg.includes('rate-limit')
  );
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  if (Date.now() < geminiQuotaCooldownUntil) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// In-memory LRU caches to prevent redundant API calls and protect user quota
const writingCache = new Map<string, WritingAnalysisResult>();
const factCheckCache = new Map<string, FactCheckResult>();
const hindiLookupCache = new Map<string, HindiWordLookupResult>();

function isBuiltInFactSample(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return (
    (lower.includes('replace 90%') && lower.includes('software engineers')) ||
    lower === 'remote work makes software engineers less productive.'
  );
}

function isBuiltInWritingSample(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return (
    lower.includes('me and my team is working hardly since 6 months') ||
    lower ===
      'artificial intelligence will replace 90% of software engineers in the next five years. most developers are not preparing for this shift.' ||
    lower ===
      'remote work makes software engineers less productive because people dont talk enough during the day and meetings takes too much time.'
  );
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Allow requests from the Chrome Extension (chrome-extension://*) and local dev
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'WriteBetter AI Backend',
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      quotaActive: Date.now() >= geminiQuotaCooldownUntil,
    });
  });

  // 1. AI Writing Assistant Endpoint
  app.post('/api/writing/enhance', async (req, res) => {
    const {
      text = '',
      platform = 'linkedin',
      mode = 'improve_writing',
      modifier = 'none',
    } = req.body as {
      text?: string;
      platform?: WritingPlatform;
      mode?: WritingMode;
      modifier?: WritingModifier;
    };

    const trimmed = text.trim();
    if (!trimmed) {
      res.status(400).json({ error: 'Please provide text to analyze or rewrite.' });
      return;
    }

    const cacheKey = `${platform}::${mode}::${modifier}::${trimmed.toLowerCase()}`;
    if (modifier !== 'retry' && writingCache.has(cacheKey)) {
      res.json(writingCache.get(cacheKey)!);
      return;
    }

    if (isBuiltInWritingSample(trimmed) && modifier !== 'retry') {
      const instant = generateFallbackWritingResult(trimmed, platform, mode, modifier);
      writingCache.set(cacheKey, instant);
      res.json(instant);
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      const fallback = generateFallbackWritingResult(trimmed, platform, mode, modifier);
      res.json(fallback);
      return;
    }

    try {
      const platformGuidance =
        platform === 'x'
          ? 'Optimize for X (Twitter): strong opening hook, concise & memorable, curiosity gap where natural, conversational rhythm, zero cheesy hashtags or fake clickbait.'
          : platform === 'linkedin'
          ? 'Optimize for LinkedIn: compelling first two lines before the fold, short readable paragraphs, authentic professional insight, and a thoughtful discussion question at the end when appropriate.'
          : 'Optimize for general web writing: natural, clear, well-structured, and articulate English.';

      const modifierInstruction =
        modifier === 'shorter'
          ? 'IMPORTANT MODIFIER: Make all three versions significantly more concise and tighter while keeping the full meaning.'
          : modifier === 'more_engaging'
          ? 'IMPORTANT MODIFIER: Increase reader curiosity, narrative energy, and human warmth across all three versions.'
          : '';

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Analyze and rewrite the following English text for platform "${platform}" using writing mode "${mode}".
${platformGuidance}
${modifierInstruction}

Rules:
- Identify grammar, spelling, punctuation, word choice, or conciseness fixes in the original text.
- Preserve the writer's core meaning and authentic voice. Never sound robotic or use clichés like "In today's fast-paced digital world" or "delve".
- Never guarantee virality or invent fake stories.
- Generate exactly 3 distinct versions:
  1. "Version 1: Natural & Conversational"
  2. "Version 2: Catchy & Engaging"
  3. "Version 3: Professional & Impactful"

Original Text:
"""
${trimmed}
"""`,
        config: {
          systemInstruction:
            'You are WriteBetter AI, an expert English communication coach, editor, and social media strategist for X and LinkedIn.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              grammarIssuesFixed: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    replacement: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    type: { type: Type.STRING },
                  },
                  required: ['original', 'replacement', 'reason', 'type'],
                },
              },
              platformTips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              v1NaturalText: { type: Type.STRING },
              v1ToneTag: { type: Type.STRING },
              v1Improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
              v2CatchyText: { type: Type.STRING },
              v2ToneTag: { type: Type.STRING },
              v2Improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
              v3ProfessionalText: { type: Type.STRING },
              v3ToneTag: { type: Type.STRING },
              v3Improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'grammarIssuesFixed',
              'platformTips',
              'v1NaturalText',
              'v1ToneTag',
              'v1Improvements',
              'v2CatchyText',
              'v2ToneTag',
              'v2Improvements',
              'v3ProfessionalText',
              'v3ToneTag',
              'v3Improvements',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const countWords = (s: string) => (s || '').trim().split(/\s+/).filter(Boolean).length;

      const v1 = applyModifierToText(parsed.v1NaturalText || trimmed, modifier);
      const v2 = applyModifierToText(parsed.v2CatchyText || trimmed, modifier);
      const v3 = applyModifierToText(parsed.v3ProfessionalText || trimmed, modifier);

      const result: WritingAnalysisResult = {
        originalText: trimmed,
        platform,
        mode,
        grammarIssuesFixed: (parsed.grammarIssuesFixed || []).map((g: any) => ({
          original: g.original || '',
          replacement: g.replacement || '',
          reason: g.reason || '',
          type: ['grammar', 'spelling', 'clarity', 'conciseness'].includes(g.type)
            ? g.type
            : 'clarity',
        })),
        platformTips:
          Array.isArray(parsed.platformTips) && parsed.platformTips.length > 0
            ? parsed.platformTips
            : ['Keep sentences concise and lead with your strongest insight.'],
        variations: [
          {
            id: 'v1-natural',
            label: 'Version 1: Natural & Conversational',
            toneTag: parsed.v1ToneTag || 'Natural · Conversational',
            text: v1,
            improvements: parsed.v1Improvements || ['Natural flow and corrected grammar'],
            wordCount: countWords(v1),
            charCount: v1.length,
          },
          {
            id: 'v2-catchy',
            label: 'Version 2: Catchy & Engaging',
            toneTag: parsed.v2ToneTag || 'Compelling Hook · High Engagement',
            text: v2,
            improvements: parsed.v2Improvements || ['Stronger opening hook and rhythm'],
            wordCount: countWords(v2),
            charCount: v2.length,
          },
          {
            id: 'v3-professional',
            label: 'Version 3: Professional & Impactful',
            toneTag: parsed.v3ToneTag || 'Authoritative · Executive',
            text: v3,
            improvements: parsed.v3Improvements || ['Polished structure and credible tone'],
            wordCount: countWords(v3),
            charCount: v3.length,
          },
        ],
        timestamp: new Date().toISOString(),
      };

      writingCache.set(cacheKey, result);
      res.json(result);
    } catch (err) {
      if (isQuotaOrRateLimitError(err)) {
        geminiQuotaCooldownUntil = Date.now() + 60_000;
      }
      const fallback = generateFallbackWritingResult(trimmed, platform, mode, modifier);
      writingCache.set(cacheKey, fallback);
      res.json(fallback);
    }
  });

  // 2. AI Fact Checker & Opinion Analyzer Endpoint (with Google Search Grounding + Quota Protection)
  app.post('/api/factcheck/analyze', async (req, res) => {
    const { text = '' } = req.body as { text?: string };
    const trimmed = text.trim();
    if (!trimmed) {
      res.status(400).json({ error: 'Please provide text to fact-check.' });
      return;
    }

    const cacheKey = trimmed.toLowerCase();
    if (factCheckCache.has(cacheKey)) {
      res.json(factCheckCache.get(cacheKey)!);
      return;
    }

    // Serve verified built-in claims immediately without burning Search Grounding quota
    if (isBuiltInFactSample(trimmed)) {
      const instant = generateFallbackFactCheckResult(trimmed);
      factCheckCache.set(cacheKey, instant);
      res.json(instant);
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      const fallback = generateFallbackFactCheckResult(trimmed);
      res.json(fallback);
      return;
    }

    const promptText = `Fact-check and analyze the claims and opinions in the following statement or draft.
Verify any factual or statistical claims against reliable sources (government data, academic research, official reports, reputable news).
Never invent citations or URLs. If a claim cannot be verified, state "Unverified".

Draft to analyze:
"""
${trimmed}
"""

Provide a detailed JSON object (and ONLY valid JSON, no markdown fences) with this exact structure:
{
  "summaryVerdict": "string summarizing overall factual accuracy and nuance",
  "claims": [
    {
      "id": "claim-1",
      "claimText": "exact claim from text",
      "classification": "Verifiable Fact" | "Statistical Claim" | "Prediction" | "Personal Opinion" | "Assumption" | "Interpretation",
      "verdict": "Supported" | "Partially Supported" | "Misleading" | "Contradicted" | "Unverified" | "Opinion / Non-Factual",
      "confidence": "High" | "Medium" | "Low",
      "explanation": "detailed explanation of whether evidence supports or contradicts this",
      "supportingEvidence": "what evidence supports any part of this",
      "contradictingEvidence": "what evidence contradicts or qualifies this",
      "contextNeeded": "missing context required for accuracy",
      "sources": [
        {
          "title": "Source title",
          "url": "https://...",
          "publisher": "Organization or journal name",
          "publishedDate": "YYYY or YYYY-MM",
          "snippet": "Key takeaway from source"
        }
      ],
      "suggestedAccuratePhrasing": "A more accurate way to express this specific claim"
    }
  ],
  "opinionAnalysis": {
    "overallLogicalConsistency": "evaluation of logical structure",
    "qualityOfArguments": "assessment of argument strength",
    "detectedBiases": ["list of cognitive or framing biases"],
    "missingPerspectives": ["important perspectives omitted"],
    "unsupportedAssumptions": ["assumptions made without proof"],
    "counterarguments": ["strongest counterarguments a thoughtful reader would raise"],
    "nuancedSuggestion": "A more nuanced expression preserving the author's fundamental viewpoint"
  },
  "improvedCredibleVersion": "Complete rewritten version of the user's draft that preserves their core viewpoint, removes unsupported exaggerations, incorporates accurate nuance, and remains engaging."
}`;

    try {
      let groundedResponse;
      try {
        groundedResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: promptText,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
      } catch (searchErr) {
        // If Google Search grounding hits a free-tier 429 rate limit, retry with gemini-3.1-flash-lite without search tool
        if (isQuotaOrRateLimitError(searchErr)) {
          groundedResponse = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: promptText,
            config: {
              responseMimeType: 'application/json',
            },
          });
        } else {
          throw searchErr;
        }
      }

      const groundingSources: VerifiedSource[] = [];
      const chunks = groundedResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (Array.isArray(chunks)) {
        for (const chunk of chunks) {
          if (chunk.web?.uri && chunk.web?.title) {
            groundingSources.push({
              title: chunk.web.title,
              url: chunk.web.uri,
              publisher: new URL(chunk.web.uri).hostname.replace(/^www\./, ''),
            });
          }
        }
      }

      const rawTextOut = (groundedResponse.text ?? '').trim();
      const jsonMatch = rawTextOut.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from fact-check response');
      }
      const parsed = JSON.parse(jsonMatch[0]);

      const fallbackRef = generateFallbackFactCheckResult(trimmed);
      const claims =
        Array.isArray(parsed.claims) && parsed.claims.length > 0
          ? parsed.claims.map((c: any, idx: number) => ({
              id: c.id || `claim-${idx + 1}`,
              claimText: c.claimText || trimmed,
              classification: c.classification || 'Interpretation',
              verdict: c.verdict || 'Partially Supported',
              confidence: c.confidence || 'High',
              explanation: c.explanation || '',
              supportingEvidence: c.supportingEvidence || '',
              contradictingEvidence: c.contradictingEvidence || '',
              contextNeeded: c.contextNeeded || '',
              sources:
                Array.isArray(c.sources) && c.sources.length > 0
                  ? c.sources
                  : groundingSources.length > 0
                  ? groundingSources.slice(0, 3)
                  : fallbackRef.claims[0].sources,
              suggestedAccuratePhrasing: c.suggestedAccuratePhrasing || '',
            }))
          : fallbackRef.claims;

      const result: FactCheckResult = {
        originalText: trimmed,
        summaryVerdict: parsed.summaryVerdict || fallbackRef.summaryVerdict,
        claims,
        opinionAnalysis: {
          overallLogicalConsistency:
            parsed.opinionAnalysis?.overallLogicalConsistency ||
            fallbackRef.opinionAnalysis.overallLogicalConsistency,
          qualityOfArguments:
            parsed.opinionAnalysis?.qualityOfArguments ||
            fallbackRef.opinionAnalysis.qualityOfArguments,
          detectedBiases:
            parsed.opinionAnalysis?.detectedBiases || fallbackRef.opinionAnalysis.detectedBiases,
          missingPerspectives:
            parsed.opinionAnalysis?.missingPerspectives ||
            fallbackRef.opinionAnalysis.missingPerspectives,
          unsupportedAssumptions:
            parsed.opinionAnalysis?.unsupportedAssumptions ||
            fallbackRef.opinionAnalysis.unsupportedAssumptions,
          counterarguments:
            parsed.opinionAnalysis?.counterarguments ||
            fallbackRef.opinionAnalysis.counterarguments,
          nuancedSuggestion:
            parsed.opinionAnalysis?.nuancedSuggestion ||
            fallbackRef.opinionAnalysis.nuancedSuggestion,
        },
        improvedCredibleVersion:
          parsed.improvedCredibleVersion || fallbackRef.improvedCredibleVersion,
        groundingSources:
          groundingSources.length > 0 ? groundingSources : fallbackRef.groundingSources,
        timestamp: new Date().toISOString(),
      };

      factCheckCache.set(cacheKey, result);
      res.json(result);
    } catch (err) {
      if (isQuotaOrRateLimitError(err)) {
        geminiQuotaCooldownUntil = Date.now() + 60_000;
      }
      const fallback = generateFallbackFactCheckResult(trimmed);
      factCheckCache.set(cacheKey, fallback);
      res.json(fallback);
    }
  });

  // 3. Double-Click English-to-Hindi Contextual Learning Assistant Endpoint
  app.post('/api/hindi/lookup', async (req, res) => {
    const { word = '', contextSentence = '' } = req.body as {
      word?: string;
      contextSentence?: string;
    };

    const trimmedWord = word.trim();
    if (!trimmedWord) {
      res.status(400).json({ error: 'Please provide an English word or phrase.' });
      return;
    }

    const cacheKey = `${trimmedWord.toLowerCase()}::${contextSentence.trim().toLowerCase()}`;
    const cached = hindiLookupCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    // Check deterministic curated dictionary first for instant response on known vocabulary words
    const localMatch = lookupContextualHindiFallback(trimmedWord, contextSentence);
    if (
      localMatch.partOfSpeech !== 'Vocabulary Term' &&
      localMatch.partOfSpeech !== 'Phrase / Short Sentence'
    ) {
      hindiLookupCache.set(cacheKey, localMatch);
      res.json(localMatch);
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.json(localMatch);
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Provide a rich, context-aware English-to-Hindi vocabulary explanation for the selected English word or short phrase: "${trimmedWord}"
Surrounding sentence context where the user double-clicked it:
"${contextSentence || trimmedWord}"

Important:
- Consider the exact surrounding sentence context! For example, if a word has multiple meanings (like "fine" meaning अच्छा, जुर्माना, or बारीक), select the meaning that fits the sentence context for "contextualMeaningHindi", and list alternative meanings in "otherMeaningsHindi".
- Provide accurate Devanagari script for Hindi meanings and example sentence translation.`,
        config: {
          systemInstruction:
            'You are a bilingual English-to-Hindi lexicographer and communication teacher.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cleanWord: { type: Type.STRING },
              partOfSpeech: { type: Type.STRING },
              hindiMeaningDevanagari: { type: Type.STRING },
              contextualMeaningHindi: { type: Type.STRING },
              otherMeaningsHindi: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    meaning: { type: Type.STRING },
                    usage: { type: Type.STRING },
                  },
                  required: ['meaning', 'usage'],
                },
              },
              pronunciationIPA: { type: Type.STRING },
              pronunciationPhonetic: { type: Type.STRING },
              hindiTransliteration: { type: Type.STRING },
              simpleEnglishMeaning: { type: Type.STRING },
              contextExplanation: { type: Type.STRING },
              exampleSentenceEnglish: { type: Type.STRING },
              exampleSentenceHindi: { type: Type.STRING },
              everydayConversationExample: { type: Type.STRING },
              synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
              antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'cleanWord',
              'partOfSpeech',
              'hindiMeaningDevanagari',
              'contextualMeaningHindi',
              'otherMeaningsHindi',
              'pronunciationIPA',
              'pronunciationPhonetic',
              'hindiTransliteration',
              'simpleEnglishMeaning',
              'contextExplanation',
              'exampleSentenceEnglish',
              'exampleSentenceHindi',
              'everydayConversationExample',
              'synonyms',
              'antonyms',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const result: HindiWordLookupResult = {
        word: trimmedWord,
        cleanWord: parsed.cleanWord || trimmedWord,
        surroundingContext: contextSentence || parsed.exampleSentenceEnglish || trimmedWord,
        hindiMeaningDevanagari: parsed.hindiMeaningDevanagari || localMatch.hindiMeaningDevanagari,
        contextualMeaningHindi: parsed.contextualMeaningHindi || localMatch.contextualMeaningHindi,
        otherMeaningsHindi:
          Array.isArray(parsed.otherMeaningsHindi) && parsed.otherMeaningsHindi.length > 0
            ? parsed.otherMeaningsHindi
            : localMatch.otherMeaningsHindi,
        pronunciationIPA: parsed.pronunciationIPA || localMatch.pronunciationIPA,
        pronunciationPhonetic: parsed.pronunciationPhonetic || localMatch.pronunciationPhonetic,
        hindiTransliteration: parsed.hindiTransliteration || localMatch.hindiTransliteration,
        simpleEnglishMeaning: parsed.simpleEnglishMeaning || localMatch.simpleEnglishMeaning,
        contextExplanation: parsed.contextExplanation || localMatch.contextExplanation,
        exampleSentenceEnglish: parsed.exampleSentenceEnglish || localMatch.exampleSentenceEnglish,
        exampleSentenceHindi: parsed.exampleSentenceHindi || localMatch.exampleSentenceHindi,
        everydayConversationExample:
          parsed.everydayConversationExample || localMatch.everydayConversationExample,
        synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms : localMatch.synonyms,
        antonyms: Array.isArray(parsed.antonyms) ? parsed.antonyms : localMatch.antonyms,
        partOfSpeech: parsed.partOfSpeech || 'Word',
        timestamp: new Date().toISOString(),
      };

      hindiLookupCache.set(cacheKey, result);
      res.json(result);
    } catch (err) {
      if (isQuotaOrRateLimitError(err)) {
        geminiQuotaCooldownUntil = Date.now() + 60_000;
      }
      hindiLookupCache.set(cacheKey, localMatch);
      res.json(localMatch);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WriteBetter AI Server running on http://localhost:${PORT}`);
  });
}

startServer();
