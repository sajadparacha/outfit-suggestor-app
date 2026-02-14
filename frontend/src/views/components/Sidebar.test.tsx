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
});
