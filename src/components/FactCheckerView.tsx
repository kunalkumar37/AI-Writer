import React, { useState } from 'react';
import {
  ShieldCheck,
  ExternalLink,
  Check,
  Copy,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Scale,
  Flag,
  Undo2,
} from 'lucide-react';
import { ClaimVerdict, FactCheckResult } from '../types/writebetter';

interface FactCheckerViewProps {
  factDraft: string;
  setFactDraft: (val: string) => void;
  result: FactCheckResult | null;
  loading: boolean;
  onRunFactCheck: (text?: string) => void;
  onReportIssue: (feature: 'fact_check', input: string, output: string) => void;
  onWordDoubleClick: (e: React.MouseEvent<HTMLElement>, contextText: string) => void;
}

const FACT_SAMPLES = [
  {
    label: '90% AI Engineer Replacement Claim',
    text: 'Artificial intelligence will replace 90% of software engineers in the next five years.',
  },
  {
    label: 'Remote Work Productivity Opinion',
    text: 'Remote work makes software engineers less productive.',
  },
  {
    label: 'Mixed Fact & Prediction Draft',
    text: 'Over 80% of Fortune 500 companies have adopted generative AI tools, which means traditional SaaS interfaces will completely disappear within 24 months.',
  },
];

function getVerdictStyle(verdict: ClaimVerdict) {
  switch (verdict) {
    case 'Supported':
      return {
        icon: CheckCircle2,
        textClass: 'text-emerald-700 dark:text-emerald-400',
        label: 'Supported',
      };
    case 'Partially Supported':
      return {
        icon: Scale,
        textClass: 'text-amber-700 dark:text-amber-400',
        label: 'Partially Supported',
      };
    case 'Misleading':
      return {
        icon: AlertTriangle,
        textClass: 'text-amber-700 dark:text-amber-400',
        label: 'Misleading / Needs Context',
      };
    case 'Contradicted':
      return {
        icon: XCircle,
        textClass: 'text-red-700 dark:text-red-400',
        label: 'Contradicted by Evidence',
      };
    default:
      return {
        icon: HelpCircle,
        textClass: 'text-slate-600 dark:text-slate-400',
        label: verdict,
      };
  }
}

export const FactCheckerView: React.FC<FactCheckerViewProps> = ({
  factDraft,
  setFactDraft,
  result,
  loading,
  onRunFactCheck,
  onReportIssue,
  onWordDoubleClick,
}) => {
  const [copiedCredible, setCopiedCredible] = useState(false);
  const [backupOriginal, setBackupOriginal] = useState<string | null>(null);

  const handleCopyImproved = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCredible(true);
    setTimeout(() => setCopiedCredible(false), 1800);
  };

  const handleReplaceWithCredible = (text: string) => {
    if (!backupOriginal) {
      setBackupOriginal(factDraft);
    }
    setFactDraft(text);
  };

  return (
    <div className="space-y-6">
      {/* Input & Sample Selector Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              AI Fact Checker & Opinion Analyzer
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Separates verifiable facts from predictions and opinions, checks primary sources, and rewrites for maximum credibility.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {FACT_SAMPLES.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setFactDraft(s.text);
                  onRunFactCheck(s.text);
                }}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="fact-check-textarea"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Statement, Argument, or Social Post to Verify
            </label>
            {backupOriginal !== null && (
              <button
                type="button"
                onClick={() => {
                  setFactDraft(backupOriginal);
                  setBackupOriginal(null);
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Restore Unedited Statement</span>
              </button>
            )}
          </div>
          <textarea
            id="fact-check-textarea"
            value={factDraft}
            onChange={(e) => setFactDraft(e.target.value)}
            onDoubleClick={(e) => onWordDoubleClick(e, factDraft)}
            rows={4}
            placeholder="Enter a claim or argument (e.g., 'Artificial intelligence will replace 90% of software engineers in the next five years.')"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 p-3.5 text-sm leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Prioritizes government publications, peer-reviewed research, and primary reports. Never invents citations.
          </span>
          <button
            type="button"
            disabled={loading || !factDraft.trim()}
            onClick={() => onRunFactCheck(factDraft)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{loading ? 'Verifying Claims & Sources...' : 'Analyze Claims & Verify Facts'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="h-5 w-1/2 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-24 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-24 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="h-5 w-1/2 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-40 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
      ) : result ? (
        <div className="space-y-6" data-testid="fact-check-results">
          {/* Executive Summary Banner */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Verification Summary
            </div>
            <p
              onDoubleClick={(e) => onWordDoubleClick(e, result.summaryVerdict)}
              className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed"
            >
              {result.summaryVerdict}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Cols: Extracted Claims & Grounded Sources */}
            <div className="lg:col-span-7 space-y-4">
              {result.claims.map((claim) => {
                const style = getVerdictStyle(claim.verdict);
                const VerdictIcon = style.icon;
                return (
                  <div
                    key={claim.id}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4"
                  >
                    {/* Metadata line using unboxed text with · separators */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 font-medium">
                        <VerdictIcon className={`w-4 h-4 ${style.textClass}`} />
                        <span className={`font-bold ${style.textClass}`} data-testid="claim-verdict-label">
                          {style.label}
                        </span>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span className="text-slate-600 dark:text-slate-300">
                          Classification: {claim.classification}
                        </span>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          Confidence: {claim.confidence}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                        Claim Analyzed:
                      </div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        &ldquo;{claim.claimText}&rdquo;
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs leading-relaxed">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Analysis:{' '}
                        </span>
                        <span
                          onDoubleClick={(e) => onWordDoubleClick(e, claim.explanation)}
                          className="text-slate-700 dark:text-slate-300"
                        >
                          {claim.explanation}
                        </span>
                      </div>

                      {claim.supportingEvidence && (
                        <div>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            Supporting Evidence:{' '}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300">
                            {claim.supportingEvidence}
                          </span>
                        </div>
                      )}

                      {claim.contradictingEvidence && (
                        <div>
                          <span className="font-semibold text-red-700 dark:text-red-400">
                            Contradicting / Qualifying Evidence:{' '}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300">
                            {claim.contradictingEvidence}
                          </span>
                        </div>
                      )}

                      {claim.contextNeeded && (
                        <div>
                          <span className="font-semibold text-amber-700 dark:text-amber-400">
                            Required Context:{' '}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300">
                            {claim.contextNeeded}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Verified Primary Sources */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Verified Reference Sources ({claim.sources.length})
                      </div>
                      <div className="space-y-2">
                        {claim.sources.map((src, sIdx) => (
                          <div
                            key={sIdx}
                            className="p-3 rounded-lg bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 text-xs space-y-1"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <a
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                              >
                                <span>{src.title}</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            </div>
                            <div className="text-slate-500 dark:text-slate-400">
                              <span>{src.publisher}</span>
                              {src.publishedDate && (
                                <>
                                  <span aria-hidden="true"> · </span>
                                  <span className="tabular-nums">Published {src.publishedDate}</span>
                                </>
                              )}
                            </div>
                            {src.snippet && (
                              <p className="text-slate-600 dark:text-slate-300 pt-0.5">
                                {src.snippet}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right 5 Cols: Opinion & Logical Analysis + Credibility-Improved Version */}
            <div className="lg:col-span-5 space-y-4">
              {/* Credibility-Improved Version Card */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Credibility-Improved Rewrite
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Preserves your core argument while aligning with verified evidence
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onReportIssue(
                        'fact_check',
                        result.originalText,
                        result.improvedCredibleVersion
                      )
                    }
                    aria-label="Report fact-check rewrite"
                    className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg"
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div
                  onDoubleClick={(e) => onWordDoubleClick(e, result.improvedCredibleVersion)}
                  className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-sm leading-relaxed text-slate-900 dark:text-slate-100 select-text"
                  data-testid="fact-check-improved-version"
                >
                  {result.improvedCredibleVersion}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopyImproved(result.improvedCredibleVersion)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copiedCredible ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Credible Version</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReplaceWithCredible(result.improvedCredibleVersion)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Replace Original</span>
                  </button>
                </div>
              </div>

              {/* Opinion & Argument Logic Analyzer */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 text-xs leading-relaxed">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Opinion & Argument Logic Evaluation
                </h3>

                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Logical Consistency:{' '}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {result.opinionAnalysis.overallLogicalConsistency}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Argument Strength:{' '}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {result.opinionAnalysis.qualityOfArguments}
                  </span>
                </div>

                {result.opinionAnalysis.detectedBiases.length > 0 && (
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      Potential Framing Biases:
                    </div>
                    <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                      {result.opinionAnalysis.detectedBiases.map((b, i) => (
                        <li key={i}>• {b}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.opinionAnalysis.missingPerspectives.length > 0 && (
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      Missing Perspectives & Context:
                    </div>
                    <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                      {result.opinionAnalysis.missingPerspectives.map((mp, i) => (
                        <li key={i}>• {mp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.opinionAnalysis.counterarguments.length > 0 && (
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      Key Counterarguments to Anticipate:
                    </div>
                    <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                      {result.opinionAnalysis.counterarguments.map((ca, i) => (
                        <li key={i}>• {ca}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
