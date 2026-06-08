export interface GuestUsage {
  limit: number;
  used: number;
  remaining: number;
  requires_signup: boolean;
}

export class GuestLimitReachedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GuestLimitReachedError';
  }
}
