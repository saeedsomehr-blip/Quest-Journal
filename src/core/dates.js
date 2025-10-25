// src/core/dates.js
// Deadline utilities used by App.jsx

const msPer = {
  min: 60_000,
  h:   3_600_000,
  d:   86_400_000,
};

function safeInt(v) {
  const n = parseInt(v || "0", 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Compute ISO deadline from relative or absolute inputs.
 * - absoluteDue: ISO string or null (from date/time pickers)
 * - deadlineAmt: number-like
 * - deadlineUnit: "min" | "h" | "d"
 * - now: timestamp (optional; defaults to Date.now())
 */
export function computeDeadlineISO({ absoluteDue, deadlineAmt, deadlineUnit, now = Date.now() }) {
  if (absoluteDue) return absoluteDue;
  const amt = safeInt(deadlineAmt);
  if (!amt) return null;
  const mult = msPer[deadlineUnit] ?? msPer.h;
  return new Date(now + amt * mult).toISOString();
}

/**
 * Next deadline for recurring tasks (daily/weekly/monthly)
 */
export function nextDeadline(task) {
  if (!task?.recur || task.recur === "none") return null;
  const base = task.deadline ? new Date(task.deadline) : new Date();
  const d = new Date(base);
  if (task.recur === "daily") d.setDate(d.getDate() + 1);
  else if (task.recur === "weekly") d.setDate(d.getDate() + 7);
  else if (task.recur === "monthly") d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}
