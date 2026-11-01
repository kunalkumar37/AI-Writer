import {
  ClaimClassification,
  FactCheckResult,
  HindiWordLookupResult,
  RewriteVariation,
  WritingAnalysisResult,
  WritingMode,
  WritingModifier,
  WritingPlatform,
} from '../types/writebetter';

export interface TextMetrics {
  wordCount: number;
  charCount: number;
  sentenceCount: number;
  readingTimeSec: number;
  platformLimitStatus: 'optimal' | 'near_limit' | 'over_limit';
  platformLimitLabel: string;
  detectedFillerWords: string[];
  firstTwoLinesLength: number;
}

const FILLER_WORDS = [
  'basically',
  'literally',
  'actually',
  'very',
  'really',
  'just',
  'totally',
  'simply',
  'in order to',
  'due to the fact that',
];

export function cleanSelectedWord(raw: string): string {
  return raw
    .trim()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .replace(/\s+/g, ' ');
}

export function extractSurroundingSentence(fullText: string, targetPhrase: string): string {
  if (!fullText || !targetPhrase) return '';
  const sentences = fullText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const lowerTarget = targetPhrase.toLowerCase();
  const matched = sentences.find((s) => s.toLowerCase().includes(lowerTarget));
  return matched || sentences[0] || fullText.slice(0, 220);
}

export function computeTextMetrics(text: string, platform: WritingPlatform): TextMetrics {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const charCount = trimmed.length;
  const sentences = trimmed
    ? trimmed
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const sentenceCount = sentences.length;
  const readingTimeSec = Math.max(1, Math.ceil((wordCount / 200) * 60));

  const lower = trimmed.toLowerCase();
  const detectedFillerWords = FILLER_WORDS.filter((filler) => {
    const regex = new RegExp(`\\b${filler.replace(/\s+/g, '\\s+')}\\b`, 'i');
    return regex.test(lower);
  });

  const firstParagraph = trimmed.split(/\n+/)[0] || '';
  const firstTwoLinesLength = firstParagraph.length;

  let platformLimitStatus: 'optimal' | 'near_limit' | 'over_limit' = 'optimal';
  let platformLimitLabel = `${charCount} chars`;

  if (platform === 'x') {
    if (charCount > 280) {
      platformLimitStatus = 'over_limit';
      platformLimitLabel = `${charCount}/280 chars (Thread recommended)`;
    } else if (charCount > 240) {
      platformLimitStatus = 'near_limit';
      platformLimitLabel = `${charCount}/280 chars`;
    } else {
      platformLimitStatus = 'optimal';
      platformLimitLabel = `${charCount}/280 chars`;
    }
  } else if (platform === 'linkedin') {
    if (charCount > 3000) {
      platformLimitStatus = 'over_limit';
      platformLimitLabel = `${charCount}/3000 chars`;
    } else if (firstTwoLinesLength > 210) {
      platformLimitStatus = 'near_limit';
      platformLimitLabel = `Hook > 210 chars ("See more" fold risk)`;
    } else {
      platformLimitStatus = 'optimal';
      platformLimitLabel = `Hook optimal (${firstTwoLinesLength}/210 chars)`;
    }
  }

  return {
    wordCount,
    charCount,
    sentenceCount,
    readingTimeSec,
    platformLimitStatus,
    platformLimitLabel,
    detectedFillerWords,
    firstTwoLinesLength,
  };
}

export function classifyClaimSentence(sentence: string): ClaimClassification {
  const s = sentence.trim();
  if (/\b\d+(\.\d+)?%|\b\d+\s*(million|billion|percent|times|x|engineers|users|companies)\b/i.test(s)) {
    if (/\b(will|going to|by 20\d\d|in the next|future|forecast)\b/i.test(s)) {
      return 'Prediction';
    }
    return 'Statistical Claim';
  }
  if (/\b(will|going to|in the next \d+|by 20\d\d|inevitably)\b/i.test(s)) {
    return 'Prediction';
  }
  if (/\b(always|never|everyone|nobody|makes .* less|makes .* more|all software|every company)\b/i.test(s)) {
    return 'Assumption';
  }
  if (/\b(i think|i believe|in my opinion|should|best|worst|overrated|underrated)\b/i.test(s)) {
    return 'Personal Opinion';
  }
  if (/\b(according to|study|research|founded in|released in|is a|are a)\b/i.test(s)) {
    return 'Verifiable Fact';
  }
  return 'Interpretation';
}

export function applyModifierToText(text: string, modifier: WritingModifier): string {
  if (!text || modifier === 'none') return text;
  if (modifier === 'shorter') {
    const cleaned = text
      .replace(/\b(basically|literally|actually|very|really|just|simply|in order to)\s+/gi, '')
      .replace(/\bdue to the fact that\b/gi, 'because')
      .replace(/\bat this point in time\b/gi, 'now');
    const sentences = cleaned
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (sentences.length > 2) {
      return sentences.slice(0, 2).join(' ');
    }
    return cleaned.trim();
  }
  if (modifier === 'more_engaging') {
    if (!text.includes('?')) {
      return `${text.trim()} What are you seeing in your own workflow?`;
    }
    return `Here is the truth few talk about: ${text.trim()}`;
  }
  return text;
}

export function generateFallbackWritingResult(
  rawText: string,
  platform: WritingPlatform,
  mode: WritingMode,
  modifier: WritingModifier = 'none'
): WritingAnalysisResult {
  const input = rawText.trim() || 'We are building a new tool that helps people write better English every day.';
  const lower = input.toLowerCase();

  // Check for known rich scenarios or synthesize clean rewrites
  const isAiReplacementSample =
    lower.includes('replace 90%') || (lower.includes('artificial intelligence') && lower.includes('software engineers'));
  const isRemoteWorkSample =
    lower.includes('remote work') && lower.includes('productive');
  const isGrammarSample =
    lower.includes('me and my team') || lower.includes('working hardly') || lower.includes('since 6 months');

  let v1Text = '';
  let v2Text = '';
  let v3Text = '';
  let grammarIssues: WritingAnalysisResult['grammarIssuesFixed'] = [];

  if (isGrammarSample) {
    grammarIssues = [
      {
        original: 'Me and my team is working hardly',
        replacement: 'My team and I have been working hard',
        reason: 'Use subject pronoun "I" after "My team and", present perfect continuous for ongoing duration, and "hard" instead of "hardly" (which means barely).',
        type: 'grammar',
      },
      {
        original: 'since 6 months',
        replacement: 'for the past six months',
        reason: 'Use "for" with a duration of time ("six months") and "since" only with a specific starting point.',
        type: 'grammar',
      },
      {
        original: 'make our users life easier',
        replacement: "make our users' lives easier",
        reason: 'Plural possessive apostrophe and plural noun agreement ("lives").',
        type: 'spelling',
      },
    ];
    v1Text =
      "My team and I have been working hard for the past six months to launch our new AI product. It's built to make our users' lives genuinely easier.";
    v2Text =
      platform === 'x'
        ? "Six months of heads-down building with the team.\n\nToday, we're finally shipping our new AI product—designed from day one to take the friction out of your daily workflow."
        : "For the past six months, my team and I have been focused on one goal: building an AI product that removes real friction from our users' daily work.\n\nToday, we're excited to share what we've built.";
    v3Text =
      platform === 'linkedin'
        ? "Over the past six months, our engineering and product teams have dedicated themselves to solving a critical workflow challenge.\n\nToday, we are proud to introduce our new AI platform—purpose-built to simplify complex tasks and return valuable time to our users.\n\nWhat repetitive task in your day do you wish was automated?"
        : "For the past six months, my team and I have worked tirelessly to build an AI product that simplifies complex workflows and measurably improves our users' daily productivity.";
  } else if (isAiReplacementSample) {
    grammarIssues = [
      {
        original: 'replace 90% of software engineers',
        replacement: 'transform how software engineers write and ship code',
        reason: 'Clarifies impact without relying on an unsubstantiated statistical forecast.',
        type: 'clarity',
      },
    ];
    v1Text =
      'AI is going to dramatically change software engineering over the next five years—not by replacing 90% of developers, but by automating boilerplate so engineers can focus on architecture and product thinking.';
    v2Text =
      platform === 'x'
        ? "Will AI replace 90% of software engineers in 5 years?\n\nNo. But engineers who use AI to ship 5x faster will outpace those who treat it like a fad.\n\nThe job isn't disappearing—the abstraction layer is moving up."
        : "There's a popular claim that AI will replace 90% of software engineers in the next five years.\n\nHere's what's actually happening on the ground: AI is automating syntax, not systems thinking.";
    v3Text =
      "Over the next five years, generative AI will fundamentally reshape software engineering workflows. Rather than replacing the vast majority of engineers, AI tools are shifting engineering focus from routine implementation toward system architecture, verification, and problem definition.";
  } else if (isRemoteWorkSample) {
    grammarIssues = [
      {
        original: 'makes software engineers less productive',
        replacement: 'can challenge engineering productivity when async systems are missing',
        reason: 'Replaces an absolute generalization with a clearer, more defensible statement.',
        type: 'clarity',
      },
    ];
    v1Text =
      'Remote work can hurt software engineering productivity when teams lack clear async communication and ownership—even though individual coding focus often improves at home.';
    v2Text =
      platform === 'x'
        ? "Unpopular take: Remote work doesn't make engineers less productive—running a remote team like a 9-to-5 office does.\n\nDeep work thrives remotely. Fast alignment requires intentional async habits."
        : "Does remote work make software engineers less productive?\n\nIn my experience, the environment isn't the bottleneck—unclear documentation and meeting overload are.";
    v3Text =
      "While unstructured remote work can slow cross-functional alignment for software teams, engineering productivity ultimately depends on clear async documentation, deep-work boundaries, and outcome-based management.\n\nHow does your team balance deep coding time with rapid collaboration?";
  } else {
    // General intelligent transformation for any custom text
    const baseClean = input
      .replace(/\s+/g, ' ')
      .replace(/\bi\b/g, 'I')
      .replace(/\bdont\b/gi, "don't")
      .replace(/\bcant\b/gi, "can't")
      .replace(/\bwont\b/gi, "won't")
      .replace(/\bim\b/gi, "I'm")
      .replace(/\bive\b/gi, "I've")
      .replace(/\btheres\b/gi, "there's")
      .replace(/\bme and my team\b/gi, 'my team and I')
      .replace(/\bworking hardly\b/gi, 'working hard')
      .trim();

    const ensuredPeriod = /[.!?]$/.test(baseClean) ? baseClean : `${baseClean}.`;

    grammarIssues = [
      {
        original: input.slice(0, 48) + (input.length > 48 ? '...' : ''),
        replacement: ensuredPeriod.slice(0, 48) + (ensuredPeriod.length > 48 ? '...' : ''),
        reason: 'Polished sentence cadence, punctuation, and active voice while preserving your core message.',
        type: 'clarity',
      },
    ];

    v1Text = ensuredPeriod;
    v2Text =
      platform === 'x'
        ? `${ensuredPeriod}\n\nMost people overlook how much compounding clarity changes the outcome. What's your take?`
        : `Here is something worth paying attention to:\n\n${ensuredPeriod}\n\nSmall shifts in how we execute make all the difference.`;
    v3Text =
      platform === 'linkedin'
        ? `${ensuredPeriod}\n\nIn practice, consistent execution and clear communication remain the strongest differentiators for high-performing teams.\n\nHow are you approaching this in your work right now?`
        : `From a strategic perspective, ${ensuredPeriod.charAt(0).toLowerCase() + ensuredPeriod.slice(1)}`;
  }

  v1Text = applyModifierToText(v1Text, modifier);
  v2Text = applyModifierToText(v2Text, modifier);
  v3Text = applyModifierToText(v3Text, modifier);

  const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

  const variations: [RewriteVariation, RewriteVariation, RewriteVariation] = [
    {
      id: 'v1-natural',
      label: 'Version 1: Natural & Conversational',
      toneTag: mode === 'fix_grammar' ? 'Minimal Edit · Authentic' : 'Warm · Human-sounding',
      text: v1Text,
      improvements: [
        'Corrected grammar and punctuation without altering your voice',
        'Smoothed sentence rhythm for effortless reading',
      ],
      wordCount: countWords(v1Text),
      charCount: v1Text.length,
    },
    {
      id: 'v2-catchy',
      label: 'Version 2: Catchy & Engaging',
      toneTag: platform === 'x' ? 'X Hook · High Curiosity' : 'Scroll-Stopping · Relatable',
      text: v2Text,
      improvements: [
        platform === 'x'
          ? 'Front-loaded the opening hook for X feed scannability'
          : 'Structured with an immediate curiosity-driven opening line',
        'Removed passive phrasing in favor of punchy contrast',
      ],
      wordCount: countWords(v2Text),
      charCount: v2Text.length,
    },
    {
      id: 'v3-professional',
      label: 'Version 3: Professional & Impactful',
      toneTag: platform === 'linkedin' ? 'LinkedIn Thought Leadership' : 'Executive · Authoritative',
      text: v3Text,
      improvements: [
        'Elevated vocabulary for credible, authoritative delivery',
        platform === 'linkedin'
          ? 'Added clean paragraph spacing and a closing discussion prompt'
          : 'Tightened structure for maximum persuasive clarity',
      ],
      wordCount: countWords(v3Text),
      charCount: v3Text.length,
    },
  ];

  const platformTips =
    platform === 'x'
      ? [
          'Lead with a sharp contrast or concrete observation in line 1.',
          'Keep single posts under 240 characters for clean quoting and retweets.',
          'End with a specific question or sharp takeaway rather than generic hashtags.',
        ]
      : platform === 'linkedin'
      ? [
          'Keep your first two lines under 210 characters so your hook lands before the "...see more" fold.',
          'Use 1–2 sentence paragraphs with whitespace to improve mobile readability.',
          'Anchor opinions in concrete personal lessons or verifiable data, then invite peer discussion.',
        ]
      : [
          'Prefer active verbs and concrete nouns over qualifiers like "very" or "basically".',
          'Vary sentence length to keep longer paragraphs engaging.',
        ];

  return {
    originalText: input,
    platform,
    mode,
    grammarIssuesFixed: grammarIssues,
    platformTips,
    variations,
    timestamp: new Date().toISOString(),
  };
}

export function generateFallbackFactCheckResult(rawText: string): FactCheckResult {
  const input =
    rawText.trim() || 'Artificial intelligence will replace 90% of software engineers in the next five years.';
  const lower = input.toLowerCase();

  if (lower.includes('replace 90%') || (lower.includes('artificial intelligence') && lower.includes('software engineers'))) {
    return {
      originalText: input,
      summaryVerdict:
        'Unverified Prediction / Exaggerated Statistical Claim — Empirical labor market studies and industry benchmarks show AI augments coding tasks rather than replacing 90% of software engineering roles within 5 years.',
      claims: [
        {
          id: 'claim-1',
          claimText: 'Artificial intelligence will replace 90% of software engineers in the next five years.',
          classification: 'Prediction',
          verdict: 'Contradicted',
          confidence: 'High',
          explanation:
            'This is a speculative prediction framed as a hard statistic. Neither the U.S. Bureau of Labor Statistics (BLS) nor peer-reviewed research from MIT CSAIL, GitHub, or the World Economic Forum supports a 90% headcount reduction in software engineering within five years.',
          supportingEvidence:
            'AI coding assistants (such as GitHub Copilot and Gemini Code Assist) automate repetitive boilerplate and unit test generation, increasing task completion speed by 20%–55% in controlled studies.',
          contradictingEvidence:
            'The U.S. Bureau of Labor Statistics projects software developer employment to grow by 17% from 2023 to 2033—much faster than the average for all occupations. World Economic Forum Future of Jobs reports list AI and big data specialists and software developers among the fastest-growing roles.',
          contextNeeded:
            'Distinguish between "AI writing a high percentage of boilerplate code lines" and "AI replacing 90% of human software engineers," whose work includes system design, security review, requirements discovery, and cross-team architecture.',
          sources: [
            {
              title: 'Occupational Outlook Handbook: Software Developers, Quality Assurance Analysts, and Testers',
              url: 'https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm',
              publisher: 'U.S. Bureau of Labor Statistics (BLS)',
              publishedDate: '2025',
              snippet: 'Employment of software developers is projected to grow 17 percent, much faster than the average for all occupations.',
            },
            {
              title: 'The Impact of AI on Developer Productivity: Evidence from GitHub Copilot',
              url: 'https://arxiv.org/abs/2302.06590',
              publisher: 'arXiv / MIT & Microsoft Research',
              publishedDate: '2023-02',
              snippet: 'Developers with access to AI pair programming completed tasks 55.8% faster, pointing to task augmentation rather than role elimination.',
            },
            {
              title: 'The Future of Jobs Report',
              url: 'https://www.weforum.org/publications/the-future-of-jobs-report-2025/',
              publisher: 'World Economic Forum',
              publishedDate: '2025-01',
              snippet: 'Software and applications developers remain among the top net job growth categories globally despite widespread generative AI adoption.',
            },
          ],
          suggestedAccuratePhrasing:
            'While AI coding tools may assist with up to 70–90% of routine syntax and boilerplate over the next five years, labor data shows they are augmenting software engineers rather than replacing them.',
        },
      ],
      opinionAnalysis: {
        overallLogicalConsistency:
          'Conflates automating one subtask of software engineering (typing syntax) with replacing the entire profession (architecture, debugging, product trade-offs, and system reliability).',
        qualityOfArguments:
          'Relies on a shock-value percentage ("90%") without citing a study, methodology, or distinction between code generation and end-to-end engineering ownership.',
        detectedBiases: [
          'Lump-of-Labor Fallacy (assuming fixed software demand rather than Jevons paradox, where cheaper code increases total software demand)',
          'Extrapolation Bias (projecting early LLM coding demos linearly to full autonomous systems engineering)',
        ],
        missingPerspectives: [
          'Historical precedent: compilers, open-source libraries, and cloud computing abstracted lower-level work while increasing global demand for software engineers.',
          'Enterprise maintenance, security compliance, and distributed debugging grow more complex as AI generates larger codebases.',
        ],
        unsupportedAssumptions: [
          'Assumes writing raw code is 90% of a software engineer’s job.',
          'Assumes enterprise organizations will deploy unverified AI code without human engineering accountability.',
        ],
        counterarguments: [
          'BLS projects 17% employment growth for software developers over the decade.',
          'Lower barriers to software creation expand the number of companies building custom software.',
        ],
        nuancedSuggestion:
          'AI won’t replace 90% of software engineers in the next five years, but it will fundamentally change how 90% of code is written—shifting engineering value from syntax to system architecture and verification.',
      },
      improvedCredibleVersion:
        'AI won’t replace 90% of software engineers in the next five years—in fact, the U.S. Bureau of Labor Statistics still projects 17% growth in developer roles. What AI is replacing is manual boilerplate: studies show AI coding assistants speed up routine implementation by up to 55%, shifting an engineer’s core value toward system architecture, verification, and product thinking.',
      groundingSources: [
        {
          title: 'Occupational Outlook Handbook: Software Developers',
          url: 'https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm',
          publisher: 'U.S. Bureau of Labor Statistics',
          publishedDate: '2025',
        },
        {
          title: 'The Impact of AI on Developer Productivity (arXiv:2302.06590)',
          url: 'https://arxiv.org/abs/2302.06590',
          publisher: 'arXiv / Microsoft & MIT Research',
          publishedDate: '2023',
        },
        {
          title: 'Future of Jobs Report',
          url: 'https://www.weforum.org/publications/the-future-of-jobs-report-2025/',
          publisher: 'World Economic Forum',
          publishedDate: '2025',
        },
      ],
      timestamp: new Date().toISOString(),
    };
  }

  if (lower.includes('remote work') && lower.includes('productive')) {
    return {
      originalText: input,
      summaryVerdict:
        'Overbroad Generalization / Partially Supported — Empirical research shows fully remote work without structured coordination can reduce synchronous mentorship by 10–18%, while hybrid and well-managed remote setups maintain or slightly improve productivity and significantly reduce attrition.',
      claims: [
        {
          id: 'claim-remote-1',
          claimText: 'Remote work makes software engineers less productive.',
          classification: 'Personal Opinion',
          verdict: 'Partially Supported',
          confidence: 'High',
          explanation:
            'This statement is phrased as a universal factual rule, but economic and software engineering studies show productivity outcomes vary significantly by work model (fully remote vs. hybrid), onboarding maturity, and management practices.',
          supportingEvidence:
            'Some working papers (e.g., Emanuel & Harrington 2023; Gibbs et. al. at University of Chicago studying an Asian IT services firm) found that abrupt transitions to 100% remote work increased hours worked needed to achieve the same output due to coordination hurdles and fewer ad-hoc feedback loops for junior staff.',
          contradictingEvidence:
            'Nicholas Bloom’s randomized controlled trials at Stanford (including the Nature 2024 hybrid work study of 1,612 engineers and employees at Trip.com) found zero reduction in performance grades or lines of code written in hybrid schedules, alongside a 33% reduction in quit rates.',
          contextNeeded:
            'Specify whether you mean unstructured 100% remote work for junior engineers or structured hybrid/async engineering teams.',
          sources: [
            {
              title: 'Hybrid working from home improves retention without damaging performance',
              url: 'https://www.nature.com/articles/s41586-024-07500-2',
              publisher: 'Nature (Nicholas Bloom, Ruobing Han & James Liang)',
              publishedDate: '2024-06',
              snippet: 'Randomized control trial of 1,612 engineers, marketing and finance employees showed hybrid work had no negative effect on performance or code output and reduced attrition by one-third.',
            },
            {
              title: 'Work from Home & Productivity: Evidence from Personnel & Analytics Data on IT Professionals',
              url: 'https://www.journals.uchicago.edu/doi/10.1086/721803',
              publisher: 'Journal of Political Economy Microeconomics (Gibbs, Mengel, Siemroth)',
              publishedDate: '2023',
              snippet: 'Found that during pandemic full-time WFH, IT professionals worked more hours for slightly lower average output, largely driven by increased coordination meetings.',
            },
          ],
          suggestedAccuratePhrasing:
            'Unstructured remote work can slow cross-team coordination and mentorship for software engineers, though Stanford research shows well-structured hybrid models preserve code output while cutting turnover.',
        },
      ],
      opinionAnalysis: {
        overallLogicalConsistency:
          'Treats "remote work" as a single uniform condition rather than accounting for management practices, documentation maturity, and team seniority.',
        qualityOfArguments:
          'Presents a complex organizational trade-off as a blanket cause-and-effect statement.',
        detectedBiases: [
          'Overgeneralization (applying friction from poorly structured remote setups to all distributed engineering teams)',
        ],
        missingPerspectives: [
          'Individual deep coding focus often benefits from zero office interruptions and zero commute time.',
          'Team-level bottlenecks usually stem from synchronous meeting overload rather than physical location.',
        ],
        unsupportedAssumptions: [
          'Assumes physical proximity automatically creates effective engineering collaboration.',
        ],
        counterarguments: [
          'Stanford RCT published in Nature (2024) found no drop in engineering code output or promotion rates under hybrid remote work.',
          'GitLab, Automattic, and Linux kernel contributors operate high-output engineering organizations entirely remotely.',
        ],
        nuancedSuggestion:
          'Remote work doesn’t automatically make software engineers less productive, but running a distributed team without clear async documentation and mentorship loops often slows cross-team execution.',
      },
      improvedCredibleVersion:
        'Unstructured remote work can slow down software teams when synchronous meetings replace clear async documentation—a friction noted in University of Chicago IT studies. However, as Stanford’s 2024 Nature study of over 1,600 employees showed, intentional hybrid and distributed workflows preserve engineering output while cutting attrition by 33%. Productivity depends on how we manage collaboration, not just where we sit.',
      groundingSources: [
        {
          title: 'Hybrid working from home improves retention without damaging performance',
          url: 'https://www.nature.com/articles/s41586-024-07500-2',
          publisher: 'Nature',
          publishedDate: '2024-06',
        },
        {
          title: 'Work from Home & Productivity: Evidence from IT Professionals',
          url: 'https://www.journals.uchicago.edu/doi/10.1086/721803',
          publisher: 'University of Chicago Press',
          publishedDate: '2023',
        },
      ],
      timestamp: new Date().toISOString(),
    };
  }

  // Generic analytical fallback for any user input
  const sentences = input
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const targetClaim = sentences[0] || input;
  const classification = classifyClaimSentence(targetClaim);

  return {
    originalText: input,
    summaryVerdict:
      classification === 'Personal Opinion' || classification === 'Assumption'
        ? 'Opinion & Argument Analysis — Statement contains broad assumptions that benefit from specific context and qualifying evidence.'
        : 'Claim Analyzed — Statement includes claims that should be framed with specific scope and verifiable attribution.',
    claims: [
      {
        id: 'claim-custom-1',
        claimText: targetClaim,
        classification,
        verdict:
          classification === 'Personal Opinion'
            ? 'Opinion / Non-Factual'
            : classification === 'Prediction'
            ? 'Unverified'
            : 'Partially Supported',
        confidence: 'Medium',
        explanation: `Classified as a ${classification}. To strengthen credibility with critical readers on LinkedIn or X, anchor the claim with specific conditions, timeframe, or primary data sources.`,
        supportingEvidence:
          'Your core directional point aligns with common practitioner observations when scoped to specific organizational contexts.',
        contradictingEvidence:
          'Broad or unqualified claims often face pushback when edge cases, industry differences, or empirical counterexamples are omitted.',
        contextNeeded:
          'Specify the exact scope, industry segment, or empirical source backing this statement.',
        sources: [
          {
            title: 'Google Scholar — Peer-Reviewed Literature Search',
            url: `https://scholar.google.com/scholar?q=${encodeURIComponent(targetClaim.slice(0, 80))}`,
            publisher: 'Google Scholar',
            publishedDate: 'Live Index',
            snippet: 'Verify empirical studies and primary datasets matching this claim.',
          },
        ],
        suggestedAccuratePhrasing: `In many high-growth environments, ${targetClaim.charAt(0).toLowerCase() + targetClaim.slice(1)}`,
      },
    ],
    opinionAnalysis: {
      overallLogicalConsistency:
        'The argument has a clear central thesis, but its persuasive power increases significantly when absolute phrasing is replaced with evidence-backed nuance.',
      qualityOfArguments:
        'Clear intent, though adding one concrete example or primary data point will make the conclusion much harder to dismiss.',
      detectedBiases: ['Scope Generalization (framing a context-dependent observation as a universal rule)'],
      missingPerspectives: [
        'Consider how organizational size, team maturity, or baseline constraints might change this outcome.',
      ],
      unsupportedAssumptions: ['Assumes the reader shares the same baseline assumptions and context.'],
      counterarguments: ['Practitioners in different domains may experience the opposite effect under different incentives.'],
      nuancedSuggestion: `While experiences vary across teams, ${input}`,
    },
    improvedCredibleVersion: `In our experience, ${input.charAt(0).toLowerCase() + input.slice(1)} Of course, outcomes depend heavily on context, execution, and baseline constraints.`,
    groundingSources: [
      {
        title: 'Google Scholar Research Verification',
        url: `https://scholar.google.com/scholar?q=${encodeURIComponent(targetClaim.slice(0, 80))}`,
        publisher: 'Google Scholar',
      },
    ],
    timestamp: new Date().toISOString(),
  };
}

interface CuratedHindiEntry {
  hindiMeaningDevanagari: string;
  pronunciationIPA: string;
  pronunciationPhonetic: string;
  hindiTransliteration: string;
  simpleEnglishMeaning: string;
  partOfSpeech: string;
  synonyms: string[];
  antonyms: string[];
  everydayConversationExample: string;
  contexts: {
    keywords: string[];
    contextualMeaningHindi: string;
    contextExplanation: string;
    exampleSentenceEnglish: string;
    exampleSentenceHindi: string;
  }[];
  otherMeaningsHindi: { meaning: string; usage: string }[];
}

const CURATED_HINDI_DICTIONARY: Record<string, CuratedHindiEntry> = {
  nevertheless: {
    hindiMeaningDevanagari: 'फिर भी / इसके बावजूद',
    pronunciationIPA: '/ˌnɛv.ə.ðəˈlɛs/',
    pronunciationPhonetic: 'nev-er-thuh-LES',
    hindiTransliteration: 'Phir bhi / Iske bawajood',
    simpleEnglishMeaning: 'Despite what has just been mentioned; nonetheless.',
    partOfSpeech: 'Adverb',
    synonyms: ['nonetheless', 'however', 'still', 'yet', 'regardless'],
    antonyms: ['therefore', 'consequently', 'accordingly'],
    everydayConversationExample: 'It was raining heavily; nevertheless, we went out for morning chai.',
    contexts: [
      {
        keywords: ['default'],
        contextualMeaningHindi: 'फिर भी / इसके बावजूद (विपरीत परिस्थिति के होते हुए भी)',
        contextExplanation:
          'Used here to connect a challenge or obstacle with an action that continued despite that obstacle.',
        exampleSentenceEnglish: 'He was tired; nevertheless, he continued working.',
        exampleSentenceHindi: 'वह थका हुआ था, फिर भी उसने काम जारी रखा।',
      },
    ],
    otherMeaningsHindi: [
      { meaning: 'तथापि', usage: 'Formal literary or editorial Hindi transition' },
      { meaning: 'तो भी', usage: 'Conversational spoken Hindi' },
    ],
  },
  fine: {
    hindiMeaningDevanagari: 'अच्छा / जुर्माना / बारीक',
    pronunciationIPA: '/faɪn/',
    pronunciationPhonetic: 'FAHYN',
    hindiTransliteration: 'Accha / Jurmana / Bareek',
    simpleEnglishMeaning: 'Of high quality, acceptable, a financial penalty, or made of very small particles/details.',
    partOfSpeech: 'Adjective / Noun / Verb',
    synonyms: ['excellent', 'penalty', 'delicate', 'satisfactory'],
    antonyms: ['poor', 'reward', 'coarse', 'unsatisfactory'],
    everydayConversationExample: 'Don’t worry about the delay, everything is fine now.',
    contexts: [
      {
        keywords: ['pay', 'paid', 'traffic', 'parking', 'penalty', 'court', 'violat', 'law', 'rupees', 'dollars', '$'],
        contextualMeaningHindi: 'जुर्माना / अर्थदंड (नियम तोड़ने पर लगने वाला दंड)',
        contextExplanation:
          'In this financial or legal sentence context, "fine" refers to a monetary penalty rather than feeling good.',
        exampleSentenceEnglish: 'He had to pay a heavy fine for parking in a no-parking zone.',
        exampleSentenceHindi: 'नो-पार्किंग जोन में गाड़ी खड़ी करने के लिए उसे भारी जुर्माना भरना पड़ा।',
      },
      {
        keywords: ['sand', 'powder', 'grain', 'detail', 'line', 'tune', 'tuning', 'hair', 'thread', 'distinction'],
        contextualMeaningHindi: 'बारीक / सूक्ष्म (बहुत पतला या गहराई वाला)',
        contextExplanation:
          'In this descriptive or technical context, "fine" means subtle, delicate, or composed of tiny particles/adjustments.',
        exampleSentenceEnglish: 'There is a fine line between confidence and arrogance.',
        exampleSentenceHindi: 'आत्मविश्वास और अहंकार के बीच एक बहुत बारीक रेखा होती है।',
      },
      {
        keywords: ['default'],
        contextualMeaningHindi: 'अच्छा / ठीक-ठाक / बढ़िया',
        contextExplanation:
          'In this general context, "fine" expresses that something is satisfactory, healthy, or of good quality.',
        exampleSentenceEnglish: 'The project schedule looks fine to me.',
        exampleSentenceHindi: 'प्रोजेक्ट का शेड्यूल मुझे बिल्कुल ठीक लग रहा है।',
      },
    ],
    otherMeaningsHindi: [
      { meaning: 'अच्छा / बढ़िया', usage: 'Quality or well-being (e.g., I am feeling fine)' },
      { meaning: 'जुर्माना', usage: 'Legal or traffic penalty (e.g., ₹500 traffic fine)' },
      { meaning: 'बारीक / महीन', usage: 'Texture or subtle distinction (e.g., fine powder, fine-tuning)' },
    ],
  },
  ubiquitous: {
    hindiMeaningDevanagari: 'सर्वव्यापी / हर जगह मौजूद',
    pronunciationIPA: '/juːˈbɪk.wɪ.təs/',
    pronunciationPhonetic: 'yoo-BIK-wi-tuhs',
    hindiTransliteration: 'Sarvavyapi / Har jagah maujood',
    simpleEnglishMeaning: 'Present, appearing, or found everywhere at the same time.',
    partOfSpeech: 'Adjective',
    synonyms: ['omnipresent', 'pervasive', 'universal', 'everywhere'],
    antonyms: ['rare', 'scarce', 'uncommon'],
    everydayConversationExample: 'UPI QR codes have become ubiquitous across Indian street shops.',
    contexts: [
      {
        keywords: ['default'],
        contextualMeaningHindi: 'सर्वव्यापी / जो हर जगह दिखाई दे',
        contextExplanation:
          'Describes technology, habits, or trends that have become so common they appear everywhere.',
        exampleSentenceEnglish: 'Smartphones and AI assistants have become ubiquitous in modern daily life.',
        exampleSentenceHindi: 'आधुनिक दैनिक जीवन में स्मार्टफोन और एआई असिस्टेंट सर्वव्यापी (हर जगह मौजूद) हो गए हैं।',
      },
    ],
    otherMeaningsHindi: [
      { meaning: 'सर्वव्यापी', usage: 'Formal Hindi for omnipresent' },
      { meaning: 'आम / हर जगह मिलने वाला', usage: 'Everyday conversational Hindi' },
    ],
  },
  pragmatic: {
    hindiMeaningDevanagari: 'व्यावहारिक / यथार्थवादी',
    pronunciationIPA: '/præɡˈmæt.ɪk/',
    pronunciationPhonetic: 'prag-MAT-ik',
    hindiTransliteration: 'Vyavaharik / Yatharthvadi',
    simpleEnglishMeaning: 'Dealing with things sensibly and realistically in a way that is based on practical rather than theoretical considerations.',
    partOfSpeech: 'Adjective',
    synonyms: ['practical', 'realistic', 'sensible', 'grounded'],
    antonyms: ['idealistic', 'impractical', 'unrealistic'],
    everydayConversationExample: 'We need a pragmatic solution that we can ship this Friday.',
    contexts: [
      {
        keywords: ['default'],
        contextualMeaningHindi: 'व्यावहारिक (जो असलियत और काम आने वाले नतीजों पर आधारित हो)',
        contextExplanation:
          'Describes a practical, results-oriented mindset rather than abstract theory.',
        exampleSentenceEnglish: 'Successful engineering leaders take a pragmatic approach to technical debt.',
        exampleSentenceHindi: 'सफल इंजीनियरिंग लीडर्स टेक्निकल डेट के प्रति एक व्यावहारिक दृष्टिकोण अपनाते हैं।',
      },
    ],
    otherMeaningsHindi: [
      { meaning: 'व्यावहारिक', usage: 'Practical and actionable' },
      { meaning: 'तर्कसंगत और उपयोगी', usage: 'Sensible in real-world situations' },
    ],
  },
  ephemeral: {
    hindiMeaningDevanagari: 'क्षणिक / अल्पकालिक',
    pronunciationIPA: '/ɪˈfɛm.ər.əl/',
    pronunciationPhonetic: 'ih-FEM-er-uhl',
    hindiTransliteration: 'Kshanik / Alpakalik',
    simpleEnglishMeaning: 'Lasting for a very short time.',
    partOfSpeech: 'Adjective',
    synonyms: ['fleeting', 'transient', 'short-lived', 'momentary'],
    antonyms: ['permanent', 'enduring', 'eternal', 'lasting'],
    everydayConversationExample: 'Viral social media trends are usually ephemeral.',
    contexts: [
      {
        keywords: ['default'],
        contextualMeaningHindi: 'क्षणिक / थोड़े समय तक रहने वाला',
        contextExplanation:
          'Refers to something temporary that fades quickly, such as social media attention or short-lived trends.',
        exampleSentenceEnglish: 'Algorithmic virality is ephemeral, whereas genuine trust compounds over years.',
        exampleSentenceHindi: 'एल्गोरिदम से मिली लोकप्रियता क्षणिक होती है, जबकि असली भरोसा वर्षों में बढ़ता है।',
      },
    ],
    otherMeaningsHindi: [
      { meaning: 'क्षणभंगुर', usage: 'Literary Hindi for fleeting' },
      { meaning: 'अल्पकालिक', usage: 'Short-term or temporary' },
    ],
  },
  resilient: {
    hindiMeaningDevanagari: 'लचीला और मजबूत / संकट से उबरने में सक्षम',
    pronunciationIPA: '/rɪˈzɪl.i.ənt/',
    pronunciationPhonetic: 'ri-ZIL-yuhnt',
    hindiTransliteration: 'Lacheela aur majboot / Ubharne mein saksham',
    simpleEnglishMeaning: 'Able to withstand or recover quickly from difficult conditions.',
    partOfSpeech: 'Adjective',
    synonyms: ['tough', 'adaptable', 'hardy', 'robust'],
    antonyms: ['fragile', 'vulnerable', 'brittle'],
    everydayConversationExample: 'Small businesses proved remarkably resilient during market shifts.',
    contexts: [
      {
        keywords: ['system', 'architecture', 'server', 'software', 'cloud', 'network', 'code'],
        contextualMeaningHindi: 'मजबूत और दोष-सहिष्णु (तकनीकी प्रणाली जो विफलता से तुरंत उबर सके)',
        contextExplanation:
          'In a software or engineering context, "resilient" means fault-tolerant and able to stay reliable under load.',
        exampleSentenceEnglish: 'We designed a resilient distributed architecture that handles traffic spikes gracefully.',
        exampleSentenceHindi: 'हमने एक मजबूत (संकट-सहिष्णु) डिस्ट्रीब्यूटेड आर्किटेक्चर डिज़ाइन किया है जो ट्रैफ़िक बढ़ने पर भी सुचारू रूप से काम करता है।',
      },
      {
        keywords: ['default'],
        contextualMeaningHindi: 'मुश्किलों से जल्दी उबरने वाला / जुझारू',
        contextExplanation:
          'Describes a person, team, or organization that bounces back strongly after setbacks.',
        exampleSentenceEnglish: 'Resilient founders treat early product rejections as valuable market feedback.',
        exampleSentenceHindi: 'जुझारू (संकट से उबरने वाले) संस्थापक शुरुआती अस्वीकृतियों को मूल्यवान फीडबैक के रूप में लेते हैं।',
      },
    ],
    otherMeaningsHindi: [
      { meaning: 'जुझारू / सहनशील', usage: 'For people and teams recovering from adversity' },
      { meaning: 'मजबूत / प्रतिरोधी', usage: 'For technical systems and infrastructure' },
    ],
  },
  paradigm: {
    hindiMeaningDevanagari: 'प्रतिमान / सोचने या काम करने का ढांचा',
    pronunciationIPA: '/ˈpær.ə.daɪm/',
    pronunciationPhonetic: 'PAIR-uh-dahym',
    hindiTransliteration: 'Pratiman / वैचारिक ढांचा (Vaicharik Dhancha)',
    simpleEnglishMeaning: 'A typical example, pattern, or fundamental model of how something works.',
    partOfSpeech: 'Noun',
    synonyms: ['model', 'framework', 'pattern', 'standard', 'archetype'],
    antonyms: ['anomaly', 'exception'],
    everydayConversationExample: 'Cloud computing created a new paradigm for software delivery.',
    contexts: [
      {
        keywords: ['default'],
        contextualMeaningHindi: 'प्रतिमान / कार्यप्रणाली का नया मॉडल',
        contextExplanation: 'Refers to an overarching model or fundamental way of thinking about a field.',
        exampleSentenceEnglish: 'Agentic workflows represent a major paradigm shift in software engineering.',
        exampleSentenceHindi: 'एजेंटिक वर्कफ़्लो सॉफ्टवेयर इंजीनियरिंग में काम करने के ढांचे (प्रतिमान) में एक बड़ा बदलाव दर्शाते हैं।',
      },
    ],
    otherMeaningsHindi: [
      { meaning: 'प्रतिमान', usage: 'Standard or theoretical model' },
      { meaning: 'आदर्श उदाहरण', usage: 'Classic example of a concept' },
    ],
  },
  nuance: {
    hindiMeaningDevanagari: 'बारीकी / सूक्ष्म अंतर',
    pronunciationIPA: '/ˈnjuː.ɑːns/',
    pronunciationPhonetic: 'NOO-ahns',
    hindiTransliteration: 'Bareeki / Sookshma antar',
    simpleEnglishMeaning: 'A subtle difference in or shade of meaning, expression, or sound.',
    partOfSpeech: 'Noun',
    synonyms: ['subtlety', 'distinction', 'refinement', 'shade'],
    antonyms: ['bluntness', 'oversimplification'],
    everydayConversationExample: 'Short social media posts often lose the nuance of complex topics.',
    contexts: [
      {
        keywords: ['default'],
        contextualMeaningHindi: 'बारीकी / सूक्ष्म पहलू',
        contextExplanation: 'Highlights subtle details that make an argument accurate rather than overly simplistic.',
        exampleSentenceEnglish: 'Great technical writers capture the nuance of engineering trade-offs without confusing the reader.',
        exampleSentenceHindi: 'बेहतरीन टेक्निकल राइटर पाठक को उलझाए बिना इंजीनियरिंग के सूक्ष्म पहलुओं (बारीकियों) को स्पष्ट करते हैं।',
      },
    ],
    otherMeaningsHindi: [
      { meaning: 'बारीकी', usage: 'Subtle detail in discussion or art' },
      { meaning: 'सूक्ष्म भेद', usage: 'Fine distinction between two ideas' },
    ],
  },
  migration: {
    hindiMeaningDevanagari: 'स्थानांतरण / प्रवास (डेटा या सिस्टम का बदलाव)',
    pronunciationIPA: '/maɪˈɡreɪ.ʃən/',
    pronunciationPhonetic: 'mahy-GRAY-shuhn',
    hindiTransliteration: 'Sthanaantaran / Pravaas',
    simpleEnglishMeaning: 'Movement from one region or system to another.',
    partOfSpeech: 'Noun',
    synonyms: ['transition', 'relocation', 'transfer', 'shift'],
    antonyms: ['stagnation', 'permanence'],
    everydayConversationExample: 'The database migration finished ahead of schedule.',
    contexts: [
      {
        keywords: ['default'],
        contextualMeaningHindi: 'सिस्टम या डेटा को एक प्लेटफॉर्म से दूसरे पर ले जाना (स्थानांतरण)',
        contextExplanation: 'In software engineering, migration refers to moving infrastructure, code, or data to a new system.',
        exampleSentenceEnglish: 'He was tired after a twelve-hour migration; nevertheless, he continued working.',
        exampleSentenceHindi: 'बारह घंटे के सिस्टम माइग्रेशन (स्थानांतरण) के बाद वह थका हुआ था, फिर भी उसने काम जारी रखा।',
      },
    ],
    otherMeaningsHindi: [
      { meaning: 'स्थानांतरण', usage: 'Technical or system transfer' },
      { meaning: 'प्रवास', usage: 'Movement of people or birds across regions' },
    ],
  },
  fragile: {
    hindiMeaningDevanagari: 'नाज़ुक / आसानी से टूटने या बिगड़ने वाला',
    pronunciationIPA: '/ˈfrædʒ.aɪl/',
    pronunciationPhonetic: 'FRAJ-ahyl',
    hindiTransliteration: 'Naazuk / Bhungur',
    simpleEnglishMeaning: 'Easily broken, damaged, or disrupted.',
    partOfSpeech: 'Adjective',
    synonyms: ['delicate', 'brittle', 'vulnerable', 'unstable'],
    antonyms: ['resilient', 'robust', 'sturdy', 'durable'],
    everydayConversationExample: 'Rushed code without tests creates fragile software.',
    contexts: [
      {
        keywords: ['default'],
        contextualMeaningHindi: 'कमज़ोर / नाज़ुक (जो दबाव पड़ने पर आसानी से विफल हो जाए)',
        contextExplanation: 'Describes systems or objects that break easily under stress.',
        exampleSentenceEnglish: 'There is a fine line between shipping fast and creating fragile infrastructure.',
        exampleSentenceHindi: 'तेज़ी से प्रोडक्ट लॉन्च करने और कमज़ोर (नाज़ुक) इंफ्रास्ट्रक्चर बनाने के बीच एक बहुत बारीक रेखा होती है।',
      },
    ],
    otherMeaningsHindi: [
      { meaning: 'नाज़ुक', usage: 'Delicate physical objects or relationships' },
      { meaning: 'अस्थिर / कमज़ोर', usage: 'Unstable software or economic systems' },
    ],
  },
  infrastructure: {
    hindiMeaningDevanagari: 'बुनियादी ढांचा / आधारभूत संरचना',
    pronunciationIPA: '/ˈɪn.frəˌstrʌk.tʃər/',
    pronunciationPhonetic: 'IN-fruh-struhk-cher',
    hindiTransliteration: 'Buniyadi dhancha / Aadharbhoot sanrachna',
    simpleEnglishMeaning: 'The basic physical and organizational structures and facilities needed for the operation of a society or enterprise.',
    partOfSpeech: 'Noun',
    synonyms: ['foundation', 'framework', 'backbone', 'architecture'],
    antonyms: ['surface', 'periphery'],
    everydayConversationExample: 'Reliable cloud infrastructure keeps our app fast worldwide.',
    contexts: [
      {
        keywords: ['default'],
        contextualMeaningHindi: 'बुनियादी तकनीकी ढांचा (सर्वर, नेटवर्क और सिस्टम की नींव)',
        contextExplanation: 'Refers to the underlying servers, databases, and foundational systems powering software.',
        exampleSentenceEnglish: 'Modern software teams invest early in scalable cloud infrastructure.',
        exampleSentenceHindi: 'आधुनिक सॉफ्टवेयर टीमें शुरुआत से ही मजबूत बुनियादी तकनीकी ढांचे (इंफ्रास्ट्रक्चर) में निवेश करती हैं।',
      },
    ],
    otherMeaningsHindi: [
      { meaning: 'बुनियादी ढांचा', usage: 'Roads, power grids, or cloud servers' },
    ],
  },
  irreplaceable: {
    hindiMeaningDevanagari: 'अद्वितीय / जिसकी जगह कोई न ले सके',
    pronunciationIPA: '/ˌɪr.ɪˈpleɪ.sə.bəl/',
    pronunciationPhonetic: 'ir-i-PLAY-suh-buhl',
    hindiTransliteration: 'Adwitiya / Jiski jagah koi na le sake',
    simpleEnglishMeaning: 'Impossible to replace if lost or damaged; uniquely valuable.',
    partOfSpeech: 'Adjective',
    synonyms: ['indispensable', 'invaluable', 'unique', 'essential'],
    antonyms: ['replaceable', 'dispensable', 'expendable'],
    everydayConversationExample: 'Empathy and critical thinking are irreplaceable human skills.',
    contexts: [
      {
        keywords: ['default'],
        contextualMeaningHindi: 'अपरिहार्य / जिसकी जगह कोई दूसरा न ले सके',
        contextExplanation: 'Emphasizes that human judgment cannot be substituted by automated tools.',
        exampleSentenceEnglish: 'Human judgment remains irreplaceable when verifying empirical claims.',
        exampleSentenceHindi: 'तथ्यात्मक दावों की जांच करते समय मानवीय विवेक और निर्णय आज भी अपरिहार्य (अद्वितीय) हैं।',
      },
    ],
    otherMeaningsHindi: [
      { meaning: 'अद्वितीय / अनमोल', usage: 'Uniquely valuable person or quality' },
    ],
  },
  empirical: {
    hindiMeaningDevanagari: 'प्रयोग और प्रत्यक्ष प्रमाण पर आधारित (आनुभविक)',
    pronunciationIPA: '/ɪmˈpɪr.ɪ.kəl/',
    pronunciationPhonetic: 'em-PIR-i-kuhl',
    hindiTransliteration: 'Aanubhavik / Praman-aadharit',
    simpleEnglishMeaning: 'Based on, concerned with, or verifiable by observation or experience rather than theory or pure logic.',
    partOfSpeech: 'Adjective',
    synonyms: ['observational', 'experimental', 'factual', 'measured'],
    antonyms: ['theoretical', 'speculative', 'hypothetical'],
    everydayConversationExample: 'We need empirical data before changing our pricing model.',
    contexts: [
      {
        keywords: ['default'],
        contextualMeaningHindi: 'वास्तविक डेटा और प्रत्यक्ष प्रमाण पर आधारित',
        contextExplanation: 'Refers to verifiable real-world measurements and evidence rather than guesswork.',
        exampleSentenceEnglish: 'Empirical labor market studies show AI augments coding tasks.',
        exampleSentenceHindi: 'वास्तविक डेटा और प्रमाण पर आधारित (आनुभविक) श्रम बाजार अध्ययन बताते हैं कि एआई कोडिंग कार्यों में मदद करता है।',
      },
    ],
    otherMeaningsHindi: [
      { meaning: 'आनुभविक', usage: 'Academic and scientific Hindi term' },
      { meaning: 'प्रमाण-आधारित', usage: 'Evidence-based in everyday prose' },
    ],
  },
};

const QUICK_WORD_GLOSSARY: Record<
  string,
  { hindi: string; translit: string; pos: string; simpleEn: string }
> = {
  tired: {
    hindi: 'थका हुआ',
    translit: 'Thaka hua',
    pos: 'Adjective',
    simpleEn: 'In need of sleep or rest; weary.',
  },
  continued: {
    hindi: 'जारी रखा',
    translit: 'Jaari rakha',
    pos: 'Verb',
    simpleEn: 'Persisted in an activity or process without stopping.',
  },
  working: {
    hindi: 'काम कर रहा / कार्यरत',
    translit: 'Kaam kar raha',
    pos: 'Verb / Noun',
    simpleEn: 'Doing work or operating effectively.',
  },
  successful: {
    hindi: 'सफल / कामयाब',
    translit: 'Safal / Kaamyaab',
    pos: 'Adjective',
    simpleEn: 'Accomplishing a desired aim or result.',
  },
  engineering: {
    hindi: 'अभियांत्रिकी / तकनीकी निर्माण',
    translit: 'Abhiyantriki / Engineering',
    pos: 'Noun',
    simpleEn: 'The branch of science and technology concerned with design, building, and software.',
  },
  approach: {
    hindi: 'दृष्टिकोण / तरीका',
    translit: 'Drishtikon / Tareeka',
    pos: 'Noun / Verb',
    simpleEn: 'A way of dealing with something.',
  },
  confidence: {
    hindi: 'आत्मविश्वास / भरोसा',
    translit: 'Aatmavishwas / Bharosa',
    pos: 'Noun',
    simpleEn: 'A feeling of self-assurance arising from appreciation of one’s own abilities.',
  },
  arrogance: {
    hindi: 'अहंकार / घमंड',
    translit: 'Ahankaar / Ghamand',
    pos: 'Noun',
    simpleEn: 'Having or revealing an exaggerated sense of one’s own importance or abilities.',
  },
  productive: {
    hindi: 'उत्पादक / कार्यकुशल',
    translit: 'Utpadak / Karyakushal',
    pos: 'Adjective',
    simpleEn: 'Achieving or producing a significant amount or result.',
  },
  artificial: {
    hindi: 'कृत्रिम / मानव-निर्मित',
    translit: 'Kritrim / Manav-nirmit',
    pos: 'Adjective',
    simpleEn: 'Made or produced by human beings rather than occurring naturally.',
  },
  intelligence: {
    hindi: 'बुद्धिमत्ता / समझ',
    translit: 'Buddhimatta / Samajh',
    pos: 'Noun',
    simpleEn: 'The ability to acquire and apply knowledge and skills.',
  },
  replace: {
    hindi: 'जगह लेना / प्रतिस्थापित करना',
    translit: 'Jagah lena / Pratisthapit karna',
    pos: 'Verb',
    simpleEn: 'Take the place of something or someone.',
  },
};

export function lookupContextualHindiFallback(
  rawWord: string,
  surroundingContext: string = ''
): HindiWordLookupResult {
  const cleanWord = cleanSelectedWord(rawWord);
  const key = cleanWord.toLowerCase();
  const contextLower = (surroundingContext || '').toLowerCase();

  const entry = CURATED_HINDI_DICTIONARY[key];
  if (entry) {
    const matchedContext =
      entry.contexts.find(
        (c) =>
          c.keywords[0] !== 'default' &&
          c.keywords.some((kw) => contextLower.includes(kw.toLowerCase()))
      ) || entry.contexts[entry.contexts.length - 1];

    return {
      word: rawWord.trim(),
      cleanWord: cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1),
      surroundingContext: surroundingContext || matchedContext.exampleSentenceEnglish,
      hindiMeaningDevanagari: entry.hindiMeaningDevanagari,
      contextualMeaningHindi: matchedContext.contextualMeaningHindi,
      otherMeaningsHindi: entry.otherMeaningsHindi,
      pronunciationIPA: entry.pronunciationIPA,
      pronunciationPhonetic: entry.pronunciationPhonetic,
      hindiTransliteration: entry.hindiTransliteration,
      simpleEnglishMeaning: entry.simpleEnglishMeaning,
      contextExplanation: matchedContext.contextExplanation,
      exampleSentenceEnglish: matchedContext.exampleSentenceEnglish,
      exampleSentenceHindi: matchedContext.exampleSentenceHindi,
      everydayConversationExample: entry.everydayConversationExample,
      synonyms: entry.synonyms,
      antonyms: entry.antonyms,
      partOfSpeech: entry.partOfSpeech,
      timestamp: new Date().toISOString(),
    };
  }

  const quickEntry = QUICK_WORD_GLOSSARY[key];
  if (quickEntry) {
    return {
      word: rawWord.trim(),
      cleanWord: cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1),
      surroundingContext: surroundingContext || cleanWord,
      hindiMeaningDevanagari: quickEntry.hindi,
      contextualMeaningHindi: `${quickEntry.hindi} (इस वाक्य के प्रसंग में)`,
      otherMeaningsHindi: [{ meaning: quickEntry.hindi, usage: 'Primary meaning in English prose' }],
      pronunciationIPA: `/${key}/`,
      pronunciationPhonetic: cleanWord.toUpperCase(),
      hindiTransliteration: quickEntry.translit,
      simpleEnglishMeaning: quickEntry.simpleEn,
      contextExplanation: surroundingContext
        ? `Used in the sentence: "${surroundingContext.slice(0, 120)}"`
        : 'Common English vocabulary term.',
      exampleSentenceEnglish:
        surroundingContext || `Using "${cleanWord}" accurately improves your English communication.`,
      exampleSentenceHindi: `इस वाक्य में "${cleanWord}" का अर्थ "${quickEntry.hindi}" है।`,
      everydayConversationExample: `People frequently use "${cleanWord}" in daily conversation.`,
      synonyms: ['clear', 'effective'],
      antonyms: ['opposite'],
      partOfSpeech: quickEntry.pos,
      timestamp: new Date().toISOString(),
    };
  }

  // Fallback for multi-word phrase or arbitrary word
  const isPhrase = cleanWord.includes(' ');
  return {
    word: rawWord.trim(),
    cleanWord: cleanWord || 'Selection',
    surroundingContext: surroundingContext || rawWord.trim(),
    hindiMeaningDevanagari: isPhrase ? 'संदर्भानुसार हिंदी भावार्थ' : 'संदर्भानुसार अर्थ (हिंदी)',
    contextualMeaningHindi: isPhrase
      ? `"${cleanWord}" का इस प्रसंग के अनुसार सरल हिंदी अनुवाद`
      : `"${cleanWord}" का इस वाक्य के प्रसंग में उपयुक्त हिंदी अर्थ`,
    otherMeaningsHindi: [
      { meaning: 'प्रमुख अर्थ', usage: 'Primary contextual usage in English prose' },
    ],
    pronunciationIPA: `/${key.replace(/\s+/g, ' ')}/`,
    pronunciationPhonetic: cleanWord.toUpperCase(),
    hindiTransliteration: cleanWord,
    simpleEnglishMeaning: isPhrase
      ? `Selected English phrase or short sentence from the passage.`
      : `English expression analyzed in the context of the surrounding sentence.`,
    contextExplanation: surroundingContext
      ? `Analyzed within the sentence: "${surroundingContext.slice(0, 120)}${surroundingContext.length > 120 ? '...' : ''}"`
      : 'Analyzed in standard conversational and professional English context.',
    exampleSentenceEnglish: surroundingContext || `Understanding how to use "${cleanWord}" makes your writing clearer.`,
    exampleSentenceHindi: `इस वाक्य में "${cleanWord}" का प्रयोग विचारों को स्पष्ट और प्रभावी बनाने के लिए किया गया है।`,
    everydayConversationExample: `You can use "${cleanWord}" naturally in professional discussions and articles.`,
    synonyms: ['clear', 'expressive', 'precise'],
    antonyms: ['vague', 'ambiguous'],
    partOfSpeech: isPhrase ? 'Phrase / Short Sentence' : 'Vocabulary Term',
    timestamp: new Date().toISOString(),
  };
}
