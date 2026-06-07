import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-xl backdrop-blur">
      <div className="flex flex-col items-center space-y-4">
        <div className="spinner-brand h-12 w-12" />
        <h3 className="text-lg font-semibold text-white">Analyzing Your Image</h3>
        <p className="text-slate-400">Our AI is working on your perfect outfit suggestion...</p>
        <div className="flex space-x-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-brand-blue" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-brand-blue" style={{ animationDelay: '0.1s' }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-brand-purple" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
