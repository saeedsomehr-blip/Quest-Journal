// src/utils/time.js
// UI time helpers

/**
 * Humanized remaining/overdue string from an ISO timestamp.
 * Returns null if iso is falsy.
 */
export function timeLeft(iso, now = Date.now()) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  const abs = Math.abs(ms);
  const d = Math.ceil(abs / 86_400_000);
  const h = Math.floor((abs % 86_400_000) / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const s = Math.floor((abs % 60_000) / 1000);
  const str = `${Math.max(0, d - 1)}d ${h}h ${m}m ${s}s`;
  return ms < 0 ? `Overdue by ${str}` : `${str} left`;
}
