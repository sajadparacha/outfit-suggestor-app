/**
 * Outfit History Component
 * Displays a list of past outfit suggestions with search and filter
 */

import React, { useState, useMemo } from 'react';
import { OutfitHistoryEntry } from '../../models/OutfitModels';

interface OutfitHistoryProps {
  history: OutfitHistoryEntry[];
  loading: boolean;
  error: string | null;
  isFullView: boolean;
  onRefresh: () => void;
}

const OutfitHistory: React.FC<OutfitHistoryProps> = ({
  history,
  loading,
  error,
  isFullView,
  onRefresh,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

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

  // Highlight matching text in search results
  const highlightText = (text: string, query: string): React.ReactElement => {
    if (!query.trim()) {
      return <>{text}</>;
    }

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 text-gray-900 font-medium">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
  };

  // Filter and sort history
  const filteredHistory = useMemo(() => {
    let filtered = [...history];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((entry) => {
        return (
          entry.shirt.toLowerCase().includes(query) ||
          entry.trouser.toLowerCase().includes(query) ||
          entry.blazer.toLowerCase().includes(query) ||
          entry.shoes.toLowerCase().includes(query) ||
          entry.belt.toLowerCase().includes(query) ||
          entry.reasoning.toLowerCase().includes(query) ||
          (entry.text_input && entry.text_input.toLowerCase().includes(query))
        );
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [history, searchQuery, sortBy]);

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
      {/* Header with title and refresh button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Outfit History
          </h2>
          {!isFullView && history.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              Showing last {history.length} {history.length === 1 ? 'entry' : 'entries'}. Click load all to see more.
            </p>
          )}
          {isFullView && history.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              Showing all {history.length} {history.length === 1 ? 'entry' : 'entries'}
            </p>
          )}
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center space-x-2"
        >
          <span>🔄</span>
          <span>{isFullView ? 'Refresh' : 'Load All'}</span>
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input with Button */}
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by clothing items, colors, or context..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Search
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="md:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          {/* Clear Button */}
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results Count */}
        {searchQuery && (
          <div className="mt-3 text-sm text-gray-600">
            Found {filteredHistory.length} {filteredHistory.length === 1 ? 'result' : 'results'} for "{searchQuery}"
          </div>
        )}
      </div>

      {/* No Results Message */}
      {filteredHistory.length === 0 && searchQuery && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="text-gray-400 text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Results Found</h3>
            <p className="text-gray-600 mb-4">
              No outfit suggestions match your search "{searchQuery}"
            </p>
            <button
              onClick={handleClearSearch}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Clear Search
            </button>
          </div>
        </div>
      )}

      {/* History Grid */}
      {filteredHistory.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredHistory.map((entry) => (
          <div
            key={entry.id}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
          >
            {/* Uploaded Image */}
            {entry.image_data && (
              <div className="w-full h-48 bg-gray-100 overflow-hidden">
                <img
                  src={`data:image/jpeg;base64,${entry.image_data}`}
                  alt="Uploaded outfit"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-6">
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
                    "{highlightText(entry.text_input, searchQuery)}"
                  </p>
                </div>
              )}

              {/* Outfit Details */}
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <span className="text-lg">👔</span>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Shirt</p>
                    <p className="text-sm text-gray-800">
                      {highlightText(entry.shirt, searchQuery)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="text-lg">👖</span>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Trouser</p>
                    <p className="text-sm text-gray-800">
                      {highlightText(entry.trouser, searchQuery)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="text-lg">🧥</span>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Blazer</p>
                    <p className="text-sm text-gray-800">
                      {highlightText(entry.blazer, searchQuery)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="text-lg">👞</span>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Shoes</p>
                    <p className="text-sm text-gray-800">
                      {highlightText(entry.shoes, searchQuery)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="text-lg">🎀</span>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Belt</p>
                    <p className="text-sm text-gray-800">
                      {highlightText(entry.belt, searchQuery)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reasoning */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 uppercase mb-1">Why this works</p>
                <p className="text-sm text-gray-700">
                  {highlightText(entry.reasoning, searchQuery)}
                </p>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
};

export default OutfitHistory;

