/** Shared Week Planner visual tokens (mockup: deep navy, elevated cards, purple select). */

export const plannerSurface =
  'rounded-xl border border-white/10 bg-[#151B2D] shadow-lg shadow-black/20';

export const plannerSurfaceSoft =
  'rounded-xl border border-white/10 bg-[#151B2D]/80';

export const selectClass =
  'w-full rounded-xl border border-white/10 bg-[#0A0E1A]/80 px-3 py-2 text-sm text-slate-100 focus:border-brand-blue/50 focus:outline-none focus:ring-1 focus:ring-brand-blue/40 focus-visible:ring-2 focus-visible:ring-brand-blue/50';

/** Blue–purple gradient — use ONLY on the single primary page CTA. */
export const primaryCtaClass =
  'btn-brand min-h-[44px] rounded-full px-6 py-2.5 font-semibold disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue';

export const secondaryCtaClass =
  'min-h-[44px] rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40';

export const dayCardSelectedClass =
  'border-brand-purple bg-brand-purple/10 ring-2 ring-brand-purple/70 shadow-[0_0_16px_rgba(196,113,237,0.25)]';

export const statusPillClass: Record<string, string> = {
  ready: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  needs_outfit: 'bg-brand-purple/25 text-purple-200 border-brand-purple/40',
  not_planned: 'bg-slate-500/20 text-slate-400 border-white/10',
  generating: 'bg-brand-blue/25 text-sky-200 border-brand-blue/40',
  edited: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
  missing: 'bg-brand-purple/25 text-purple-200 border-brand-purple/40',
  rest: 'bg-slate-500/20 text-slate-400 border-white/10',
  not_generated: 'bg-slate-600/30 text-slate-300 border-white/10',
};

export const statusLabel: Record<string, string> = {
  ready: 'Ready',
  needs_outfit: 'Needs outfit',
  not_planned: 'Not planned',
  generating: 'Generating',
  edited: 'Edited',
  missing: 'Needs outfit',
  rest: 'Not planned',
  not_generated: 'Needs outfit',
};
