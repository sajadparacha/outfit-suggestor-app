import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ApiService from '../../services/ApiService';
import type { User } from '../../models/AuthModels';
import { formatApiErrorMessage } from '../../utils/apiErrorMessage';

type AdminReportsProps = {
  user: User;
};

type ReportTab = 'overview' | 'utilization' | 'users' | 'searches';

const TABS: { id: ReportTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'utilization', label: 'Utilization' },
  { id: 'users', label: 'Users' },
  { id: 'searches', label: 'Searches' },
];

const CHART_AXIS = { stroke: '#94a3b8', fontSize: 12 };
const CHART_GRID = { stroke: '#334155', strokeDasharray: '3 3' };
const CHART_TOOLTIP = {
  contentStyle: {
    backgroundColor: '#1e293b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
  },
  labelStyle: { color: '#e2e8f0' },
  itemStyle: { color: '#e2e8f0' },
};
const BAR_COLORS = ['#4facfe', '#6bb8ff', '#8899ff', '#a87bff', '#c471ed'];

type ChartBarPoint = { name: string; count: number };

function formatPeriodLabel(period: string): string {
  if (!period) return '';
  const date = new Date(period);
  if (Number.isNaN(date.getTime())) return String(period);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function parseUserFilter(userFilter: string): { user_id?: number; user?: string } {
  const trimmed = userFilter.trim();
  if (!trimmed) return {};
  if (/^\d+$/.test(trimmed)) return { user_id: Number(trimmed) };
  return { user: trimmed };
}

function TabEmptyMessage() {
  return <p className="text-slate-400 text-center py-8">No data for the selected filters.</p>;
}

type ChartCardProps = {
  title: string;
  children: React.ReactNode;
  testId?: string;
};

function ChartCard({ title, children, testId }: ChartCardProps) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div data-testid={testId} className="h-64 w-full">
        {children}
      </div>
    </div>
  );
}

export default function AdminReports({ user }: AdminReportsProps) {
  const [activeTab, setActiveTab] = React.useState<ReportTab>('overview');
  const [stats, setStats] = React.useState<any>(null);
  const [usage, setUsage] = React.useState<any>(null);
  const [timeline, setTimeline] = React.useState<any>(null);
  const [searchReports, setSearchReports] = React.useState<any>(null);
  const [hasSearched, setHasSearched] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const emptyFilters = React.useMemo(
    () => ({
      start_date: '',
      end_date: '',
      user: '',
      country: '',
      city: '',
      operation_type: '',
      endpoint: '',
    }),
    []
  );

  const [draftFilters, setDraftFilters] = React.useState(emptyFilters);

  const fetchReports = React.useCallback(async (filters: typeof draftFilters) => {
    setLoading(true);
    setError(null);
    try {
      const dateParams = {
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
      };
      const userParams = parseUserFilter(filters.user);

      const [s, u, t, sr] = await Promise.all([
        ApiService.getAccessLogStats({ ...dateParams, ...userParams }),
        ApiService.getAccessLogUsage({ ...dateParams, ...userParams }),
        ApiService.getAccessLogTimeline({
          ...dateParams,
          country: filters.country || undefined,
          city: filters.city || undefined,
          group_by: 'day',
          ...userParams,
        }),
        ApiService.getSearchReports({ ...dateParams, ...userParams }),
      ]);

      setStats(s);
      setUsage(u);
      setTimeline(t);
      setSearchReports(sr);
      setHasSearched(true);
    } catch (e) {
      setError(formatApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = React.useCallback(() => {
    fetchReports(draftFilters);
  }, [draftFilters, fetchReports]);

  const handleClear = React.useCallback(() => {
    setDraftFilters(emptyFilters);
    setError(null);
    setStats(null);
    setUsage(null);
    setTimeline(null);
    setSearchReports(null);
    setHasSearched(false);
  }, [emptyFilters]);

  const timelineChartData = React.useMemo(() => {
    const points = Array.isArray(timeline?.timeline) ? timeline.timeline : [];
    return points.map((point: { period: string; count: number }) => ({
      label: formatPeriodLabel(point.period),
      count: point.count,
    }));
  }, [timeline]);

  const utilizationChartData = React.useMemo((): ChartBarPoint[] => {
    if (!usage) return [];
    return [
      { name: 'Outfit AI', count: usage?.ai_calls?.outfit_suggestions ?? 0 },
      { name: 'Wardrobe AI', count: usage?.ai_calls?.wardrobe_analysis ?? 0 },
      { name: 'Wardrobe add', count: usage?.wardrobe_operations?.add ?? 0 },
      { name: 'Wardrobe view', count: usage?.wardrobe_operations?.view ?? 0 },
      { name: 'History views', count: usage?.outfit_history?.views ?? 0 },
    ];
  }, [usage]);

  const countryChartData = React.useMemo((): ChartBarPoint[] => {
    const rows = Array.isArray(stats?.by_country) ? stats.by_country : [];
    return rows.slice(0, 10).map((row: { country: string; count: number }) => ({
      name: row.country || 'Unknown',
      count: row.count,
    }));
  }, [stats]);

  const cityChartData = React.useMemo((): ChartBarPoint[] => {
    const rows = Array.isArray(stats?.by_city) ? stats.by_city : [];
    return rows.slice(0, 10).map((row: { city: string; country?: string; count: number }) => ({
      name: row.city ? `${row.city}${row.country ? `, ${row.country}` : ''}` : 'Unknown',
      count: row.count,
    }));
  }, [stats]);

  const topUsers = React.useMemo(() => {
    return Array.isArray(usage?.top_users) ? usage.top_users : [];
  }, [usage]);

  const occasionChartData = React.useMemo(() => {
    const rows = Array.isArray(searchReports?.by_occasion) ? searchReports.by_occasion : [];
    return rows.map((row: { occasion: string; count: number }) => ({
      name: row.occasion || 'Unknown',
      count: row.count,
    }));
  }, [searchReports]);

  const seasonChartData = React.useMemo(() => {
    const rows = Array.isArray(searchReports?.by_season) ? searchReports.by_season : [];
    return rows.map((row: { season: string; count: number }) => ({
      name: row.season || 'Unknown',
      count: row.count,
    }));
  }, [searchReports]);

  const styleChartData = React.useMemo(() => {
    const rows = Array.isArray(searchReports?.by_style) ? searchReports.by_style : [];
    return rows.map((row: { style: string; count: number }) => ({
      name: row.style || 'Unknown',
      count: row.count,
    }));
  }, [searchReports]);

  const recentSearches = React.useMemo(() => {
    return Array.isArray(searchReports?.recent) ? searchReports.recent : [];
  }, [searchReports]);

  if (!user?.is_admin) {
    return (
      <div className="max-w-2xl mx-auto rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">📊 Reports</h2>
        <p className="text-slate-200">Admin privileges are required to view reports.</p>
      </div>
    );
  }

  const renderOverviewTab = () => {
    if (!hasSearched) return null;
    const hasTimeline = timelineChartData.length > 0;
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6">
            <p className="text-sm text-slate-400">Total requests</p>
            <p className="text-3xl font-bold text-white">{stats?.total_requests ?? '—'}</p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6">
            <p className="text-sm text-slate-400">Unique IPs</p>
            <p className="text-3xl font-bold text-white">{stats?.unique_ip_addresses ?? '—'}</p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6">
            <p className="text-sm text-slate-400">Avg response (ms)</p>
            <p className="text-3xl font-bold text-white">{stats?.average_response_time_ms ?? '—'}</p>
          </div>
        </div>
        <ChartCard title="Request timeline" testId="overview-timeline-chart">
          {hasTimeline ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineChartData}>
                <CartesianGrid {...CHART_GRID} />
                <XAxis dataKey="label" {...CHART_AXIS} />
                <YAxis {...CHART_AXIS} allowDecimals={false} />
                <Tooltip {...CHART_TOOLTIP} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#4facfe"
                  strokeWidth={2}
                  dot={{ fill: '#c471ed', r: 4 }}
                  activeDot={{ r: 6, fill: '#c471ed' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <TabEmptyMessage />
          )}
        </ChartCard>
      </div>
    );
  };

  const renderUtilizationTab = () => {
    if (!hasSearched) return null;
    const hasChartData = utilizationChartData.some((row) => row.count > 0);
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Utilization</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6">
            <p className="text-sm text-slate-400">AI calls (total)</p>
            <p className="text-2xl font-bold text-white">{usage?.ai_calls?.total ?? '—'}</p>
            <p className="text-sm text-slate-300 mt-1">
              Outfit: {usage?.ai_calls?.outfit_suggestions ?? '—'} • Wardrobe:{' '}
              {usage?.ai_calls?.wardrobe_analysis ?? '—'}
            </p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6">
            <p className="text-sm text-slate-400">Wardrobe ops (total)</p>
            <p className="text-2xl font-bold text-white">{usage?.wardrobe_operations?.total ?? '—'}</p>
            <p className="text-sm text-slate-300 mt-1">
              Add: {usage?.wardrobe_operations?.add ?? '—'} • View:{' '}
              {usage?.wardrobe_operations?.view ?? '—'}
            </p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6">
            <p className="text-sm text-slate-400">History views</p>
            <p className="text-2xl font-bold text-white">{usage?.outfit_history?.views ?? '—'}</p>
            <p className="text-sm text-slate-300 mt-1">
              Unique users: {usage?.outfit_history?.unique_users ?? '—'}
            </p>
          </div>
        </div>
        <ChartCard title="Usage breakdown" testId="utilization-bar-chart">
          {hasChartData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={utilizationChartData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid {...CHART_GRID} />
                <XAxis type="number" {...CHART_AXIS} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={110} {...CHART_AXIS} />
                <Tooltip {...CHART_TOOLTIP} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {utilizationChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <TabEmptyMessage />
          )}
        </ChartCard>
      </div>
    );
  };

  const renderUsersTab = () => {
    if (!hasSearched) return null;
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Users</h2>
        <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top users</h3>
          {topUsers.length > 0 ? (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr className="text-left">
                    <th className="py-2 pr-4 text-slate-300">User</th>
                    <th className="py-2 pr-4 text-slate-300">Total ops</th>
                    <th className="py-2 pr-4 text-slate-300">AI outfit</th>
                    <th className="py-2 pr-4 text-slate-300">AI wardrobe</th>
                    <th className="py-2 pr-4 text-slate-300">History views</th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.map((row: any) => (
                    <tr key={row.user_id} className="border-b border-white/5 last:border-b-0">
                      <td className="py-2 pr-4 text-slate-200">{row.user_email || row.user_id}</td>
                      <td className="py-2 pr-4 text-slate-200">{row.total_operations ?? '—'}</td>
                      <td className="py-2 pr-4 text-slate-200">{row.ai_outfit_suggestions ?? '—'}</td>
                      <td className="py-2 pr-4 text-slate-200">{row.ai_wardrobe_analysis ?? '—'}</td>
                      <td className="py-2 pr-4 text-slate-200">{row.outfit_history_views ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <TabEmptyMessage />
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Requests by country" testId="users-country-chart">
            {countryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countryChartData}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="name" {...CHART_AXIS} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis {...CHART_AXIS} allowDecimals={false} />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {countryChartData.map((_, index) => (
                      <Cell key={`country-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <TabEmptyMessage />
            )}
          </ChartCard>
          <ChartCard title="Requests by city" testId="users-city-chart">
            {cityChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cityChartData}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="name" {...CHART_AXIS} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis {...CHART_AXIS} allowDecimals={false} />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {cityChartData.map((_, index) => (
                      <Cell key={`city-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <TabEmptyMessage />
            )}
          </ChartCard>
        </div>
      </div>
    );
  };

  const renderSearchesTab = () => {
    if (!hasSearched) return null;
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Searches</h2>
        <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6">
          <p className="text-sm text-slate-400">Total searches</p>
          <p className="text-3xl font-bold text-white">{searchReports?.total_searches ?? '—'}</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartCard title="By occasion" testId="searches-occasion-chart">
            {occasionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occasionChartData}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="name" {...CHART_AXIS} />
                  <YAxis {...CHART_AXIS} allowDecimals={false} />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Bar dataKey="count" fill="#4facfe" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <TabEmptyMessage />
            )}
          </ChartCard>
          <ChartCard title="By season" testId="searches-season-chart">
            {seasonChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seasonChartData}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="name" {...CHART_AXIS} />
                  <YAxis {...CHART_AXIS} allowDecimals={false} />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Bar dataKey="count" fill="#8899ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <TabEmptyMessage />
            )}
          </ChartCard>
          <ChartCard title="By style" testId="searches-style-chart">
            {styleChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={styleChartData}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="name" {...CHART_AXIS} />
                  <YAxis {...CHART_AXIS} allowDecimals={false} />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Bar dataKey="count" fill="#c471ed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <TabEmptyMessage />
            )}
          </ChartCard>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent searches</h3>
          {recentSearches.length > 0 ? (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr className="text-left">
                    <th className="py-2 pr-4 text-slate-300">Time</th>
                    <th className="py-2 pr-4 text-slate-300">User</th>
                    <th className="py-2 pr-4 text-slate-300">Occasion</th>
                    <th className="py-2 pr-4 text-slate-300">Season</th>
                    <th className="py-2 pr-4 text-slate-300">Style</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSearches.map((row: any) => (
                    <tr key={row.id} className="border-b border-white/5 last:border-b-0">
                      <td className="py-2 pr-4 whitespace-nowrap text-slate-200">
                        {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-2 pr-4 text-slate-200">{row.user_email || row.user_id || '—'}</td>
                      <td className="py-2 pr-4 text-slate-200">{row.occasion || '—'}</td>
                      <td className="py-2 pr-4 text-slate-200">{row.season || '—'}</td>
                      <td className="py-2 pr-4 text-slate-200">{row.style || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <TabEmptyMessage />
          )}
        </div>
      </div>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'utilization':
        return renderUtilizationTab();
      case 'users':
        return renderUsersTab();
      case 'searches':
        return renderSearchesTab();
      default:
        return null;
    }
  };

  return (
    <div className="py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">📊 Admin Reports</h1>
              <p className="text-slate-300">Access logs and usage analytics (admin-only)</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 mb-6 flex items-center justify-between">
            <span className="text-red-200">{error}</span>
            <button onClick={() => setError(null)} className="text-red-300 hover:text-red-100">
              ✕
            </button>
          </div>
        )}

        <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <h2 className="text-xl font-semibold text-white">Filters</h2>
            <p className="text-sm text-slate-400">Edit filters, then press “Search” to fetch.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <input
              className="px-4 py-3 border border-white/20 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
              type="date"
              value={draftFilters.start_date}
              onChange={(e) => setDraftFilters((p) => ({ ...p, start_date: e.target.value }))}
            />
            <input
              className="px-4 py-3 border border-white/20 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
              type="date"
              value={draftFilters.end_date}
              onChange={(e) => setDraftFilters((p) => ({ ...p, end_date: e.target.value }))}
            />
            <input
              className="px-4 py-3 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
              placeholder="User name/email contains"
              value={draftFilters.user}
              onChange={(e) => setDraftFilters((p) => ({ ...p, user: e.target.value }))}
            />
            <input
              className="px-4 py-3 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
              placeholder="Country"
              value={draftFilters.country}
              onChange={(e) => setDraftFilters((p) => ({ ...p, country: e.target.value }))}
            />
            <input
              className="px-4 py-3 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
              placeholder="City"
              value={draftFilters.city}
              onChange={(e) => setDraftFilters((p) => ({ ...p, city: e.target.value }))}
            />
            <input
              className="px-4 py-3 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
              placeholder="Operation type"
              value={draftFilters.operation_type}
              onChange={(e) => setDraftFilters((p) => ({ ...p, operation_type: e.target.value }))}
            />
            <input
              className="px-4 py-3 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
              placeholder="Endpoint contains"
              value={draftFilters.endpoint}
              onChange={(e) => setDraftFilters((p) => ({ ...p, endpoint: e.target.value }))}
            />
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
              className="px-5 py-2.5 bg-white/10 text-slate-200 rounded-xl font-medium hover:bg-white/20 border border-white/15 disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="px-5 py-2.5 btn-brand rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl font-medium transition-colors border ${
                activeTab === tab.id
                  ? 'btn-brand border-transparent text-white'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {!loading && !error && !hasSearched && (
          <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6 mb-6">
            <p className="text-slate-200">
              Ready when you are. Set your filters above, then click <b className="text-white">Search</b> to load
              reports.
            </p>
          </div>
        )}

        {loading && (
          <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6 mb-6 text-center">
            <p className="text-slate-200">Searching…</p>
          </div>
        )}

        {!loading && renderActiveTab()}
      </div>
    </div>
  );
}
