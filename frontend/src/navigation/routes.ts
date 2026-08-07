export type AppView =
  | 'main'
  | 'history'
  | 'wardrobe'
  | 'week'
  | 'insights'
  | 'reports'
  | 'integration-tests'
  | 'about'
  | 'guide'
  | 'settings';

export const ROUTES = {
  MAIN: '/',
  WARDROBE: '/wardrobe',
  WEEK: '/week',
  HISTORY: '/history',
  INSIGHTS: '/insights',
  GUIDE: '/guide',
  ABOUT: '/about',
  SETTINGS: '/settings',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_INTEGRATION_TESTS: '/admin/integration-tests',
} as const;

const VIEW_PATH_MAP: Record<AppView, string> = {
  main: ROUTES.MAIN,
  wardrobe: ROUTES.WARDROBE,
  week: ROUTES.WEEK,
  history: ROUTES.HISTORY,
  insights: ROUTES.INSIGHTS,
  guide: ROUTES.GUIDE,
  about: ROUTES.ABOUT,
  settings: ROUTES.SETTINGS,
  reports: ROUTES.ADMIN_REPORTS,
  'integration-tests': ROUTES.ADMIN_INTEGRATION_TESTS,
};

const PATH_VIEW_ENTRIES: [string, AppView][] = [
  [ROUTES.MAIN, 'main'],
  [ROUTES.WARDROBE, 'wardrobe'],
  [ROUTES.WEEK, 'week'],
  [ROUTES.HISTORY, 'history'],
  [ROUTES.INSIGHTS, 'insights'],
  [ROUTES.GUIDE, 'guide'],
  [ROUTES.ABOUT, 'about'],
  [ROUTES.SETTINGS, 'settings'],
  [ROUTES.ADMIN_REPORTS, 'reports'],
  [ROUTES.ADMIN_INTEGRATION_TESTS, 'integration-tests'],
];

export function viewToPath(view: AppView): string {
  return VIEW_PATH_MAP[view];
}

export function pathToView(pathname: string): AppView | null {
  const normalized = pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;

  for (const [path, view] of PATH_VIEW_ENTRIES) {
    if (normalized === path) {
      return view;
    }
  }
  return null;
}

export function wardrobePath(category?: string | null): string {
  if (!category) {
    return ROUTES.WARDROBE;
  }
  const params = new URLSearchParams({ category });
  return `${ROUTES.WARDROBE}?${params.toString()}`;
}

/** Week Planner → Wardrobe pick session (day + slot). */
export function wardrobePickPath(opts: {
  dayOfWeek: number;
  slotKey: string;
  category?: string | null;
}): string {
  const params = new URLSearchParams();
  const category = opts.category ?? opts.slotKey;
  if (category) params.set('category', category);
  params.set('pickDay', String(opts.dayOfWeek));
  params.set('pickSlot', opts.slotKey);
  return `${ROUTES.WARDROBE}?${params.toString()}`;
}

export function weekPath(dayOfWeek?: number | null): string {
  if (dayOfWeek == null || !Number.isInteger(dayOfWeek)) {
    return ROUTES.WEEK;
  }
  return `${ROUTES.WEEK}?day=${dayOfWeek}`;
}

export type WardrobePickSession = {
  dayOfWeek: number;
  slotKey: string;
  category: string | null;
};

export function parseWardrobePickSession(
  searchParams: URLSearchParams
): WardrobePickSession | null {
  const pickDay = searchParams.get('pickDay');
  const pickSlot = searchParams.get('pickSlot');
  if (pickDay == null || !pickSlot) return null;
  const dayOfWeek = Number(pickDay);
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) return null;
  return {
    dayOfWeek,
    slotKey: pickSlot,
    category: searchParams.get('category'),
  };
}

export const LOGIN_REDIRECT_STATE = 'showLogin' as const;
