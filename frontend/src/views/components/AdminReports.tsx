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
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">📊 Reports</h2>
        <p className="text-gray-600">Admin privileges are required to view reports.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-1">📊 Admin Reports</h1>
              <p className="text-gray-600">Access logs and usage analytics (admin-only)</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <span className="text-red-800">{error}</span>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              ✕
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Filters</h2>
            <p className="text-sm text-gray-500">Edit filters, then press “Search” to fetch.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <input
              className="px-4 py-3 border border-gray-300 rounded-lg"
              type="date"
              value={draftFilters.start_date}
              onChange={(e) => setDraftFilters((p) => ({ ...p, start_date: e.target.value }))}
            />
            <input
              className="px-4 py-3 border border-gray-300 rounded-lg"
              type="date"
              value={draftFilters.end_date}
              onChange={(e) => setDraftFilters((p) => ({ ...p, end_date: e.target.value }))}
            />
            <input
              className="px-4 py-3 border border-gray-300 rounded-lg"
              placeholder="User name/email contains"
              value={draftFilters.user}
              onChange={(e) => setDraftFilters((p) => ({ ...p, user: e.target.value }))}
            />
            <input
              className="px-4 py-3 border border-gray-300 rounded-lg"
              placeholder="Country"
              value={draftFilters.country}
              onChange={(e) => setDraftFilters((p) => ({ ...p, country: e.target.value }))}
            />
            <input
              className="px-4 py-3 border border-gray-300 rounded-lg"
              placeholder="Operation type"
              value={draftFilters.operation_type}
              onChange={(e) => setDraftFilters((p) => ({ ...p, operation_type: e.target.value }))}
            />
            <input
              className="px-4 py-3 border border-gray-300 rounded-lg"
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
              className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </div>

        {!loading && !error && stats === null && usage === null && logs.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <p className="text-gray-700">
              Ready when you are. Set your filters above, then click <b>Search</b> to load reports.
            </p>
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <p className="text-sm text-gray-500">Total requests</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.total_requests ?? '—'}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <p className="text-sm text-gray-500">Unique IPs</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.unique_ip_addresses ?? '—'}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <p className="text-sm text-gray-500">Avg response (ms)</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.average_response_time_ms ?? '—'}</p>
          </div>
        </div>

        {/* Usage quick view */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Usage overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm text-gray-500">AI calls (total)</p>
              <p className="text-2xl font-bold text-gray-900">{usage?.ai_calls?.total ?? '—'}</p>
              <p className="text-sm text-gray-600 mt-1">Outfit: {usage?.ai_calls?.outfit_suggestions ?? '—'} • Wardrobe: {usage?.ai_calls?.wardrobe_analysis ?? '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm text-gray-500">Wardrobe ops (total)</p>
              <p className="text-2xl font-bold text-gray-900">{usage?.wardrobe_operations?.total ?? '—'}</p>
              <p className="text-sm text-gray-600 mt-1">Add: {usage?.wardrobe_operations?.add ?? '—'} • View: {usage?.wardrobe_operations?.view ?? '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm text-gray-500">History views</p>
              <p className="text-2xl font-bold text-gray-900">{usage?.outfit_history?.views ?? '—'}</p>
              <p className="text-sm text-gray-600 mt-1">Unique users: {usage?.outfit_history?.unique_users ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* Logs table */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Recent access logs</h2>
            <p className="text-sm text-gray-600">
              Showing {filteredLogs.length} (filtered) of {logs.length} loaded • Total matching server query: {total}
            </p>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div className="flex-1">
              <input
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                placeholder="Filter table rows (user, endpoint, op, status, country, city…)"
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setTableFilter('')}
              disabled={!tableFilter}
              className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50"
            >
              Clear table filter
            </button>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Op</th>
                  <th className="py-2 pr-4">Endpoint</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">ms</th>
                  <th className="py-2 pr-4">Country</th>
                  <th className="py-2 pr-4">City</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-4 whitespace-nowrap">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{log.user_email || log.user_id || '-'}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{log.operation_type || '-'}</td>
                    <td className="py-2 pr-4">{log.method} {log.endpoint}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{log.status_code}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{log.response_time_ms ?? '-'}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{log.country || '-'}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{log.city || '-'}</td>
                  </tr>
                ))}
                {!loading && filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-gray-500">
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

