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
    <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 text-center">
        Your Perfect Outfit
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {outfitItems.map((item, index) => (
          <div
            key={index}
            className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200"
          >
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-2xl">{item.icon}</span>
              <h3 className="font-semibold text-gray-700">{item.label}</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">{item.value}</p>
          </div>
        ))}
      </div>

      {suggestion.reasoning && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
            <span className="text-lg mr-2">💡</span>
            Why This Outfit Works
          </h3>
          <p className="text-blue-700 leading-relaxed">{suggestion.reasoning}</p>
        </div>
      )}

      <div className="mt-6 text-center">
        <button
          onClick={() => window.location.reload()}
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Try Another Image
        </button>
      </div>
    </div>
  );
};

export default OutfitSuggestion;
