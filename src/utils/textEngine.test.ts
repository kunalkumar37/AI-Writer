import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanSelectedWord,
  computeTextMetrics,
  classifyClaimSentence,
  lookupContextualHindiFallback,
  generateFallbackWritingResult,
  generateFallbackFactCheckResult,
  applyModifierToText,
} from './textEngine';

test('cleanSelectedWord strips leading and trailing punctuation while preserving word', () => {
  assert.equal(cleanSelectedWord(' "Nevertheless," '), 'Nevertheless');
  assert.equal(cleanSelectedWord('(fine!)'), 'fine');
});

test('computeTextMetrics calculates words, chars, and platform limits for X and LinkedIn', () => {
  const shortTweet = 'Building in public is the fastest way to learn.';
  const xMetrics = computeTextMetrics(shortTweet, 'x');
  assert.equal(xMetrics.wordCount, 9);
  assert.equal(xMetrics.platformLimitStatus, 'optimal');

  const longTweet = 'a'.repeat(290);
  const overMetrics = computeTextMetrics(longTweet, 'x');
  assert.equal(overMetrics.platformLimitStatus, 'over_limit');
});

test('classifyClaimSentence separates statistical predictions from opinions and facts', () => {
  assert.equal(
    classifyClaimSentence('Artificial intelligence will replace 90% of software engineers in the next five years.'),
    'Prediction'
  );
  assert.equal(
    classifyClaimSentence('Remote work makes software engineers less productive.'),
    'Assumption'
  );
  assert.equal(
    classifyClaimSentence('72% of enterprise teams adopted cloud tools last quarter.'),
    'Statistical Claim'
  );
});

test('lookupContextualHindiFallback resolves polysemous word "Fine" based on surrounding sentence context', () => {
  const trafficFine = lookupContextualHindiFallback(
    'fine',
    'He had to pay a heavy fine for violating traffic rules.'
  );
  assert.ok(trafficFine.contextualMeaningHindi.includes('जुर्माना'));

  const fineDetail = lookupContextualHindiFallback(
    'fine',
    'There is a fine line between confidence and arrogance.'
  );
  assert.ok(fineDetail.contextualMeaningHindi.includes('बारीक'));

  const feelingFine = lookupContextualHindiFallback(
    'fine',
    'The deployment went well and everything looks fine today.'
  );
  assert.ok(feelingFine.contextualMeaningHindi.includes('अच्छा'));
});

test('lookupContextualHindiFallback returns exact Devanagari and example for "Nevertheless"', () => {
  const result = lookupContextualHindiFallback(
    'Nevertheless',
    'He was tired; nevertheless, he continued working.'
  );
  assert.equal(result.hindiMeaningDevanagari, 'फिर भी / इसके बावजूद');
  assert.equal(result.exampleSentenceHindi, 'वह थका हुआ था, फिर भी उसने काम जारी रखा।');
});

test('generateFallbackWritingResult produces 3 distinct variations (Natural, Catchy, Professional)', () => {
  const res = generateFallbackWritingResult(
    'Me and my team is working hardly since 6 months to launch our new AI product.',
    'linkedin',
    'improve_writing'
  );
  assert.equal(res.variations.length, 3);
  assert.equal(res.variations[0].label, 'Version 1: Natural & Conversational');
  assert.equal(res.variations[1].label, 'Version 2: Catchy & Engaging');
  assert.equal(res.variations[2].label, 'Version 3: Professional & Impactful');
  assert.ok(res.grammarIssuesFixed.length >= 2);
});

test('generateFallbackFactCheckResult verifies the 90% software engineer replacement claim with real sources', () => {
  const factRes = generateFallbackFactCheckResult(
    'Artificial intelligence will replace 90% of software engineers in the next five years.'
  );
  assert.ok(factRes.claims.length >= 1);
  assert.equal(factRes.claims[0].verdict, 'Contradicted');
  assert.ok(factRes.claims[0].sources.some((s) => s.url.includes('bls.gov')));
  assert.ok(factRes.improvedCredibleVersion.length > 40);
});

test('applyModifierToText shortens or boosts engagement on rewrites', () => {
  const original = 'We are basically really excited to share our new update. It helps teams write faster. It also checks facts.';
  const shorter = applyModifierToText(original, 'shorter');
  assert.ok(shorter.length < original.length);
  const engaging = applyModifierToText('Consistency beats intensity.', 'more_engaging');
  assert.ok(engaging.includes('?'));
});
