// src/core/constants.js

export const QUEST_TYPES = {
  BASIC: { label: "Basic", unit: "h", unlockLvl: 1,  mult: 1.0,  escrow: "none",      capActive: () => Infinity },
  // Open from the start (no gating while adding tasks)
  SIDE:  { label: "Side",  unit: "d", unlockLvl: 1,  mult: 2.0,  escrow: "end",       capActive: () => Infinity },
  MAIN:  { label: "Main",  unit: "w", unlockLvl: 1,  mult: 5.0,  escrow: "milestone", capActive: lvl => (lvl>=8 ? 3 + Math.floor((lvl-8)/2) : 0) },
  // Locked only up to level 5 (unlocks at level 6)
  EPIC:  { label: "Epic",  unit: "m", unlockLvl: 6,  mult: 12.0, escrow: "milestone", capActive: lvl => (lvl>=15 ? 1 + Math.floor((lvl-15)/5) : 0) },
};

// Labels for units
export const QUEST_UNITS_LABEL = {
  h: "hours",
  d: "days",
  w: "weeks",
  m: "months",
};
