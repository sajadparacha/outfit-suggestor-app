import React from 'react';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-8 border-t border-gray-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50">
      <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-600">
        <p className="mb-2 sm:mb-0">© {year} Sajjad Ahmed Paracha. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="hover:text-teal-600 transition-colors underline decoration-dotted"
            aria-label="Privacy policy"
          >
            Privacy
          </button>
          <span className="text-gray-300">•</span>
          <button
            type="button"
            className="hover:text-teal-600 transition-colors underline decoration-dotted"
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


