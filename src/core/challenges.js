// src/core/challenges.js
const K = {
  TPL_D: "qj_daily_templates_v1",
  TPL_W: "qj_weekly_templates_v1",
  DAY: (d) => `qj_day_${d}`,
  WEEK: (w) => `qj_week_${w}`,
};

export const DEFAULT_DAILY_XP = 250;
export const DEFAULT_WEEKLY_XP = 500;

export const todayStr = () => new Date().toISOString().slice(0, 10);
export function weekKeyOf(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Returns localized weekday name (e.g., "Monday" or "دوشنبه")
export function dayNameOf(d = new Date(), locale) {
  try {
    const loc = locale || (typeof navigator !== "undefined" ? navigator.language : "en-US");
    return d.toLocaleDateString(loc, { weekday: "long" });
  } catch {
    // Fallback
    return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d.getDay()] || "";
  }
}

const load = (k, f) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : f; } catch { return f; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export function loadDailyTemplates() {
  // Default pool of ≥10 daily challenges (with optional XP overrides)
  const defaults = [
    { title: "Drink 8 glasses of water", xp: 200 },
    { title: "Walk 20 minutes", xp: 250 },
    { title: "Read 10 pages", xp: 250 },
    { title: "Meditate 5 minutes", xp: 220 },
    { title: "Stretch for 10 minutes", xp: 230 },
    { title: "Write a journal entry", xp: 260 },
    { title: "Clean your desk", xp: 200 },
    { title: "Message a friend", xp: 250 },
    { title: "Practice a skill 15 minutes", xp: 280 },
    { title: "Cook a simple meal", xp: 270 },
    { title: "Plan tomorrow in 5 mins", xp: 220 },
  ].map((t, i) => ({ id: `d${i}`, title: t.title, xp: t.xp }));
  return load(K.TPL_D, defaults);
}
export function saveDailyTemplates(arr) { save(K.TPL_D, arr); }

export function loadWeeklyTemplates() {
  // Default pool of ≥10 weekly challenges
  const defaults = [
    { title: "Workout 3 times", xp: 600 },
    { title: "Cook 2 home meals", xp: 550 },
    { title: "Read 70 pages total", xp: 600 },
    { title: "Call family twice", xp: 550 },
    { title: "Declutter one area", xp: 580 },
    { title: "Ship one side-project task", xp: 620 },
    { title: "No sugar for 3 days", xp: 600 },
    { title: "Sleep before 12 for 3 nights", xp: 600 },
    { title: "Learn 3 new concepts", xp: 620 },
    { title: "Walk 20k steps total", xp: 650 },
    { title: "Meet a friend", xp: 550 },
  ].map((t, i) => ({ id: `w${i}`, title: t.title, xp: t.xp }));
  return load(K.TPL_W, defaults);
}
export function saveWeeklyTemplates(arr) { save(K.TPL_W, arr); }

function randomPicks(ids, n) {
  const a = [...ids], p = [];
  while (a.length && p.length < n) p.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  return p;
}

export function ensureTodayState(templates) {
  const key = K.DAY(todayStr());
  const cur = load(key, null);
  if (cur && cur.date === todayStr()) return cur;
  const picks = randomPicks(templates.map(t => t.id), 2);
  const next = { date: todayStr(), picks, completedIds: [] };
  save(key, next);
  return next;
}
export function loadTodayState() { return load(K.DAY(todayStr()), { date: todayStr(), picks: [], completedIds: [] }); }
export function saveTodayState(st) { save(K.DAY(todayStr()), st); }

export function ensureWeekState(templates) {
  const wk = weekKeyOf();
  const key = K.WEEK(wk);
  const cur = load(key, null);
  if (cur && cur.weekKey === wk) return cur;
  const picks = randomPicks(templates.map(t => t.id), 2);
  const next = { weekKey: wk, picks, completedIds: [] };
  save(key, next);
  return next;
}
export function loadWeekState() { return load(K.WEEK(weekKeyOf()), { weekKey: weekKeyOf(), picks: [], completedIds: [] }); }
export function saveWeekState(st) { save(K.WEEK(weekKeyOf()), st); }
