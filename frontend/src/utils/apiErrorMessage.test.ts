import { formatApiErrorMessage } from './apiErrorMessage';

const FRIENDLY_NETWORK_MESSAGE =
  "Can't reach the API. Make sure the backend is running and open the app at http://localhost:3000 (not 127.0.0.1).";

describe('formatApiErrorMessage', () => {
  it('maps Failed to fetch string to friendly copy', () => {
    expect(formatApiErrorMessage('Failed to fetch')).toBe(FRIENDLY_NETWORK_MESSAGE);
  });

  it('maps Error with Failed to fetch to friendly copy', () => {
    expect(formatApiErrorMessage(new Error('Failed to fetch'))).toBe(FRIENDLY_NETWORK_MESSAGE);
  });

  it('maps TypeError Failed to fetch to friendly copy', () => {
    expect(formatApiErrorMessage(new TypeError('Failed to fetch'))).toBe(FRIENDLY_NETWORK_MESSAGE);
  });

  it('keeps server HTTP error messages unchanged', () => {
    expect(formatApiErrorMessage(new Error('Session expired'))).toBe('Session expired');
    expect(formatApiErrorMessage(new Error('Admin privileges required'))).toBe(
      'Admin privileges required'
    );
  });

  it('returns fallback for non-error values', () => {
    expect(formatApiErrorMessage(null)).toBe('Failed to load reports');
    expect(formatApiErrorMessage(undefined)).toBe('Failed to load reports');
  });
});
