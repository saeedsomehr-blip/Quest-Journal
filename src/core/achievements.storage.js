// src/core/achievements.storage.js
// ─────────────────────────────────────────────────────────────
// ذخیره و بازیابی اچیومنت‌ها از localStorage
// این فایل هیچ وابستگی به catalog یا logic نداره
// ─────────────────────────────────────────────────────────────

/**
 * شکل داده در localStorage:
 * { unlocked: [{ id, label, tier, type, icon, gainedAt, xpReward, description }], ... }
 */

export function loadAchievements() {
  try {
    return JSON.parse(localStorage.getItem("qj_ach_v2") || "{}");
  } catch {
    return {};
  }
}

export function saveAchievements(ach) {
  try {
    localStorage.setItem("qj_ach_v2", JSON.stringify(ach || {}));
  } catch {}
}

/**
 * همگام‌سازی داده‌های نمایش unlocked با جدیدترین کاتالوگ
 * (در صورت تغییر توضیحات یا آیکن در نسخه‌های بعد)
 */
export function reconcileAchievementsWithCatalog(ach, catalog) {
  try {
    const byId = {};
    (catalog || []).forEach(it => { if (it?.id) byId[it.id] = it; });

    const unlocked = Array.isArray(ach?.unlocked) ? ach.unlocked : [];
    const nextUnlocked = unlocked.map(u => {
      const fresh = byId[u?.id];
      if (!fresh) return u;
      return {
        ...u,
        label: fresh.label ?? u.label,
        icon: fresh.icon ?? u.icon,
        type: fresh.type ?? u.type,
        tier: fresh.tier ?? u.tier,
        description: fresh.description ?? u.description,
      };
    });

    return { ...(ach || {}), unlocked: nextUnlocked };
  } catch {
    return ach;
  }
}
