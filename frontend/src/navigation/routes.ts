export type AppView =
  | 'main'
  | 'history'
  | 'wardrobe'
  | 'insights'
  | 'reports'
  | 'integration-tests'
  | 'about'
  | 'guide'
  | 'settings';

export const ROUTES = {
  MAIN: '/',
  WARDROBE: '/wardrobe',
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

export const LOGIN_REDIRECT_STATE = 'showLogin' as const;
