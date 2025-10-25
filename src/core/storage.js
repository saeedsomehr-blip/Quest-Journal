// src/core/storage.js

/**
 * Unified local storage helpers with migration from older keys.
 * - Canonical keys: qj_tasks, qj_xp, qj_lists, qj_active_list
 * - Migrates from legacy: qj_tasks_v2, qj_xp_v1, qj_lists_v1, qj_active_list_v1
 * - All ops wrapped in try/catch to handle Safari Private Mode gracefully.
 *
 * ✨ Updates:
 * - Default lists unified with App: ["all","main","side","contracts","inbox"]
 * - loadActiveListId default → "main" (and verified to exist)
 * - Guard to ensure required lists ("all","inbox") always exist
 */

const CANON = {
  TASKS: "qj_tasks",
  XP: "qj_xp",
  LISTS: "qj_lists",
  ACTIVE: "qj_active_list",
};

const LEGACY = {
  TASKS: ["qj_tasks_v2"],
  XP: ["qj_xp_v1"],
  LISTS: ["qj_lists_v1"],
  ACTIVE: ["qj_active_list_v1"],
};

const MIGRATION_FLAG = "qj_storage_migrated_v2";

// App-wide unified defaults (kept here too to avoid mismatches)
const DEFAULT_LISTS_UNIFIED = [
  { id: "all",       name: "All Quests" },
  { id: "main",      name: "main quests" },
  { id: "side",      name: "side quests" },
  { id: "contracts", name: "contracts" },
  { id: "inbox",     name: "Inbox" },
];

/* ------------------ low-level helpers ------------------ */
function getItem(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function setItem(key, val) {
  try { localStorage.setItem(key, val); } catch {}
}
function removeItem(key) {
  try { localStorage.removeItem(key); } catch {}
}

function getJSON(key, fallback) {
  try {
    const raw = getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function setJSON(key, obj) {
  try { setItem(key, JSON.stringify(obj)); } catch {}
}

/* ------------------ list normalization ------------------ */
function toValidListEntry(x) {
  const id = String(x?.id ?? "").trim();
  const name = String(x?.name ?? "").trim();
  if (!id || !name) return null;
  return { id, name };
}
function ensureRequiredListsPresent(arr) {
  // make sure "all" and "inbox" exist (UI and filters rely on them)
  const ids = new Set(arr.map(x => x.id));
  const required = [
    { id: "all",   name: "All Quests" },
    { id: "inbox", name: "Inbox" },
  ];
  for (const r of required) {
    if (!ids.has(r.id)) arr.push(r);
  }
  return dedupeById(arr);
}
function dedupeById(arr) {
  const seen = new Set();
  const out = [];
  for (const it of arr) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}
function normalizeLists(arr) {
  // Accept only valid entries
  const cleaned = (Array.isArray(arr) ? arr : []).map(toValidListEntry).filter(Boolean);
  if (!cleaned.length) {
    // fallback to unified defaults
    return [...DEFAULT_LISTS_UNIFIED];
  }
  // keep user custom lists but guarantee required ones
  return ensureRequiredListsPresent(cleaned);
}

/* ------------------ migration ------------------ */
function migrateOnce() {
  try {
    if (getItem(MIGRATION_FLAG)) return;

    // tasks
    if (!getItem(CANON.TASKS)) {
      for (const k of LEGACY.TASKS) {
        const v = getItem(k);
        if (v) { setItem(CANON.TASKS, v); break; }
      }
    }
    // xp
    if (!getItem(CANON.XP)) {
      for (const k of LEGACY.XP) {
        const v = getItem(k);
        if (v) { setItem(CANON.XP, v); break; }
      }
    }
    // lists
    // If nothing present, we won't bring legacy minimalist lists as-is; we will normalize later.
    if (!getItem(CANON.LISTS)) {
      for (const k of LEGACY.LISTS) {
        const v = getItem(k);
        if (v) { setItem(CANON.LISTS, v); break; }
      }
    }
    // active list
    if (!getItem(CANON.ACTIVE)) {
      for (const k of LEGACY.ACTIVE) {
        const v = getItem(k);
        if (v) { setItem(CANON.ACTIVE, v); break; }
      }
    }

    // optional: clean legacy (only if canonical exists now)
    if (getItem(CANON.TASKS)) LEGACY.TASKS.forEach(removeItem);
    if (getItem(CANON.XP)) LEGACY.XP.forEach(removeItem);
    if (getItem(CANON.LISTS)) LEGACY.LISTS.forEach(removeItem);
    if (getItem(CANON.ACTIVE)) LEGACY.ACTIVE.forEach(removeItem);

    setItem(MIGRATION_FLAG, "1");
  } catch {
    // ignore migration failures silently
  }
}
migrateOnce();

/* ------------------ public API ------------------ */

// tasks
export function loadTasks() {
  const arr = getJSON(CANON.TASKS, []);
  return Array.isArray(arr) ? arr : [];
}
export function saveTasks(arr) {
  setJSON(CANON.TASKS, Array.isArray(arr) ? arr : []);
}

// xp
export function loadXP() {
  const n = Number(getItem(CANON.XP));
  return Number.isFinite(n) ? n : 0;
}
export function saveXP(xp) {
  setItem(CANON.XP, String(Number.isFinite(xp) ? xp : 0));
}

// lists
export function loadLists() {
  // Start from stored value or unified defaults
  const stored = getJSON(CANON.LISTS, null);
  const normalized = normalizeLists(stored ?? DEFAULT_LISTS_UNIFIED);
  return normalized;
}
export function saveLists(ls) {
  // Normalize on write as well, to keep invariants
  const incoming = Array.isArray(ls) ? ls : [];
  const cleaned = normalizeLists(incoming);
  setJSON(CANON.LISTS, cleaned);
}

// active list id (verified against current list set)
export function loadActiveListId() {
  // Prefer "main" to match App's expectation, but verify existence
  let v = getItem(CANON.ACTIVE) || "main";
  try {
    const lists = loadLists();
    const has = lists.some(x => x?.id === v);
    if (!has) {
      // fallback preference: "main" → "inbox" → first available
      if (lists.some(x => x.id === "main")) v = "main";
      else if (lists.some(x => x.id === "inbox")) v = "inbox";
      else v = (lists[0]?.id) || "main";
    }
  } catch {
    // if any failure, keep v as-is
  }
  return v;
}
export function saveActiveListId(id) {
  setItem(CANON.ACTIVE, String(id || "main"));
}

/* ------------------ OPTIONAL helpers (if you need them) ------------------ */
/**
 * readUpdatedAt / writeUpdatedAt:
 * اگر خواستی برچسب زمان محلی یکپارچه داشته باشی، می‌تونی این‌ها رو استفاده کنی.
 * الان App.jsx نسخهٔ خودش رو دارد؛ این‌ها برای استفادهٔ آینده گذاشته شده‌اند.
 */
const UPDATED_KEY = "qj_last_local_updated";
export function readUpdatedAt() {
  const n = Number(getItem(UPDATED_KEY));
  return Number.isFinite(n) ? n : 0;
}
export function writeUpdatedAt(ts = Date.now()) {
  setItem(UPDATED_KEY, String(ts));
}
