const GUEST_SESSION_ID_KEY = 'guest_session_id';

function createGuestSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/**
 * Returns a stable guest session UUID, creating and persisting one if needed.
 */
export function getGuestSessionId(): string {
  let id = localStorage.getItem(GUEST_SESSION_ID_KEY);
  if (!id) {
    id = createGuestSessionId();
    localStorage.setItem(GUEST_SESSION_ID_KEY, id);
  }
  return id;
}
