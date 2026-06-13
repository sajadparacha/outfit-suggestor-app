import React from 'react';
import { WardrobeInsightAdmin } from '../../../models/WardrobeInsightResult';

interface AdminDebugPanelProps {
  admin: WardrobeInsightAdmin;
}

const formatCost = (cost: number): string => {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 0.1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
};

const AdminDebugPanel: React.FC<AdminDebugPanelProps> = ({ admin }) => (
  <details
    open
    className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5"
    data-testid="admin-diagnostics"
  >
    <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
      Admin diagnostics
    </summary>
    <p className="mt-3 text-xs text-slate-400">
      Prompt, response, and cost details appear for Premium analysis runs. Basic analysis shows placeholders below.
    </p>
    <div className="mt-4 space-y-4">
      <div className="rounded-xl border border-brand-blue/20 bg-brand-blue/10 p-4" data-testid="analysis-cost">
        {admin.cost ? (
          <div className="flex items-center justify-between">
            <div>
              <h3 className="mb-1 font-semibold text-brand-blue">Analysis Cost</h3>
              <div className="space-y-1 text-sm text-slate-200">
                <div>ChatGPT: {formatCost(admin.cost.gpt4_cost)}</div>
                {admin.cost.input_tokens !== undefined && (
                  <div>Input tokens: {admin.cost.input_tokens}</div>
                )}
                {admin.cost.output_tokens !== undefined && (
                  <div>Output tokens: {admin.cost.output_tokens}</div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{formatCost(admin.cost.total_cost)}</div>
              <div className="text-xs text-brand-blue">Total</div>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="mb-1 font-semibold text-brand-blue">Analysis Cost</h3>
            <p className="text-sm text-slate-200">
              Cost details are unavailable for this run (likely free-mode or premium fallback).
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
        <h3 className="mb-4 font-semibold text-white">AI Prompt & Response (Admin)</h3>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3" data-testid="input-prompt">
            <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Input Prompt</div>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-sm text-slate-200">
              {admin.aiPrompt || 'Prompt is unavailable for this run (likely free-mode or premium fallback).'}
            </pre>
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3" data-testid="ai-response">
            <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">AI Response</div>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-sm text-slate-200">
              {admin.aiRawResponse || 'Response is unavailable for this run (likely free-mode or premium fallback).'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  </details>
);

export default AdminDebugPanel;
