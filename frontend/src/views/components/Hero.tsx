import React from 'react';

const Hero: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-indigo-500 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-teal-400 blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-6">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 lg:gap-8">
          {/* Text column */}
          <div className="flex-1 text-center lg:text-left space-y-3 sm:space-y-4">
            <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-teal-100 ring-1 ring-white/15">
              <span className="mr-1">✨</span> Smart outfits for real life
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
              Look good in every
              <span className="text-teal-300"> moment</span>.
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-slate-200 max-w-xl mx-auto lg:mx-0">
              Upload a piece from your wardrobe and let AI build a complete outfit around it&mdash;
              perfect for work, dates, or weekends with friends.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1">
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs text-slate-100 border border-white/15">
                📸 Upload or take a photo
              </span>
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs text-slate-100 border border-white/15">
                🎯 Outfit ideas in seconds
              </span>
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs text-slate-100 border border-white/15">
                💾 History & wardrobe built-in
              </span>
            </div>
          </div>

          {/* Visual column - hidden on very small screens to keep hero compact */}
          <div className="hidden md:block w-full max-w-xs sm:max-w-sm lg:max-w-md">
            <div className="rounded-3xl bg-white/5 border border-white/10 p-4 sm:p-5 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-400 to-indigo-500 flex items-center justify-center text-sm font-semibold">
                    AI
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-100">Today&apos;s fit</p>
                    <p className="text-[11px] text-slate-300">Curated just for you</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                  Free beta
                </span>
              </div>

              <div className="relative aspect-[4/5] rounded-2xl bg-slate-900/80 border border-slate-700/70 overflow-hidden mb-3 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-900 opacity-70" />
                <div className="relative text-center space-y-1 px-4">
                  <div className="text-4xl mb-1" aria-hidden="true">
                    👕👖
                  </div>
                  <p className="text-sm font-medium text-slate-50">
                    “Smart casual for a Friday night?”
                  </p>
                  <p className="text-xs text-slate-300">
                    We&apos;ll match your favorite piece with tops, bottoms, shoes, and more.
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-center text-slate-300">
                Start by dropping a photo below &mdash; no account required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

