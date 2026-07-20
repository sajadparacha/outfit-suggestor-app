/**
 * Week Outfit Planner — guest gate + generate flow + responsive redesign integration
 */
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { rest } from 'msw';
import { renderApp } from '../test/renderWithRouter';
import { server } from '../test/msw/server';
import { ROUTES } from '../navigation/routes';
import { WeekPlanUpsertRequest } from '../models/WeekPlanModels';

const API_BASE = 'http://localhost:8001';

jest.setTimeout(30000);

function emptyDays() {
  return Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    enabled: false,
    occasion: 'everyday',
    style: 'classic',
    use_wardrobe_only: true,
    outfit: null as null | Record<string, unknown>,
  }));
}

function authMe(isAdmin = false) {
  return rest.get(`${API_BASE}/api/auth/me`, (_req, res, ctx) =>
    res(
      ctx.json({
        id: 1,
        email: isAdmin ? 'admin@example.com' : 'tester@example.com',
        full_name: isAdmin ? 'Admin' : 'Test User',
        is_admin: isAdmin,
      })
    )
  );
}

describe('Week Outfit Planner', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('shows auth gate for guest on /week', async () => {
    renderApp({ routerProps: { initialEntries: [ROUTES.WEEK] } });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /Plan your week’s outfits in one place/i,
        })
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Sign in to save day plans, generate looks, and see Today’s outfit/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
  });

  it('enables days, sets occasions, generates, and updates Today / plan UI', async () => {
    localStorage.setItem('auth_token', 'test-token');

    let storedDays = emptyDays();
    const putCapture: { body: WeekPlanUpsertRequest | null } = { body: null };

    server.use(
      authMe(),
      rest.get(`${API_BASE}/api/week-plan`, (_req, res, ctx) =>
        res(
          ctx.json({
            reminder_time: '07:30',
            timezone: 'UTC',
            shared_style: 'classic',
            shared_season: 'all-season',
            days: storedDays,
            wardrobe_empty: false,
            message: null,
          })
        )
      ),
      rest.get(`${API_BASE}/api/week-plan/today`, (_req, res, ctx) => {
        const mon = storedDays[0];
        return res(
          ctx.json({
            day_of_week: 0,
            enabled: mon.enabled,
            occasion: mon.enabled ? mon.occasion : null,
            use_wardrobe_only: mon.use_wardrobe_only,
            outfit: mon.outfit,
            reminder_time: '07:30',
            timezone: 'UTC',
            has_plan: true,
            message: null,
          })
        );
      }),
      rest.put(`${API_BASE}/api/week-plan`, async (req, res, ctx) => {
        const body = (await req.json()) as WeekPlanUpsertRequest;
        putCapture.body = body;
        storedDays = body.days.map((d) => ({
          ...d,
          style: d.style ?? 'classic',
          use_wardrobe_only: d.use_wardrobe_only ?? true,
          outfit: storedDays.find((s) => s.day_of_week === d.day_of_week)?.outfit ?? null,
        }));
        return res(
          ctx.json({
            reminder_time: body.reminder_time,
            timezone: body.timezone,
            shared_style: body.shared_style,
            shared_season: body.shared_season,
            days: storedDays,
            wardrobe_empty: false,
            message: null,
          })
        );
      }),
      rest.post(`${API_BASE}/api/week-plan/generate`, async (_req, res, ctx) => {
        storedDays = storedDays.map((d) =>
          d.enabled
            ? {
                ...d,
                outfit: {
                  summary: `${d.occasion} look for day ${d.day_of_week}`,
                  shirt: 'White oxford shirt',
                  trouser: 'Navy trousers',
                  blazer: 'Gray blazer',
                  shoes: 'Brown shoes',
                  belt: 'Brown belt',
                  reasoning: 'Generated for tests. Why this works for the occasion.',
                },
              }
            : d
        );
        return res(
          ctx.json({
            reminder_time: '07:30',
            timezone: 'UTC',
            shared_style: 'classic',
            shared_season: 'all-season',
            days: storedDays,
            wardrobe_empty: false,
            message: null,
          })
        );
      })
    );

    renderApp({ routerProps: { initialEntries: [ROUTES.WEEK] } });

    await waitFor(() => {
      expect(screen.getByTestId('week-planner')).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Shared season/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Shared style/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Reminder time/i)).toBeInTheDocument();
    expect(screen.getByTestId('week-empty-days')).toHaveTextContent(
      /Turn on the days you want to plan/i
    );

    const monday = screen.getByTestId('week-day-0');
    fireEvent.click(within(monday).getByLabelText(/Enable Monday/i));

    await waitFor(() => {
      expect(screen.getByTestId('week-day-detail')).toHaveAttribute('data-day', '0');
    });
    fireEvent.change(screen.getByLabelText(/Monday occasion/i), {
      target: { value: 'work' },
    });

    const wardrobeToggle = screen.getByLabelText(/Monday use wardrobe/i);
    expect(wardrobeToggle).toBeChecked();
    fireEvent.click(wardrobeToggle);
    expect(wardrobeToggle).not.toBeChecked();

    const tuesday = screen.getByTestId('week-day-1');
    fireEvent.click(within(tuesday).getByLabelText(/Enable Tuesday/i));
    await waitFor(() => {
      expect(screen.getByTestId('week-day-detail')).toHaveAttribute('data-day', '1');
    });
    fireEvent.change(screen.getByLabelText(/Tuesday occasion/i), {
      target: { value: 'date-night' },
    });

    const generateBtn = screen.getByRole('button', { name: /Generate week/i });
    await waitFor(() => expect(generateBtn).not.toBeDisabled());
    fireEvent.click(generateBtn);

    fireEvent.click(screen.getByTestId('week-day-select-0'));
    await waitFor(() => {
      expect(screen.getByTestId('week-day-summary-0')).toHaveTextContent(
        /work look for day 0/i
      );
    });

    fireEvent.click(screen.getByTestId('week-day-select-1'));
    await waitFor(() => {
      expect(screen.getByTestId('week-day-summary-1')).toHaveTextContent(
        /date-night look for day 1/i
      );
    });

    expect(putCapture.body?.days?.[0]?.use_wardrobe_only).toBe(false);
    expect(putCapture.body?.days?.[1]?.use_wardrobe_only).toBe(true);

    fireEvent.click(screen.getByTestId('week-day-select-0'));
    const mondayDetails = await screen.findByTestId('week-day-summary-0-details');
    expect(mondayDetails).not.toHaveAttribute('open');

    fireEvent.click(screen.getByTestId('week-day-summary-0-why-toggle'));
    if (!mondayDetails.hasAttribute('open')) {
      mondayDetails.setAttribute('open', '');
    }

    await waitFor(() => {
      const expanded = screen.getByTestId('week-day-summary-0-expanded');
      expect(expanded).toBeInTheDocument();
      expect(within(expanded).getByRole('heading', { name: /Why this works/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/White oxford shirt/i)).toBeInTheDocument();
    expect(screen.getAllByText(/AI Suggested/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByTestId('week-today-summary')).toHaveTextContent(
        /work look for day 0/i
      );
    });
  });

  it('updates detail panel when selecting a different day without reload', async () => {
    localStorage.setItem('auth_token', 'test-token');

    const days = emptyDays().map((d, i) =>
      i === 0
        ? {
            ...d,
            enabled: true,
            occasion: 'work',
            outfit: {
              summary: 'Monday work look',
              shirt: 'Blue shirt',
              trouser: 'Gray trousers',
              blazer: 'Navy blazer',
              shoes: 'Black shoes',
              belt: 'Black belt',
              reasoning: 'Sharp for work.',
            },
          }
        : i === 1
          ? {
              ...d,
              enabled: true,
              occasion: 'date-night',
              outfit: {
                summary: 'Tuesday date look',
                shirt: 'Silk shirt',
                trouser: 'Dark trousers',
                blazer: 'Velvet blazer',
                shoes: 'Loafers',
                belt: 'Thin belt',
                reasoning: 'Evening ready.',
              },
            }
          : d
    );

    server.use(
      authMe(),
      rest.get(`${API_BASE}/api/week-plan`, (_req, res, ctx) =>
        res(
          ctx.json({
            reminder_time: '07:30',
            timezone: 'UTC',
            shared_style: 'classic',
            shared_season: 'all-season',
            days,
            wardrobe_empty: false,
            message: null,
          })
        )
      ),
      rest.get(`${API_BASE}/api/week-plan/today`, (_req, res, ctx) =>
        res(
          ctx.json({
            day_of_week: 0,
            enabled: true,
            occasion: 'work',
            use_wardrobe_only: true,
            outfit: days[0].outfit,
            reminder_time: '07:30',
            timezone: 'UTC',
            has_plan: true,
            message: null,
          })
        )
      )
    );

    renderApp({ routerProps: { initialEntries: [ROUTES.WEEK] } });

    await waitFor(() => {
      expect(screen.getByTestId('week-day-detail')).toHaveAttribute('data-day', '0');
    });
    expect(screen.getByTestId('week-day-summary-0')).toHaveTextContent(/Monday work look/i);

    fireEvent.click(screen.getByTestId('week-day-select-1'));

    await waitFor(() => {
      expect(screen.getByTestId('week-day-detail')).toHaveAttribute('data-day', '1');
    });
    expect(screen.getByTestId('week-day-summary-1')).toHaveTextContent(/Tuesday date look/i);
    expect(screen.queryByTestId('week-day-summary-0')).not.toBeInTheDocument();
  });

  it('shows missing-item actions when a core outfit slot is empty', async () => {
    localStorage.setItem('auth_token', 'test-token');

    const days = emptyDays().map((d, i) =>
      i === 0
        ? {
            ...d,
            enabled: true,
            occasion: 'work',
            outfit: {
              summary: 'Almost ready',
              shirt: 'White shirt',
              trouser: 'Navy trousers',
              blazer: '',
              shoes: 'Brown shoes',
              belt: 'Brown belt',
              reasoning: 'Needs a blazer.',
            },
          }
        : d
    );

    let regenerated = false;

    server.use(
      authMe(),
      rest.get(`${API_BASE}/api/week-plan`, (_req, res, ctx) =>
        res(
          ctx.json({
            reminder_time: '07:30',
            timezone: 'UTC',
            shared_style: 'classic',
            shared_season: 'all-season',
            days,
            wardrobe_empty: false,
            message: null,
          })
        )
      ),
      rest.get(`${API_BASE}/api/week-plan/today`, (_req, res, ctx) =>
        res(
          ctx.json({
            day_of_week: 0,
            enabled: true,
            occasion: 'work',
            use_wardrobe_only: true,
            outfit: days[0].outfit,
            reminder_time: '07:30',
            timezone: 'UTC',
            has_plan: true,
            message: null,
          })
        )
      ),
      rest.put(`${API_BASE}/api/week-plan`, async (req, res, ctx) => {
        const body = (await req.json()) as WeekPlanUpsertRequest;
        return res(
          ctx.json({
            reminder_time: body.reminder_time,
            timezone: body.timezone,
            shared_style: body.shared_style,
            shared_season: body.shared_season,
            days,
            wardrobe_empty: false,
            message: null,
          })
        );
      }),
      rest.post(`${API_BASE}/api/week-plan/generate`, async (_req, res, ctx) => {
        regenerated = true;
        return res(
          ctx.json({
            reminder_time: '07:30',
            timezone: 'UTC',
            shared_style: 'classic',
            shared_season: 'all-season',
            days,
            wardrobe_empty: false,
            message: null,
          })
        );
      })
    );

    renderApp({ routerProps: { initialEntries: [ROUTES.WEEK] } });

    await waitFor(() => {
      expect(screen.getByTestId('week-missing-item-card')).toBeInTheDocument();
    });
    expect(screen.getByTestId('week-outfit-missing-slot-blazer')).toBeInTheDocument();
    expect(screen.getByTestId('week-missing-choose-wardrobe')).toBeInTheDocument();
    expect(screen.getByTestId('week-missing-find-alternative')).toBeInTheDocument();
    expect(screen.getByTestId('week-missing-continue')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('week-missing-find-alternative'));
    await waitFor(() => expect(regenerated).toBe(true));

    fireEvent.click(screen.getByTestId('week-missing-continue'));
    await waitFor(() => {
      expect(screen.queryByTestId('week-missing-item-card')).not.toBeInTheDocument();
    });
  });

  it('disables Save weekly plan while saving', async () => {
    localStorage.setItem('auth_token', 'test-token');

    let resolvePut: ((value: unknown) => void) | null = null;

    server.use(
      authMe(),
      rest.get(`${API_BASE}/api/week-plan`, (_req, res, ctx) =>
        res(
          ctx.json({
            reminder_time: '07:30',
            timezone: 'UTC',
            shared_style: 'classic',
            shared_season: 'all-season',
            days: emptyDays().map((d, i) =>
              i === 0 ? { ...d, enabled: true, occasion: 'work' } : d
            ),
            wardrobe_empty: false,
            message: null,
          })
        )
      ),
      rest.get(`${API_BASE}/api/week-plan/today`, (_req, res, ctx) =>
        res(
          ctx.json({
            day_of_week: 0,
            enabled: true,
            occasion: 'work',
            use_wardrobe_only: true,
            outfit: null,
            reminder_time: '07:30',
            timezone: 'UTC',
            has_plan: true,
            message: null,
          })
        )
      ),
      rest.put(`${API_BASE}/api/week-plan`, async (_req, res, ctx) => {
        await new Promise((resolve) => {
          resolvePut = resolve;
        });
        return res(
          ctx.json({
            reminder_time: '07:30',
            timezone: 'UTC',
            shared_style: 'classic',
            shared_season: 'all-season',
            days: emptyDays().map((d, i) =>
              i === 0 ? { ...d, enabled: true, occasion: 'work' } : d
            ),
            wardrobe_empty: false,
            message: null,
          })
        );
      })
    );

    renderApp({ routerProps: { initialEntries: [ROUTES.WEEK] } });

    const saveBtn = await screen.findByTestId('week-save-plan');
    await waitFor(() => expect(saveBtn).not.toBeDisabled());

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByTestId('week-save-plan')).toBeDisabled();
      expect(screen.getByTestId('week-save-plan')).toHaveAttribute('aria-busy', 'true');
    });

    expect(resolvePut).not.toBeNull();
    resolvePut!(undefined);

    await waitFor(() => {
      expect(screen.getByTestId('week-save-plan')).not.toBeDisabled();
    });
  });

  it('asks to confirm before clearing the plan', async () => {
    localStorage.setItem('auth_token', 'test-token');
    let deleted = false;
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

    server.use(
      authMe(),
      rest.get(`${API_BASE}/api/week-plan`, (_req, res, ctx) =>
        res(
          ctx.json({
            reminder_time: '07:30',
            timezone: 'UTC',
            shared_style: 'classic',
            shared_season: 'all-season',
            days: emptyDays().map((d, i) =>
              i === 0 ? { ...d, enabled: true, occasion: 'work' } : d
            ),
            wardrobe_empty: false,
            message: null,
          })
        )
      ),
      rest.get(`${API_BASE}/api/week-plan/today`, (_req, res, ctx) =>
        res(
          ctx.json({
            day_of_week: 0,
            enabled: true,
            occasion: 'work',
            use_wardrobe_only: true,
            outfit: null,
            reminder_time: '07:30',
            timezone: 'UTC',
            has_plan: true,
            message: null,
          })
        )
      ),
      rest.delete(`${API_BASE}/api/week-plan`, (_req, res, ctx) => {
        deleted = true;
        return res(ctx.json({ deleted: true }));
      })
    );

    renderApp({ routerProps: { initialEntries: [ROUTES.WEEK] } });

    await waitFor(() => {
      expect(screen.getByTestId('week-clear-plan')).toBeInTheDocument();
      expect(screen.getByTestId('week-clear-plan')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId('week-clear-plan'));
    expect(confirmSpy).toHaveBeenCalled();
    expect(deleted).toBe(false);

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByTestId('week-clear-plan'));
    await waitFor(() => expect(deleted).toBe(true));

    confirmSpy.mockRestore();
  });

  it('lists previous plans and Load restores the plan UI', async () => {
    localStorage.setItem('auth_token', 'test-token');

    let storedDays = emptyDays();
    const historyItems = [
      {
        id: 42,
        label: 'Mon–Fri work week',
        created_at: '2026-07-10T12:00:00Z',
        enabled_day_count: 5,
      },
    ];

    server.use(
      authMe(),
      rest.get(`${API_BASE}/api/week-plan`, (_req, res, ctx) =>
        res(
          ctx.json({
            reminder_time: '07:30',
            timezone: 'UTC',
            shared_style: 'classic',
            shared_season: 'all-season',
            days: storedDays,
            wardrobe_empty: false,
            message: null,
          })
        )
      ),
      rest.get(`${API_BASE}/api/week-plan/today`, (_req, res, ctx) => {
        const mon = storedDays[0];
        return res(
          ctx.json({
            day_of_week: 0,
            enabled: mon.enabled,
            occasion: mon.enabled ? mon.occasion : null,
            style: mon.style,
            use_wardrobe_only: mon.use_wardrobe_only,
            outfit: mon.outfit,
            reminder_time: '07:30',
            timezone: 'UTC',
            has_plan: true,
            message: null,
          })
        );
      }),
      rest.get(`${API_BASE}/api/week-plan/history`, (_req, res, ctx) =>
        res(ctx.json({ items: historyItems }))
      ),
      rest.post(`${API_BASE}/api/week-plan/history/:id/restore`, async (req, res, ctx) => {
        expect(req.params.id).toBe('42');
        storedDays = emptyDays().map((d, i) =>
          i < 5
            ? {
                ...d,
                enabled: true,
                occasion: 'work',
                outfit: {
                  summary: `Restored outfit day ${i}`,
                  shirt: 'Restored shirt',
                  trouser: 'Navy trousers',
                  blazer: 'Gray blazer',
                  shoes: 'Brown shoes',
                  belt: 'Brown belt',
                  reasoning: 'Restored from history.',
                },
              }
            : d
        );
        return res(
          ctx.json({
            reminder_time: '08:00',
            timezone: 'UTC',
            shared_style: 'classic',
            shared_season: 'all-season',
            days: storedDays,
            wardrobe_empty: false,
            message: null,
          })
        );
      })
    );

    renderApp({ routerProps: { initialEntries: [ROUTES.WEEK] } });

    await waitFor(() => {
      expect(screen.getByTestId('week-planner')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('week-plan-history-list')).toBeInTheDocument();
    });
    expect(screen.getByText(/Mon–Fri work week/i)).toBeInTheDocument();
    expect(screen.getByTestId('week-plan-history-item-42')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('week-plan-history-load-42'));

    await waitFor(() => {
      expect(screen.getByTestId('week-day-summary-0')).toHaveTextContent(
        /Restored outfit day 0/i
      );
    });
    expect(screen.getByLabelText(/Reminder time/i)).toHaveValue('08:00');
    await waitFor(() => {
      expect(screen.getByTestId('week-plan-message')).toHaveTextContent(
        /Previous plan loaded/i
      );
    });
  });

  it('shows admin generation diagnostics when admin and toggle enabled', async () => {
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('show_ai_prompt_response', 'true');

    let storedDays = emptyDays();
    storedDays[0].enabled = true;

    server.use(
      authMe(true),
      rest.get(`${API_BASE}/api/week-plan`, (_req, res, ctx) =>
        res(
          ctx.json({
            reminder_time: '07:30',
            timezone: 'UTC',
            shared_style: 'classic',
            shared_season: 'all-season',
            days: storedDays,
            wardrobe_empty: false,
            message: null,
          })
        )
      ),
      rest.post(`${API_BASE}/api/week-plan/generate`, async (_req, res, ctx) => {
        storedDays = storedDays.map((d) =>
          d.enabled
            ? {
                ...d,
                outfit: {
                  summary: 'Admin outfit',
                  shirt: 'Shirt',
                  trouser: 'Trousers',
                  blazer: 'Blazer',
                  shoes: 'Shoes',
                  belt: 'Belt',
                  reasoning: 'Because',
                  ai_prompt: 'week-plan-prompt',
                  ai_raw_response: '{"shirt":"Shirt"}',
                  cost: {
                    gpt4_cost: 0.01,
                    total_cost: 0.01,
                    input_tokens: 10,
                    output_tokens: 20,
                  },
                },
              }
            : d
        );
        return res(
          ctx.json({
            reminder_time: '07:30',
            timezone: 'UTC',
            shared_style: 'classic',
            shared_season: 'all-season',
            days: storedDays,
            wardrobe_empty: false,
            message: null,
          })
        );
      })
    );

    renderApp({ routerProps: { initialEntries: [ROUTES.WEEK] } });

    await waitFor(() => {
      expect(screen.getByTestId('week-planner')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Generate week/i }));

    await waitFor(() => {
      expect(screen.getByTestId('week-plan-admin-diagnostics')).toBeInTheDocument();
    });
    expect(screen.getByTestId('week-plan-input-prompt')).toHaveTextContent('week-plan-prompt');
    expect(screen.getByTestId('week-plan-generation-cost')).toHaveTextContent(/\$0\.01/);
  });

  it('shows empty state when there are no previous plans', async () => {
    localStorage.setItem('auth_token', 'test-token');

    server.use(
      authMe(),
      rest.get(`${API_BASE}/api/week-plan/history`, (_req, res, ctx) =>
        res(ctx.json({ items: [] }))
      )
    );

    renderApp({ routerProps: { initialEntries: [ROUTES.WEEK] } });

    await waitFor(() => {
      expect(screen.getByTestId('week-planner')).toBeInTheDocument();
    });
    expect(screen.getByTestId('week-plan-history-empty')).toHaveTextContent(
      /No previous plans yet.*Clear plan or regenerate/i
    );
  });
});
