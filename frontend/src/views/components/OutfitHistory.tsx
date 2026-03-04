/**
 * Outfit History Component
 * Pure presentation component - displays a list of past outfit suggestions
 */

import React, { useState } from 'react';
import { OutfitHistoryEntry } from '../../models/OutfitModels';
import { useHistorySearchController } from '../../controllers/useHistorySearchController';

interface OutfitHistoryProps {
  history: OutfitHistoryEntry[];
  loading: boolean;
  error: string | null;
  isFullView: boolean;
  onRefresh: () => void;
  onEnsureFullHistory: () => Promise<unknown>;
  onDelete: (entryId: number) => Promise<void>;
  searchController?: ReturnType<typeof useHistorySearchController>;
}

const OutfitHistory: React.FC<OutfitHistoryProps> = ({
  history,
  loading,
  error,
  isFullView,
  onRefresh,
  onEnsureFullHistory,
  onDelete,
  searchController: providedSearchController,
}) => {
  // Always call the hook (hooks must be called unconditionally)
  // If a controller is provided, we'll use it, otherwise create a default one
  const defaultSearchController = useHistorySearchController(
    history,
    onEnsureFullHistory,
    isFullView
  );
  
  // Use provided search controller or the default one
  const searchController = providedSearchController || defaultSearchController;

  const {
    searchInput,
    searchQuery,
    sortBy,
    filteredHistory,
    setSearchInput,
    setSortBy,
    handleSearch,
    handleClearSearch,
    highlightText
  } = searchController;

  // Image viewer state
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [viewingImageType, setViewingImageType] = useState<'model' | 'upload' | null>(null);

  const handleViewImage = (imageData: string, type: 'model' | 'upload') => {
    if (type === 'model') {
      setViewingImage(`data:image/png;base64,${imageData}`);
    } else {
      setViewingImage(`data:image/jpeg;base64,${imageData}`);
    }
    setViewingImageType(type);
  };

  const handleDeleteEntry = async (entryId: number) => {
    if (window.confirm('Are you sure you want to delete this outfit history entry?')) {
      try {
        await onDelete(entryId);
      } catch (err) {
        console.error('Error deleting history entry:', err);
        // Error is handled by controller
      }
    }
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

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
          <p className="text-slate-200">Loading history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-8">
        <div className="text-center">
          <div className="text-red-400 text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-white mb-2">Error Loading History</h3>
          <p className="text-slate-200 mb-4">{error}</p>
          <button
            onClick={onRefresh}
            className="px-6 py-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with title and refresh button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Outfit History
          </h2>
          {!isFullView && history.length > 0 && (
            <p className="text-sm text-slate-400 mt-1">
              Showing last {history.length} {history.length === 1 ? 'entry' : 'entries'}. Click load all to see more.
            </p>
          )}
          {isFullView && history.length > 0 && (
            <p className="text-sm text-slate-400 mt-1">
              Showing all {history.length} {history.length === 1 ? 'entry' : 'entries'}
            </p>
          )}
        </div>
        {history.length > 0 && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 text-teal-300 hover:bg-white/10 rounded-xl transition-colors flex items-center space-x-2 border border-white/10"
          >
            <span>🔄</span>
            <span>{isFullView ? 'Refresh' : 'Load All'}</span>
          </button>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-4 mb-6">
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
                className="w-full px-4 py-2 pl-10 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
              <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors font-medium"
            >
              Search
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="md:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
              className="w-full px-4 py-2 border border-white/20 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          {/* Clear Button */}
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="px-4 py-2 bg-white/10 text-slate-200 rounded-xl hover:bg-white/20 transition-colors border border-white/15"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results Count */}
        {searchQuery && (
          <div className="mt-3 text-sm text-slate-300">
            Found {filteredHistory.length} {filteredHistory.length === 1 ? 'result' : 'results'} for &quot;{searchQuery}&quot;
          </div>
        )}
      </div>

      {/* No History Message */}
      {history.length === 0 && !searchQuery && (
        <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-8">
          <div className="text-center">
            <div className="text-slate-400 text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-white mb-2">No History Yet</h3>
            <p className="text-slate-200 mb-4">
              Your outfit suggestions will appear here once you start using the app.
            </p>
          </div>
        </div>
      )}

      {/* No Results Message */}
      {filteredHistory.length === 0 && searchQuery && history.length > 0 && (
        <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-8">
          <div className="text-center">
            <div className="text-slate-400 text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Results Found</h3>
            <p className="text-slate-200 mb-4">
              No outfit suggestions match your search &quot;{searchQuery}&quot;
            </p>
            <button
              onClick={handleClearSearch}
              className="px-4 py-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 transition-colors"
            >
              Clear Search
            </button>
          </div>
        </div>
      )}

      {/* History Grid */}
      {filteredHistory.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredHistory.map((entry: OutfitHistoryEntry) => {
            // Debug: Log entry data
            if (entry.model_image) {
              console.log(`History entry ${entry.id} has model_image, length: ${entry.model_image.length}`);
            } else {
              console.log(`History entry ${entry.id} has no model_image`);
            }
            
            return (
            <div
              key={entry.id}
              className="rounded-2xl bg-white/5 border border-white/10 shadow-xl hover:shadow-2xl transition-all overflow-hidden backdrop-blur"
            >
              {/* Model Image (preferred) or Uploaded Image */}
              {entry.model_image ? (
                <div 
                  className="w-full bg-slate-800/80 overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleViewImage(entry.model_image!, 'model')}
                  title="Click to view full size"
                >
                  <img
                    src={`data:image/png;base64,${entry.model_image}`}
                    alt="AI generated model wearing recommended outfit"
                    className="w-full h-auto max-h-96 object-contain bg-slate-900/80"
                    onError={(e) => {
                      console.error(`Error loading model image for entry ${entry.id}:`, e);
                    }}
                    onLoad={() => {
                      console.log(`✅ Model image loaded for entry ${entry.id}`);
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg z-10">
                    🤖 AI Model
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-5 transition-all flex items-center justify-center">
                    <div className="text-white bg-black bg-opacity-50 px-3 py-1 rounded text-xs opacity-0 hover:opacity-100 transition-opacity">
                      Click to enlarge
                    </div>
                  </div>
                </div>
              ) : entry.image_data ? (
                <div 
                  className="w-full h-48 bg-slate-800/80 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative"
                  onClick={() => handleViewImage(entry.image_data!, 'upload')}
                  title="Click to view full size"
                >
                  <img
                    src={`data:image/jpeg;base64,${entry.image_data}`}
                    alt="Uploaded outfit"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-5 transition-all flex items-center justify-center">
                    <div className="text-white bg-black bg-opacity-50 px-3 py-1 rounded text-xs opacity-0 hover:opacity-100 transition-opacity">
                      Click to enlarge
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="p-6">
              {/* Header with date and delete button */}
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm text-slate-400">
                  {formatDate(entry.created_at)}
                </span>
                <div className="flex items-center gap-2">
                  {entry.text_input && (
                    <span className="text-xs bg-white/10 text-teal-200 px-2 py-1 rounded-full border border-white/15">
                      Custom
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEntry(entry.id);
                    }}
                    className="text-red-400 hover:text-red-300 text-xl transition-colors"
                    title="Delete this entry"
                    disabled={loading}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Context if provided */}
              {entry.text_input && (
                <div className="mb-4 p-3 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-sm text-slate-200 italic">
                    &quot;{highlightText(entry.text_input, searchQuery)}&quot;
                  </p>
                </div>
              )}

              {/* Outfit Details */}
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <span className="text-lg">👔</span>
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Shirt</p>
                    <p className="text-sm text-slate-200">
                      {highlightText(entry.shirt, searchQuery)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="text-lg">👖</span>
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Trouser</p>
                    <p className="text-sm text-slate-200">
                      {highlightText(entry.trouser, searchQuery)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="text-lg">🧥</span>
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Blazer</p>
                    <p className="text-sm text-slate-200">
                      {highlightText(entry.blazer, searchQuery)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="text-lg">👞</span>
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Shoes</p>
                    <p className="text-sm text-slate-200">
                      {highlightText(entry.shoes, searchQuery)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <span className="text-lg">🎀</span>
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Belt</p>
                    <p className="text-sm text-slate-200">
                      {highlightText(entry.belt, searchQuery)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reasoning */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-slate-400 uppercase mb-1">Why this works</p>
                <p className="text-sm text-slate-200">
                  {highlightText(entry.reasoning, searchQuery)}
                </p>
              </div>
            </div>
          </div>
            );
          })}
        </div>
      )}

      {/* Image Viewer Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setViewingImage(null);
            setViewingImageType(null);
          }}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img
              src={viewingImage}
              alt={viewingImageType === 'model' ? 'AI generated model' : 'Uploaded outfit'}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            {viewingImageType === 'model' && (
              <div className="absolute top-4 right-20 bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                🤖 AI Model
              </div>
            )}
            <button
              onClick={() => {
                setViewingImage(null);
                setViewingImageType(null);
              }}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-3 text-2xl transition-all"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutfitHistory;

