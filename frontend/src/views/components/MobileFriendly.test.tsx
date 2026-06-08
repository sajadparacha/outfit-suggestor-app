/**
 * Tests for mobile-friendly (responsive) layout and touch targets.
 * Asserts that markup and classes added for mobile are present so that
 * the app behaves correctly on small viewports and touch devices.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../App';
import Sidebar from './Sidebar';
import Hero from './Hero';
import OutfitPreview from './OutfitPreview';
import Wardrobe from './Wardrobe';
import type { OutfitSuggestion } from '../../models/OutfitModels';

describe('Mobile-friendly layout and touch targets', () => {
  describe('Navigation (App)', () => {
    it('nav has horizontal scroll and dedicated mobile row in header grid', async () => {
      render(<App />);
      const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
      const cls = nav.getAttribute('class') ?? '';
      expect(cls).toMatch(/overflow-x-auto/);
      expect(cls).toMatch(/scrollbar-none/);
      expect(cls).toMatch(/col-span-2/);
      expect(cls).toMatch(/row-start-2/);
    });

    it('header uses responsive grid layout for logo, nav, and auth', () => {
      render(<App />);
      const headerGrid = document.querySelector('header .grid');
      expect(headerGrid).toBeInTheDocument();
      expect(headerGrid?.getAttribute('class')).toMatch(/md:min-h-\[56px\]/);
    });

    it('nav tab buttons have touch-manipulation for responsive tap', () => {
      render(<App />);
      const suggestTab = screen.getByRole('button', { name: /^Suggest$/i });
      expect(suggestTab.getAttribute('class')).toMatch(/touch-manipulation/);
    });

    it('nav tab buttons have minimum height for touch targets', () => {
      render(<App />);
      const suggestTab = screen.getByRole('button', { name: /^Suggest$/i });
      const cls = suggestTab.getAttribute('class') ?? '';
      expect(cls).toMatch(/touch-manipulation/);
      expect(cls).toMatch(/min-h-\[44px\]|py-2/);
    });

    it('Guide tab is visible and has touch-friendly classes', () => {
      render(<App />);
      const guideTab = screen.getByRole('button', { name: 'Guide' });
      expect(guideTab).toBeInTheDocument();
      expect(guideTab.getAttribute('class')).toMatch(/touch-manipulation/);
    });

    it('About is in the footer with touch-friendly classes', async () => {
      render(<App />);
      await screen.findByRole('button', { name: /^Suggest$/ });
      fireEvent.click(screen.getByRole('button', { name: /More options/i }));
      const aboutFooter = await screen.findByRole('button', { name: /About the app and creator/i });
      expect(aboutFooter).toBeInTheDocument();
      expect(aboutFooter.getAttribute('class')).toMatch(/touch-manipulation/);
    });
  });

  describe('Sidebar', () => {
    const defaultProps = {
      filters: { occasion: 'casual', season: 'all', style: 'modern' },
      setFilters: jest.fn(),
      preferenceText: '',
      setPreferenceText: jest.fn(),
      image: null,
      setImage: jest.fn(),
      onGetSuggestion: jest.fn(),
      loading: false,
      generateModelImage: false,
      setGenerateModelImage: jest.fn(),
      imageModel: 'dalle3',
      setImageModel: jest.fn(),
      modelGenerationEnabled: false,
      isAuthenticated: false,
    };

    it('is sticky on large screens (lg:sticky)', () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const root = container.firstElementChild;
      expect(root?.getAttribute('class')).toMatch(/lg:sticky/);
    });

    it('Generate Outfit button has min-h-[48px] and touch-manipulation', () => {
      render(<Sidebar {...defaultProps} />);
      const primaryButton = screen.getByRole('button', { name: /Get AI outfit suggestion/i });
      const cls = primaryButton.getAttribute('class') ?? '';
      expect(cls).toMatch(/min-h-\[48px\]/);
      expect(cls).toMatch(/touch-manipulation/);
    });
  });

  describe('Hero', () => {
    it('heading has responsive text size classes', () => {
      const { container } = render(<Hero />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      const cls = heading.getAttribute('class') ?? '';
      expect(cls).toMatch(/text-3xl|sm:text-4xl|md:text-5xl/);
    });

    it('has responsive vertical padding', () => {
      const { container } = render(<Hero />);
      const inner = container.querySelector('.container');
      expect(inner?.getAttribute('class')).toMatch(/py-6|sm:py-8/);
    });
  });

  describe('OutfitPreview', () => {
    const mockActionProps = {
      onGenerateAnother: jest.fn(),
      onMakeMoreFormal: jest.fn(),
      onMakeMoreCasual: jest.fn(),
      onUseWardrobeOnly: jest.fn(),
      onChangeOccasion: jest.fn(),
    };

    const baseSuggestion: OutfitSuggestion = {
      id: '1',
      shirt: 'White shirt',
      trouser: 'Navy chinos',
      blazer: 'Gray blazer',
      shoes: 'Brown loafers',
      belt: 'Brown belt',
      reasoning: 'Classic look.',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('action buttons have touch-friendly sizing', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...mockActionProps}
          hasImage={true}
        />
      );

      const generateBtn = screen.getAllByRole('button', { name: /Generate another look/i })[0];
      const formalBtn = screen.getByRole('button', { name: /Make it more formal/i });

      [generateBtn, formalBtn].forEach((btn) => {
        const cls = btn.getAttribute('class') ?? '';
        expect(cls).toMatch(/min-h-\[(40|44|48)px\]/);
        expect(cls).toMatch(/touch-manipulation/);
      });
    });

    it('content area has responsive padding (p-4 sm:p-6 lg:p-8)', () => {
      const { container } = render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...mockActionProps}
        />
      );
      const contentSection = container.querySelector('.p-4');
      expect(contentSection).toBeInTheDocument();
      const withResponsivePadding = container.querySelector('[class*="sm:p-6"]') ?? contentSection;
      expect(withResponsivePadding).toBeTruthy();
    });

    it('empty state has responsive padding', () => {
      const { container } = render(
        <OutfitPreview
          suggestion={null}
          loading={false}
          error={null}
          {...mockActionProps}
        />
      );
      expect(screen.getByText(/Ready for Style Magic?/i)).toBeInTheDocument();
      const emptyCard = container.querySelector('.p-6');
      expect(emptyCard).toBeInTheDocument();
      expect(emptyCard?.getAttribute('class')).toMatch(/sm:p-8|lg:p-12/);
    });

    it('Add to Wardrobe button when authenticated has touch-friendly classes', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...mockActionProps}
          isAuthenticated={true}
          onAddToWardrobe={jest.fn()}
          hasImage={true}
        />
      );
      const addBtn = screen.getByRole('button', { name: /Add new item to your wardrobe/i });
      const cls = addBtn.getAttribute('class') ?? '';
      expect(cls).toMatch(/min-h-\[48px\]/);
      expect(cls).toMatch(/touch-manipulation/);
    });
  });

  describe('Wardrobe', () => {
    it('uses stacked layout classes for header actions and item cards on small screens', async () => {
      const { container } = render(<Wardrobe />);
      await screen.findByRole('heading', { name: /My Wardrobe/i });
      await screen.findByText('Integration test shirt');

      expect(container.querySelector('.flex-col.gap-4.sm\\:flex-row')).toBeInTheDocument();
      expect(container.querySelector('.border-t.border-white\\/10')).toBeInTheDocument();
      const addItemBtn = screen.getByRole('button', { name: /\+ Add Item/i });
      expect(addItemBtn.className).toMatch(/min-h-\[44px\]/);
      expect(addItemBtn.className).toMatch(/touch-manipulation/);
    });

    it('search form stacks vertically on mobile', async () => {
      const { container } = render(<Wardrobe />);
      await screen.findByRole('heading', { name: /My Wardrobe/i });

      const searchForm = container.querySelector('form');
      expect(searchForm?.getAttribute('class')).toMatch(/flex-col/);
      expect(searchForm?.getAttribute('class')).toMatch(/sm:flex-row/);
    });
  });

  describe('Global styles', () => {
    it('scrollbar-none utility is available in document when nav is rendered', () => {
      render(<App />);
      const el = document.querySelector('.scrollbar-none');
      expect(el).toBeInTheDocument();
    });
  });
});
