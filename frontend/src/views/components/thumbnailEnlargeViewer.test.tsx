import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import OutfitItem from './weekPlan/OutfitItem';
import Wardrobe from './Wardrobe';
import type { WeekPlanOutfit } from '../../models/WeekPlanModels';
import type { WardrobeItem } from '../../models/WardrobeModels';

const mockWardrobeItems: WardrobeItem[] = [];
const mockSummary = {
  total_items: 0,
  by_category: {} as Record<string, number>,
  by_color: {},
  categories: [] as string[],
};
let mockSelectedCategory: string | null = null;

jest.mock('../../controllers/useWardrobeController', () => ({
  useWardrobeController: () => ({
    wardrobeItems: mockWardrobeItems,
    summary: mockSummary,
    loading: false,
    error: null,
    selectedCategory: mockSelectedCategory,
    totalCount: mockWardrobeItems.length,
    currentPage: 1,
    itemsPerPage: 10,
    searchQuery: '',
    loadWardrobe: jest.fn(),
    loadSummary: jest.fn(),
    analyzeImage: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    deleteItem: jest.fn(),
    setSelectedCategory: jest.fn((category: string | null) => {
      mockSelectedCategory = category;
    }),
    setSearchQuery: jest.fn(),
    clearError: jest.fn(),
  }),
}));

const baseOutfit: WeekPlanOutfit = {
  summary: 'Test look',
  shirt: 'White oxford shirt',
  trouser: 'Navy trousers',
  blazer: '',
  shoes: 'Brown shoes',
  belt: '',
  reasoning: 'Clean and simple.',
  matching_wardrobe_items: {
    shirt: [
      {
        id: 11,
        category: 'shirt',
        description: 'White oxford shirt',
        color: 'White',
        image_data: 'week-shirt-thumb',
      },
    ],
    trouser: [],
    blazer: [],
    shoes: [],
    belt: [],
  },
  shirt_id: 11,
};

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

describe('Thumbnail enlarge viewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWardrobeItems.length = 0;
    mockSummary.total_items = 0;
    mockSummary.by_category = {};
    mockSummary.categories = [];
    mockSelectedCategory = null;
    localStorage.setItem('wardrobe_flow_tip_dismissed', 'true');
  });

  describe('Week Planner OutfitItem', () => {
    it('opens and dismisses full-size viewer from slot thumbnail', () => {
      render(
        <OutfitItem
          categoryKey="shirt"
          label="Shirt"
          value="White oxford shirt"
          outfit={baseOutfit}
        />
      );

      fireEvent.click(screen.getByTestId('week-outfit-enlarge-shirt'));
      expect(screen.getByTestId('week-outfit-viewer-shirt')).toBeInTheDocument();
      expect(screen.getByAltText('Full size view')).toHaveAttribute(
        'src',
        'data:image/jpeg;base64,week-shirt-thumb'
      );

      fireEvent.click(screen.getByRole('button', { name: /^Close$/i }));
      expect(screen.queryByTestId('week-outfit-viewer-shirt')).not.toBeInTheDocument();
    });

    it('dismisses viewer on Escape and backdrop click', () => {
      render(
        <OutfitItem
          categoryKey="shirt"
          label="Shirt"
          value="White oxford shirt"
          outfit={baseOutfit}
        />
      );

      fireEvent.click(screen.getByTestId('week-outfit-enlarge-shirt'));
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByTestId('week-outfit-viewer-shirt')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('week-outfit-enlarge-shirt'));
      fireEvent.click(screen.getByTestId('week-outfit-viewer-shirt'));
      expect(screen.queryByTestId('week-outfit-viewer-shirt')).not.toBeInTheDocument();
    });

    it('does not open viewer for placeholder thumbnail', () => {
      const outfitWithoutThumb: WeekPlanOutfit = {
        ...baseOutfit,
        matching_wardrobe_items: null,
        shirt_id: null,
      };
      render(
        <OutfitItem
          categoryKey="shirt"
          label="Shirt"
          value="White oxford shirt"
          outfit={outfitWithoutThumb}
        />
      );

      expect(screen.getByTestId('week-outfit-placeholder-shirt')).toBeInTheDocument();
      expect(screen.queryByTestId('week-outfit-enlarge-shirt')).not.toBeInTheDocument();
      expect(screen.queryByTestId('week-outfit-viewer-shirt')).not.toBeInTheDocument();
    });

    it('does not fire Change when enlarging thumbnail', () => {
      const onChangeItem = jest.fn();
      render(
        <OutfitItem
          categoryKey="shirt"
          label="Shirt"
          value="White oxford shirt"
          outfit={baseOutfit}
          onChangeItem={onChangeItem}
        />
      );

      fireEvent.click(screen.getByTestId('week-outfit-enlarge-shirt'));
      expect(onChangeItem).not.toHaveBeenCalled();
      expect(screen.getByTestId('week-outfit-viewer-shirt')).toBeInTheDocument();
    });
  });

  describe('Wardrobe list/card thumbnail', () => {
    it('opens and dismisses full-size viewer from card thumbnail', () => {
      mockWardrobeItems.push({
        ...mockWardrobeItem,
        image_data: 'wardrobe-card-thumb',
      });
      render(<Wardrobe />);

      fireEvent.click(screen.getByTestId('wardrobe-item-enlarge-1'));
      expect(screen.getByTestId('wardrobe-image-viewer')).toBeInTheDocument();
      expect(screen.getByAltText('Full size view')).toHaveAttribute(
        'src',
        'data:image/jpeg;base64,wardrobe-card-thumb'
      );

      fireEvent.click(screen.getByRole('button', { name: /^Close$/i }));
      expect(screen.queryByTestId('wardrobe-image-viewer')).not.toBeInTheDocument();
    });

    it('does not open viewer for placeholder thumbnail', () => {
      mockWardrobeItems.push({ ...mockWardrobeItem, image_data: null });
      render(<Wardrobe />);

      expect(screen.getByTestId('wardrobe-item-placeholder-1')).toBeInTheDocument();
      expect(screen.queryByTestId('wardrobe-item-enlarge-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('wardrobe-image-viewer')).not.toBeInTheDocument();
    });

    it('does not fire Select when enlarging thumbnail in week-plan pick mode', () => {
      const onPickForWeekPlan = jest.fn();
      mockWardrobeItems.push({
        ...mockWardrobeItem,
        image_data: 'wardrobe-card-thumb',
      });
      render(
        <Wardrobe
          pickSession={{ dayOfWeek: 0, slotKey: 'shirt', category: 'shirt' }}
          onPickForWeekPlan={onPickForWeekPlan}
        />
      );

      fireEvent.click(screen.getByTestId('wardrobe-item-enlarge-1'));
      expect(onPickForWeekPlan).not.toHaveBeenCalled();
      expect(screen.getByTestId('wardrobe-image-viewer')).toBeInTheDocument();
    });
  });
});
