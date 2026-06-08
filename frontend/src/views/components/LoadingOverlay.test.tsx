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
});
