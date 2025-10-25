// src/core/multixp.js
// Multi-domain XP: data model + helpers (single source of truth for perks)

import { PERK_RULES } from "./perkRules.data.js";
import { emitChange } from "../sync/repos.js";

export const XP_TYPES = ["WISDOM", "HEALTH", "STRENGTH", "SOCIAL", "TRADE", "ATHLETICS"];
export const XP_META = {
  WISDOM:    { color: "#6366f1", icon: "🧠" },
  HEALTH:    { color: "#22c55e", icon: "💚" },
  STRENGTH:  { color: "#ef4444", icon: "💪" },
  SOCIAL:    { color: "#f59e0b", icon: "🗣️" },
  TRADE:     { color: "#06b6d4", icon: "💼" },
  ATHLETICS: { color: "#10b981", icon: "🏃‍♂️" },
};

const LS_KEY = "qj_multi_xp_v1";
const LEGACY_KEY = "qj_multixp_state_v1";
const TODAY = () => new Date().toISOString().slice(0, 10);

export function xpNeededForLevel(level) { return 50 * level * level; }
export function levelFromXP(xp) {
  let lvl = 0, sum = 0;
  while (true) {
    const need = xpNeededForLevel(lvl + 1);
    if (xp >= sum + need) { sum += need; lvl += 1; } else break;
  }
  const into = xp - sum, span = xpNeededForLevel(lvl + 1);
  return { level: lvl, into, span, nextIn: Math.max(0, span - into) };
}

function blankState() {
  const xp = {}; XP_TYPES.forEach(t => { xp[t] = 0; });
  return {
    xp,
    perks: [],
    perkTiers: {},
    dailyPerks: { date: TODAY(), items: [] },
    synergies: [],
    skillsUnlocked: [],
    lastDecayOn: TODAY(),
  };
}

export function loadMultiXP() {
  try {
    // migrate legacy once
    try {
      const legacyRaw = localStorage.getItem(LEGACY_KEY);
      if (legacyRaw && !localStorage.getItem(LS_KEY)) {
        const legacy = JSON.parse(legacyRaw);
        const migrated = { ...blankState(), ...(legacy || {}) };
        localStorage.setItem(LS_KEY, JSON.stringify(migrated));
        localStorage.removeItem(LEGACY_KEY);
      }
    } catch {}
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return blankState();
    const s = JSON.parse(raw);
    return { ...blankState(), ...s, xp: { ...blankState().xp, ...(s.xp || {}) } };
  } catch { return blankState(); }
}

export function saveMultiXP(s) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
  // Notify sync layer so other devices get updates immediately
  try { emitChange(); } catch {}
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers

function levelsByBranch(state) {
  return Object.fromEntries(XP_TYPES.map(t => [t, levelFromXP(state?.xp?.[t] || 0).level]));
}

function computeSkillPerks(state) {
  const have = new Set(state.perks || []);
  const lvl = levelsByBranch(state);
  const newly = [];
  for (const rule of PERK_RULES) {
    if (rule.kind !== "permanent") continue;
    const { id, requires, source } = rule || {};
    if (!id || have.has(id)) continue;
    if (source?.type !== "skill") continue;
    const need = requires?.branchAt || {};
    let ok = true;
    for (const [branch, at] of Object.entries(need)) {
      if ((lvl[branch] || 0) < (at || 0)) { ok = false; break; }
    }
    if (ok) newly.push(id);
  }
  return newly;
}

export function mergePerksFromAchievements(ach) {
  const s = loadMultiXP();
  const owned = new Set(s.perks || []);
  const tiers = { ...(s.perkTiers || {}) };

  const unlocked = Array.isArray(ach?.unlocked) ? ach.unlocked : [];
  const byId = new Map(unlocked.map(a => [a.id, a]));

  for (const rule of PERK_RULES) {
    if (rule.kind !== "permanent") continue;
    const src = rule.source;
    if (!src || src.type !== "ach") continue;
    const a = byId.get(src.achId);
    if (!a) continue;
    if (!owned.has(rule.id)) owned.add(rule.id);
    if (rule.tiered && Number.isFinite(a.tier)) {
      const prev = tiers[rule.id] || 0;
      tiers[rule.id] = Math.max(prev, a.tier|0);
    }
  }

  const next = { ...s, perks: Array.from(owned), perkTiers: tiers };
  saveMultiXP(next);
  return next;
}

// Daily perks (recomputed from todayStats)
export function recomputeDailyPerks(todayStats = {}) {
  const s = loadMultiXP();
  const today = TODAY();
  const items = [];
  for (const rule of PERK_RULES) {
    if (rule.kind !== "daily") continue;
    const f = rule.dailyCompute;
    if (typeof f !== "function") continue;
    const eff = f({ todayStats });
    if (eff && (eff.globalMult || eff.branchMult)) {
      items.push({ id: rule.id, effects: eff });
    }
  }
  const next = { ...s, dailyPerks: { date: today, items } };
  saveMultiXP(next);
  return next;
}

// Synergies
const SYNERGY_RULES = [
  { id:"WISDOMxSOCIAL_I",   a:"WISDOM",   b:"SOCIAL",   minA:5, minB:5 },
  { id:"STRENGTHxHEALTH_I", a:"STRENGTH", b:"HEALTH",   minA:5, minB:5 },
  { id:"TRADExSOCIAL_I",    a:"TRADE",    b:"SOCIAL",   minA:6, minB:6 },
];
function computeSynergies(state) {
  const have = new Set(state.synergies || []);
  const lvl = levelsByBranch(state);
  const newly = [];
  for (const r of SYNERGY_RULES) {
    if (have.has(r.id)) continue;
    if ((lvl[r.a]||0) >= r.minA && (lvl[r.b]||0) >= r.minB) newly.push(r.id);
  }
  return newly;
}

// Daily decay
const DECAY = { HEALTH:{ perDay:1, min:0 }, ATHLETICS:{ perDay:1, min:0 } };
export function applyDailyDecay(state, today = TODAY()) {
  if (state.lastDecayOn === today) return { state, changed:false };
  const prev = new Date(state.lastDecayOn), cur = new Date(today);
  const days = Math.max(0, Math.round((cur - prev)/86400000));
  if (days <= 0) { state.lastDecayOn = today; return { state, changed:false }; }
  const next = { ...state, xp:{ ...state.xp }, lastDecayOn: today };
  for (const k of Object.keys(DECAY)) {
    const cut = DECAY[k].perDay * days;
    next.xp[k] = Math.max(DECAY[k].min, (next.xp[k]||0) - cut);
  }
  return { state: next, changed:true, days };
}

// ────────────────────────────────────────────────────────────────────────────
// Normalization for awards map

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
  for (const [k, vRaw] of Object.entries(awards)) {
    if (vRaw == null) continue;
    const n = Math.max(0, parseInt(vRaw, 10) || 0);
    if (n <= 0) continue;

    const keyUpper = (k || "").toString().toUpperCase();
    const mapped = XP_TYPES.includes(keyUpper)
      ? keyUpper
      : ALIASES[(k || "").toString().toLowerCase()] || null;

    if (!mapped) continue;                 // drop unknown keys
    if (!XP_TYPES.includes(mapped)) continue;

    out[mapped] = (out[mapped] || 0) + n;  // merge same branch
  }
  return out;
}

// Apply multipliers (permanent + daily + synergy) strictly to present keys
function withPerkBoosts(state, awards) {
  const baseAwards = normalizeAwardsMap(awards);
  const out = { ...baseAwards }; // ONLY keys present in awards

  // 1) permanent perks
  let globalMul = 1.0;
  const branchMul = Object.fromEntries(XP_TYPES.map(t => [t, 1.0]));
  const active = new Set(state.perks || []);
  for (const id of active) {
    const rule = PERK_RULES.find(r => r.id === id);
    if (!rule) continue;

    const eff = rule.effects;
    if (eff) {
      if (typeof eff.globalMult === "number") globalMul *= eff.globalMult;
      if (eff.branchMult && typeof eff.branchMult === "object") {
        for (const [k, m] of Object.entries(eff.branchMult)) {
          if (typeof m === "number" && branchMul[k] != null) branchMul[k] *= m;
        }
      }
    }

    if (rule.tiered) {
      const tier = (state.perkTiers?.[id] || 1) | 0;
      if (tier >= 1) {
        const base = rule.tiered.baseMult || 1.0;
        const step = rule.tiered.perTier || 0.0;
        const m = base * (1 + (tier - 1) * step);
        const branch = rule.tiered.branch;
        if (branch) {
          if (branchMul[branch] != null) branchMul[branch] *= m;
        } else {
          globalMul *= m;
        }
      }
    }
  }

  // 2) daily perks (precomputed)
  const today = TODAY();
  const daily = (state.dailyPerks?.date === today) ? (state.dailyPerks.items || []) : [];
  for (const it of daily) {
    const eff = it.effects || {};
    if (typeof eff.globalMult === "number") globalMul *= eff.globalMult;
    if (eff.branchMult && typeof eff.branchMult === "object") {
      for (const [k, m] of Object.entries(eff.branchMult)) {
        if (typeof m === "number" && branchMul[k] != null) branchMul[k] *= m;
      }
    }
  }

  // 3) synergies (only multiplier on present keys)
  const hasSyn = new Set(state.synergies || []);
  const synergyMul = (t) => {
    let m = 1.0;
    if (hasSyn.has("WISDOMxSOCIAL_I")   && t === "SOCIAL")   m *= 1.05;
    if (hasSyn.has("STRENGTHxHEALTH_I") && t === "STRENGTH") m *= 1.05;
    if (hasSyn.has("TRADExSOCIAL_I")    && t === "TRADE")    m *= 1.05;
    return m;
  };

  // 4) apply (STRICT: only existing keys)
  for (const t of Object.keys(out)) {
    const base = Math.max(0, out[t] | 0);
    const mul  = globalMul * (branchMul[t] || 1.0) * synergyMul(t);
    out[t] = Math.round(base * mul);
  }

  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// PUBLIC: applyAwards — uses provided state (no hidden load), filters keys strictly

export function applyAwards(state, awardsMap) {
  const s = state && typeof state === "object" ? state : loadMultiXP();
  const boosted = withPerkBoosts(s, awardsMap);

  const next = { ...s, xp: { ...s.xp } };
  for (const [k, v] of Object.entries(boosted)) {
    if (!XP_TYPES.includes(k)) continue;        // guard (extra safety)
    next.xp[k] = Math.max(0, (next.xp[k] || 0) + Math.max(0, v | 0));
  }

  // skill unlocks + synergies
  const perksNew = computeSkillPerks(next);
  const synNew   = computeSynergies(next);
  if (perksNew.length) next.perks = [...new Set([...(next.perks||[]), ...perksNew])];
  if (synNew.length)   next.synergies = [...new Set([...(next.synergies||[]), ...synNew])];

  saveMultiXP(next);
  return { state: next, perksNew, synNew, awarded: boosted };
}

// ────────────────────────────────────────────────────────────────────────────
// Buff breakdown (unchanged except it reads current state)
export function computeBuffBreakdown(state) {
  const today = TODAY();
  const out = {
    globalMul: 1.0,
    branchMul: Object.fromEntries(XP_TYPES.map(t => [t, 1.0])),
    items: [],
  };

  const active = new Set(state.perks || []);
  for (const id of active) {
    const rule = PERK_RULES.find(r => r.id === id);
    if (!rule) continue;
    const label = rule.label || id;

    const eff = rule.effects;
    if (eff) {
      if (typeof eff.globalMult === "number") {
        out.globalMul *= eff.globalMult;
        out.items.push({ id, label, kind:"permanent", scope:"global", mult: eff.globalMult, source: rule.source?.type || "skill" });
      }
      if (eff.branchMult && typeof eff.branchMult === "object") {
        for (const [k, m] of Object.entries(eff.branchMult)) {
          if (typeof m === "number" && out.branchMul[k] != null) {
            out.branchMul[k] *= m;
            out.items.push({ id: `${id}:${k}`, label, kind:"permanent", scope:"branch", branch:k, mult:m, source: rule.source?.type || "skill" });
          }
        }
      }
    }

    if (rule.tiered) {
      const tier = (state.perkTiers?.[id] || 1) | 0;
      if (tier >= 1) {
        const base  = rule.tiered.baseMult || 1.0;
        const step  = rule.tiered.perTier || 0.0;
        const mult  = base * (1 + (tier - 1) * step);
        const brKey = rule.tiered.branch;
        if (brKey) {
          out.branchMul[brKey] = (out.branchMul[brKey] || 1.0) * mult;
          out.items.push({ id: `${id}:tier:${brKey}`, label: `${label} (Tier ${tier})`, kind:"permanent", scope:"branch", branch:brKey, mult, source:"ach" });
        } else {
          out.globalMul *= mult;
          out.items.push({ id: `${id}:tier`, label: `${label} (Tier ${tier})`, kind:"permanent", scope:"global", mult, source:"ach" });
        }
      }
    }
  }

  const daily = (state.dailyPerks?.date === today) ? (state.dailyPerks.items || []) : [];
  for (const it of daily) {
    const label = (PERK_RULES.find(r => r.id === it.id)?.label) || it.id;
    const eff = it.effects || {};
    if (typeof eff.globalMult === "number") {
      out.globalMul *= eff.globalMult;
      out.items.push({ id:`daily:${it.id}`, label, kind:"daily", scope:"global", mult:eff.globalMult, source:"daily" });
    }
    if (eff.branchMult && typeof eff.branchMult === "object") {
      for (const [k, m] of Object.entries(eff.branchMult)) {
        if (typeof m === "number" && out.branchMul[k] != null) {
          out.branchMul[k] *= m;
          out.items.push({ id:`daily:${it.id}:${k}`, label, kind:"daily", scope:"branch", branch:k, mult:m, source:"daily" });
        }
      }
    }
  }

  const has = new Set(state.synergies || []);
  const synergyDefs = [
    { id:"WISDOMxSOCIAL_I", branch:"SOCIAL", mult:1.05, label:"Wisdom×Social I" },
    { id:"STRENGTHxHEALTH_I", branch:"STRENGTH", mult:1.05, label:"Strength×Health I" },
    { id:"TRADExSOCIAL_I", branch:"TRADE", mult:1.05, label:"Trade×Social I" },
  ];
  for (const syn of synergyDefs) {
    if (has.has(syn.id) && out.branchMul[syn.branch] != null) {
      out.branchMul[syn.branch] *= syn.mult;
      out.items.push({ id:syn.id, label:syn.label, kind:"synergy", scope:"branch", branch:syn.branch, mult:syn.mult, source:"synergy" });
    }
  }

  return out;
}
