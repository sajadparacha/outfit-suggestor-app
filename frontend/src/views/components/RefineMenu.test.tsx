import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RefineMenu from './RefineMenu';
import { MAIN_FLOW_UX_COPY } from '../../utils/mainFlowUxCopy';

describe('RefineMenu', () => {
  const handlers = {
    onMakeMoreFormal: jest.fn(),
    onMakeMoreCasual: jest.fn(),
    onUseWardrobeOnly: jest.fn(),
    onChangeOccasion: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens menu with four refine options', () => {
    render(<RefineMenu {...handlers} showWardrobeOnlyAction />);

    fireEvent.click(screen.getByTestId('refine-menu-trigger'));

    expect(screen.getByRole('menuitem', { name: MAIN_FLOW_UX_COPY.refineMoreFormal })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: MAIN_FLOW_UX_COPY.refineMoreCasual })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: MAIN_FLOW_UX_COPY.refineWardrobeOnly })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: MAIN_FLOW_UX_COPY.refineChangeOccasion })).toBeInTheDocument();
  });

  it('calls refine handlers when options are selected', () => {
    render(<RefineMenu {...handlers} showWardrobeOnlyAction />);

    fireEvent.click(screen.getByTestId('refine-menu-trigger'));
    fireEvent.click(screen.getByRole('menuitem', { name: MAIN_FLOW_UX_COPY.refineMoreFormal }));
    expect(handlers.onMakeMoreFormal).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('refine-menu-trigger'));
    fireEvent.click(screen.getByRole('menuitem', { name: MAIN_FLOW_UX_COPY.refineChangeOccasion }));
    expect(handlers.onChangeOccasion).toHaveBeenCalledTimes(1);
  });

  it('hides wardrobe-only option when showWardrobeOnlyAction is false', () => {
    render(<RefineMenu {...handlers} showWardrobeOnlyAction={false} />);

    fireEvent.click(screen.getByTestId('refine-menu-trigger'));
    expect(screen.queryByRole('menuitem', { name: MAIN_FLOW_UX_COPY.refineWardrobeOnly })).not.toBeInTheDocument();
  });

  it('opens compact menu upward so it clears the sticky footer', () => {
    render(<RefineMenu {...handlers} variant="compact" wrapperClassName="flex-1 min-w-0" showWardrobeOnlyAction />);

    fireEvent.click(screen.getByTestId('refine-menu-trigger'));

    const panel = screen.getByTestId('refine-menu-panel');
    expect(panel.className).toMatch(/bottom-full/);
    expect(panel.className).not.toMatch(/top-full/);
  });
});
