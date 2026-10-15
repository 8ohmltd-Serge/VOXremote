export function eventRetryDelay(attempt) {
  const boundedAttempt = Math.max(0, Math.min(4, Number(attempt) || 0));
  return Math.min(30000, 2000 * (2 ** boundedAttempt));
}
