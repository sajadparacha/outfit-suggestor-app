/**
 * Integration tests for persuasive auth UX: gates, contextual modal, guest Like.
 */
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderApp } from '../../test/renderWithRouter';
import ApiService from '../../services/ApiService';
import { FIRST_OUTFIT_PROMPT_KEY } from '../../utils/authPromptCopy';
import { ROUTES } from '../../navigation/routes';

jest.setTimeout(25000);

jest.mock('../../utils/imageUtils', () => {
  const actual = jest.requireActual('../../utils/imageUtils');
  return {
    ...actual,
    compressImageForOutfit: async (file: File) => file,
    compressImageForWardrobe: async (file: File) => file,
  };
});

const outfitFirst = {
  shirt: 'White linen shirt',
  trouser: 'Navy chinos',
  blazer: 'Gray blazer',
  shoes: 'Brown loafers',
  belt: 'Brown leather belt',
  reasoning: 'Classic business casual.',
  model_image: null,
};

describe('Persuasive auth UX (App integration)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(ApiService, 'checkDuplicate').mockResolvedValue({ is_duplicate: false });
    jest.spyOn(ApiService, 'getSuggestion').mockResolvedValue(outfitFirst);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('shows history gate copy for guest on /history', async () => {
    renderApp({ routerProps: { initialEntries: [ROUTES.HISTORY] } });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /Create an account to keep your outfit history/i,
        })
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Every suggestion you generate will be saved automatically/i)
    ).toBeInTheDocument();
  });

  it('shows wardrobe gate for guest on /wardrobe', async () => {
    renderApp({ routerProps: { initialEntries: [ROUTES.WARDROBE] } });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /Upload your clothes once and get unlimited combinations/i,
        })
      ).toBeInTheDocument();
    });
  });

  it('guest Like opens login modal with like copy', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Get AI outfit suggestion/i })).toBeInTheDocument();
    });

    const file = new File(['x'.repeat(2048)], 'shirt.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    const getAiBtn = screen.getByRole('button', { name: /Get AI outfit suggestion/i });
    await waitFor(() => expect(getAiBtn).not.toBeDisabled());
    fireEvent.click(getAiBtn);

    await waitFor(() => {
      expect(screen.getByText('White linen shirt')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /Save Look/i })[0]);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Sign in to save favorites/i })
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Your liked outfits stay with you across devices/i)
    ).toBeInTheDocument();
  });

  it('shows first-outfit banner once after first guest suggestion', async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Get AI outfit suggestion/i })).toBeInTheDocument();
    });

    const file = new File(['x'.repeat(2048)], 'shirt.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    const getAiBtn = screen.getByRole('button', { name: /Get AI outfit suggestion/i });
    await waitFor(() => expect(getAiBtn).not.toBeDisabled());
    fireEvent.click(getAiBtn);

    await waitFor(() => {
      expect(screen.getByText('White linen shirt')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByRole('region', { name: /Save your outfit prompt/i })
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Save this outfit and build your wardrobe/i)
    ).toBeInTheDocument();
    expect(localStorage.getItem(FIRST_OUTFIT_PROMPT_KEY)).toBe('true');
  });
});
