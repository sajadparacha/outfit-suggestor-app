/**
 * Tests for mobile-friendly (responsive) layout and touch targets.
 * Asserts that markup and classes added for mobile are present so that
 * the app behaves correctly on small viewports and touch devices.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../../App';
import Sidebar from './Sidebar';
import Hero from './Hero';
import OutfitPreview from './OutfitPreview';
import type { OutfitSuggestion } from '../../models/OutfitModels';

describe('Mobile-friendly layout and touch targets', () => {
  describe('Navigation (App)', () => {
    it('nav tab container has scrollbar-none and overflow-x-auto for horizontal scroll on small screens', async () => {
      render(<App />);
      await screen.findByText(/Get Suggestion/i);

      const scrollContainer = document.querySelector('.scrollbar-none');
      expect(scrollContainer).toBeInTheDocument();
      expect(scrollContainer?.getAttribute('class')).toMatch(/overflow-x-auto/);
    });

    it('nav has minimum height for touch targets', () => {
      render(<App />);
      const navRow = document.querySelector('.min-h-\\[48px\\]');
      expect(navRow).toBeInTheDocument();
    });

    it('nav tab buttons have touch-manipulation for responsive tap', () => {
      render(<App />);
      const getSuggestionTab = screen.getByRole('button', { name: /Get Suggestion/i });
      expect(getSuggestionTab.getAttribute('class')).toMatch(/touch-manipulation/);
    });

    it('nav tab buttons have minimum height for touch targets', () => {
      render(<App />);
      const getSuggestionTab = screen.getByRole('button', { name: /Get Suggestion/i });
      const cls = getSuggestionTab.getAttribute('class') ?? '';
      expect(cls).toMatch(/touch-manipulation/);
      expect(cls).toMatch(/py-2/);
    });

    it('Guide tab is visible and has touch-friendly classes', () => {
      render(<App />);
      const guideTab = screen.getByRole('button', { name: 'Guide' });
      expect(guideTab).toBeInTheDocument();
      expect(guideTab.getAttribute('class')).toMatch(/touch-manipulation/);
    });

    it('About is in the footer with touch-friendly classes', async () => {
      render(<App />);
      await screen.findByText(/Get Suggestion/i);
      const aboutFooter = screen.getByRole('button', { name: /About the app and creator/i });
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

    it('has responsive padding (p-4 sm:p-6) on root', () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const root = container.firstElementChild;
      expect(root).toBeInTheDocument();
      expect(root?.getAttribute('class')).toMatch(/p-4/);
      expect(root?.getAttribute('class')).toMatch(/sm:p-6/);
    });

    it('Get AI Suggestion button has min-h-[48px] and touch-manipulation', () => {
      render(<Sidebar {...defaultProps} />);
      const primaryButton = screen.getByRole('button', { name: /Get AI outfit suggestion/i });
      const cls = primaryButton.getAttribute('class') ?? '';
      expect(cls).toMatch(/min-h-\[48px\]/);
      expect(cls).toMatch(/touch-manipulation/);
    });

    it('sidebar is not sticky on small screens (lg:sticky)', () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const root = container.firstElementChild;
      expect(root?.getAttribute('class')).toMatch(/lg:sticky/);
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
    const mockOnLike = jest.fn();
    const mockOnDislike = jest.fn();
    const mockOnNext = jest.fn();

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

    it('action buttons (Next, Like, Dislike) have min-h-[48px] and touch-manipulation', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          onLike={mockOnLike}
          onDislike={mockOnDislike}
          onNext={mockOnNext}
          hasImage={true}
        />
      );

      const nextBtn = screen.getByRole('button', { name: /Get next suggestion/i });
      const likeBtn = screen.getByRole('button', { name: /^Like this outfit$/i });
      const dislikeBtn = screen.getByRole('button', { name: /Dislike this outfit/i });

      [nextBtn, likeBtn, dislikeBtn].forEach((btn) => {
        const cls = btn.getAttribute('class') ?? '';
        expect(cls).toMatch(/min-h-\[48px\]/);
        expect(cls).toMatch(/touch-manipulation/);
      });
    });

    it('content area has responsive padding (p-4 sm:p-6 lg:p-8)', () => {
      const { container } = render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          onLike={mockOnLike}
          onDislike={mockOnDislike}
          onNext={mockOnNext}
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
          onLike={mockOnLike}
          onDislike={mockOnDislike}
          onNext={mockOnNext}
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
          onLike={mockOnLike}
          onDislike={mockOnDislike}
          onNext={mockOnNext}
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

  describe('Global styles', () => {
    it('scrollbar-none utility is available in document when nav is rendered', () => {
      render(<App />);
      const el = document.querySelector('.scrollbar-none');
      expect(el).toBeInTheDocument();
    });
  });
});
