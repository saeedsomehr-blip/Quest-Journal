// src/core/xpSuggest.js
// XP پیشنهادی با خروجی بزرگ‌تر، تاثیر محسوس‌تر اسلایدرها، و اثر ملایم‌تر زمان
// + اکسپورت stepFor برای اسلایدرهای UI

import { QUEST_TYPES, QUEST_UNITS_LABEL } from "./constants.js";

/* --- پیکربندی --- */

// اثر ملایم زمان (log2) با ضرایب پایین‌تر
const TIME_K = {
  BASIC: 0.15,  // hours
  SIDE:  0.20,  // days
  MAIN:  0.25,  // weeks
  EPIC:  0.30,  // months
};

// پایه‌ی مقیاس: در Basic با ورودی‌های متوسط ~350 XP
const BASE_CONST = 150;

// مقیاس نهایی (اگر خواستی نمایشی ×5 کنی، اینو 5 بگذار)
const DISPLAY_SCALE = 1;

/* --- کمک‌ها --- */

function clamp01(x) {
  const n = Number(x) || 0;
  return Math.min(1, Math.max(0.01, n));
}

/**
 * امتیاز ذهنی تقویت‌شده:
 * - وزن‌ها مثل قبل (اهمیت پررنگ‌تر)
 * - سپس تقویت غیرخطی تا اثر اسلایدرها محسوس شود
 * دامنه تقریباً ~0.45 .. ~3.0
 */
function mentalScoreAmplified({
  difficulty = 50,
  importance = 50,
  energy = 50,
  pride = 50,
} = {}) {
  const d = clamp01(difficulty / 100);
  const i = clamp01(importance  / 100);
  const e = clamp01(energy     / 100);
  const p = clamp01(pride      / 100);

  const S = 0.35 * i + 0.25 * p + 0.20 * d + 0.20 * e; // ~0.01..1
  // تقویت غیرخطی: تغییر اسلایدرها تاثیر محسوسی روی خروجی داشته باشد
  const amplified = 0.1 + 2.6 * Math.pow(S, 1.5);
  return amplified;
}

/**
 * اثر زمان (ملایم):
 * T = 1 + k * log2(1 + units)  ∈ [1 .. 1.8]
 */
function timeFactor(questType, duration) {
  const k = TIME_K[questType] ?? 0.2;
  const u = Math.max(0.25, Number(duration) || 0.25);
  const tf = 1 + k * Math.log2(1 + u);
  return Math.min(tf, 2.8);
}

/* --- باند --- */

export function band20(xp) {
  const d = Math.max(1, Math.round(xp * 0.20));
  return { min: Math.max(1, xp - d), max: xp + d };
}

// (گزینه‌ی باند پویا - فعلاً استفاده نمی‌کنیم)
export function bandPct(xp) {
  if (xp < 500)   return 0.15;
  if (xp < 10000) return 0.25;
  return 0.35;
}
export function bandFor(xp) {
  const p = bandPct(xp);
  const min = Math.max(1, Math.round(xp * (1 - p)));
  const max = Math.max(min, Math.round(xp * (1 + p)));
  return { min, max };
}

/* --- گام اسلایدر (برای UI) --- */
/**
 * stepFor(xp): گام مناسب برای اسلایدر‌های range/number
 * بازه‌های پله‌ای انتخاب شده تا اسلایدر هم نرم باشد و هم سریع بالا/پایین برود.
 */
export function stepFor(xp) {
  const x = Math.max(0, Number(xp) || 0);
  if (x < 200)   return 5;
  if (x < 1000)  return 10;
  if (x < 5000)  return 25;
  if (x < 20000) return 50;
  return 100;
}

/* --- اصلی --- */

export function suggestXP({
  questType = "BASIC",
  duration = 1,
  sliders = {},
  level = 1,
} = {}) {
  const t = QUEST_TYPES[questType] || QUEST_TYPES.BASIC;

  // 1) ذهنی تقویت‌شده
  const M = mentalScoreAmplified(sliders);     // ~0.45..3.0

  // 2) زمان ملایم
  const T = timeFactor(questType, duration);   // ~1..1.8

  // 3) ضریب نوع کوئست
  const Q = t?.mult ?? 1;

  // 4) LevelFactor ملایم
  const lvl = Math.max(1, Number(level) || 1);
  const L  = 1 + (lvl / 50);

  // 5) هسته‌ی محاسبه
  const raw = BASE_CONST * M * T * Q * L;

  // 6) رُند به مضرب 5 + مقیاس نهایی
  const rounded5 = Math.max(1, Math.round(raw / 5) * 5);
  const finalXP  = Math.max(1, Math.round(rounded5 * DISPLAY_SCALE));

  return finalXP;
}
