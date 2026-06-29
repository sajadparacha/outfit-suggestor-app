import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LoadingOverlay from './LoadingOverlay';

describe('LoadingOverlay', () => {
  it('renders nothing when not loading', () => {
    const { container } = render(<LoadingOverlay isLoading={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows staged progress steps for outfit suggestions', () => {
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
