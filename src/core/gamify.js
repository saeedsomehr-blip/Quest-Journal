// src/core/gamify.js

import { QUEST_TYPES } from "./constants.js";

/* =========================
 * Level curve (configurable)
 * ========================= */
export const BASE_XP = 1000;   // xp لازم برای Level 1 → 2 (پایه)
export const GROWTH  = 1.10;   // ~۱۰٪ سخت‌تر در هر لِول

export function xpForLevel(l) {
  if (l <= 1) return BASE_XP;
  return Math.round(BASE_XP * Math.pow(GROWTH, Math.max(0, l - 1)));
}

export function sumToReachLevel(l) {
  // xp تجمعی موردنیاز از ابتدای بازی تا ابتدای Level l
  if (l <= 1) return 0;
  return Math.round((BASE_XP * (Math.pow(GROWTH, l - 1) - 1)) / (GROWTH - 1));
}

export function levelFromXP(xp) {
  if (xp <= 0) return 1;
  // معکوس سری هندسی
  const val = (xp * (GROWTH - 1)) / BASE_XP + 1;
  const l = Math.floor(Math.log(Math.max(val, 1)) / Math.log(GROWTH)) + 1;
  return Math.max(1, l);
}

export function levelProgress(totalXP) {
  const level = levelFromXP(totalXP);
  const start = sumToReachLevel(level);
  const span  = xpForLevel(level);
  const into  = totalXP - start;
  const nextIn = Math.max(0, span - into);
  return { level, start, span, into, nextIn };
}

/* =========================
 * Quest type gates/capacity
 * ========================= */
export function isQuestTypeUnlocked(level, questType) {
  const t = QUEST_TYPES[questType] || QUEST_TYPES.BASIC;
  return (level || 1) >= (t.unlockLvl || 1);
}

export function maxActiveFor(level, questType) {
  const t = QUEST_TYPES[questType] || QUEST_TYPES.BASIC;
  const fn = t.capActive || (() => Infinity);
  try { return fn(level || 1); } catch { return Infinity; }
}

/* =========================
 * Parent boost from subtasks
 * =========================
 * Boost_parent = min( 0.5 * XP_parent_base,  0.15 * sum(XP_subtasks_done) )
 * - فقط به XP «پایه» نگاه می‌کنیم؛ اعمال باف‌ها به لایهٔ award واگذار می‌شود
 */
export function computeParentBoost(task) {
  if (!task || !Array.isArray(task.subtasks)) return 0;
  const parentBase = Math.max(0, parseInt(task.xpBase ?? task.xp ?? 0, 10) || 0);
  if (!parentBase) return 0;

  const sumDoneSubs = task.subtasks.reduce((acc, s) => {
    if (!s || !s.done) return acc;
    const v = parseInt(s.xpBase ?? s.xp ?? 0, 10) || 0;
    return acc + Math.max(0, v);
  }, 0);

  const cap = 0.5 * parentBase;
  const k   = 0.15;
  const boost = Math.min(cap, k * sumDoneSubs);
  return Math.max(0, Math.round(boost));
}

/* =========================
 * Portion splitter utilities
 * =========================
 * ما پورشنِ پرداخت (مثلاً 20% از xpBase) را با این تابع خرد می‌کنیم:
 * - branchAwards: به‌صورت نسبتی از xpAwards (تخصیص‌های کاربر)
 * - globalBase: باقیماندهٔ پایه (= portion * (xpBase - sum(xpAwards)))
 * ~ نکته: اعمال باف‌های گلوبال/شاخه‌ای در award انجام می‌شود.
 */
function sumMap(obj) {
  return Object.values(obj || {}).reduce((a, b) => {
    const n = parseInt(b, 10);
    return a + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);
}

/**
 * splitPortion(xpBase, xpAwards, portion)
 * @param {number} xpBase            - کل XP پایهٔ تسک
 * @param {Record<string,number>} xpAwards - تخصیص شاخه‌ای کاربر (جمعش ≤ xpBase)
 * @param {number} portion           - عدد بین (0..1] مثلاً 0.25 یعنی 25% آزادسازی
 * @returns {{ baseGlobal:number, branchAwards:Record<string,number>, portion:number }}
 */
export function splitPortion(xpBase, xpAwards, portion) {
  const base = Math.max(0, parseInt(xpBase ?? 0, 10) || 0);
  const p    = Math.max(0, Math.min(1, Number(portion) || 0));

  const totalAwards = sumMap(xpAwards);
  const unallocated = Math.max(0, base - totalAwards);

  // شاخه‌ها به نسبت تخصیص اولیه‌ی کاربر
  const branchAwards = {};
  for (const k of Object.keys(xpAwards || {})) {
    const v = Math.max(0, parseInt(xpAwards[k] || 0, 10) || 0);
    branchAwards[k] = Math.round(v * p);
  }

  // گلوبال = سهمِ آن‌بخش از base که به شاخه‌ای اختصاص داده نشده بود
  const baseGlobal = Math.round(base * p);

  return { baseGlobal, branchAwards, portion: p };
}

/* =========================
 * Payout planner (escrow modes)
 * =========================
 * escrow.mode:
 *  - "none"      → پرداختِ کل XP هنگام done شدن (اگر چنین سیاستی خواستی)
 *  - "end"       → (SIDE) پرداختِ کل XP هنگام done شدن
 *  - "milestone" → (MAIN/EPIC) پرداخت به‌ازای مایلستون‌هایی که done شده‌اند و هنوز paid نشده‌اند
 *
 * ورودی task انتظار دارد:
 * {
 *   id, title, xpBase, xpAwards: {BR:xp,...}, questType, escrow:{mode, paid?:bool},
 *   subtasks?: [
 *     { id, title, done, isMilestone?:true, milestoneWeight?:number(0..100), paid?:bool }
 *   ],
 *   done?: bool
 * }
 *
 * خروجی: آرایه‌ای از آیتم‌های پرداختیِ «due» که باید به award داده شوند:
 * [{
 *   payoutKey: string,                 // کلید یکتای پرداخت (برای علامت‌گذاری paid در استور خودت)
 *   kind: "final"|"milestone",
 *   portion: number,                   // سهم پرداخت از کل (0..1]
 *   baseGlobal: number,                // برای گلوبال XP (قبل از باف)
 *   branchAwards: Record<string,number>// برای شاخه‌ها (قبل از باف)
 * }]
 */
export function duePayouts(task) {
  if (!task) return [];
  const base = Math.max(0, parseInt(task.xpBase ?? task.xp ?? 0, 10) || 0);
  if (!base) return [];

  const mode = task?.escrow?.mode || "none";
  const awards = (task?.xpAwards && typeof task.xpAwards === "object") ? task.xpAwards : {};

  // Helper برای ساخت آیتم payout
  function buildItem({ key, kind, portion }) {
    const { baseGlobal, branchAwards } = splitPortion(base, awards, portion);
    return {
      payoutKey: key,
      kind,
      portion,
      baseGlobal,
      branchAwards,
    };
  }

  const res = [];

  if (mode === "milestone") {
    // پرداخت مرحله‌ای: هر مایلستون done و unpaid
    const subs = Array.isArray(task.subtasks) ? task.subtasks : [];
    subs.forEach((s, idx) => {
      if (!s?.isMilestone) return;
      if (!s.done) return;
      if (s.paid) return;
      const w = Math.max(0, Math.min(100, Number(s.milestoneWeight) || 0));
      if (w <= 0) return;
      const portion = w / 100;
      res.push(buildItem({
        key: `task:${task.id || "?"}:ms:${s.id || idx}`,
        kind: "milestone",
        portion,
      }));
    });
    return res;
  }

  if (mode === "end") {
    // پرداختِ کل در انتها (SIDE)
    if (task.done && !task?.escrow?.paid) {
      res.push(buildItem({
        key: `task:${task.id || "?"}:final`,
        kind: "final",
        portion: 1,
      }));
    }
    return res;
  }

  // mode === "none"
  // اگر خواستی BASIC را هم مشمول پرداخت آنی کنی، هنگام done شدن یک آیتم می‌سازیم:
  if (task.done && !task?.escrow?.paid) {
    res.push(buildItem({
      key: `task:${task.id || "?"}:final`,
      kind: "final",
      portion: 1,
    }));
  }
  return res;
}

/* =========================
 * Primary branch helper (≥50%)
 * ========================= */
export function primaryBranchOf(xpAwards) {
  const total = sumMap(xpAwards);
  if (total <= 0) return null;
  let best = null, bestVal = 0;
  for (const k of Object.keys(xpAwards || {})) {
    const v = Math.max(0, parseInt(xpAwards[k] || 0, 10) || 0);
    if (v > bestVal) { bestVal = v; best = k; }
  }
  return bestVal / Math.max(1, total) >= 0.5 ? best : null;
}
