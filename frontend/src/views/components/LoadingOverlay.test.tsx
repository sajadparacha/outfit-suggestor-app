import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LoadingOverlay from './LoadingOverlay';

describe('LoadingOverlay', () => {
  it('renders nothing when not loading', () => {
    const { container } = render(<LoadingOverlay isLoading={false} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument();
  });

  it('shows a full-screen backdrop that blocks interaction when loading', () => {
    render(
      <LoadingOverlay
        isLoading
        operationType="outfit-suggestion"
      />
    );

    const overlay = screen.getByTestId('loading-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveClass('fixed', 'inset-0');
    expect(overlay).toHaveAttribute('aria-modal', 'true');

    const backdrop = screen.getByTestId('loading-overlay-backdrop');
    expect(backdrop).toBeInTheDocument();
    expect(backdrop).toHaveClass('absolute', 'inset-0');
  });

  it('still renders the bottom progress card while the modal is open', () => {
    render(
      <LoadingOverlay
        isLoading
        operationType="outfit-suggestion"
        message="Compressing image..."
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Creating your outfit')).toBeInTheDocument();
    expect(screen.getByText('Analyzing your item')).toBeInTheDocument();
    expect(screen.getByText('Matching colors and style')).toBeInTheDocument();
    expect(screen.getByText('Building outfit recommendation')).toBeInTheDocument();
    expect(screen.getByText(/Usually ~/i)).toBeInTheDocument();
    expect(screen.getByText('Compressing image...')).toBeInTheDocument();
  });

  it('does not dismiss when the backdrop is clicked', () => {
    const onCancel = jest.fn();
    const { rerender } = render(
      <LoadingOverlay
        isLoading
        operationType="outfit-suggestion"
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByTestId('loading-overlay-backdrop'));

    expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Creating your outfit')).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();

    // Still visible while isLoading remains true
    rerender(
      <LoadingOverlay
        isLoading
        operationType="outfit-suggestion"
        onCancel={onCancel}
      />
    );
    expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
  });

  it('removes the overlay when isLoading becomes false', () => {
    const { rerender } = render(
      <LoadingOverlay isLoading operationType="outfit-suggestion" />
    );
    expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();

    rerender(<LoadingOverlay isLoading={false} operationType="outfit-suggestion" />);
    expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('includes preview step when generating model image', () => {
    render(
      <LoadingOverlay
        isLoading
        operationType="outfit-with-preview"
      />
    );

    expect(screen.getByText('Generating preview')).toBeInTheDocument();
  });

  it('calls onCancel when cancel is clicked', () => {
    const onCancel = jest.fn();
    render(
      <LoadingOverlay
        isLoading
        operationType="outfit-suggestion"
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows staged progress for random history picks', () => {
    render(
      <LoadingOverlay
        isLoading
        operationType="random-history"
        message="Picking a random look from your history..."
      />
    );

    expect(screen.getByText('Picking from your history')).toBeInTheDocument();
    expect(screen.getByText('Loading your saved looks')).toBeInTheDocument();
    expect(screen.getByText('Finding a varied outfit')).toBeInTheDocument();
    expect(screen.getByText('Preparing your look')).toBeInTheDocument();
  });

  it('shows staged progress for past suggestions', () => {
    render(
      <LoadingOverlay
        isLoading
        operationType="past-suggestions"
        message="Loading past suggestions for this item…"
      />
    );

    expect(screen.getByText('Loading past suggestions')).toBeInTheDocument();
    expect(screen.getByText('Loading your saved looks')).toBeInTheDocument();
    expect(screen.getByText('Finding outfits for this item')).toBeInTheDocument();
    expect(screen.getByText('Preparing suggestions')).toBeInTheDocument();
  });
});
