// src/core/perkEngine.js
import { PERK_RULES } from "./perkRules.data.js";

/** ثوابت شاخه‌ها — با سیستم اصلی هماهنگ */
const BR = {
  SOCIAL: "SOCIAL",
  WISDOM: "WISDOM",
  HEALTH: "HEALTH",
  STRENGTH: "STRENGTH",
  TRADE: "TRADE",
  ATHLETICS: "ATHLETICS",
};

/** اگر آچیومنت‌ها داخل پروفایل سینک می‌شن، ست‌شون رو برگردون */
function getUnlockedAchievementIdSet(profile) {
  try {
    const arr = Array.isArray(profile?.achievements?.unlocked)
      ? profile.achievements.unlocked
      : [];
    return new Set(arr.map(a => a?.id).filter(Boolean));
  } catch {
    return new Set();
  }
}

/** شمارش «تعداد تسک‌های done امروز» برحسب شاخه */
function countDoneByBranchToday(tasks, todayStrFn) {
  const todayKey = todayStrFn ? todayStrFn() : new Date().toISOString().slice(0,10);
  const map = {
    [BR.SOCIAL]: 0,
    [BR.WISDOM]: 0,
    [BR.HEALTH]: 0,
    [BR.STRENGTH]: 0,
    [BR.TRADE]: 0,
    [BR.ATHLETICS]: 0,
  };
  if (!Array.isArray(tasks)) return map;

  for (const t of tasks) {
    if (!t?.done) continue;
    const doneAt = (t.doneAt || t.createdAt || "").slice(0,10);
    if (doneAt !== todayKey) continue;

    // شاخه را از xpAwards یا category برداشت می‌کنیم
    let br = null;
    if (t?.xpAwards && typeof t.xpAwards === "object") {
      for (const k of Object.keys(BR)) {
        const val = Number(t.xpAwards[k] || 0);
        if (val > 0) { br = k; break; }
      }
    }
    if (!br) {
      const cat = (t.category || "").toLowerCase();
      if (cat === "social") br = BR.SOCIAL;
      else if (cat === "learning") br = BR.WISDOM;
      else if (cat === "health") br = BR.HEALTH;
      else if (cat === "strength") br = BR.STRENGTH;
      else if (cat === "trade") br = BR.TRADE;
      else if (cat === "athletics") br = BR.ATHLETICS;
    }
    if (br && map[br] != null) map[br] += 1;
  }
  return map;
}

/** بررسی اینکه Rule الان قابل unlock هست یا نه */
function meets(profile, rule, ctx) {
  if (!rule) return false;
  const { level = 0, tasks = [], todayStrFn } = ctx || {};
  const requires = rule?.requires;

  const lifetimeCounts = profile?.lifetime?.doneByBranch || {}; // شمارش Lifetime
  const xpByBranch = profile?.multixp?.xp || {};                 // XP شاخه (برای branchXP اختیاری)
  const streak = profile?.meta?.streak || 0;

  // اگر Rule به Today نیاز دارد، همین الان بشمار
  const todayCounts = (requires && requires.branchAtToday)
    ? countDoneByBranchToday(tasks, todayStrFn)
    : null;

  // اگر Rule منبع آچیومنتی دارد، باید آن آچیومنت unlock باشد
  if (rule?.source?.type === "ach") {
    const neededAchId = rule?.source?.achId;
    if (!neededAchId) return false;
    const unlocked = getUnlockedAchievementIdSet(profile);
    if (!unlocked.has(neededAchId)) return false;
  }

  if (requires) {
    if (requires.level && level < requires.level) return false;
    if (requires.streak && streak < requires.streak) return false;

    // ✅ آستانهٔ Lifetime برحسب تعداد تسک شاخه
    if (requires.branchAt) {
      for (const [br, need] of Object.entries(requires.branchAt)) {
        const have = Number(lifetimeCounts?.[br] || 0);
        if (have < Number(need || 0)) return false;
      }
    }

    // ✅ آستانهٔ «امروز» برحسب تعداد تسک شاخه
    if (requires.branchAtToday && todayCounts) {
      for (const [br, need] of Object.entries(requires.branchAtToday)) {
        const have = Number(todayCounts?.[br] || 0);
        if (have < Number(need || 0)) return false;
      }
    }

    // (اختیاری) شرط مبتنی بر XP شاخه
    if (requires.branchXP) {
      for (const [br, need] of Object.entries(requires.branchXP)) {
        const have = Number(xpByBranch?.[br] || 0);
        if (have < Number(need || 0)) return false;
      }
    }
  }

  return true;
}

/** خروجی: لیست پرک‌هایی که الآن «شرایط unlock» دارند ولی هنوز Owned نیستند */
export function evaluateNewPerks(profile, ownedIds, { level = 0, tasks = [], todayStrFn } = {}) {
  const have = new Set(ownedIds || []);
  const out = [];
  for (const r of PERK_RULES) {
    if (have.has(r.id)) continue;
    if (meets(profile, r, { level, tasks, todayStrFn })) out.push(r);
  }
  return out;
}

/** اعمال اثر پرک‌ها روی جوایز چندشاخه‌ای { BRANCH: amount } */
export function applyPerkEffects(awards, ownedIds) {
  if (!awards || !ownedIds?.length) return awards;

  let globalMult = 1;
  const branchMult = {};

  for (const id of ownedIds) {
    const rule = PERK_RULES.find(x => x.id === id);
    if (!rule?.effects) continue;
    if (rule.effects.globalMult) globalMult *= rule.effects.globalMult;
    if (rule.effects.branchMult) {
      for (const [br, m] of Object.entries(rule.effects.branchMult)) {
        branchMult[br] = (branchMult[br] || 1) * m;
      }
    }
  }

  const out = {};
  for (const [br, amt] of Object.entries(awards)) {
    const base = Math.max(0, parseInt(amt || 0, 10) || 0);
    const bm = branchMult[br] || 1;
    out[br] = Math.round(base * globalMult * bm);
  }
  return out;
}
