/**
 * Fire-and-forget client error reports with session-level fingerprint dedupe.
 */
const REPORTED_KEY = 'outfit_error_reports_v1';
const MAX_TRACKED = 40;

type ClientErrorPayload = {
  error_code: string;
  message: string;
  stack?: string;
  detail?: string;
  status_code?: number;
  endpoint?: string;
  method?: string;
  route?: string;
  platform?: string;
  context?: Record<string, unknown>;
};

function fingerprint(payload: ClientErrorPayload): string {
  return [
    payload.error_code,
    (payload.message || '').slice(0, 120),
    payload.endpoint || payload.route || '',
    String(payload.status_code ?? ''),
  ].join('|');
}

function alreadyReported(fp: string): boolean {
  try {
    const raw = sessionStorage.getItem(REPORTED_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return list.includes(fp);
  } catch {
    return false;
  }
}

function markReported(fp: string): void {
  try {
    const raw = sessionStorage.getItem(REPORTED_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (list.includes(fp)) return;
    list.push(fp);
    sessionStorage.setItem(REPORTED_KEY, JSON.stringify(list.slice(-MAX_TRACKED)));
  } catch {
    // ignore storage errors
  }
}

type ReportFn = (payload: ClientErrorPayload) => Promise<void>;

let reportFn: ReportFn | null = null;

/** Inject ApiService reporter to avoid circular imports at module load. */
export function setClientErrorReporter(fn: ReportFn): void {
  reportFn = fn;
}

export async function reportClientError(payload: ClientErrorPayload): Promise<void> {
  const fp = fingerprint(payload);
  if (alreadyReported(fp)) return;
  markReported(fp);
  if (!reportFn) return;
  try {
    await reportFn({
      ...payload,
      platform: payload.platform || 'web',
      route: payload.route || (typeof window !== 'undefined' ? window.location.pathname : undefined),
    });
  } catch {
    // never surface reporting failures to the UI
  }
}

export function __resetClientErrorDedupeForTests(): void {
  try {
    sessionStorage.removeItem(REPORTED_KEY);
  } catch {
    // ignore
  }
}
