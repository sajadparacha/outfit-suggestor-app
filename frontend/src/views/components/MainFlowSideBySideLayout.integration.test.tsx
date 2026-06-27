/**
 * Integration tests for main-flow side-by-side layout (web md+ ↔ iPad regular width).
 */
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { renderApp } from '../../test/renderWithRouter';
import ApiService from '../../services/ApiService';
import { MAIN_FLOW_UX_COPY } from '../../utils/mainFlowUxCopy';

jest.setTimeout(25000);

jest.mock('../../utils/imageUtils', () => {
  const actual = jest.requireActual('../../utils/imageUtils');
  return {
    ...actual,
    compressImageForOutfit: async (file: File) => file,
    compressImageForWardrobe: async (file: File) => file,
  };
});

const mockOutfitResponse = {
  shirt: 'White linen shirt',
  trouser: 'Navy chinos',
  blazer: 'Gray blazer',
  shoes: 'Brown loafers',
  belt: 'Brown leather belt',
  reasoning: 'Classic business casual combination.',
  model_image: null,
};

describe('Main flow side-by-side layout', () => {
  let scrollIntoViewMock: jest.Mock;

  beforeEach(() => {
    scrollIntoViewMock = jest.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
    jest.spyOn(ApiService, 'checkDuplicate').mockResolvedValue({ is_duplicate: false });
    jest.spyOn(ApiService, 'getSuggestion').mockResolvedValue(mockOutfitResponse);
    jest.spyOn(ApiService, 'getGuestUsage').mockResolvedValue({
      limit: 3,
      used: 0,
      remaining: 3,
      requires_signup: false,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses max-width 980px and md two-column grid on main flow shell', async () => {
    renderApp();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Get AI outfit suggestion/i })).toBeInTheDocument();
    });

    const grid = document.querySelector('.max-w-\\[980px\\].md\\:grid-cols-2');
    expect(grid).toBeInTheDocument();
    expect(grid?.className).toMatch(/md:gap-5/);
  });

  it('shows empty preview alongside upload in creation state (side-by-side DOM)', async () => {
    renderApp();
    await waitFor(() => {
      expect(screen.getByText(MAIN_FLOW_UX_COPY.emptyPreviewHeadline)).toBeInTheDocument();
    });

    const grid = document.querySelector('.md\\:grid-cols-2');
    expect(grid).toBeInTheDocument();
    expect(within(grid as HTMLElement).getByText(MAIN_FLOW_UX_COPY.emptyPreviewHeadline)).toBeInTheDocument();
    expect(within(grid as HTMLElement).getByTestId('main.uploadButton')).toBeInTheDocument();
  });

  it('after result shows compact summary and result title in the same grid', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Get AI outfit suggestion/i })).toBeInTheDocument();
    });

    const file = new File(['x'.repeat(2048)], 'shirt.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    const generateBtn = screen.getByRole('button', { name: /Get AI outfit suggestion/i });
    await waitFor(() => expect(generateBtn).not.toBeDisabled());
    fireEvent.click(generateBtn);

    await waitFor(
      () => {
        expect(screen.getByTestId('main-flow-compact-summary')).toBeInTheDocument();
        expect(screen.getByTestId('outfit-preview-result')).toBeInTheDocument();
        expect(screen.getAllByText(MAIN_FLOW_UX_COPY.resultTitle).length).toBeGreaterThan(0);
      },
      { timeout: 15000 }
    );

    const grid = document.querySelector('.md\\:grid-cols-2');
    expect(grid).toBeInTheDocument();
    expect(within(grid as HTMLElement).getByTestId('main-flow-compact-summary')).toBeInTheDocument();
    expect(within(grid as HTMLElement).getByText(MAIN_FLOW_UX_COPY.resultTitle)).toBeInTheDocument();
  });

  it('hides HowItWorks stepper wrapper on md+ breakpoints', async () => {
    renderApp();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Get AI outfit suggestion/i })).toBeInTheDocument();
    });

    const howItWorksHeading = screen.getByRole('heading', { name: /How it works/i });
    expect(howItWorksHeading.closest('.md\\:hidden')).toBeInTheDocument();
  });

  it('scrolls to result on success (mobile stacked behavior)', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Get AI outfit suggestion/i })).toBeInTheDocument();
    });

    const file = new File(['x'.repeat(2048)], 'shirt.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Get AI outfit suggestion/i }));

    await waitFor(
      () => expect(screen.getAllByText(MAIN_FLOW_UX_COPY.resultTitle).length).toBeGreaterThan(0),
      { timeout: 15000 }
    );

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
    expect(document.getElementById('outfit-result-hero')).toBeInTheDocument();
  });
});
