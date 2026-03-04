import React from 'react';
import ApiService from '../../services/ApiService';
import type { User } from '../../models/AuthModels';

type AdminReportsProps = {
  user: User;
};

export default function AdminReports({ user }: AdminReportsProps) {
  const [stats, setStats] = React.useState<any>(null);
  const [usage, setUsage] = React.useState<any>(null);
  const [logs, setLogs] = React.useState<any[]>([]);
  const [total, setTotal] = React.useState<number>(0);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [tableFilter, setTableFilter] = React.useState<string>('');

  const emptyFilters = React.useMemo(
    () => ({
      start_date: '',
      end_date: '',
      user: '',
      country: '',
      operation_type: '',
      endpoint: '',
    }),
    []
  );

  // Draft filters: user can type freely without triggering network calls
  const [draftFilters, setDraftFilters] = React.useState(emptyFilters);

  const fetchReports = React.useCallback(async (filters: typeof draftFilters) => {
    setLoading(true);
    setError(null);
    try {
      const [s, u, l] = await Promise.all([
        ApiService.getAccessLogStats({
          start_date: filters.start_date || undefined,
          end_date: filters.end_date || undefined,
        }),
        ApiService.getAccessLogUsage({
          start_date: filters.start_date || undefined,
          end_date: filters.end_date || undefined,
        }),
        ApiService.getAccessLogs({
          start_date: filters.start_date || undefined,
          end_date: filters.end_date || undefined,
          user: filters.user || undefined,
          country: filters.country || undefined,
          operation_type: filters.operation_type || undefined,
          endpoint: filters.endpoint || undefined,
          limit: 100,
          offset: 0,
        }),
      ]);

      setStats(s);
      setUsage(u);
      setTotal(typeof l?.total === 'number' ? l.total : 0);
      setLogs(Array.isArray(l?.logs) ? l.logs : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load reports';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = React.useCallback(() => {
    fetchReports(draftFilters);
  }, [draftFilters, fetchReports]);

  const filteredLogs = React.useMemo(() => {
    const q = tableFilter.trim().toLowerCase();
    if (!q) return logs;

    return logs.filter((log) => {
      const haystack = [
        log?.user_email,
        log?.user_name,
        log?.user_id,
        log?.ip_address,
        log?.operation_type,
        log?.method,
        log?.endpoint,
        log?.status_code,
        log?.response_time_ms,
        log?.country,
        log?.city,
      ]
        .filter((v) => v !== undefined && v !== null)
        .map((v) => String(v).toLowerCase())
        .join(' | ');

      return haystack.includes(q);
    });
  }, [logs, tableFilter]);

  if (!user?.is_admin) {
    return (
      <div className="max-w-2xl mx-auto rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">📊 Reports</h2>
        <p className="text-slate-200">Admin privileges are required to view reports.</p>
      </div>
    );
  }

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

        {/* Filters */}
        <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <h2 className="text-xl font-semibold text-white">Filters</h2>
            <p className="text-sm text-slate-400">Edit filters, then press “Search” to fetch.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <input
              className="px-4 py-3 border border-white/20 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              type="date"
              value={draftFilters.start_date}
              onChange={(e) => setDraftFilters((p) => ({ ...p, start_date: e.target.value }))}
            />
            <input
              className="px-4 py-3 border border-white/20 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              type="date"
              value={draftFilters.end_date}
              onChange={(e) => setDraftFilters((p) => ({ ...p, end_date: e.target.value }))}
            />
            <input
              className="px-4 py-3 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="User name/email contains"
              value={draftFilters.user}
              onChange={(e) => setDraftFilters((p) => ({ ...p, user: e.target.value }))}
            />
            <input
              className="px-4 py-3 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="Country"
              value={draftFilters.country}
              onChange={(e) => setDraftFilters((p) => ({ ...p, country: e.target.value }))}
            />
            <input
              className="px-4 py-3 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="Operation type"
              value={draftFilters.operation_type}
              onChange={(e) => setDraftFilters((p) => ({ ...p, operation_type: e.target.value }))}
            />
            <input
              className="px-4 py-3 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="Endpoint contains"
              value={draftFilters.endpoint}
              onChange={(e) => setDraftFilters((p) => ({ ...p, endpoint: e.target.value }))}
            />
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setDraftFilters(emptyFilters);
                setError(null);
                setStats(null);
                setUsage(null);
                setLogs([]);
                setTotal(0);
                setTableFilter('');
              }}
              disabled={loading}
              className="px-5 py-2.5 bg-white/10 text-slate-200 rounded-xl font-medium hover:bg-white/20 border border-white/15 disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="px-5 py-2.5 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </div>

        {!loading && !error && stats === null && usage === null && logs.length === 0 && (
          <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6 mb-6">
            <p className="text-slate-200">
              Ready when you are. Set your filters above, then click <b className="text-white">Search</b> to load reports.
            </p>
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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

        {/* Usage quick view */}
        <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Usage overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-sm text-slate-400">AI calls (total)</p>
              <p className="text-2xl font-bold text-white">{usage?.ai_calls?.total ?? '—'}</p>
              <p className="text-sm text-slate-300 mt-1">Outfit: {usage?.ai_calls?.outfit_suggestions ?? '—'} • Wardrobe: {usage?.ai_calls?.wardrobe_analysis ?? '—'}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-sm text-slate-400">Wardrobe ops (total)</p>
              <p className="text-2xl font-bold text-white">{usage?.wardrobe_operations?.total ?? '—'}</p>
              <p className="text-sm text-slate-300 mt-1">Add: {usage?.wardrobe_operations?.add ?? '—'} • View: {usage?.wardrobe_operations?.view ?? '—'}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-sm text-slate-400">History views</p>
              <p className="text-2xl font-bold text-white">{usage?.outfit_history?.views ?? '—'}</p>
              <p className="text-sm text-slate-300 mt-1">Unique users: {usage?.outfit_history?.unique_users ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* Logs table */}
        <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Recent access logs</h2>
            <p className="text-sm text-slate-300">
              Showing {filteredLogs.length} (filtered) of {logs.length} loaded • Total matching server query: {total}
            </p>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div className="flex-1">
              <input
                className="w-full px-4 py-2.5 border border-white/20 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Filter table rows (user, endpoint, op, status, country, city…)"
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setTableFilter('')}
              disabled={!tableFilter}
              className="px-4 py-2.5 bg-white/10 text-slate-200 rounded-xl font-medium hover:bg-white/20 border border-white/15 disabled:opacity-50"
            >
              Clear table filter
            </button>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-white/10">
                <tr className="text-left">
                  <th className="py-2 pr-4 text-slate-300">Time</th>
                  <th className="py-2 pr-4 text-slate-300">User</th>
                  <th className="py-2 pr-4 text-slate-300">Op</th>
                  <th className="py-2 pr-4 text-slate-300">Endpoint</th>
                  <th className="py-2 pr-4 text-slate-300">Status</th>
                  <th className="py-2 pr-4 text-slate-300">ms</th>
                  <th className="py-2 pr-4 text-slate-300">Country</th>
                  <th className="py-2 pr-4 text-slate-300">City</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-white/5 last:border-b-0">
                    <td className="py-2 pr-4 whitespace-nowrap text-slate-200">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</td>
                    <td className="py-2 pr-4 whitespace-nowrap text-slate-200">{log.user_email || log.user_id || '-'}</td>
                    <td className="py-2 pr-4 whitespace-nowrap text-slate-200">{log.operation_type || '-'}</td>
                    <td className="py-2 pr-4 text-slate-200">{log.method} {log.endpoint}</td>
                    <td className="py-2 pr-4 whitespace-nowrap text-slate-200">{log.status_code}</td>
                    <td className="py-2 pr-4 whitespace-nowrap text-slate-200">{log.response_time_ms ?? '-'}</td>
                    <td className="py-2 pr-4 whitespace-nowrap text-slate-200">{log.country || '-'}</td>
                    <td className="py-2 pr-4 whitespace-nowrap text-slate-200">{log.city || '-'}</td>
                  </tr>
                ))}
                {!loading && filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      No logs match the current table filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

