import React from 'react';

interface FooterProps {
  onOpenUserGuide?: () => void;
  onOpenAbout?: () => void;
}

const linkBtn =
  'min-h-[44px] inline-flex items-center hover:text-teal-300 transition-colors underline decoration-dotted touch-manipulation px-1';

const Footer: React.FC<FooterProps> = ({ onOpenUserGuide, onOpenAbout }) => {
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-8 border-t border-white/10 bg-slate-900/80 md:bg-slate-950/80 backdrop-blur">
      <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-300">
        <p className="mb-0 sm:mb-0 text-center sm:text-left">© {year} Sajjad Ahmed Paracha. All rights reserved.</p>
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
              <span className="text-slate-500" aria-hidden>
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
              <span className="text-slate-500" aria-hidden>
                •
              </span>
            </>
          )}
          <button type="button" className={linkBtn} aria-label="Privacy policy">
            Privacy
          </button>
          <span className="text-slate-500" aria-hidden>
            •
          </span>
          <button type="button" className={linkBtn} aria-label="Terms of service">
            Terms
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


