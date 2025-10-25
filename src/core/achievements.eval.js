// src/core/achievements.eval.js
// ─────────────────────────────────────────────────────────────
// تابع مرکزی ارزیابی و unlock اچیومنت‌ها
// شامل منطق streak، daily/weekly reset، شاخه‌های روزانه و Deal Day روزانه
// ─────────────────────────────────────────────────────────────

import { ACH_CATALOG } from "./achievements.catalog.js";
import { summarize, meetsNeed } from "./achievements.eval.helpers.js";
import { todayISO, weekKeyOf, resetDailyAchievements, resetWeeklyAchievements } from "./achievements.helpers.js";
import { unlockBranchByProfileCounters, TYPE_TO_BRANCH } from "./achievements.branches.js";

// شمارش روزهای متوالی با حداقل n تسک در روز (برای Meta streak)
function countConsecutiveDays(minTasksPerDay = 3, maxDays = 30) {
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < maxDays; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const key = `qj_stats_today_${iso}`;
    const stats = JSON.parse(localStorage.getItem(key) || "null");
    if (stats && Number(stats.doneTasks || 0) >= minTasksPerDay) streak++;
    else break;
  }
  return streak;
}

// بازه‌ی هفته‌ی جاری (ISO: Mon..Sun)
function currentWeekRange() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = (d.getDay() + 6) % 7; // Mon=0..Sun=6
  const start = new Date(d); start.setDate(d.getDate() - day); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(start.getDate() + 7);
  return { start, end };
}

// محاسبه‌ی XP هفتگی از روی تسک‌های done (legacy و branch)
function computeWeeklyXP(tasks) {
  const { start, end } = currentWeekRange();
  let legacy = 0;
  const byBranch = { WISDOM:0, STRENGTH:0, SOCIAL:0, TRADE:0, HEALTH:0, ATHLETICS:0 };

  const arr = Array.isArray(tasks) ? tasks : [];
  for (const t of arr) {
    if (!t?.done) continue;
    const stamp = new Date(t.doneAt || t.createdAt || 0);
    if (!(stamp >= start && stamp < end)) continue;

    const base = Math.max(0, parseInt(t.baseXp ?? t.xp ?? t.xpBase ?? 0, 10) || 0);
    legacy += base;

    if (t.xpAwards && typeof t.xpAwards === "object") {
      for (const k of Object.keys(byBranch)) {
        const v = Math.max(0, parseInt(t.xpAwards?.[k] || 0, 10) || 0);
        if (v) byBranch[k] += v;
      }
    }
  }
  return { legacy, byBranch };
}

// کمکی: تعداد TRADE امروز را مستقیماً از tasks حساب کنیم (برای Deal Day)
function countTradeToday(tasks) {
  const today = todayISO();
  let n = 0;
  for (const t of tasks || []) {
    if (!t?.done) continue;
    const d = (t.doneAt || t.createdAt || "").slice(0,10);
    if (d !== today) continue;

    let isTrade = false;
    if (t?.xpAwards && typeof t.xpAwards === "object" && Number(t.xpAwards.TRADE || 0) > 0) {
      isTrade = true;
    } else if ((t.category || "").toLowerCase() === "trade") {
      isTrade = true;
    }
    if (isTrade) n++;
  }
  return n;
}

export function evaluateAchievements(ctx, prev, awardFn) {
  // ── Reset checks (روزانه و هفتگی)
  resetDailyAchievements();
  resetWeeklyAchievements();

  const safePrev = prev && typeof prev === "object" ? prev : {};
  const unlocked = Array.isArray(safePrev.unlocked) ? [...safePrev.unlocked] : [];

  const lastDaily = safePrev.lastDaily || null;
  const lastWeekly = safePrev.lastWeekly || null;
  const today = todayISO();
  const thisWeek = weekKeyOf();

  const dailyNow = today !== lastDaily ? [] :
    Array.isArray(safePrev.ephemeralDaily) ? [...safePrev.ephemeralDaily] : [];
  const weeklyNow = thisWeek !== lastWeekly ? [] :
    Array.isArray(safePrev.ephemeralWeekly) ? [...safePrev.ephemeralWeekly] : [];

  const has = (id) => unlocked.some(u => u.id === id);
  const add = (a) => {
    const entry = {
      id: a.id,
      label: a.label,
      tier: a.tier,
      type: a.type,
      icon: a.icon || "🏆",
      gainedAt: new Date().toISOString(),
      xpReward: a.xpReward || 0,
      description: a.description || "",
    };
    unlocked.push(entry);
    if (typeof awardFn === "function") {
      awardFn({
        global: a.xpReward || 0,
        multi:  a.xpAwards || {},
        reason: `Achievement: ${a.label}`,
      });
    }
  };

  const sum = summarize(ctx.tasks || []);

  // ۱) life achievements (به‌جز برنچ‌های خاص که از counters می‌آیند)
  for (const a of ACH_CATALOG) {
    const scope = a.scope || "life";
    const t = (a.type || "").toLowerCase();
    if (scope === "life") {
      if (["strength","trade","athletics"].includes(t)) continue; // این‌ها از counters
      if (!has(a.id) && meetsNeed(a.need, ctx, sum)) add(a);
    }
  }

  // ۲) branch unlocks از روی lifetime counters
  unlockBranchByProfileCounters(unlocked, awardFn);

  // ۳) Meta streak
  const streak = countConsecutiveDays(3);
  const unlockById = (id) => {
    const item = ACH_CATALOG.find(x => x.id === id);
    if (item && !has(id)) add(item);
  };
  if (streak >= 3)  unlockById("streak_3");
  if (streak >= 5)  unlockById("streak_5");
  if (streak >= 7)  unlockById("streak_7");
  if (streak >= 10) unlockById("streak_10");

  // ۴) Ephemeral daily/weekly
  function readTodayBranchCounts() {
    try {
      const key = `qj_stats_today_${todayISO()}`;
      const stats = JSON.parse(localStorage.getItem(key) || "null") || {};
      return stats.doneByBranch || {};
    } catch { return {}; }
  }
  const todayByBranch = readTodayBranchCounts();
  const weekly = computeWeeklyXP(ctx.tasks || []);

  for (const a of ACH_CATALOG) {
    const scope = a.scope || "life";
    const t = (a.type || "").toLowerCase();

    if (scope === "daily") {
      // ── اسکیپ Deal Day در مسیر عمومیِ daily
      const isDealDay = 
  a.id === "deal_day" || 
  a.id === "trd_today_2" ||  // ⬅️ این خط را اضافه کنید
  (a.label || "").toLowerCase() === "deal day";
      if (isDealDay) {
        continue;
      }

      const branchName = TYPE_TO_BRANCH[t];
      const isBranchDaily = !!branchName && a?.need?.doneToday != null;
      if (isBranchDaily) {
        const have = Number(todayByBranch?.[branchName] || 0);
        if (have >= a.need.doneToday && !dailyNow.find(x => x.id === a.id)) {
          const entry = { ...a, gainedAt: new Date().toISOString() };
          dailyNow.push(entry);
          if (typeof awardFn === "function") {
            awardFn({
              global: a.xpReward || 0,
              multi: a.xpAwards || {},
              reason: `Achievement: ${a.label}`,
            });
          }
        }
      } else if (meetsNeed(a.need, ctx, sum) && !dailyNow.find(x => x.id === a.id)) {
        const entry = { ...a, gainedAt: new Date().toISOString() };
        dailyNow.push(entry);
        if (typeof awardFn === "function") {
          awardFn({
            global: a.xpReward || 0,
            multi: a.xpAwards || {},
            reason: `Achievement: ${a.label}`,
          });
        }
      }
    }

    if (scope === "weekly") {
      let ok = false;
      if (a?.need?.weeklyLegacyXP != null) {
        ok = weekly.legacy >= Number(a.need.weeklyLegacyXP || 0);
      } else if (a?.need?.weeklyBranchXP != null) {
        const topBranchXP = Math.max(...Object.values(weekly.byBranch));
        ok = topBranchXP >= Number(a.need.weeklyBranchXP || 0);
      } else {
        ok = meetsNeed(a.need, ctx, sum);
      }
      if (ok && !weeklyNow.find(x => x.id === a.id)) {
        const entry = { ...a, gainedAt: new Date().toISOString() };
        weeklyNow.push(entry);
        if (typeof awardFn === "function") {
          awardFn({
            global: a.xpReward || 0,
            multi: a.xpAwards || {},
            reason: `Achievement: ${a.label}`,
          });
        }
      }
    }
  }

  // ۵) Deal Day (روزانه: دقیقاً وقتی امروز ≥۲ تسک TRADE انجام شد)
  {
    const dealDayItem =
      ACH_CATALOG.find(x => x.id === "deal_day") ||
      ACH_CATALOG.find(x => (x.label || "").toLowerCase() === "deal day");

    if (dealDayItem) {
      const alreadyToday = dailyNow.find(x => x.id === dealDayItem.id);
      const tradeCount = countTradeToday(ctx.tasks || []);
      if (!alreadyToday && tradeCount >= 2) {
        dailyNow.push({ ...dealDayItem, gainedAt: new Date().toISOString() });
        if (typeof awardFn === "function") {
          awardFn({
            global: dealDayItem.xpReward || 0,
            multi: dealDayItem.xpAwards || {},
            reason: `Achievement: ${dealDayItem.label}`,
          });
        }
      }
    }
  }

  // ۶) خروجی کامل برای UI (Locked/Unlocked + روزانه/هفتگی)
  return {
    all: ACH_CATALOG,
    unlocked,
    ephemeralDaily: dailyNow,
    ephemeralWeekly: weeklyNow,
    lastDaily: today,
    lastWeekly: thisWeek,
  };
}
