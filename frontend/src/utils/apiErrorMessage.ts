const FRIENDLY_NETWORK_MESSAGE =
  "Can't reach the API. Make sure the backend is running and open the app at http://localhost:3000 (not 127.0.0.1).";

function getErrorMessage(error: unknown): string | null {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return null;
}

function isNetworkOrCorsError(error: unknown, message: string): boolean {
  const normalized = message.trim().toLowerCase();
  if (normalized === 'failed to fetch' || normalized.includes('failed to fetch')) {
    return true;
  }
  return error instanceof TypeError && normalized.includes('network');
}

export function formatApiErrorMessage(error: unknown): string {
  const message = getErrorMessage(error);
  if (!message) {
    return 'Failed to load reports';
  }
  if (isNetworkOrCorsError(error, message)) {
    return FRIENDLY_NETWORK_MESSAGE;
  }
  return message;
}
