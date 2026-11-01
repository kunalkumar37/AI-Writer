import React from 'react';
import { Trash2, Shield, History, Flag, CheckCircle2 } from 'lucide-react';
import {
  ExtensionSettings,
  ReportedSuggestion,
  WritingHistoryItem,
} from '../types/writebetter';

interface HistoryAndPrivacyViewProps {
  history: WritingHistoryItem[];
  reports: ReportedSuggestion[];
  settings: ExtensionSettings;
  onUpdateSettings: (partial: Partial<ExtensionSettings>) => void;
  onClearHistory: () => void;
  onDeleteAllUserData: () => void;
}

export const HistoryAndPrivacyView: React.FC<HistoryAndPrivacyViewProps> = ({
  history,
  reports,
  settings,
  onUpdateSettings,
  onClearHistory,
  onDeleteAllUserData,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 7 Columns: Writing & Fact-Check History */}
      <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Writing & Verification History ({history.length})
            </h2>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
            No history entries stored. Enable &ldquo;Save Writing History&rdquo; in Privacy Controls to keep a local log of your improved drafts.
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>
                    {item.type === 'writing' ? 'Writing Assistant' : 'Fact Checker'} ·{' '}
                    {item.platform.toUpperCase()} · {item.modeOrVerdict}
                  </span>
                  <span className="tabular-nums">
                    {new Date(item.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="text-slate-500 dark:text-slate-400 line-through">
                  Original: {item.originalText}
                </div>
                <div className="text-slate-900 dark:text-slate-100 font-medium">
                  Improved: {item.selectedOutput}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reported Suggestions Log */}
        {reports.length > 0 && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-amber-500" />
              <span>Reported AI Suggestions ({reports.length})</span>
            </h3>
            <div className="space-y-2">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 text-xs space-y-1"
                >
                  <div className="font-semibold text-amber-800 dark:text-amber-300">
                    Feature: {rep.feature} · Reason: {rep.reason}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 truncate">
                    Input: {rep.originalInput}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right 5 Columns: Privacy Controls, Security Policy & Data Deletion */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Extension Settings & Privacy Controls
          </h2>
        </div>

        <div className="space-y-3 text-xs">
          <label className="flex items-start justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 cursor-pointer">
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">
                Auto-Detect Supported Writing Editors
              </div>
              <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                Show the floating WriteBetter AI icon inside X, LinkedIn, and HTML textareas.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoDetectEditors}
              onChange={(e) => onUpdateSettings({ autoDetectEditors: e.target.checked })}
              className="mt-1 rounded border-slate-300"
            />
          </label>

          <label className="flex items-start justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 cursor-pointer">
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">
                Double-Click English-to-Hindi Popup
              </div>
              <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                Automatically display Devanagari meanings and context when double-clicking words on any site.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.doubleClickHindiEnabled}
              onChange={(e) =>
                onUpdateSettings({ doubleClickHindiEnabled: e.target.checked })
              }
              className="mt-1 rounded border-slate-300"
            />
          </label>

          <label className="flex items-start justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 cursor-pointer">
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">
                Opt-In Local Writing History
              </div>
              <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                Store private social media drafts and rewrites in local storage. Turn off for zero-retention mode.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.saveWritingHistory}
              onChange={(e) => onUpdateSettings({ saveWritingHistory: e.target.checked })}
              className="mt-1 rounded border-slate-300"
            />
          </label>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 space-y-2 text-xs">
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>WriteBetter AI Privacy Guarantee</span>
          </div>
          <ul className="space-y-1 text-slate-600 dark:text-slate-400">
            <li>• Never sends API requests on every keystroke; only runs on explicit user trigger.</li>
            <li>• Never collects or transmits browsing history or background tab URLs.</li>
            <li>• Production Gemini API keys remain strictly on the backend server.</li>
          </ul>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onDeleteAllUserData}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 dark:border-red-900/70 bg-red-50/60 dark:bg-red-950/30 text-red-700 dark:text-red-300 hover:bg-red-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete All Saved Vocabulary, History & Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
