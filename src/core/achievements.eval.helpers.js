// src/core/achievements.eval.helpers.js
// ─────────────────────────────────────────────────────────────
// ابزارهای کمکی برای evaluateAchievements()
// ─────────────────────────────────────────────────────────────

/**
 * خلاصه‌سازی وضعیت تسک‌ها برای مقایسه با نیازهای هر اچیومنت
 */
export function summarize(tasks) {
  const done = (Array.isArray(tasks) ? tasks : []).filter(t => t.done);
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const doneToday = done.filter(t => {
    const d = new Date(t.doneAt || t.createdAt || 0).getTime();
    return d >= startOfToday.getTime();
  }).length;

  const totalDone = done.length;

  // active days (last 30d)
  const days = new Set();
  for (const t of done) {
    const ts = new Date(t.doneAt || t.createdAt || 0).getTime();
    if (Number.isFinite(ts) && (now - ts) <= 30 * 86400000) {
      days.add(new Date(ts).toISOString().slice(0, 10));
    }
  }

  // category counts
  const socialTasks   = done.filter(t => t.category === "social").length;
  const learningTasks = done.filter(t => t.category === "learning").length;
  const healthTasks   = done.filter(t => t.category === "health").length;

  function anyDoneBetween(hStart, hEnd) {
    return done.some(t => {
      const d = new Date(t.doneAt || t.createdAt || 0);
      const h = d.getHours();
      return h >= hStart && h < hEnd;
    });
  }

  return {
    doneToday,
    totalDone,
    activeDaysCount: days.size,
    anyDoneBetween,
    socialTasks,
    learningTasks,
    healthTasks,
  };
}

/**
 * بررسی نیازهای اچیومنت نسبت به وضعیت کاربر
 */
export function meetsNeed(need, ctx, sum) {
  if (!need) return false;

  if (need.doneToday != null)         return sum.doneToday >= need.doneToday;
  if (need.activeDaysInLast != null)  return sum.activeDaysCount >= need.activeDaysInLast;
  if (need.levelAtLeast != null)      return (ctx.level || 0) >= need.levelAtLeast;

  if (need.totalDone != null && need.socialTasks != null)
    return sum.totalDone >= need.totalDone && sum.socialTasks >= need.socialTasks;

  if (need.totalDone != null && need.learningTasks != null)
    return sum.totalDone >= need.totalDone && sum.learningTasks >= need.learningTasks;

  if (need.totalDone != null && need.healthTasks != null)
    return sum.totalDone >= need.totalDone && sum.healthTasks >= need.healthTasks;

  if (need.totalDone != null)         return sum.totalDone >= need.totalDone;

  if (need.anyDoneBetween) {
    const [hs, he] = need.anyDoneBetween;
    return sum.anyDoneBetween(hs, he);
  }

  return false;
}
