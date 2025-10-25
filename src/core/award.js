// src/core/award.js
import {
  applyAwards,
  loadMultiXP,
  saveMultiXP,
  applyDailyDecay,
  recomputeDailyPerks,
  XP_TYPES,
} from "./multixp.js";
import { loadProfile, saveProfile } from "./profile.js";
import {
  ACH_CATALOG,
  loadAchievements,
  saveAchievements,
  evaluateAchievements as runAchievementEval,
} from "./achievements.js";
import { loadTasks } from "./storage.js";
import { duePayouts, computeParentBoost } from "./gamify.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: today stats (daily counters)
function todayISO() { return new Date().toISOString().slice(0, 10); }
function statsKeyFor(dateISO) { return `qj_stats_today_${dateISO}`; }
function readTodayStats() {
  const key = statsKeyFor(todayISO());
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || {
      doneTasks: 0,
      activeMinutes: 0,
      doneByBranch: {},
    };
  } catch {
    return { doneTasks: 0, activeMinutes: 0, doneByBranch: {} };
  }
}
function writeTodayStats(stats) {
  const key = statsKeyFor(todayISO());
  try { localStorage.setItem(key, JSON.stringify(stats)); } catch {}
}

// ≥50% rule (kept)
export function primaryBranchOf(xpAwards) {
  const totals = Object.values(xpAwards || {}).map(v => parseInt(v, 10) || 0);
  const sum = totals.reduce((a, b) => a + b, 0);
  if (sum <= 0) return null;

  let best = null, bestVal = 0;
  for (const k of XP_TYPES) {
    const v = parseInt(xpAwards?.[k] || 0, 10) || 0;
    if (v > bestVal) { bestVal = v; best = k; }
  }
  return bestVal / sum >= 0.5 ? best : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Local normalizer (strict): map aliases → canonical keys, drop invalid
const ALIASES = {
  wisdom: "WISDOM",
  health: "HEALTH",
  strength: "STRENGTH",
  social: "SOCIAL",
  trade: "TRADE",
  athletics: "ATHLETICS",
};
function normalizeAwardsMap(awards) {
  const out = {};
  if (!awards || typeof awards !== "object") return out;
  for (const [k, raw] of Object.entries(awards)) {
    const n = Math.max(0, parseInt(raw, 10) || 0);
    if (n <= 0) continue;
    const keyU = (k || "").toString().toUpperCase();
    const mapped = XP_TYPES.includes(keyU) ? keyU : ALIASES[(k || "").toString().toLowerCase()] || null;
    if (!mapped || !XP_TYPES.includes(mapped)) continue;
    out[mapped] = (out[mapped] || 0) + n;
  }
  return out;
}

// Safety: subtract any accidental branch increases outside intended awards
function clampToAwardsOnly(prevState, nextState, intendedAwards) {
  const allowed = new Set(Object.keys(intendedAwards));
  const prev = prevState?.xp || {};
  const next = { ...(nextState || {}), xp: { ...(nextState?.xp || {}) } };

  let changed = false;
  for (const br of XP_TYPES) {
    const delta = (next.xp[br] || 0) - (prev[br] || 0);
    if (delta > 0 && !allowed.has(br)) {
      next.xp[br] = prev[br] || 0; // revert unintended gain
      changed = true;
    }
  }
  return { state: next, changed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Simple/legacy path: "task completed → award XP"
export function awardXPForTask(task, incGlobalXP, doEvaluateAchievements = true) {
  // 0) Normalize task awards strictly
  const rawAwardsObj = (task?.xpAwards && typeof task.xpAwards === "object") ? task.xpAwards : {};
  const awards = normalizeAwardsMap(rawAwardsObj);

  // 1) Global XP (base)
  const rawBase = Math.max(0, parseInt(task?.baseXp ?? task?.xp ?? 0, 10) || 0);
  const allowZeroBase = task?.allowZeroBase === true;
  const base = allowZeroBase ? rawBase : Math.max(1, rawBase || 1);
  if (typeof incGlobalXP === "function" && base > 0) {
    try { incGlobalXP(base); } catch {}
  }

  // 2) Daily decay
  const pre = loadMultiXP();
  const { state: decayed } = applyDailyDecay(pre);
  saveMultiXP(decayed);

 // 3) Branch XP (STRICT: only awards' keys)
let stateAfter = decayed;
if (Object.keys(awards).length > 0) {
  const before = loadMultiXP();
  const xpBefore = { ...before.xp }; // ذخیره XP قبلی
  
  const res = applyAwards(before, awards);
  const applied = res?.state || before;

  // Guard اول: clamp شاخه‌های غیرمجاز
  const { state: clamped, changed } = clampToAwardsOnly(before, applied, awards);
  
  // Guard دوم: اطمینان نهایی
  const allowedBranches = new Set(Object.keys(awards));
  const finalState = { ...clamped, xp: { ...clamped.xp } };
  
  for (const br of ['WISDOM', 'HEALTH', 'STRENGTH', 'SOCIAL', 'TRADE', 'ATHLETICS']) {
    if (!allowedBranches.has(br)) {
      finalState.xp[br] = xpBefore[br] || 0;
    }
  }
  
  saveMultiXP(finalState);
  stateAfter = finalState;
}
  // 4) Today stats + daily perks recompute
  try {
    const stats = readTodayStats();
    stats.doneTasks = (stats.doneTasks || 0) + 1;
    const p = primaryBranchOf(awards);
    if (p) {
      stats.doneByBranch = stats.doneByBranch || {};
      stats.doneByBranch[p] = (stats.doneByBranch[p] || 0) + 1;
    }
    writeTodayStats(stats);
    recomputeDailyPerks(stats);
  } catch {}

  // 5) Profile sync (multi-xp state + lifetime)
  const prof = loadProfile();
  prof.multixp = { ...prof.multixp, ...(stateAfter || {}) };

  if (!prof.lifetime) prof.lifetime = {};
  if (!prof.lifetime.doneByBranch) prof.lifetime.doneByBranch = {};
  const p = primaryBranchOf(awards);
  if (p) {
    prof.lifetime.doneByBranch[p] = (prof.lifetime.doneByBranch[p] || 0) + 1;
  }

  // 6) Achievements (optional)
  if (doEvaluateAchievements) {
    try {
      const prevAch = loadAchievements();
      const allTasks = loadTasks();
      const ctx = { tasks: Array.isArray(allTasks) ? allTasks : [], level: prof.level || 0 };
      const achState = {
        unlocked: Array.isArray(prevAch?.unlocked) ? prevAch.unlocked : [],
        all: ACH_CATALOG,
      };
      const nextAch = runAchievementEval(ctx, achState);

      // dispatch any new animations (optional – keeps your prior behavior)
      const prevIds = new Set(achState.unlocked.map(a => a.id));
      const newOnes = nextAch.unlocked.filter(a => !prevIds.has(a.id));
      for (const a of newOnes) {
        // if you still dispatch a window event here, keep it;
        // otherwise you can remove this block safely.
      }

      saveAchievements(nextAch);
      prof.ach = nextAch;
    } catch {}
  }

  saveProfile(prof);

  return {
    base,
    primary: p || null,
    branchAwards: awards,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Milestone payouts (unchanged behavior, but strict on final boost only)
export function awardPayout(payout, { incGlobalXP } = {}) {
  const pre = loadMultiXP();
  const { state: decayed } = applyDailyDecay(pre);

  let s = decayed;
  const g = Math.max(0, parseInt(payout.baseGlobal || 0, 10) || 0);
  if (g > 0 && typeof incGlobalXP === "function") {
    try { incGlobalXP(g); } catch {}
  }

  const awards = normalizeAwardsMap(payout.branchAwards || {});
  if (Object.keys(awards).length > 0) {
    const before = loadMultiXP();
    const res = applyAwards(before, awards);
    const applied = res?.state || before;
    const { state: clamped, changed } = clampToAwardsOnly(before, applied, awards);
    if (changed) saveMultiXP(clamped); else saveMultiXP(applied);
    s = changed ? clamped : applied;
  } else {
    saveMultiXP(s);
  }

  // sync profile
  const prof = loadProfile();
  prof.multixp = { ...prof.multixp, ...s };
  saveProfile(prof);

  return {
    deltaGlobal: g,
    payoutKey: payout.payoutKey,
    kind: payout.kind,
  };
}

export function releaseMilestonePayouts(task, { incGlobalXP, onBoostInfo } = {}) {
  if (!task) return { applied: [], boostAdded: 0, payouts: [] };
  const payouts = duePayouts(task);

  const hasFinal = payouts.some(p => p.kind === "final");
  let boostAdded = 0;

  if (hasFinal) {
    const b = Math.max(0, computeParentBoost(task) || 0);
    if (b > 0) {
      const i = payouts.findIndex(p => p.kind === "final");
      payouts[i] = { ...payouts[i], baseGlobal: Math.max(0, (payouts[i].baseGlobal || 0)) + b };
      boostAdded = b;
    }
  }

  const applied = [];
  for (const p of payouts) {
    const res = awardPayout(p, { incGlobalXP });
    applied.push(res.payoutKey);
  }

  if (boostAdded > 0 && typeof onBoostInfo === "function") {
    try { onBoostInfo({ taskId: task.id, boost: boostAdded }); } catch {}
  }

  return { applied, boostAdded, payouts };
}
