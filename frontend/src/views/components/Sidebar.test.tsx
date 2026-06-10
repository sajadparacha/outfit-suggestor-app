/**
 * Unit tests for Sidebar - file size validation
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';
import { MICRO_HELP } from '../../utils/microHelpCopy';
import {
  FIRST_RUN_COACH_DISMISSED_KEY,
  FIRST_RUN_PREFS_EXPANDED_KEY,
} from '../../utils/firstRunCoach';

describe('Sidebar file validation', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('calls setImage when valid file is selected', () => {
    const setImage = jest.fn();
    const onFileReject = jest.fn();
    render(
      <Sidebar
        {...defaultProps}
        setImage={setImage}
        onFileReject={onFileReject}
      />
    );

    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();

    // Create small file (1 KB)
    const file = new File(['x'.repeat(1024)], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(input!, { target: { files: [file] } });

    expect(setImage).toHaveBeenCalledWith(file);
    expect(onFileReject).not.toHaveBeenCalled();
  });

  it('calls onFileReject when oversized file is selected', () => {
    const setImage = jest.fn();
    const onFileReject = jest.fn();
    render(
      <Sidebar
        {...defaultProps}
        setImage={setImage}
        onFileReject={onFileReject}
      />
    );

    const input = document.querySelector('input[type="file"]');
    // Create 11 MB file (over 10MB limit)
    const size = 11 * 1024 * 1024;
    const file = new File([new ArrayBuffer(size)], 'large.jpg', { type: 'image/jpeg' });
    fireEvent.change(input!, { target: { files: [file] } });

    expect(onFileReject).toHaveBeenCalledWith(
      expect.stringMatching(/Image must be under 10MB/)
    );
    expect(onFileReject).toHaveBeenCalledWith(
      expect.stringMatching(/current:.*11 MB/)
    );
    expect(setImage).not.toHaveBeenCalled();
  });

  it('file input has accept attribute for jpeg, png, webp', () => {
    render(<Sidebar {...defaultProps} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe('image/jpeg,image/jpg,image/png,image/webp');
  });

  it('displays max size hint', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText(/JPG, PNG, WebP up to 10MB/i)).toBeInTheDocument();
  });

  it('does not show random outfit button when not authenticated', () => {
    render(<Sidebar {...defaultProps} />);
    expect(
      screen.queryByText(/Random from Wardrobe/i)
    ).not.toBeInTheDocument();
  });

  it('shows random outfit button when authenticated and handler provided', () => {
    const onGetRandomSuggestion = jest.fn();
    render(
      <Sidebar
        {...defaultProps}
        isAuthenticated={true}
        onGetRandomSuggestion={onGetRandomSuggestion}
      />
    );

    fireEvent.click(screen.getByText('Wardrobe & picks'));

    const button = screen.getByRole('button', { name: /get random outfit from wardrobe/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onGetRandomSuggestion).toHaveBeenCalledTimes(1);
  });

  it('shows random from history button when authenticated and handler provided', () => {
    const onGetRandomFromHistory = jest.fn();
    render(
      <Sidebar
        {...defaultProps}
        isAuthenticated={true}
        onGetRandomFromHistory={onGetRandomFromHistory}
      />
    );

    fireEvent.click(screen.getByText('Wardrobe & picks'));

    const button = screen.getByRole('button', { name: /show random outfit from your history/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onGetRandomFromHistory).toHaveBeenCalledTimes(1);
  });

  it('does not show random from history button when not authenticated', () => {
    render(<Sidebar {...defaultProps} />);
    expect(
      screen.queryByText(/Random from History/i)
    ).not.toBeInTheDocument();
  });

  it('shows insights shortcut link for authenticated users', () => {
    const onOpenInsights = jest.fn();
    render(
      <Sidebar
        {...defaultProps}
        isAuthenticated
        onOpenInsights={onOpenInsights}
      />
    );

    const shortcut = screen.getByRole('button', { name: /open insights for wardrobe analysis/i });
    expect(shortcut).toBeInTheDocument();
    expect(screen.getByText('Open Insights →')).toBeInTheDocument();
    expect(screen.getByText(MICRO_HELP.INSIGHTS)).toBeInTheDocument();
    fireEvent.click(shortcut);
    expect(onOpenInsights).toHaveBeenCalledTimes(1);
  });

  describe('contextual micro-help', () => {
    it('shows static wardrobe-only micro-help regardless of toggle state', () => {
      const setUseWardrobeOnly = jest.fn();
      const { rerender } = render(
        <Sidebar
          {...defaultProps}
          isAuthenticated
          setUseWardrobeOnly={setUseWardrobeOnly}
          useWardrobeOnly={false}
        />
      );

      fireEvent.click(screen.getByText('Wardrobe & picks'));
      expect(screen.getByText(MICRO_HELP.WARDROBE_ONLY)).toBeInTheDocument();
      expect(screen.queryByText(/AI may suggest items you do not own/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Only your wardrobe items are used/i)).not.toBeInTheDocument();

      rerender(
        <Sidebar
          {...defaultProps}
          isAuthenticated
          setUseWardrobeOnly={setUseWardrobeOnly}
          useWardrobeOnly={true}
        />
      );
      expect(screen.getByText(MICRO_HELP.WARDROBE_ONLY)).toBeInTheDocument();
    });

    it('shows model preview micro-help when admin model generation controls are visible', () => {
      render(
        <Sidebar
          {...defaultProps}
          isAuthenticated
          isAdmin
          modelGenerationEnabled
          generateModelImage={false}
        />
      );

      expect(screen.getByText(MICRO_HELP.MODEL_PREVIEW)).toBeInTheDocument();
      expect(screen.queryByText(/This may take longer/i)).not.toBeInTheDocument();
    });

    it('hides model preview micro-help for non-admins even with modelGeneration URL flag prop', () => {
      render(
        <Sidebar
          {...defaultProps}
          isAuthenticated
          isAdmin={false}
          modelGenerationEnabled
          generateModelImage={false}
        />
      );

      expect(screen.queryByText(MICRO_HELP.MODEL_PREVIEW)).not.toBeInTheDocument();
      expect(screen.queryByText(/Advanced options/i)).not.toBeInTheDocument();
    });
  });

  describe('first-run coach and preferences', () => {
    it('shows coach strip for first-time guests', () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByTestId('first-run-coach')).toBeInTheDocument();
    });

    it('hides coach when first_run_coach_dismissed is set', () => {
      localStorage.setItem(FIRST_RUN_COACH_DISMISSED_KEY, 'true');
      render(<Sidebar {...defaultProps} />);
      expect(screen.queryByTestId('first-run-coach')).not.toBeInTheDocument();
    });

    it('marks coach step 1 complete after image upload', () => {
      const file = new File(['x'.repeat(1024)], 'test.jpg', { type: 'image/jpeg' });
      render(<Sidebar {...defaultProps} image={file} />);
      expect(screen.getByTestId('first-run-coach-step-1')).toHaveAttribute('data-complete', 'true');
    });

    it('shows collapsed preferences on first run', () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByTestId('first-run-prefs-collapsed')).toBeInTheDocument();
      expect(screen.getByText('Occasion, season, style (optional)')).toBeInTheDocument();
      expect(screen.queryByLabelText('Select occasion')).not.toBeInTheDocument();
    });

    it('expand reveals occasion, season, and style controls', () => {
      render(<Sidebar {...defaultProps} />);
      fireEvent.click(screen.getByTestId('first-run-prefs-collapsed'));
      expect(localStorage.getItem(FIRST_RUN_PREFS_EXPANDED_KEY)).toBe('true');
      expect(screen.getByLabelText('Select occasion')).toBeInTheDocument();
      expect(screen.getByLabelText('Select season')).toBeInTheDocument();
      expect(screen.getByLabelText('Select style preference')).toBeInTheDocument();
    });

    it('shows full preferences after first suggestion', () => {
      render(<Sidebar {...defaultProps} hasSuggestion={true} />);
      expect(screen.queryByTestId('first-run-prefs-collapsed')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Select occasion')).toBeInTheDocument();
    });

    it('shows full preferences after coach dismiss', () => {
      render(<Sidebar {...defaultProps} />);
      fireEvent.click(screen.getByTestId('first-run-coach-dismiss'));
      expect(screen.queryByTestId('first-run-prefs-collapsed')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Select occasion')).toBeInTheDocument();
    });
  });

  describe('section hint tooltips', () => {
    it('renders Preferences tooltip with occasion/season/style summary', () => {
      render(<Sidebar {...defaultProps} />);
      const tooltips = screen.getAllByRole('tooltip');
      const prefs = tooltips.find((el) => el.textContent?.includes('Occasion: Casual'));
      expect(prefs).toBeDefined();
      expect(prefs?.textContent).toMatch(/Season: All Seasons/);
      expect(prefs?.textContent).toMatch(/Style: Modern/);
    });

    it('renders Wardrobe & picks tooltip with wardrobe and random pick hints when authenticated', () => {
      const setUseWardrobeOnly = jest.fn();
      render(
        <Sidebar
          {...defaultProps}
          isAuthenticated
          image={null}
          onAddToWardrobe={jest.fn()}
          setUseWardrobeOnly={setUseWardrobeOnly}
          onGetRandomSuggestion={jest.fn()}
          onGetRandomFromHistory={jest.fn()}
        />
      );
      const tooltips = screen.getAllByRole('tooltip');
      const secondaryHint = tooltips.find((el) => el.textContent?.includes('Add to wardrobe'));
      expect(secondaryHint?.textContent).toMatch(/Add to wardrobe: upload a photo first/);
      expect(secondaryHint?.textContent).toMatch(/Use my wardrobe only: Off/);
      expect(secondaryHint?.textContent).toMatch(new RegExp(MICRO_HELP.WARDROBE_ONLY));
      expect(secondaryHint?.textContent).not.toMatch(/AI may suggest items you do not own/);
      expect(secondaryHint?.textContent).toMatch(/Random from Wardrobe uses/);
      expect(secondaryHint?.textContent).toMatch(/Random from History loads/);
    });
  });
});
