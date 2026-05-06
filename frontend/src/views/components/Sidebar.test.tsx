/**
 * Unit tests for Sidebar - file size validation
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';

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

  it('shows analyze wardrobe button for authenticated users with handler', () => {
    const onAnalyzeWardrobe = jest.fn();
    render(
      <Sidebar
        {...defaultProps}
        isAuthenticated
        onAnalyzeWardrobe={onAnalyzeWardrobe}
      />
    );

    const button = screen.getByRole('button', { name: /analyze my wardrobe gaps/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onAnalyzeWardrobe).toHaveBeenCalledTimes(1);
  });

  it('disables analyze wardrobe button and shows loading copy while analyzing', () => {
    render(
      <Sidebar
        {...defaultProps}
        isAuthenticated
        onAnalyzeWardrobe={jest.fn()}
        analyzingWardrobe
      />
    );

    expect(screen.getByRole('button', { name: /analyze my wardrobe gaps/i })).toBeDisabled();
    expect(screen.getByText(/Analyzing Wardrobe\.\.\./i)).toBeInTheDocument();
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

    it('renders Wardrobe tooltip with add-to-wardrobe and wardrobe-only hints when authenticated', () => {
      const setUseWardrobeOnly = jest.fn();
      render(
        <Sidebar
          {...defaultProps}
          isAuthenticated
          image={null}
          onAddToWardrobe={jest.fn()}
          setUseWardrobeOnly={setUseWardrobeOnly}
        />
      );
      const tooltips = screen.getAllByRole('tooltip');
      const wardrobeHint = tooltips.find((el) => el.textContent?.includes('Add to wardrobe'));
      expect(wardrobeHint?.textContent).toMatch(/Add to wardrobe: upload a photo first/);
      expect(wardrobeHint?.textContent).toMatch(/Use my wardrobe only: Off/);
    });

    it('renders Random picks tooltip explaining wardrobe vs history', () => {
      render(
        <Sidebar
          {...defaultProps}
          isAuthenticated
          onGetRandomSuggestion={jest.fn()}
          onGetRandomFromHistory={jest.fn()}
        />
      );
      const tooltips = screen.getAllByRole('tooltip');
      const randomHint = tooltips.find((el) =>
        el.textContent?.includes('Random from Wardrobe uses')
      );
      expect(randomHint?.textContent).toMatch(/Random from History loads/);
    });
  });
});
