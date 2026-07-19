/**
 * Week Outfit Planner — guest gate + generate flow integration
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
      rest.get(`${API_BASE}/api/auth/me`, (_req, res, ctx) =>
        res(
          ctx.json({
            id: 1,
            email: 'tester@example.com',
            full_name: 'Test User',
            is_admin: false,
          })
        )
      ),
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
    fireEvent.change(within(monday).getByLabelText(/Monday occasion/i), {
      target: { value: 'work' },
    });

    const wardrobeToggle = within(monday).getByLabelText(/Monday use wardrobe/i);
    expect(wardrobeToggle).toBeChecked();
    fireEvent.click(wardrobeToggle);
    expect(wardrobeToggle).not.toBeChecked();

    const tuesday = screen.getByTestId('week-day-1');
    fireEvent.click(within(tuesday).getByLabelText(/Enable Tuesday/i));
    fireEvent.change(within(tuesday).getByLabelText(/Tuesday occasion/i), {
      target: { value: 'date-night' },
    });

    const generateBtn = screen.getByRole('button', { name: /Generate week/i });
    await waitFor(() => expect(generateBtn).not.toBeDisabled());
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByTestId('week-day-summary-0')).toHaveTextContent(
        /work look for day 0/i
      );
      expect(screen.getByTestId('week-day-summary-1')).toHaveTextContent(
        /date-night look for day 1/i
      );
    });

    expect(putCapture.body?.days?.[0]?.use_wardrobe_only).toBe(false);
    expect(putCapture.body?.days?.[1]?.use_wardrobe_only).toBe(true);

    const mondayDetails = screen.getByTestId('week-day-summary-0-details');
    expect(mondayDetails).not.toHaveAttribute('open');

    fireEvent.click(screen.getByTestId('week-day-summary-0'));
    // jsdom may not toggle <details>; ensure expanded content is reachable
    if (!mondayDetails.hasAttribute('open')) {
      mondayDetails.setAttribute('open', '');
    }

    await waitFor(() => {
      const expanded = screen.getByTestId('week-day-summary-0-expanded');
      expect(expanded).toBeInTheDocument();
      expect(within(expanded).getByText(/White oxford shirt/i)).toBeInTheDocument();
      expect(within(expanded).getByRole('heading', { name: /Why this works/i })).toBeInTheDocument();
      expect(within(expanded).getAllByText(/AI Suggested/i).length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(screen.getByTestId('week-today-summary')).toHaveTextContent(
        /work look for day 0/i
      );
    });
  });

  it('asks to confirm before clearing the plan', async () => {
    localStorage.setItem('auth_token', 'test-token');
    let deleted = false;
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

    server.use(
      rest.get(`${API_BASE}/api/auth/me`, (_req, res, ctx) =>
        res(
          ctx.json({
            id: 1,
            email: 'tester@example.com',
            full_name: 'Test User',
            is_admin: false,
          })
        )
      ),
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
    });

    fireEvent.click(screen.getByTestId('week-clear-plan'));
    expect(confirmSpy).toHaveBeenCalled();
    expect(deleted).toBe(false);

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByTestId('week-clear-plan'));
    await waitFor(() => expect(deleted).toBe(true));

    confirmSpy.mockRestore();
  });
});
