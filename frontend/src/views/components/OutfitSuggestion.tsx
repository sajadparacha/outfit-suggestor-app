import React from 'react';

interface OutfitSuggestionData {
  shirt: string;
  trouser: string;
  blazer: string;
  shoes: string;
  belt: string;
  reasoning: string;
}

interface OutfitSuggestionProps {
  suggestion: OutfitSuggestionData;
}

const OutfitSuggestion: React.FC<OutfitSuggestionProps> = ({ suggestion }) => {
  const outfitItems = [
    { label: 'Shirt', value: suggestion.shirt, icon: '👔' },
    { label: 'Trouser', value: suggestion.trouser, icon: '👖' },
    { label: 'Blazer', value: suggestion.blazer, icon: '🧥' },
    { label: 'Shoes', value: suggestion.shoes, icon: '👞' },
    { label: 'Belt', value: suggestion.belt, icon: '🪢' },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur md:p-8">
      <h2 className="mb-6 text-center text-2xl font-bold text-white md:text-3xl">Your Perfect Outfit</h2>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {outfitItems.map((item, index) => (
          <div key={index} className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
            <div className="mb-2 flex items-center space-x-3">
              <span className="text-2xl">{item.icon}</span>
              <h3 className="font-semibold text-slate-200">{item.label}</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">{item.value}</p>
          </div>
        ))}
      </div>

      {suggestion.reasoning && (
        <div className="card-brand-accent rounded-xl p-6">
          <h3 className="mb-3 flex items-center font-semibold text-brand-blue">
            <span className="mr-2 text-lg">💡</span>
            Why This Outfit Works
          </h3>
          <p className="leading-relaxed text-slate-300">{suggestion.reasoning}</p>
        </div>
      )}

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-brand rounded-xl px-6 py-3 text-sm font-medium"
        >
          Try Another Image
        </button>
      </div>
    </div>
  );
};

export default OutfitSuggestion;
