export const RATE_LIMIT = { requests: 10, windowMs: 60_000 };

const requestLog = new Map<string, number[]>();

export function isRateLimited(userId: string, now = Date.now()): boolean {
  const recent = (requestLog.get(userId) ?? []).filter(timestamp => now - timestamp < RATE_LIMIT.windowMs);
  const limited = recent.length >= RATE_LIMIT.requests;
  requestLog.set(userId, limited ? recent : [...recent, now]);
  return limited;
}
