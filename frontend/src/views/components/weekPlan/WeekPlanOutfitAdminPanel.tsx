import React from 'react';
import { OutfitCost } from '../../../models/OutfitModels';
import { WeekPlanOutfit } from '../../../models/WeekPlanModels';

const formatCost = (cost: number): string => {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 0.1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
};

export function weekPlanOutfitHasAdminDiagnostics(outfit: WeekPlanOutfit): boolean {
  return Boolean(outfit.ai_prompt || outfit.ai_raw_response || outfit.cost);
}

interface WeekPlanOutfitAdminPanelProps {
  dayLabel: string;
  outfit: WeekPlanOutfit;
}

const WeekPlanOutfitAdminPanel: React.FC<WeekPlanOutfitAdminPanelProps> = ({
  dayLabel,
  outfit,
}) => {
  if (!weekPlanOutfitHasAdminDiagnostics(outfit)) {
    return null;
  }

  const cost = outfit.cost as OutfitCost | undefined;

  return (
    <details
      className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
      data-testid="week-plan-admin-diagnostics"
    >
      <summary className="cursor-pointer list-none text-xs font-semibold text-slate-300">
        Admin diagnostics — {dayLabel}
      </summary>
      <div className="mt-3 space-y-3">
        {cost && (
          <div
            className="rounded-lg border border-brand-blue/20 bg-brand-blue/10 p-3 text-sm text-slate-200"
            data-testid="week-plan-generation-cost"
          >
            <div className="font-semibold text-brand-blue">Generation cost</div>
            <div className="mt-1">ChatGPT: {formatCost(cost.gpt4_cost)}</div>
            {cost.input_tokens !== undefined && (
              <div>Input tokens: {cost.input_tokens}</div>
            )}
            {cost.output_tokens !== undefined && (
              <div>Output tokens: {cost.output_tokens}</div>
            )}
            <div className="mt-1 font-semibold text-white">
              Total: {formatCost(cost.total_cost)}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div
            className="rounded-lg border border-white/10 bg-slate-900/40 p-2"
            data-testid="week-plan-input-prompt"
          >
            <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">
              Input prompt
            </div>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-200">
              {outfit.ai_prompt || '—'}
            </pre>
          </div>
          <div
            className="rounded-lg border border-white/10 bg-slate-900/40 p-2"
            data-testid="week-plan-ai-response"
          >
            <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">
              AI response
            </div>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-200">
              {outfit.ai_raw_response || '—'}
            </pre>
          </div>
        </div>
      </div>
    </details>
  );
};

export default WeekPlanOutfitAdminPanel;
