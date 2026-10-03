/**
 * Integration: Wardrobe “How this fits” fit-evaluate flow.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import Wardrobe from './Wardrobe';
import { server } from '../../test/msw/server';
import { WARDROBE_FIT_COPY } from '../../utils/wardrobeFitCopy';
import { AUTH_PROMPT_COPY } from '../../utils/authPromptCopy';
import { renderApp } from '../../test/renderWithRouter';
import ApiService from '../../services/ApiService';

const API_BASE = 'http://localhost:8001';

jest.setTimeout(30000);

describe('WardrobeFitEvaluate integration', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('hides How this fits when not authenticated', async () => {
    render(<Wardrobe isAuthenticated={false} />);

    expect(await screen.findByText('Integration test shirt')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wardrobe-item-menu-1'));
    expect(
      screen.queryByRole('menuitem', { name: WARDROBE_FIT_COPY.action })
    ).not.toBeInTheDocument();
  });

  it('shows How this fits when authenticated and loads pair counts + missing goal', async () => {
    render(<Wardrobe isAuthenticated />);

    expect(await screen.findByText('Integration test shirt')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wardrobe-item-menu-1'));

    const action = screen.getByRole('menuitem', { name: WARDROBE_FIT_COPY.action });
    expect(action).toBeInTheDocument();
    fireEvent.click(action);

    expect(await screen.findByTestId('wardrobe-fit-panel')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('wardrobe-fit-summary')).toHaveTextContent(
        /works with 2 trousers/i
      );
    });

    expect(screen.getByTestId('wardrobe-fit-verdict')).toHaveTextContent('Strong fit');
    expect(screen.getByTestId('wardrobe-fit-pairs')).toBeInTheDocument();
    expect(screen.getByTestId('wardrobe-fit-pair-trouser')).toHaveTextContent('2');
    expect(screen.getByTestId('wardrobe-fit-missing')).toHaveTextContent(
      /structured blazer/i
    );
    expect(screen.getByTestId('wardrobe-fit-missing')).toHaveTextContent(
      WARDROBE_FIT_COPY.sectionGap
    );
  });

  it('shows error and retry when evaluate-fit fails', async () => {
    let calls = 0;
    server.use(
      rest.post(`${API_BASE}/api/wardrobe/evaluate-fit`, (_req, res, ctx) => {
        calls += 1;
        if (calls === 1) {
          return res(ctx.status(500), ctx.json({ detail: 'Boom' }));
        }
        return res(
          ctx.json({
            candidate: {
              id: 1,
              category: 'shirt',
              label: 'Blue shirt',
              color: 'Blue',
              image_data: null,
            },
            goal: {
              label: 'business-casual',
              dress_code: 'smart-casual',
              lifestyle_mix: ['work', 'everyday'],
              primary_lifestyle: 'work',
              style_primary: 'classic',
              text_input: '',
            },
            pairs_with: [],
            outfit_multiplier: 0,
            verdict: 'weak_fit',
            missing_for_goal: {
              category: 'shoes',
              label: 'pair of shoes',
              reason: 'Add shoes to complete looks.',
              candidate_fills_this_gap: false,
            },
            summary_text: 'Limited pairing options yet.',
          })
        );
      })
    );

    render(<Wardrobe isAuthenticated />);
    expect(await screen.findByText('Integration test shirt')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wardrobe-item-menu-1'));
    fireEvent.click(screen.getByRole('menuitem', { name: WARDROBE_FIT_COPY.action }));

    expect(await screen.findByTestId('wardrobe-fit-error')).toHaveTextContent(
      WARDROBE_FIT_COPY.error
    );

    fireEvent.click(screen.getByTestId('wardrobe-fit-retry'));

    await waitFor(() => {
      expect(screen.getByTestId('wardrobe-fit-summary')).toHaveTextContent(
        /Limited pairing/i
      );
    });
    expect(screen.getByTestId('wardrobe-fit-verdict')).toHaveTextContent('Weak fit');
  });

  function captureEvaluateBodies(pairCount = 3) {
    const bodies: Array<Record<string, unknown>> = [];
    server.use(
      rest.post(`${API_BASE}/api/wardrobe/evaluate-fit`, async (req, res, ctx) => {
        bodies.push((await req.json()) as Record<string, unknown>);
        return res(
          ctx.json({
            candidate: { id: 1, category: 'shirt', label: 'Blue shirt', color: 'Blue', image_data: null },
            goal: {
              label: 'goal',
              dress_code: 'smart-casual',
              lifestyle_mix: ['work'],
              primary_lifestyle: 'work',
              style_primary: 'classic',
              text_input: '',
            },
            pairs_with: [
              {
                category: 'trouser',
                count: pairCount,
                items: [{ id: 2, label: 'Navy trouser', color: 'Navy', image_data: null }],
              },
            ],
            outfit_multiplier: pairCount,
            verdict: 'weak_fit',
            missing_for_goal: {
              category: 'shoes',
              label: 'pair of shoes',
              reason: 'Add shoes.',
              candidate_fills_this_gap: false,
            },
            summary_text: 'Some pairing options.',
          })
        );
      })
    );
    return bodies;
  }

  it('shows a visible How this fits secondary button outside the overflow menu', async () => {
    render(<Wardrobe isAuthenticated />);
    expect(await screen.findByText('Integration test shirt')).toBeInTheDocument();

    const visible = screen.getByTestId('wardrobe-how-this-fits-1');
    expect(visible).toHaveTextContent(WARDROBE_FIT_COPY.action);
    expect(visible).not.toHaveAttribute('role', 'menuitem');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(visible);
    expect(await screen.findByTestId('wardrobe-fit-panel')).toBeInTheDocument();
  });

  it('hides the visible How this fits button when not authenticated', async () => {
    render(<Wardrobe isAuthenticated={false} />);
    expect(await screen.findByText('Integration test shirt')).toBeInTheDocument();
    expect(screen.queryByTestId('wardrobe-how-this-fits-1')).not.toBeInTheDocument();
  });

  it('prefills the goal from saved Insights preferences', async () => {
    localStorage.setItem(
      'insights_lifestyle_preferences',
      JSON.stringify({
        lifestyleMix: ['social', 'everyday'],
        primaryLifestyle: 'social',
        dressCodes: ['business-professional', 'casual'],
        climates: [],
        stylePrimaries: ['minimal', 'classic'],
        styleAccents: [],
        eventFocus: null,
      })
    );
    const bodies = captureEvaluateBodies();

    render(<Wardrobe isAuthenticated />);
    expect(await screen.findByText('Integration test shirt')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wardrobe-how-this-fits-1'));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({
      dress_code: 'business-professional',
      lifestyle_mix: ['social', 'everyday'],
      primary_lifestyle: 'social',
      style_primary: 'minimal',
    });
    expect(screen.getByTestId('wardrobe-fit-goal-hint')).toHaveTextContent(
      'Goal: business-professional · social + everyday · minimal'
    );
  });

  it('persists the last-used goal and prefers it over Insights prefs on reopen', async () => {
    localStorage.setItem(
      'insights_lifestyle_preferences',
      JSON.stringify({ lifestyleMix: ['work'], primaryLifestyle: 'work', dressCodes: ['casual'], stylePrimaries: ['classic'] })
    );
    const bodies = captureEvaluateBodies();

    render(<Wardrobe isAuthenticated />);
    expect(await screen.findByText('Integration test shirt')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wardrobe-how-this-fits-1'));
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({ dress_code: 'casual' });

    await screen.findByTestId('wardrobe-fit-result');
    fireEvent.click(screen.getByTestId('wardrobe-fit-change-goal'));
    fireEvent.change(screen.getByTestId('wardrobe-fit-dress-code'), {
      target: { value: 'formal' },
    });
    fireEvent.click(screen.getByTestId('wardrobe-fit-apply-goal'));
    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1]).toMatchObject({ dress_code: 'formal' });
    expect(JSON.parse(localStorage.getItem('wardrobe_fit_last_goal') || '{}')).toMatchObject({
      dress_code: 'formal',
    });

    await screen.findByTestId('wardrobe-fit-result');
    fireEvent.click(screen.getByTestId('wardrobe-fit-close'));
    await waitFor(() =>
      expect(screen.queryByTestId('wardrobe-fit-panel')).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('wardrobe-how-this-fits-1'));
    await waitFor(() => expect(bodies).toHaveLength(3));
    expect(bodies[2]).toMatchObject({ dress_code: 'formal' });
  });

  it('shows pair counts with units', async () => {
    captureEvaluateBodies(3);
    render(<Wardrobe isAuthenticated />);
    expect(await screen.findByText('Integration test shirt')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wardrobe-how-this-fits-1'));

    expect(await screen.findByTestId('wardrobe-fit-pair-count-trouser')).toHaveTextContent(
      'Pairs with 3'
    );
  });

  it('closes on Escape, traps Tab focus, and returns focus to the trigger', async () => {
    captureEvaluateBodies();
    render(<Wardrobe isAuthenticated />);
    expect(await screen.findByText('Integration test shirt')).toBeInTheDocument();

    const trigger = screen.getByTestId('wardrobe-how-this-fits-1');
    trigger.focus();
    fireEvent.click(trigger);

    await screen.findByTestId('wardrobe-fit-result');
    const dialog = screen.getByRole('dialog');
    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled])'));
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);

    trigger.blur();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByTestId('wardrobe-fit-panel')).not.toBeInTheDocument()
    );
    expect(document.activeElement).toBe(trigger);
  });

  describe('expandable images', () => {
    function useImageFitResponse() {
      server.use(
        rest.post(`${API_BASE}/api/wardrobe/evaluate-fit`, (_req, res, ctx) =>
          res(
            ctx.json({
              candidate: { id: 1, category: 'shirt', label: 'Blue shirt', color: 'Blue', image_data: 'Y2FuZA==' },
              goal: {
                label: 'goal',
                dress_code: 'smart-casual',
                lifestyle_mix: ['work'],
                primary_lifestyle: 'work',
                style_primary: 'classic',
                text_input: '',
              },
              pairs_with: [
                {
                  category: 'trouser',
                  count: 2,
                  items: [
                    { id: 2, label: 'Navy trouser', color: 'Navy', image_data: 'cGFpcg==' },
                    { id: 3, label: 'Grey trouser', color: 'Grey', image_data: null },
                  ],
                },
              ],
              outfit_multiplier: 2,
              verdict: 'strong_fit',
              missing_for_goal: {
                category: 'shoes',
                label: 'pair of shoes',
                reason: 'Add shoes.',
                candidate_fills_this_gap: false,
              },
              summary_text: 'Works with 2 trousers you own.',
            })
          )
        )
      );
    }

    async function openFitResult() {
      useImageFitResponse();
      render(<Wardrobe isAuthenticated />);
      expect(await screen.findByText('Integration test shirt')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('wardrobe-how-this-fits-1'));
      await screen.findByTestId('wardrobe-fit-result');
    }

    it('opens the candidate image full screen and closing returns to the panel', async () => {
      await openFitResult();

      fireEvent.click(screen.getByRole('button', { name: 'View full image' }));
      const full = await screen.findByAltText('Full size view');
      expect(full).toHaveAttribute('src', 'data:image/jpeg;base64,Y2FuZA==');

      fireEvent.click(screen.getByTestId('wardrobe-fit-image-viewer-close'));
      await waitFor(() =>
        expect(screen.queryByAltText('Full size view')).not.toBeInTheDocument()
      );
      expect(screen.getByTestId('wardrobe-fit-panel')).toBeInTheDocument();
      expect(screen.getByTestId('wardrobe-fit-result')).toBeInTheDocument();
    });

    it('opens a Works with what you own thumbnail with that item image', async () => {
      await openFitResult();

      fireEvent.click(screen.getByRole('button', { name: 'View full image of Navy trouser' }));
      expect(await screen.findByAltText('Full size view')).toHaveAttribute(
        'src',
        'data:image/jpeg;base64,cGFpcg=='
      );

      fireEvent.click(screen.getByTestId('wardrobe-fit-image-viewer'));
      await waitFor(() =>
        expect(screen.queryByAltText('Full size view')).not.toBeInTheDocument()
      );
      expect(screen.getByTestId('wardrobe-fit-panel')).toBeInTheDocument();
    });

    it('Escape closes the viewer but keeps the panel open', async () => {
      await openFitResult();

      fireEvent.click(screen.getByRole('button', { name: 'View full image' }));
      await screen.findByAltText('Full size view');

      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() =>
        expect(screen.queryByAltText('Full size view')).not.toBeInTheDocument()
      );
      expect(screen.getByTestId('wardrobe-fit-panel')).toBeInTheDocument();
    });

    it('does not render a viewer button for pair items without image_data', async () => {
      await openFitResult();

      expect(
        screen.queryByRole('button', { name: 'View full image of Grey trouser' })
      ).not.toBeInTheDocument();
      expect(screen.getByTitle('Grey trouser')).toBeInTheDocument();
    });
  });

  describe('View all pair items', () => {
    const trousers = Array.from({ length: 5 }, (_, i) => ({
      id: 10 + i,
      label: `Trouser ${i + 1}`,
      color: 'Navy',
      image_data: btoa(`trouser-${i + 1}`),
    }));

    async function openWithManyPairs() {
      server.use(
        rest.post(`${API_BASE}/api/wardrobe/evaluate-fit`, (_req, res, ctx) =>
          res(
            ctx.json({
              candidate: { id: 1, category: 'shirt', label: 'Blue shirt', color: 'Blue', image_data: null },
              goal: {
                label: 'goal',
                dress_code: 'smart-casual',
                lifestyle_mix: ['work'],
                primary_lifestyle: 'work',
                style_primary: 'classic',
                text_input: '',
              },
              pairs_with: [
                { category: 'trouser', count: trousers.length, items: trousers },
                {
                  category: 'shoes',
                  count: 2,
                  items: [
                    { id: 30, label: 'Brown shoes', color: 'Brown', image_data: btoa('shoes-1') },
                    { id: 31, label: 'Black shoes', color: 'Black', image_data: btoa('shoes-2') },
                  ],
                },
              ],
              outfit_multiplier: 7,
              verdict: 'strong_fit',
              missing_for_goal: {
                category: 'blazer',
                label: 'structured blazer',
                reason: 'Add a blazer.',
                candidate_fills_this_gap: false,
              },
              summary_text: 'Works with 5 trousers you own.',
            })
          )
        )
      );
      render(<Wardrobe isAuthenticated />);
      expect(await screen.findByText('Integration test shirt')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('wardrobe-how-this-fits-1'));
      await screen.findByTestId('wardrobe-fit-result');
    }

    const trouserThumbs = () =>
      screen
        .getByTestId('wardrobe-fit-pair-thumbs-trouser')
        .querySelectorAll('button[aria-label^="View full image of"]');

    it('shows 3 thumbnails and View all (N) when a category has more than 3 items', async () => {
      await openWithManyPairs();

      expect(trouserThumbs()).toHaveLength(3);
      const toggle = screen.getByTestId('wardrobe-fit-pair-toggle-trouser');
      expect(toggle).toHaveTextContent('View all (5)');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(
        screen.queryByRole('button', { name: 'View full image of Trouser 4' })
      ).not.toBeInTheDocument();
    });

    it('expands to all items with Show less and collapses back to 3', async () => {
      await openWithManyPairs();

      fireEvent.click(screen.getByRole('button', { name: 'View all (5)' }));
      expect(trouserThumbs()).toHaveLength(5);
      const toggle = screen.getByTestId('wardrobe-fit-pair-toggle-trouser');
      expect(toggle).toHaveTextContent('Show less');
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByTestId('wardrobe-fit-pair-thumbs-trouser')).toHaveClass('flex-wrap');

      fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
      expect(trouserThumbs()).toHaveLength(3);
      expect(screen.getByTestId('wardrobe-fit-pair-toggle-trouser')).toHaveTextContent(
        'View all (5)'
      );
    });

    it('does not show a toggle for a category with 3 or fewer items', async () => {
      await openWithManyPairs();

      expect(screen.queryByTestId('wardrobe-fit-pair-toggle-shoes')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'View full image of Black shoes' })
      ).toBeInTheDocument();
    });

    it('opens a revealed thumbnail in the full-screen viewer', async () => {
      await openWithManyPairs();

      fireEvent.click(screen.getByRole('button', { name: 'View all (5)' }));
      fireEvent.click(screen.getByRole('button', { name: 'View full image of Trouser 5' }));
      expect(await screen.findByAltText('Full size view')).toHaveAttribute(
        'src',
        `data:image/jpeg;base64,${btoa('trouser-5')}`
      );
    });
  });
});

describe('Check before you buy (main upload flow)', () => {
  const PREVIEW_URL = 'blob:check-before-buy-preview';
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let callOrder: string[];

  function authMe() {
    return rest.get(`${API_BASE}/api/auth/me`, (_req, res, ctx) =>
      res(ctx.json({ id: 1, email: 'tester@example.com', full_name: 'Test User', is_admin: false }))
    );
  }

  function attributeFitResponse() {
    return {
      candidate: { id: null, category: 'shirt', label: 'Olive shirt', color: 'Olive', image_data: null },
      goal: {
        label: 'goal',
        dress_code: 'smart-casual',
        lifestyle_mix: ['work', 'everyday'],
        primary_lifestyle: 'work',
        style_primary: 'classic',
        text_input: '',
      },
      pairs_with: [
        {
          category: 'trouser',
          count: 4,
          items: [{ id: 2, label: 'Navy trouser', color: 'Navy', image_data: null }],
        },
      ],
      outfit_multiplier: 4,
      verdict: 'strong_fit',
      missing_for_goal: {
        category: 'blazer',
        label: 'structured blazer',
        reason: 'Add a blazer for work.',
        candidate_fills_this_gap: false,
      },
      summary_text: 'Works with 4 trousers you own.',
    };
  }

  function captureAttributeEvaluate(fail = false) {
    const bodies: Array<Record<string, unknown>> = [];
    server.use(
      rest.post(`${API_BASE}/api/wardrobe/evaluate-fit`, async (req, res, ctx) => {
        callOrder.push('evaluate');
        bodies.push((await req.json()) as Record<string, unknown>);
        if (fail) return res(ctx.status(500), ctx.json({ detail: 'Boom' }));
        return res(ctx.json(attributeFitResponse()));
      })
    );
    return bodies;
  }

  async function uploadImage() {
    const file = new File(['x'.repeat(2048)], 'olive-shirt.jpg', { type: 'image/jpeg' });
    const input = (await waitFor(() => {
      const el = document.querySelector('input[type="file"]') as HTMLInputElement | null;
      expect(el).toBeTruthy();
      return el;
    })) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    return file;
  }

  beforeEach(() => {
    callOrder = [];
    URL.createObjectURL = jest.fn(() => PREVIEW_URL);
    URL.revokeObjectURL = jest.fn();
    HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('shows Check before you buy only once an image is present (authenticated)', async () => {
    localStorage.setItem('auth_token', 'test-token');
    server.use(authMe());
    renderApp();

    await screen.findByRole('button', { name: /Get AI outfit suggestion/i });
    expect(screen.queryByTestId('main.checkBeforeBuy')).not.toBeInTheDocument();

    await uploadImage();
    expect(await screen.findByTestId('main.checkBeforeBuy')).toHaveTextContent(
      WARDROBE_FIT_COPY.checkBeforeBuyAction
    );
  });

  it('opens the login gate for guests instead of evaluating', async () => {
    const analyzeSpy = jest.spyOn(ApiService, 'analyzeWardrobeImage');
    const bodies = captureAttributeEvaluate();
    renderApp();

    await screen.findByRole('button', { name: /Get AI outfit suggestion/i });
    await uploadImage();
    fireEvent.click(await screen.findByTestId('main.checkBeforeBuy'));

    expect(
      await screen.findByText(AUTH_PROMPT_COPY.wardrobe.headline)
    ).toBeInTheDocument();
    expect(screen.queryByTestId('wardrobe-fit-panel')).not.toBeInTheDocument();
    expect(analyzeSpy).not.toHaveBeenCalled();
    expect(bodies).toHaveLength(0);
  });

  it('analyzes then evaluates with an attribute-only body and shows the result with the uploaded thumb', async () => {
    localStorage.setItem('auth_token', 'test-token');
    server.use(authMe());
    let resolveAnalyze: (v: { category: string; color: string; description: string }) => void = () => {};
    const analyzeSpy = jest.spyOn(ApiService, 'analyzeWardrobeImage').mockImplementation(() => {
      callOrder.push('analyze');
      return new Promise((resolve) => {
        resolveAnalyze = resolve;
      });
    });
    const bodies = captureAttributeEvaluate();

    renderApp();
    await screen.findByRole('button', { name: /Get AI outfit suggestion/i });
    const file = await uploadImage();
    fireEvent.click(await screen.findByTestId('main.checkBeforeBuy'));

    expect(await screen.findByTestId('wardrobe-fit-loading')).toHaveTextContent(
      WARDROBE_FIT_COPY.checkBeforeBuyLoading
    );
    expect(analyzeSpy).toHaveBeenCalledWith(file, 'blip');

    resolveAnalyze({ category: 'shirt', color: '', description: 'Olive overshirt' });

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(callOrder).toEqual(['analyze', 'evaluate']);
    expect(bodies[0]).not.toHaveProperty('wardrobe_item_id');
    expect(bodies[0]).toMatchObject({
      category: 'shirt',
      description: 'Olive overshirt',
      dress_code: 'smart-casual',
      lifestyle_mix: ['work', 'everyday'],
      primary_lifestyle: 'work',
      style_primary: 'classic',
    });
    expect(bodies[0].color ?? null).toBeNull();

    await screen.findByTestId('wardrobe-fit-result');
    expect(screen.getByTestId('wardrobe-fit-pair-count-trouser')).toHaveTextContent('Pairs with 4');
    expect(screen.getByTestId('wardrobe-fit-missing')).toHaveTextContent(/structured blazer/i);
    expect(screen.getByTestId('wardrobe-fit-candidate-thumb')).toHaveAttribute('src', PREVIEW_URL);
    expect(screen.getByTestId('wardrobe-fit-add-to-wardrobe')).toHaveTextContent(
      WARDROBE_FIT_COPY.addToWardrobe
    );
    expect(screen.queryByTestId('wardrobe-fit-get-outfit')).not.toBeInTheDocument();
    expect(screen.queryByText(WARDROBE_FIT_COPY.getOutfit)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('wardrobe-fit-add-to-wardrobe'));
    expect(await screen.findByText(/Review & Add to Wardrobe/)).toBeInTheDocument();
    expect(screen.queryByTestId('wardrobe-fit-panel')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Olive overshirt')).toBeInTheDocument();
  });

  it('shows error copy + Retry when analyze fails, and recovers on retry', async () => {
    localStorage.setItem('auth_token', 'test-token');
    server.use(authMe());
    const analyzeSpy = jest
      .spyOn(ApiService, 'analyzeWardrobeImage')
      .mockRejectedValueOnce(new Error('analyze failed'))
      .mockResolvedValue({ category: 'shirt', color: 'Olive', description: 'Olive shirt' });
    const bodies = captureAttributeEvaluate();

    renderApp();
    await screen.findByRole('button', { name: /Get AI outfit suggestion/i });
    await uploadImage();
    fireEvent.click(await screen.findByTestId('main.checkBeforeBuy'));

    expect(await screen.findByTestId('wardrobe-fit-error')).toHaveTextContent(
      WARDROBE_FIT_COPY.error
    );
    expect(bodies).toHaveLength(0);

    fireEvent.click(screen.getByTestId('wardrobe-fit-retry'));
    await screen.findByTestId('wardrobe-fit-result');
    expect(analyzeSpy).toHaveBeenCalledTimes(2);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({ category: 'shirt', color: 'Olive' });
  });

  it('shows error copy + Retry when evaluate fails', async () => {
    localStorage.setItem('auth_token', 'test-token');
    server.use(authMe());
    jest
      .spyOn(ApiService, 'analyzeWardrobeImage')
      .mockResolvedValue({ category: 'shirt', color: 'Olive', description: 'Olive shirt' });
    captureAttributeEvaluate(true);

    renderApp();
    await screen.findByRole('button', { name: /Get AI outfit suggestion/i });
    await uploadImage();
    fireEvent.click(await screen.findByTestId('main.checkBeforeBuy'));

    expect(await screen.findByTestId('wardrobe-fit-error')).toHaveTextContent(
      WARDROBE_FIT_COPY.error
    );
    expect(screen.getByTestId('wardrobe-fit-retry')).toHaveTextContent(WARDROBE_FIT_COPY.retry);
  });
});
