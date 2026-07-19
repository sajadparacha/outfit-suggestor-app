import React from 'react';
import { NavLink as RouterNavLink, useLocation, useNavigate, type NavLinkRenderProps } from 'react-router-dom';
import { AppView, ROUTES, pathToView, viewToPath } from '../../navigation/routes';

interface NavBarProps {
  isAuthenticated: boolean;
  user?: { full_name?: string | null; email?: string; is_admin?: boolean } | null;
  testRunnerEnabled?: boolean;
  hideGuestAuthActions?: boolean;
  onLogin: () => void;
  onSignUp: () => void;
  onLogout: () => void;
}

const SparkleIcon = () => (
  <svg className="h-5 w-5 text-brand-blue" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2zm7 11l1 3.5L23.5 18l-3.5 1L19 22.5l-1-3.5L14.5 18l3.5-1L19 13zM5 13l.75 2.25L8 16l-2.25.75L5 19l-.75-2.25L2 16l2.25-.75L5 13z" />
  </svg>
);

interface NavTabLinkProps {
  to: string;
  label: string;
  end?: boolean;
}

const NavTabLink: React.FC<NavTabLinkProps> = ({ to, label, end }) => (
  <RouterNavLink
    to={to}
    end={end}
    className={({ isActive }: NavLinkRenderProps) =>
      `relative min-h-[44px] touch-manipulation px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
        isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
      }`
    }
  >
    {({ isActive }: NavLinkRenderProps) => (
      <>
        {label}
        {isActive && (
          <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-brand-gradient" aria-hidden />
        )}
      </>
    )}
  </RouterNavLink>
);

const NavBar: React.FC<NavBarProps> = ({
  isAuthenticated,
  user,
  testRunnerEnabled = false,
  hideGuestAuthActions = false,
  onLogin,
  onSignUp,
  onLogout,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentView = pathToView(location.pathname);
  const initial = (user?.full_name || user?.email || 'U').charAt(0).toUpperCase();

  const mainLinks: { view: AppView; label: string }[] = [
    { view: 'main', label: 'Suggest' },
    { view: 'wardrobe', label: 'Wardrobe' },
    { view: 'week', label: 'Week' },
    { view: 'history', label: 'History' },
    { view: 'insights', label: 'Insights' },
    { view: 'guide', label: 'Guide' },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-brand-navy/90 backdrop-blur-xl">
      <div className="container mx-auto grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 px-3 py-2 sm:px-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-x-3 md:py-0 md:min-h-[56px]">
        {/* Logo */}
        <button
          type="button"
          onClick={() => navigate(ROUTES.MAIN)}
          className="col-start-1 row-start-1 flex flex-shrink-0 items-center gap-2 touch-manipulation"
          aria-label="Outfit Suggestor home"
        >
          <SparkleIcon />
          <span className="text-sm font-semibold text-white sm:text-base">Outfit Suggestor</span>
        </button>

        {/* Nav — second row on mobile, centered on desktop */}
        <nav
          className="col-span-2 row-start-2 flex min-w-0 items-center gap-0.5 overflow-x-auto border-t border-white/5 pb-1 pt-2 scrollbar-none md:col-span-1 md:col-start-2 md:row-start-1 md:justify-center md:border-t-0 md:pb-0 md:pt-0 md:gap-1"
          aria-label="Main navigation"
        >
          {mainLinks.map(({ view, label }) => (
            <NavTabLink
              key={view}
              to={viewToPath(view)}
              label={label}
              end={view === 'main'}
            />
          ))}
        </nav>

        {/* Right: auth */}
        <div className="col-start-2 row-start-1 flex flex-shrink-0 items-center gap-1.5 sm:gap-2 md:col-start-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {user?.is_admin && (
                  <div className="hidden lg:flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => navigate(ROUTES.ADMIN_REPORTS)}
                      className={`rounded-lg px-2 py-1 text-xs transition ${
                        currentView === 'reports' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Reports
                    </button>
                    {testRunnerEnabled && (
                      <button
                        type="button"
                        onClick={() => navigate(ROUTES.ADMIN_INTEGRATION_TESTS)}
                        className={`rounded-lg px-2 py-1 text-xs transition ${
                          currentView === 'integration-tests' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Tests
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(ROUTES.SETTINGS)}
                      className={`rounded-lg px-2 py-1 text-xs transition ${
                        currentView === 'settings' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Settings
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.SETTINGS)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white shadow-brand touch-manipulation"
                  aria-label="User profile and settings"
                  title={user?.full_name || user?.email || 'User'}
                >
                  {initial}
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="hidden sm:inline-flex min-h-[36px] items-center rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 touch-manipulation"
                >
                  Logout
                </button>
              </div>
            ) : !hideGuestAuthActions ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onSignUp}
                  className="min-h-[36px] rounded-full border border-brand-blue/40 px-3 py-1.5 text-xs font-medium text-brand-blue transition hover:bg-brand-blue/10 touch-manipulation sm:text-sm"
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={onLogin}
                  className="btn-brand min-h-[36px] rounded-full px-3 py-1.5 text-xs font-medium touch-manipulation sm:text-sm"
                >
                  Login
                </button>
              </div>
            ) : null}
          </div>
      </div>
    </header>
  );
};

export default NavBar;
