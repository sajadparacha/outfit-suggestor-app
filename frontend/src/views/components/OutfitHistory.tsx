/**
 * Outfit History Component
 * Displays a list of past outfit suggestions
 */

import React from 'react';
import { OutfitHistoryEntry } from '../../models/OutfitModels';

interface OutfitHistoryProps {
  history: OutfitHistoryEntry[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const OutfitHistory: React.FC<OutfitHistoryProps> = ({
  history,
  loading,
  error,
  onRefresh,
}) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-gray-600">Loading history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Error Loading History</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={onRefresh}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No History Yet</h3>
          <p className="text-gray-600 mb-4">
            Your outfit suggestions will appear here once you start using the app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Outfit History ({history.length})
        </h2>
        <button
          onClick={onRefresh}
          className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center space-x-2"
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
          >
            {/* Header with date */}
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm text-gray-500">
                {formatDate(entry.created_at)}
              </span>
              {entry.text_input && (
                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                  Custom
                </span>
              )}
            </div>

            {/* Context if provided */}
            {entry.text_input && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 italic">
                  "{entry.text_input}"
                </p>
              </div>
            )}

            {/* Outfit Details */}
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <span className="text-lg">👔</span>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Shirt</p>
                  <p className="text-sm text-gray-800">{entry.shirt}</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="text-lg">👖</span>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Trouser</p>
                  <p className="text-sm text-gray-800">{entry.trouser}</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="text-lg">🧥</span>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Blazer</p>
                  <p className="text-sm text-gray-800">{entry.blazer}</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="text-lg">👞</span>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Shoes</p>
                  <p className="text-sm text-gray-800">{entry.shoes}</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="text-lg">🎀</span>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Belt</p>
                  <p className="text-sm text-gray-800">{entry.belt}</p>
                </div>
              </div>
            </div>

            {/* Reasoning */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 uppercase mb-1">Why this works</p>
              <p className="text-sm text-gray-700">{entry.reasoning}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OutfitHistory;

