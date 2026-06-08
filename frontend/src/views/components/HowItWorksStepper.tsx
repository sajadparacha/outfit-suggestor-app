import React from 'react';

const steps = [
  {
    number: 1,
    title: 'Upload Item',
    description: 'Snap or upload a photo of any clothing piece from your closet.',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
  {
    number: 2,
    title: 'Set Preferences',
    description: 'Choose occasion, season, style, and add any personal notes.',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    ),
  },
  {
    number: 3,
    title: 'Generate',
    description: 'AI builds a complete outfit around your item in seconds.',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2z" />
      </svg>
    ),
  },
  {
    number: 4,
    title: 'Save & Explore',
    description: 'Save looks to history, browse your wardrobe, and refine.',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
      </svg>
    ),
  },
];

const HowItWorksStepper: React.FC = () => (
  <section className="mt-12 sm:mt-16" aria-labelledby="how-it-works-heading">
    <h2 id="how-it-works-heading" className="mb-2 text-xl font-bold text-white sm:text-2xl">
      How it works
    </h2>
    <p className="mb-6 text-sm text-slate-400">
      Upload a new photo, or start from{' '}
      <span className="text-slate-200">Wardrobe</span> — pick a saved item, tune preferences on Suggest, then generate.
    </p>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, index) => (
        <div
          key={step.number}
          className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-lg backdrop-blur transition hover:border-white/20"
        >
          {index < steps.length - 1 && (
            <span
              className="absolute right-0 top-1/2 hidden h-px w-4 translate-x-full bg-gradient-to-r from-brand-blue/50 to-transparent lg:block"
              aria-hidden
            />
          )}
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient-soft text-brand-blue">
              {step.icon}
            </div>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white">
              {step.number}
            </span>
          </div>
          <h3 className="mb-1.5 font-semibold text-white">{step.title}</h3>
          <p className="text-sm leading-relaxed text-slate-400">{step.description}</p>
        </div>
      ))}
    </div>
  </section>
);

export default HowItWorksStepper;
