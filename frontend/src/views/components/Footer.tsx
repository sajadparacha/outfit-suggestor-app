import React, { useState } from 'react';

interface FooterProps {
  onOpenUserGuide?: () => void;
  onOpenAbout?: () => void;
}

const linkBtn =
  'min-h-[44px] inline-flex items-center text-slate-400 transition-colors hover:text-brand-blue underline decoration-dotted touch-manipulation px-1';

const Footer: React.FC<FooterProps> = ({ onOpenUserGuide, onOpenAbout }) => {
  const year = new Date().getFullYear();
  const [expanded, setExpanded] = useState(false);

  return (
    <footer className="relative mt-12 border-t border-white/10 bg-brand-navy/80 backdrop-blur">
      <div className="container mx-auto px-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between py-4 text-sm font-medium text-slate-300 transition hover:text-white touch-manipulation"
          aria-expanded={expanded}
        >
          <span>More options</span>
          <svg
            className={`h-4 w-4 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div className="border-t border-white/10 pb-6 pt-4">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="mb-0 text-center text-sm text-slate-400 sm:text-left">
                © {year} Sajjad Ahmed Paracha. All rights reserved.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-x-4">
                {onOpenUserGuide && (
                  <>
                    <button
                      type="button"
                      onClick={onOpenUserGuide}
                      className={linkBtn}
                      aria-label="Open user guide"
                    >
                      User guide
                    </button>
                    <span className="text-slate-600" aria-hidden>
                      •
                    </span>
                  </>
                )}
                {onOpenAbout && (
                  <>
                    <button
                      type="button"
                      onClick={onOpenAbout}
                      className={linkBtn}
                      aria-label="About the app and creator"
                    >
                      About
                    </button>
                    <span className="text-slate-600" aria-hidden>
                      •
                    </span>
                  </>
                )}
                <button type="button" className={linkBtn} aria-label="Privacy policy">
                  Privacy
                </button>
                <span className="text-slate-600" aria-hidden>
                  •
                </span>
                <button type="button" className={linkBtn} aria-label="Terms of service">
                  Terms
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};

export default Footer;
