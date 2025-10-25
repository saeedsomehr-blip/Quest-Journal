// src/core/profile.js
// Atomic profile storage + migration from older scattered keys.
import { emitChange } from "../sync/repos.js";

const PROFILE_KEY = "qj_profile_v1";

// Legacy keys (if present)
const LEGACY = {
  multixp: "qj_multixp_state_v1",
  perks: "qj_perks_v1",
  seen: "qj_seen_events_v1",
};

/**
 * Create a default profile object.
 * @param {"normal"|"reset"} mode
 *   - "normal": standard defaults (use for general init/merge)
 *   - "reset" : a *clean* profile for hard resets (no carry-over counters/perks/events)
 */
export function defaultProfile(mode = "normal") {
  const base = {
    // basic identity
    name: "",
    // multi-XP: { xp: {WISDOM:0,...}, lastDecayDate:'YYYY-MM-DD' ... }
    multixp: { xp: {}, lastDecayDate: null, version: 1 },
    // perks: owned ids
    perks: { owned: [], rulesVersion: 1 },
    // events: unlocked once
    events: { seen: [] },
    // meta (streaks / caps etc.)
    meta: { streak: 0, lastActiveDate: null, version: 1 },
  };

  if (mode === "reset") {
    // نسخه‌ی خالص برای ریست کامل؛ اگر جایی خواستی *نام* کاربر را نگه داری،
    // آن را بعد از ساخت این آبجکت رویش set کن.
    return {
      ...base,
      name: "",
      multixp: { xp: {}, lastDecayDate: null, version: 1 },
      perks: { owned: [], rulesVersion: 1 },
      events: { seen: [] },
      meta: { streak: 0, lastActiveDate: null, version: 1 },
    };
  }

  return base;
}

/**
 * Merge given partial profile with defaults, preserving existing fields.
 * (Does not mutate the input)
 */
export function mergeDefaults(p) {
  const d = defaultProfile("normal");
  return {
    ...d,
    ...(p || {}),
    name: typeof p?.name === "string" ? p.name : d.name,
    multixp: { ...d.multixp, ...(p?.multixp || {}) },
    perks: { ...d.perks, ...(p?.perks || {}) },
    events: { ...d.events, ...(p?.events || {}) },
    meta: { ...d.meta, ...(p?.meta || {}) },
  };
}

/**
 * Load profile from localStorage, merged with defaults for safety.
 */
export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return defaultProfile("normal");
    const parsed = JSON.parse(raw);
    return mergeDefaults(parsed);
  } catch {
    return defaultProfile("normal");
  }
}

/**
 * Save a profile atomically to localStorage.
 */
export function saveProfile(p) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    try { emitChange(); } catch {}
  } catch {
    // noop
  }
}

/**
 * Remove the stored profile entirely (helper for hard resets).
 * NOTE: This does not remove legacy scattered keys.
 */
export function clearProfileStorage() {
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    // noop
  }
}

/** One-time migration from legacy scattered keys into atomic profile */
export function migrateProfileFromLegacy() {
  try {
    const existing = localStorage.getItem(PROFILE_KEY);
    if (existing) return; // already migrated

    const prof = defaultProfile("normal");

    // multixp
    const m = localStorage.getItem(LEGACY.multixp);
    if (m) {
      try {
        const mv = JSON.parse(m);
        prof.multixp = { ...prof.multixp, ...(mv || {}) };
      } catch {}
    }

    // perks
    const pr = localStorage.getItem(LEGACY.perks);
    if (pr) {
      try {
        prof.perks.owned = Array.isArray(JSON.parse(pr)) ? JSON.parse(pr) : [];
      } catch {}
    }

    // events
    const ev = localStorage.getItem(LEGACY.seen);
    if (ev) {
      try {
        const sv = JSON.parse(ev);
        prof.events.seen = Array.isArray(sv) ? sv : [];
      } catch {}
    }

    saveProfile(prof);
  } catch {
    /* noop */
  }
}

/**
 * Build a clean reset profile, optionally preserving the current name.
 * Not used automatically; provided as a utility if you need it from Settings.
 */
export function buildResetProfile({ preserveName = false } = {}) {
  const clean = defaultProfile("reset");
  if (!preserveName) return clean;

  try {
    const current = loadProfile();
    return { ...clean, name: current?.name || "" };
  } catch {
    return clean;
  }
}
