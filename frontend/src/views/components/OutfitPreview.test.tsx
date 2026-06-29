/**
 * Unit tests for OutfitPreview - suggestion display, action buttons, disabled states
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import OutfitPreview from './OutfitPreview';
import { MAIN_FLOW_UX_COPY } from '../../utils/mainFlowUxCopy';
import type { OutfitSuggestion } from '../../models/OutfitModels';

const defaultActionProps = {
  onGenerateAnother: jest.fn(),
  onMakeMoreFormal: jest.fn(),
  onMakeMoreCasual: jest.fn(),
  onUseWardrobeOnly: jest.fn(),
  onChangeOccasion: jest.fn(),
};

describe('OutfitPreview', () => {
  const mockOnGenerateAnother = jest.fn();
  const mockOnMakeMoreFormal = jest.fn();
  const mockOnMakeMoreCasual = jest.fn();
  const mockOnUseWardrobeOnly = jest.fn();
  const mockOnChangeOccasion = jest.fn();

  const actionProps = {
    onGenerateAnother: mockOnGenerateAnother,
    onMakeMoreFormal: mockOnMakeMoreFormal,
    onMakeMoreCasual: mockOnMakeMoreCasual,
    onUseWardrobeOnly: mockOnUseWardrobeOnly,
    onChangeOccasion: mockOnChangeOccasion,
  };

  const baseSuggestion: OutfitSuggestion = {
    id: '1',
    shirt: 'White linen shirt',
    trouser: 'Navy chinos',
    blazer: 'Gray blazer',
    shoes: 'Brown loafers',
    belt: 'Brown leather belt',
    reasoning: 'Classic business casual combination. It balances comfort and polish.',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows loading skeleton when loading', () => {
      const { container } = render(
        <OutfitPreview suggestion={null} loading={true} error={null} {...defaultActionProps} />
      );
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message and Try Again button', () => {
      render(
        <OutfitPreview
          suggestion={null}
          loading={false}
          error="Something went wrong"
          hasImage={true}
          {...actionProps}
        />
      );
      expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument();
      const tryAgainBtn = screen.getByRole('button', { name: /Try Again/i });
      fireEvent.click(tryAgainBtn);
      expect(mockOnGenerateAnother).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty state (no suggestion)', () => {
    it('shows headline and subline when no suggestion', () => {
      render(<OutfitPreview suggestion={null} loading={false} error={null} {...defaultActionProps} />);
      expect(screen.getByText(MAIN_FLOW_UX_COPY.emptyPreviewHeadline)).toBeInTheDocument();
      expect(screen.getByText(MAIN_FLOW_UX_COPY.emptyPreviewSubline)).toBeInTheDocument();
    });
  });

  describe('suggestion display', () => {
    it('displays outfit details with result title and reasoning bullets', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
          filters={{ occasion: 'business', season: 'summer', style: 'business casual' }}
        />
      );
      expect(screen.getAllByText(MAIN_FLOW_UX_COPY.resultTitle).length).toBeGreaterThan(0);
      expect(screen.getByText('White linen shirt')).toBeInTheDocument();
      expect(screen.getByText(MAIN_FLOW_UX_COPY.whyThisWorks)).toBeInTheDocument();
      expect(screen.getByText(/Classic business casual combination/)).toBeInTheDocument();
      expect(screen.queryByText(/Advanced options/i)).not.toBeInTheDocument();
    });

    it('does not use upload image as hero when model_image is absent', () => {
      const uploadedImageUrl = 'blob:http://localhost/fake-uploaded-shirt';
      render(
        <OutfitPreview
          suggestion={{ ...baseSuggestion, imageUrl: uploadedImageUrl, upload_matched_category: 'shirt' }}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
        />
      );
      const hero = document.getElementById('outfit-result-hero');
      expect(hero).toBeInTheDocument();
      expect(within(hero as HTMLElement).getByText(MAIN_FLOW_UX_COPY.resultTitle)).toBeInTheDocument();
      const heroImg = hero?.querySelector('img');
      expect(heroImg).toBeNull();
      expect(screen.queryByText(/Styled outfit preview/i)).not.toBeInTheDocument();
    });

    it('uses uploaded image as shirt thumbnail when upload matched shirt', () => {
      const uploadedImageUrl = 'blob:http://localhost/fake-uploaded-shirt';
      const suggestionWithWardrobe = {
        ...baseSuggestion,
        imageUrl: uploadedImageUrl,
        upload_matched_category: 'shirt',
        matching_wardrobe_items: {
          shirt: [
            { id: 1, category: 'shirt', color: 'navy', description: 'Other navy shirt', image_data: 'base64_wardrobe_A' },
          ],
          trouser: [],
          blazer: [],
          shoes: [],
          belt: [],
        },
      };
      render(
        <OutfitPreview
          suggestion={suggestionWithWardrobe}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
        />
      );
      const shirtImg = screen.getAllByRole('img').find((img) => img.getAttribute('alt') === 'Shirt');
      expect(shirtImg?.getAttribute('src')).toBe(uploadedImageUrl);
    });

    it('uses wardrobe match thumbnail for shirt when no imageUrl', () => {
      const suggestionWithWardrobe = {
        ...baseSuggestion,
        imageUrl: undefined,
        shirt_id: 1,
        matching_wardrobe_items: {
          shirt: [
            { id: 1, category: 'shirt', color: 'navy', description: 'Navy shirt', image_data: 'base64_wardrobe_shirt' },
          ],
          trouser: [],
          blazer: [],
          shoes: [],
          belt: [],
        },
      };
      render(
        <OutfitPreview suggestion={suggestionWithWardrobe} loading={false} error={null} {...actionProps} />
      );
      const shirtImg = screen.getAllByRole('img').find((img) => img.getAttribute('alt') === 'Shirt');
      expect(shirtImg?.getAttribute('src')).toBe('data:image/jpeg;base64,base64_wardrobe_shirt');
    });

    it('shows wardrobe thumbnails when ids absent but matching items present', () => {
      const suggestionWithWardrobe = {
        ...baseSuggestion,
        imageUrl: undefined,
        matching_wardrobe_items: {
          shirt: [
            { id: 10, category: 'shirt', color: 'navy', description: 'Navy shirt', image_data: 'base64_no_id_shirt' },
          ],
          trouser: [
            { id: 11, category: 'trouser', color: 'beige', description: 'Chinos', image_data: 'base64_no_id_trouser' },
          ],
          blazer: [],
          shoes: [],
          belt: [],
        },
      };
      render(
        <OutfitPreview suggestion={suggestionWithWardrobe} loading={false} error={null} {...actionProps} />
      );
      const shirtImg = screen.getAllByRole('img').find((img) => img.getAttribute('alt') === 'Shirt');
      const trouserImg = screen.getAllByRole('img').find((img) => img.getAttribute('alt') === 'Trousers');
      expect(shirtImg?.getAttribute('src')).toBe('data:image/jpeg;base64,base64_no_id_shirt');
      expect(trouserImg?.getAttribute('src')).toBe('data:image/jpeg;base64,base64_no_id_trouser');
      expect(screen.getAllByText(MAIN_FLOW_UX_COPY.tagFromWardrobe).length).toBeGreaterThanOrEqual(2);
    });

    it('shows parsed short name for multi-part item text', () => {
      const suggestion = {
        ...baseSuggestion,
        shirt: 'Cream linen button-down — breathable summer fabric',
      };
      render(
        <OutfitPreview suggestion={suggestion} loading={false} error={null} {...actionProps} hasImage={true} />
      );
      expect(screen.getByText('Cream linen button-down')).toBeInTheDocument();
      expect(screen.getByText('breathable summer fabric')).toBeInTheDocument();
    });

    it('shows Also wear section when optional layers are present', () => {
      const suggestionWithLayers: OutfitSuggestion = {
        ...baseSuggestion,
        sweater: 'Navy merino crewneck — extra warmth for cool evenings',
        outerwear: 'Charcoal wool overcoat',
        tie: null,
        sweater_id: 21,
        matching_wardrobe_items: {
          shirt: [],
          trouser: [],
          blazer: [],
          shoes: [],
          belt: [],
          sweater: [
            {
              id: 21,
              category: 'sweater',
              color: 'navy',
              description: 'Merino crewneck',
              image_data: 'base64_sweater',
            },
          ],
          outerwear: [],
        },
      };
      render(
        <OutfitPreview suggestion={suggestionWithLayers} loading={false} error={null} {...actionProps} hasImage={true} />
      );
      expect(screen.getByTestId('also-wear-section')).toBeInTheDocument();
      expect(screen.getByText(MAIN_FLOW_UX_COPY.alsoWearSection)).toBeInTheDocument();
      expect(screen.getByText(MAIN_FLOW_UX_COPY.layerLabel)).toBeInTheDocument();
      expect(screen.getByText(MAIN_FLOW_UX_COPY.outerwearLabel)).toBeInTheDocument();
      expect(screen.queryByText(MAIN_FLOW_UX_COPY.tieLabel)).not.toBeInTheDocument();
      expect(screen.getByText('Navy merino crewneck')).toBeInTheDocument();
      expect(screen.getByText('Charcoal wool overcoat')).toBeInTheDocument();
      const sweaterImg = screen.getAllByRole('img').find((img) => img.getAttribute('alt') === 'Layer');
      expect(sweaterImg?.getAttribute('src')).toBe('data:image/jpeg;base64,base64_sweater');
    });

    it('hides Also wear section when all optional fields are null or empty', () => {
      render(
        <OutfitPreview
          suggestion={{ ...baseSuggestion, sweater: null, outerwear: undefined, tie: '' }}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
        />
      );
      expect(screen.queryByTestId('also-wear-section')).not.toBeInTheDocument();
      expect(screen.queryByText(MAIN_FLOW_UX_COPY.alsoWearSection)).not.toBeInTheDocument();
    });
  });

  describe('primary actions', () => {
    it('shows exactly two primary actions: Generate Another and Refine', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
        />
      );
      const primaryRow = screen.getByTestId('result-primary-actions');
      const buttons = within(primaryRow).getAllByRole('button');
      expect(buttons).toHaveLength(2);
      expect(within(primaryRow).getByRole('button', { name: MAIN_FLOW_UX_COPY.generateAnother })).toBeInTheDocument();
      expect(within(primaryRow).getByRole('button', { name: MAIN_FLOW_UX_COPY.refine })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: MAIN_FLOW_UX_COPY.saveLook })).not.toBeInTheDocument();
    });

    it('does not show standalone refine buttons outside Refine menu', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
        />
      );
      expect(screen.queryByRole('button', { name: /Make it more formal/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Use wardrobe items only/i })).not.toBeInTheDocument();
    });

    it('refine options live inside Refine menu', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
          isAuthenticated={true}
        />
      );
      const primaryRow = screen.getByTestId('result-primary-actions');
      fireEvent.click(within(primaryRow).getByRole('button', { name: MAIN_FLOW_UX_COPY.refine }));
      fireEvent.click(screen.getByRole('menuitem', { name: MAIN_FLOW_UX_COPY.refineMoreFormal }));
      expect(mockOnMakeMoreFormal).toHaveBeenCalledTimes(1);
    });
  });

  describe('disabled states', () => {
    it('disables image-based refine actions when hasImage is false', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={false}
          isAuthenticated={true}
        />
      );
      const primaryRow = screen.getByTestId('result-primary-actions');
      expect(within(primaryRow).getByRole('button', { name: MAIN_FLOW_UX_COPY.generateAnother })).toBeDisabled();

      fireEvent.click(within(primaryRow).getByRole('button', { name: MAIN_FLOW_UX_COPY.refine }));
      fireEvent.click(screen.getByRole('menuitem', { name: MAIN_FLOW_UX_COPY.refineChangeOccasion }));
      expect(mockOnChangeOccasion).toHaveBeenCalledTimes(1);
    });

    it('enables generate and refine when canGenerateAnother is true without a file', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={false}
          canGenerateAnother={true}
          isAuthenticated={true}
        />
      );
      const primaryRow = screen.getByTestId('result-primary-actions');
      expect(within(primaryRow).getByRole('button', { name: MAIN_FLOW_UX_COPY.generateAnother })).toBeEnabled();

      fireEvent.click(within(primaryRow).getByRole('button', { name: MAIN_FLOW_UX_COPY.refine }));
      fireEvent.click(screen.getByRole('menuitem', { name: MAIN_FLOW_UX_COPY.refineWardrobeOnly }));
      expect(mockOnUseWardrobeOnly).toHaveBeenCalledTimes(1);
    });
  });

  describe('side-by-side result actions (md+)', () => {
    it('hides inline primary actions on md+ breakpoints', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
        />
      );
      const primaryRow = screen.getByTestId('result-primary-actions');
      expect(primaryRow.className).toMatch(/md:hidden/);
    });

    it('shows wide sticky action bar for tablet/desktop result state', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
        />
      );
      const wideSticky = screen.getByTestId('result-sticky-wide-actions');
      expect(wideSticky).toBeInTheDocument();
      expect(wideSticky.closest('.md\\:block')).toBeTruthy();
    });

    it('keeps mobile-only sticky bar separate from wide sticky bar', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
        />
      );
      expect(screen.getByTestId('result-sticky-mobile-actions')).toBeInTheDocument();
      expect(screen.getByTestId('result-sticky-wide-actions')).toBeInTheDocument();
    });

    it('reserves space below reasoning so fixed action bars do not overlap content', () => {
      render(
        <OutfitPreview
          suggestion={baseSuggestion}
          loading={false}
          error={null}
          {...actionProps}
          hasImage={true}
        />
      );
      expect(screen.getByTestId('result-sticky-spacer')).toBeInTheDocument();
    });
  });
});
