import React from 'react';
import { render, screen } from '@testing-library/react';
import Wardrobe from './Wardrobe';
import type { WardrobeItem } from '../../models/WardrobeModels';

// Mock state: shared array so we can test both empty and with-items in one file
const mockWardrobeItems: WardrobeItem[] = [];

const mockLoadWardrobe = jest.fn();
const mockLoadSummary = jest.fn();
const mockAnalyzeImage = jest.fn();
const mockAddItem = jest.fn();
const mockUpdateItem = jest.fn();
const mockDeleteItem = jest.fn();
const mockSetSelectedCategory = jest.fn();
const mockSetSearchQuery = jest.fn();
const mockClearError = jest.fn();

jest.mock('../../controllers/useWardrobeController', () => ({
  useWardrobeController: () => ({
    wardrobeItems: mockWardrobeItems,
    summary: {
      total_items: mockWardrobeItems.length,
      by_category: { shirt: mockWardrobeItems.filter((i) => i.category === 'shirt').length },
      by_color: {},
      categories: ['shirt'],
    },
    loading: false,
    error: null,
    selectedCategory: null,
    totalCount: mockWardrobeItems.length,
    currentPage: 1,
    itemsPerPage: 10,
    searchQuery: '',
    loadWardrobe: mockLoadWardrobe,
    loadSummary: mockLoadSummary,
    analyzeImage: mockAnalyzeImage,
    addItem: mockAddItem,
    updateItem: mockUpdateItem,
    deleteItem: mockDeleteItem,
    setSelectedCategory: mockSetSelectedCategory,
    setSearchQuery: mockSetSearchQuery,
    clearError: mockClearError,
  }),
}));

const mockWardrobeItem: WardrobeItem = {
  id: 1,
  category: 'shirt',
  name: null,
  description: 'Test shirt',
  color: 'Blue',
  brand: null,
  size: null,
  image_data: null,
  tags: null,
  condition: null,
  wear_count: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('Wardrobe page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWardrobeItems.length = 0;
  });

  it('loads the wardrobe page and shows the page header', () => {
    render(<Wardrobe />);
    expect(screen.getByRole('heading', { name: /My Wardrobe/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Add items to get personalized outfit suggestions/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty list state when there are no wardrobe items', () => {
    render(<Wardrobe />);
    expect(screen.getByText(/Your wardrobe is empty/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Your First Item/i })).toBeInTheDocument();
  });

  it('shows wardrobe item list when items exist', () => {
    mockWardrobeItems.push(mockWardrobeItem);
    render(<Wardrobe />);
    expect(screen.getByRole('heading', { name: /My Wardrobe/i })).toBeInTheDocument();
    expect(screen.getByText('Test shirt')).toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();
    expect(screen.getByText(/Color:/)).toBeInTheDocument();
  });
});
