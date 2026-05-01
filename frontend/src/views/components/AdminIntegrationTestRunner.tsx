import React from 'react';
import ApiService from '../../services/ApiService';
import type { User } from '../../models/AuthModels';

type AdminIntegrationTestRunnerProps = {
  user: User;
};

type IntegrationTestCase = {
  id: string;
  name: string;
  description: string;
  layer: 'frontend' | 'backend';
  path: string;
};

type IntegrationTestRunResult = {
  test_id: string;
  name: string;
  description: string;
  layer: 'frontend' | 'backend';
  path: string;
  started_at: string;
  duration_ms: number;
  status: 'passed' | 'failed';
  timed_out: boolean;
  exit_code: number;
  command: string;
  passed: number;
  failed: number;
  skipped: number;
  suite_failure_cause?: string | null;
  test_cases: Array<{
    name: string;
    status: 'passed' | 'failed' | 'skipped' | 'error';
    failure_cause?: string | null;
  }>;
  output_excerpt: string;
};

export default function AdminIntegrationTestRunner({ user }: AdminIntegrationTestRunnerProps) {
  const [tests, setTests] = React.useState<IntegrationTestCase[]>([]);
  const [results, setResults] = React.useState<IntegrationTestRunResult[]>([]);
  const [loadingTests, setLoadingTests] = React.useState(false);
  const [runningTestId, setRunningTestId] = React.useState<string | null>(null);
  const [runningAll, setRunningAll] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadTests = React.useCallback(async () => {
    setLoadingTests(true);
    setError(null);
    try {
      const data = await ApiService.listIntegrationTests();
      setTests(Array.isArray(data?.tests) ? data.tests : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integration tests');
    } finally {
      setLoadingTests(false);
    }
  }, []);

  React.useEffect(() => {
    if (user?.is_admin) {
      loadTests();
    }
  }, [user?.is_admin, loadTests]);

  const handleRunTest = React.useCallback(async (testId: string) => {
    setRunningTestId(testId);
    setError(null);
    setResults([]);
    try {
      const result = await ApiService.runIntegrationTest(testId);
      setResults([result]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run test');
    } finally {
      setRunningTestId(null);
    }
  }, []);

  const handleRunAllTests = React.useCallback(async () => {
    setRunningAll(true);
    setError(null);
    setResults([]);
    try {
      const payload = await ApiService.runAllIntegrationTests();
      setResults(Array.isArray(payload?.runs) ? payload.runs : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run all tests');
    } finally {
      setRunningAll(false);
    }
  }, []);

  const flattenedCases = React.useMemo(
    () =>
      results.flatMap((suite) =>
        (suite.test_cases || []).map((testCase) => ({
          suiteName: suite.name,
          suiteDescription: suite.description,
          name: testCase.name,
          status: testCase.status,
          failureCause: testCase.failure_cause || '',
          suiteOutputExcerpt: suite.output_excerpt || '',
        }))
      ),
    [results]
  );

  if (!user?.is_admin) {
    return (
      <div className="max-w-2xl mx-auto rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Integration Test Runner</h2>
        <p className="text-slate-200">Admin privileges are required to run integration tests.</p>
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Integration Test Runner</h1>
              <p className="text-slate-300">Run individual integration suites and inspect results.</p>
            </div>
            <button
              type="button"
              onClick={loadTests}
              disabled={loadingTests || !!runningTestId || runningAll}
              className="px-4 py-2.5 bg-white/10 text-slate-200 rounded-xl font-medium hover:bg-white/20 border border-white/15 disabled:opacity-50"
            >
              {loadingTests ? 'Refreshing...' : 'Refresh Tests'}
            </button>
            <button
              type="button"
              onClick={handleRunAllTests}
              disabled={loadingTests || !!runningTestId || runningAll || tests.length === 0}
              className="px-4 py-2.5 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 disabled:opacity-50"
            >
              {runningAll ? 'Running All...' : 'Run All Tests'}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/20 p-4 text-red-200">
            {error}
          </div>
        )}

        <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Available Integration Tests</h2>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-white/10">
                <tr className="text-left">
                  <th className="py-2 pr-4 text-slate-300">Suite</th>
                  <th className="py-2 pr-4 text-slate-300">Description</th>
                  <th className="py-2 pr-4 text-slate-300">Layer</th>
                  <th className="py-2 pr-4 text-slate-300">Path</th>
                  <th className="py-2 pr-4 text-slate-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((testCase) => (
                  <tr key={testCase.id} className="border-b border-white/5 last:border-b-0">
                    <td className="py-2 pr-4 text-slate-100">{testCase.name}</td>
                    <td className="py-2 pr-4 text-slate-300">{testCase.description}</td>
                    <td className="py-2 pr-4 text-slate-200 capitalize">{testCase.layer}</td>
                    <td className="py-2 pr-4 text-slate-300 font-mono text-xs">{testCase.path}</td>
                    <td className="py-2 pr-4">
                      <button
                        type="button"
                        onClick={() => handleRunTest(testCase.id)}
                        disabled={!!runningTestId || runningAll}
                        className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-semibold hover:bg-teal-600 disabled:opacity-50"
                      >
                        {runningTestId === testCase.id ? 'Running...' : 'Run'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!loadingTests && tests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No integration tests available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Run Results</h2>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-white/10">
                <tr className="text-left">
                  <th className="py-2 pr-4 text-slate-300">Suite</th>
                  <th className="py-2 pr-4 text-slate-300">Description</th>
                  <th className="py-2 pr-4 text-slate-300">Status</th>
                  <th className="py-2 pr-4 text-slate-300">Failure Cause</th>
                  <th className="py-2 pr-4 text-slate-300">Duration</th>
                  <th className="py-2 pr-4 text-slate-300">Passed</th>
                  <th className="py-2 pr-4 text-slate-300">Failed</th>
                  <th className="py-2 pr-4 text-slate-300">Skipped</th>
                  <th className="py-2 pr-4 text-slate-300">Exit</th>
                  <th className="py-2 pr-4 text-slate-300">Started</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.test_id} className="border-b border-white/5 last:border-b-0">
                    <td className="py-2 pr-4 text-slate-100">{result.name}</td>
                    <td className="py-2 pr-4 text-slate-300">{result.description}</td>
                    <td className={`py-2 pr-4 font-semibold ${result.status === 'passed' ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {result.status.toUpperCase()}
                    </td>
                    <td className="py-2 pr-4 text-slate-300">
                      {result.status === 'failed' ? (
                        <details>
                          <summary className="cursor-pointer text-rose-300">View cause</summary>
                          <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
                            {result.suite_failure_cause || result.output_excerpt || 'No suite-level failure cause available.'}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-slate-200">{(result.duration_ms / 1000).toFixed(2)}s</td>
                    <td className="py-2 pr-4 text-slate-200">{result.passed}</td>
                    <td className="py-2 pr-4 text-slate-200">{result.failed}</td>
                    <td className="py-2 pr-4 text-slate-200">{result.skipped}</td>
                    <td className="py-2 pr-4 text-slate-200">{result.exit_code}</td>
                    <td className="py-2 pr-4 text-slate-300 whitespace-nowrap">
                      {new Date(result.started_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-slate-400">
                      Run a test to see results here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Test Case Results and Failure Causes</h2>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-white/10">
                <tr className="text-left">
                  <th className="py-2 pr-4 text-slate-300">Suite</th>
                  <th className="py-2 pr-4 text-slate-300">Test Case</th>
                  <th className="py-2 pr-4 text-slate-300">Status</th>
                  <th className="py-2 pr-4 text-slate-300">Failure Cause</th>
                </tr>
              </thead>
              <tbody>
                {flattenedCases.map((testCase, index) => (
                  <tr key={`${testCase.suiteName}-${testCase.name}-${index}`} className="border-b border-white/5 last:border-b-0">
                    <td className="py-2 pr-4 text-slate-100">{testCase.suiteName}</td>
                    <td className="py-2 pr-4 text-slate-200">{testCase.name}</td>
                    <td
                      className={`py-2 pr-4 font-semibold ${
                        testCase.status === 'passed'
                          ? 'text-emerald-300'
                          : testCase.status === 'failed'
                            ? 'text-rose-300'
                            : 'text-amber-300'
                      }`}
                    >
                      {String(testCase.status).toUpperCase()}
                    </td>
                    <td className="py-2 pr-4 text-slate-300">
                      {testCase.status === 'failed' ? (
                        <details>
                          <summary className="cursor-pointer text-rose-300">View cause</summary>
                          <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
                            {testCase.failureCause || testCase.suiteOutputExcerpt || 'No failure details available.'}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {flattenedCases.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      Run tests to see per-test-case results.
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
