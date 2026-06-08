import { getGuestSessionId } from './guestSession';

describe('guestSession', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates and persists a UUID in localStorage', () => {
    const id = getGuestSessionId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(localStorage.getItem('guest_session_id')).toBe(id);
  });

  it('returns the same id on subsequent calls', () => {
    const first = getGuestSessionId();
    const second = getGuestSessionId();
    expect(second).toBe(first);
  });
});
