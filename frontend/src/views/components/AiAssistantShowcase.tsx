import React from 'react';
import { MAIN_FLOW_UX_COPY } from '../../utils/mainFlowUxCopy';

const SparkleIcon = () => (
  <svg className="h-5 w-5 text-brand-purple" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2z" />
  </svg>
);

const PROCESS_STEPS = [
  {
    title: 'We Analyze',
    description: 'We detect color, fabric, pattern and style.',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
      </svg>
    ),
  },
  {
    title: 'We Match',
    description: 'We search our database to find the perfect pieces that go well together.',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    title: 'You Get Outfits',
    description: 'Receive complete outfit suggestions with shoes and accessories.',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  },
];

const AiAssistantShowcase: React.FC = () => (
  <div
    className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-xl backdrop-blur"
    data-testid="empty-outfit-preview"
  >
    <div className="flex flex-1 flex-col p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <SparkleIcon />
        <div>
          <h2 className="text-lg font-semibold text-white sm:text-xl">AI Outfit Assistant</h2>
          <p className="mt-0.5 text-sm text-slate-400">Upload a clothing item and we&apos;ll do the rest.</p>
        </div>
      </div>

      <div className="relative mb-6 space-y-5 pl-1">
        <div className="absolute bottom-3 left-[17px] top-3 w-px border-l border-dashed border-brand-purple/30" aria-hidden />
        {PROCESS_STEPS.map((step) => (
          <div key={step.title} className="relative flex gap-4">
            <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-purple/30 bg-brand-purple/10 text-brand-purple">
              {step.icon}
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-semibold text-white">{step.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-hero-flatlay">
        <div className="absolute inset-0 bg-brand-gradient-soft opacity-25" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-center gap-4 p-6 sm:gap-6">
          <span className="text-5xl drop-shadow-lg sm:text-6xl" role="img" aria-label="Shirt">
            👔
          </span>
          <span className="text-4xl drop-shadow-lg sm:text-5xl" role="img" aria-label="Shoes">
            👞
          </span>
          <span className="text-4xl drop-shadow-lg sm:text-5xl" role="img" aria-label="Jacket">
            🧥
          </span>
          <span className="text-4xl drop-shadow-lg sm:text-5xl" role="img" aria-label="Jeans">
            👖
          </span>
        </div>
        <h3 className="relative mt-4 text-center text-base font-semibold text-white sm:text-lg">
          {MAIN_FLOW_UX_COPY.emptyPreviewHeadline}
        </h3>
        <p className="relative mt-1 max-w-xs px-4 pb-6 text-center text-xs text-slate-400 sm:text-sm">
          {MAIN_FLOW_UX_COPY.emptyPreviewSubline}
        </p>
      </div>
    </div>
  </div>
);

export default AiAssistantShowcase;
