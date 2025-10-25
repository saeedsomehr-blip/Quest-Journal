// src/core/skills.js
// Simple skill nodes; you can wire a UI with react-flow later.

export const SKILLS = [
  { id:"wis_fast_read",   name:"Speed Reading",    icon:"📘", req:{ WISDOM:{level:5} },          grants:{ perk:"FAST_LEARNER" } },
  { id:"soc_small_talk",  name:"Small Talk",       icon:"💬", req:{ SOCIAL:{level:4} },          grants:{ xpBoost:{ SOCIAL:0.05 } } },
  { id:"ath_endurance",   name:"Endurance I",      icon:"🏃", req:{ ATHLETICS:{level:5}, HEALTH:{level:4} }, grants:{ xpBoost:{ ATHLETICS:0.05 } } },
  { id:"str_power",       name:"Power I",          icon:"🧱", req:{ STRENGTH:{level:6} },        grants:{ xpBoost:{ STRENGTH:0.05 } } },
  { id:"trade_barter",    name:"Barter",           icon:"🤝", req:{ TRADE:{level:6}, SOCIAL:{level:6} }, grants:{ xpBoost:{ TRADE:0.05 } } },
];

// Simple checker
export function canUnlock(skill, levels, owned=[]) {
  if (owned.includes(skill.id)) return false;
  for (const [k,cond] of Object.entries(skill.req||{})) {
    if ((levels[k]||0) < (cond.level||0)) return false;
  }
  return true;
}
