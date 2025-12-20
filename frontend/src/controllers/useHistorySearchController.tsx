/**
 * History Search Controller Hook
 * Manages search and filter logic for outfit history
 * This is the "Controller" in the MVC pattern for history search
 */

import React, { useState, useMemo, useCallback } from 'react';
import { OutfitHistoryEntry } from '../models/OutfitModels';

interface UseHistorySearchControllerReturn {
  // State
  searchInput: string;
  searchQuery: string;
  sortBy: 'newest' | 'oldest';
  filteredHistory: OutfitHistoryEntry[];
  
  // Actions
  setSearchInput: (input: string) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: 'newest' | 'oldest') => void;
  handleSearch: () => void;
  handleClearSearch: () => void;
  highlightText: (text: string, query: string) => React.ReactElement;
}

export const useHistorySearchController = (
  history: OutfitHistoryEntry[],
  onEnsureFullHistory?: () => Promise<void>,
  isFullView?: boolean
): UseHistorySearchControllerReturn => {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  /**
   * Handle search - ensures full history is loaded if needed
   */
  const handleSearch = useCallback(async () => {
    // If searching and not in full view, load all history first
    if (searchInput.trim() && !isFullView && onEnsureFullHistory) {
      await onEnsureFullHistory();
    }
    setSearchQuery(searchInput);
  }, [searchInput, isFullView, onEnsureFullHistory]);

  /**
   * Clear search
   */
  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setSearchQuery('');
  }, []);

  /**
   * Highlight matching text in search results
   */
  const highlightText = useCallback((text: string, query: string): React.ReactElement => {
    if (!query.trim()) {
      return <>{text}</>;
    }

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part: string, index: number) =>
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
  }, []);

  /**
   * Filter and sort history
   */
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

  return {
    searchInput,
    searchQuery,
    sortBy,
    filteredHistory,
    setSearchInput,
    setSearchQuery,
    setSortBy,
    handleSearch,
    handleClearSearch,
    highlightText
  };
};

