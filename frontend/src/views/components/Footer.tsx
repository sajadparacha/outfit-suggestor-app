import React from 'react';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-8 border-t border-white/10 bg-slate-900/80 md:bg-slate-950/80 backdrop-blur">
      <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between text-sm text-slate-300">
        <p className="mb-2 sm:mb-0">© {year} Sajjad Ahmed Paracha. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="hover:text-teal-300 transition-colors underline decoration-dotted"
            aria-label="Privacy policy"
          >
            Privacy
          </button>
          <span className="text-slate-500">•</span>
          <button
            type="button"
            className="hover:text-teal-300 transition-colors underline decoration-dotted"
            aria-label="Terms of service"
          >
            Terms
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


