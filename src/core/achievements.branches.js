// src/core/achievements.branches.js
import { loadProfile } from "./profile.js";
import { ACH_CATALOG } from "./achievements.catalog.js";

export const BRANCH_THRESHOLDS = {
  social:    [1, 5, 10, 20],
  learning:  [1, 5, 10, 20],
  health:    [1, 5, 10, 20],
  strength:  [1, 5, 10, 20],
  trade:     [2, 5, 10, 20], // ⬅️ Tier1 باید 2 باشد تا «Deal Maker» زود آزاد نشود
  athletics: [1, 5, 10, 20],
};

export const TYPE_TO_BRANCH = {
  social:    "SOCIAL",
  learning:  "WISDOM",
  health:    "HEALTH",
  strength:  "STRENGTH",
  trade:     "TRADE",
  athletics: "ATHLETICS",
};

function isUnlocked(unlockedArr, id) {
  return Array.isArray(unlockedArr) && unlockedArr.some(u => u?.id === id);
}

/**
 * به‌روزرسانی unlock شاخه‌ای بر اساس شمارنده‌های پروفایل
 * - فقط وقتی پاداش (global یا multi) تعریف شده awardFn را صدا می‌زنیم
 * - از push تکراری در یک پاس جلوگیری می‌کنیم
 */
export function unlockBranchByProfileCounters(unlockedArr, awardFn) {
  const prof = loadProfile();
  const counts = prof?.lifetime?.doneByBranch || {};
  const justUnlocked = new Set();

  for (const item of ACH_CATALOG) {
    const typeKey = (item.type || "").toLowerCase();
    if (!BRANCH_THRESHOLDS[typeKey]) continue;

    const tier = Number(item.tier || 0);
    if (tier < 1) continue;

    const branch = TYPE_TO_BRANCH[typeKey];
    const need = BRANCH_THRESHOLDS[typeKey][Math.min(tier - 1, BRANCH_THRESHOLDS[typeKey].length - 1)];
    const haveCount = Number(counts?.[branch] || 0);

    if (haveCount >= need && !isUnlocked(unlockedArr, item.id) && !justUnlocked.has(item.id)) {
      const unlockedObj = {
        id: item.id,
        label: item.label,
        tier: item.tier,
        type: item.type,
        icon: item.icon || "🏆",
        gainedAt: new Date().toISOString(),
        xpReward: item.xpReward || 0,
        description: item.description || "",
      };

      unlockedArr.push(unlockedObj);
      justUnlocked.add(item.id);

      const hasGlobal = !!(unlockedObj.xpReward && Number(unlockedObj.xpReward) !== 0);
      const hasMulti  = !!(item.xpAwards && typeof item.xpAwards === "object" && Object.keys(item.xpAwards).length > 0);

      if ((hasGlobal || hasMulti) && typeof awardFn === "function") {
        awardFn({
          global: unlockedObj.xpReward || 0,
          multi:  item.xpAwards || {},
          reason: `Achievement: ${item.label}`,
        });
      }
    }
  }
}

/**
 * اعمال دوباره‌ی unlock شاخه‌ای روی state فعلی (idempotent)
 */
export function applyBranchTaskAchievements(achState) {
  try {
    const prof = loadProfile();
    const counts = prof?.lifetime?.doneByBranch || {};
    const src = Array.isArray(achState?.all) ? achState.all : ACH_CATALOG;

    const nextUnlocked = Array.isArray(achState?.unlocked) ? [...achState.unlocked] : [];
    const unlockedSet = new Set(nextUnlocked.map((a) => a?.id));

    for (const item of src) {
      const typeKey = (item.type || '').toLowerCase();
      const tier = Number(item.tier || 0);
      if (!BRANCH_THRESHOLDS[typeKey] || tier < 1) continue;

      const branch = TYPE_TO_BRANCH[typeKey];
      const need = BRANCH_THRESHOLDS[typeKey][Math.min(tier - 1, BRANCH_THRESHOLDS[typeKey].length - 1)];
      const haveCount = Number(counts?.[branch] || 0);

      if (haveCount >= need && !unlockedSet.has(item.id)) {
        nextUnlocked.push({
          id: item.id,
          label: item.label,
          icon: item.icon || '🏆',
          type: item.type,
          tier: item.tier,
          description: item.description || '',
          gainedAt: new Date().toISOString(),
          unlocked: true,
          xpReward: item.xpReward || 0,
        });
        unlockedSet.add(item.id);
      }
    }

    return { ...(achState || {}), unlocked: nextUnlocked };
  } catch {
    return achState || { unlocked: [] };
  }
}
