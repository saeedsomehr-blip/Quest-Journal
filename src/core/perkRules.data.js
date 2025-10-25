// src/core/perkRules.data.js
// قواعد پرک‌ها — منبع واحد برای همه‌ی perkها (Skill + Achievement + Daily)
//
// نکته‌ها:
// - برای نودهای Skill، idها دقیقاً با id نودهای SkillForest یکسان نگه داشته شده‌اند
//   تا Owned شدن‌شان ساده باشد (perks.includes(node.id)).
// - برای Achievements، مقدار `achId` باید با IDهای واقعی کاتالوگ شما (ACH_CATALOG) هماهنگ شود.
// - پرک‌های Daily فقط چارچوب‌شان اینجاست؛ اثر روزانه در multixp.recomputeDailyPerks محاسبه و ذخیره می‌شود.

import { BR } from "./branches.js";

/**
 * هر Rule می‌تواند یکی از این شکل‌ها باشد:
 * {
 *   id: "wis_learner",
 *   label: "Learner",
 *   source: { type: "skill", nodeId: "wis_learner" } | { type: "ach", achId: "early_bird" } | { type: "daily" },
 *   kind: "permanent" | "daily",
 *   requires?: { branchAt?: { [BR.X]: levelNumber } },   // برای skill-based unlock
 *   effects?: { globalMult?: number, branchMult?: { [BR.X]: number } }, // اثر ثابت
 *   // برای اچیومنت‌های tiered:
 *   tiered?: { baseMult: number, perTier: number, branch?: keyof typeof BR }, // اگر branch نداشته باشد، اثر global است
 *   // برای پرک‌های روزانه:
 *   dailyCompute?: (ctx) => ({ globalMult?: number, branchMult?: Record<string, number> } | null)
 * }
 */

export const PERK_RULES = [
  // ───────────────────────────────────────────────────────────────────────────
  // SKILL NODES → Permanent Perks (idها با SkillForest یکی است)

  // Wisdom
  {
    id: "wis_learner",
    label: "Learner",
    source: { type: "skill", nodeId: "wis_learner" },
    kind: "permanent",
    requires: { branchAt: { [BR.WISDOM]: 5 } },
    effects: { branchMult: { [BR.WISDOM]: 1.10 } }, // +10% Wisdom XP
  },
  {
    id: "wis_scholar",
    label: "Scholar",
    source: { type: "skill", nodeId: "wis_scholar" },
    kind: "permanent",
    requires: { branchAt: { [BR.WISDOM]: 10 } },
    effects: { branchMult: { [BR.WISDOM]: 1.10 } },
  },
  {
    id: "wis_sage",
    label: "Sage",
    source: { type: "skill", nodeId: "wis_sage" },
    kind: "permanent",
    requires: { branchAt: { [BR.WISDOM]: 20 } },
    effects: { branchMult: { [BR.WISDOM]: 1.10 } },
  },

  // Strength
  {
    id: "str_grit",
    label: "Grit",
    source: { type: "skill", nodeId: "str_grit" },
    kind: "permanent",
    requires: { branchAt: { [BR.STRENGTH]: 5 } },
    effects: { branchMult: { [BR.STRENGTH]: 1.10 } },
  },
  {
    id: "str_brute",
    label: "Brute",
    source: { type: "skill", nodeId: "str_brute" },
    kind: "permanent",
    requires: { branchAt: { [BR.STRENGTH]: 10 } },
    effects: { branchMult: { [BR.STRENGTH]: 1.10 } },
  },
  {
    id: "str_gladiator",
    label: "Gladiator",
    source: { type: "skill", nodeId: "str_gladiator" },
    kind: "permanent",
    requires: { branchAt: { [BR.STRENGTH]: 20 } },
    effects: { branchMult: { [BR.STRENGTH]: 1.10 } },
  },

  // Social
  {
    id: "soc_charm",
    label: "Charm",
    source: { type: "skill", nodeId: "soc_charm" },
    kind: "permanent",
    requires: { branchAt: { [BR.SOCIAL]: 5 } },
    effects: { branchMult: { [BR.SOCIAL]: 1.10 } },
  },
  {
    id: "soc_orator",
    label: "Orator",
    source: { type: "skill", nodeId: "soc_orator" },
    kind: "permanent",
    requires: { branchAt: { [BR.SOCIAL]: 12 } },
    effects: { branchMult: { [BR.SOCIAL]: 1.10 } },
  },
  {
    id: "soc_diplomat",
    label: "Diplomat",
    source: { type: "skill", nodeId: "soc_diplomat" },
    kind: "permanent",
    requires: { branchAt: { [BR.SOCIAL]: 20 } },
    effects: { branchMult: { [BR.SOCIAL]: 1.10 } },
  },

  // Trade
  {
    id: "trd_haggler",
    label: "Haggler",
    source: { type: "skill", nodeId: "trd_haggler" },
    kind: "permanent",
    requires: { branchAt: { [BR.TRADE]: 5 } },
    effects: { branchMult: { [BR.TRADE]: 1.10 } },
  },
  {
    id: "trd_broker",
    label: "Broker",
    source: { type: "skill", nodeId: "trd_broker" },
    kind: "permanent",
    requires: { branchAt: { [BR.TRADE]: 12 } },
    effects: { branchMult: { [BR.TRADE]: 1.10 } },
  },
  {
    id: "trd_magnate",
    label: "Magnate",
    source: { type: "skill", nodeId: "trd_magnate" },
    kind: "permanent",
    requires: { branchAt: { [BR.TRADE]: 20 } },
    effects: { branchMult: { [BR.TRADE]: 1.10 } },
  },

  // Health
  {
    id: "hlt_focus",
    label: "Focus",
    source: { type: "skill", nodeId: "hlt_focus" },
    kind: "permanent",
    requires: { branchAt: { [BR.HEALTH]: 5 } },
    effects: { branchMult: { [BR.HEALTH]: 1.10 } },
  },
  {
    id: "hlt_resolve",
    label: "Resolve",
    source: { type: "skill", nodeId: "hlt_resolve" },
    kind: "permanent",
    requires: { branchAt: { [BR.HEALTH]: 12 } },
    effects: { branchMult: { [BR.HEALTH]: 1.10 } },
  },
  {
    id: "hlt_ironbody",
    label: "Iron Body",
    source: { type: "skill", nodeId: "hlt_ironbody" },
    kind: "permanent",
    requires: { branchAt: { [BR.HEALTH]: 20 } },
    effects: { branchMult: { [BR.HEALTH]: 1.10 } },
  },

  // Athletics
  {
    id: "ath_sprint",
    label: "Sprint",
    source: { type: "skill", nodeId: "ath_sprint" },
    kind: "permanent",
    requires: { branchAt: { [BR.ATHLETICS]: 5 } },
    effects: { branchMult: { [BR.ATHLETICS]: 1.10 } },
  },
  {
    id: "ath_agile",
    label: "Agile",
    source: { type: "skill", nodeId: "ath_agile" },
    kind: "permanent",
    requires: { branchAt: { [BR.ATHLETICS]: 12 } },
    effects: { branchMult: { [BR.ATHLETICS]: 1.10 } },
  },
  {
    id: "ath_swift",
    label: "Swift",
    source: { type: "skill", nodeId: "ath_swift" },
    kind: "permanent",
    requires: { branchAt: { [BR.ATHLETICS]: 20 } },
    effects: { branchMult: { [BR.ATHLETICS]: 1.10 } },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ACHIEVEMENTS → Tiered Permanent Perks
  // Achievement-based perks (matching real ACH_CATALOG IDs)
  
  // Social achievements
  {
    id: "ach_friendly_face",
    label: "Friendly Face",
    source: { type: "ach", achId: "soc_1" },
    kind: "permanent",
    tiered: { baseMult: 1.05, perTier: 0.025, branch: BR.SOCIAL },
  },
  {
    id: "ach_social_star",
    label: "Social Star",
    source: { type: "ach", achId: "soc_5" },
    kind: "permanent",
    tiered: { baseMult: 1.05, perTier: 0.025, branch: BR.SOCIAL },
  },
  {
    id: "ach_community_leader",
    label: "Community Leader",
    source: { type: "ach", achId: "soc_10" },
    kind: "permanent",
    tiered: { baseMult: 1.05, perTier: 0.025, branch: BR.SOCIAL },
  },

  // Learning achievements
  {
    id: "ach_curious_mind",
    label: "Curious Mind",
    source: { type: "ach", achId: "learn_1" },
    kind: "permanent",
    tiered: { baseMult: 1.05, perTier: 0.025, branch: BR.WISDOM },
  },
  {
    id: "ach_knowledge_seeker",
    label: "Knowledge Seeker",
    source: { type: "ach", achId: "learn_5" },
    kind: "permanent",
    tiered: { baseMult: 1.05, perTier: 0.025, branch: BR.WISDOM },
  },
  {
    id: "ach_wise_scholar",
    label: "Wise Scholar",
    source: { type: "ach", achId: "learn_10" },
    kind: "permanent",
    tiered: { baseMult: 1.05, perTier: 0.025, branch: BR.WISDOM },
  },

  // Health achievements
  {
    id: "ach_wellness_beginner",
    label: "Wellness Beginner",
    source: { type: "ach", achId: "health_1" },
    kind: "permanent",
    tiered: { baseMult: 1.05, perTier: 0.025, branch: BR.HEALTH },
  },
  {
    id: "ach_vitality_booster",
    label: "Vitality Booster",
    source: { type: "ach", achId: "health_5" },
    kind: "permanent",
    tiered: { baseMult: 1.05, perTier: 0.025, branch: BR.HEALTH },
  },
  {
    id: "ach_health_guru",
    label: "Health Guru",
    source: { type: "ach", achId: "health_10" },
    kind: "permanent",
    tiered: { baseMult: 1.05, perTier: 0.025, branch: BR.HEALTH },
  },

  // Productivity achievements
  {
    id: "ach_task_starter",
    label: "Task Starter",
    source: { type: "ach", achId: "prod_1" },
    kind: "permanent",
    tiered: { baseMult: 1.03, perTier: 0.01 }, // Global multiplier
  },
  {
    id: "ach_task_sprinter",
    label: "Task Sprinter",
    source: { type: "ach", achId: "prod_3" },
    kind: "permanent",
    tiered: { baseMult: 1.03, perTier: 0.01 }, // Global multiplier
  },
  {
    id: "ach_task_master",
    label: "Task Master",
    source: { type: "ach", achId: "prod_5" },
    kind: "permanent",
    tiered: { baseMult: 1.03, perTier: 0.01 }, // Global multiplier
  },
  {
    id: "ach_productivity_legend",
    label: "Productivity Legend",
    source: { type: "ach", achId: "prod_10" },
    kind: "permanent",
    tiered: { baseMult: 1.03, perTier: 0.01 }, // Global multiplier
  },

  // Time achievements
  {
    id: "ach_early_bird",
    label: "Early Bird",
    source: { type: "ach", achId: "time_early" },
    kind: "permanent",
    tiered: { baseMult: 1.05, perTier: 0.025, branch: BR.WISDOM },
  },
  {
    id: "ach_night_owl",
    label: "Night Owl",
    source: { type: "ach", achId: "time_night" },
    kind: "permanent",
    tiered: { baseMult: 1.05, perTier: 0.025, branch: BR.STRENGTH },
  },

  // Strength achievements
  {
    id: "ach_iron_start",
    label: "Iron Start",
    source: { type: "ach", achId: "str_1" },
    kind: "permanent",
    tiered: { baseMult: 1.04, perTier: 0.02, branch: BR.STRENGTH },
  },
  {
    id: "ach_hard_hitter",
    label: "Hard Hitter",
    source: { type: "ach", achId: "str_5" },
    kind: "permanent",
    tiered: { baseMult: 1.05, perTier: 0.025, branch: BR.STRENGTH },
  },
  {
    id: "ach_powerhouse",
    label: "Powerhouse",
    source: { type: "ach", achId: "str_10" },
    kind: "permanent",
    tiered: { baseMult: 1.06, perTier: 0.03, branch: BR.STRENGTH },
  },
  {
    id: "ach_titan",
    label: "Titan",
    source: { type: "ach", achId: "str_20" },
    kind: "permanent",
    tiered: { baseMult: 1.07, perTier: 0.035, branch: BR.STRENGTH },
  },

  // Trade achievements
  {
    id: "ach_deal_maker",
    label: "Deal Maker",
    source: { type: "ach", achId: "trd_1" },
    kind: "permanent",
    tiered: { baseMult: 1.04, perTier: 0.02, branch: BR.TRADE },
  },
  {
    id: "ach_market_mover",
    label: "Market Mover",
    source: { type: "ach", achId: "trd_5" },
    kind: "permanent",
    tiered: { baseMult: 1.05, perTier: 0.025, branch: BR.TRADE },
  },
  {
    id: "ach_rainmaker",
    label: "Rainmaker",
    source: { type: "ach", achId: "trd_10" },
    kind: "permanent",
    tiered: { baseMult: 1.06, perTier: 0.03, branch: BR.TRADE },
  },
  {
    id: "ach_tycoon",
    label: "Tycoon",
    source: { type: "ach", achId: "trd_20" },
    kind: "permanent",
    tiered: { baseMult: 1.07, perTier: 0.035, branch: BR.TRADE },
  },

  // Athletics achievements
  {
    id: "ach_quick_feet",
    label: "Quick Feet",
    source: { type: "ach", achId: "ath_1" },
    kind: "permanent",
    tiered: { baseMult: 1.04, perTier: 0.02, branch: BR.ATHLETICS },
  },
  {
    id: "ach_trail_runner",
    label: "Trail Runner",
    source: { type: "ach", achId: "ath_5" },
    kind: "permanent",
    tiered: { baseMult: 1.05, perTier: 0.025, branch: BR.ATHLETICS },
  },
  {
    id: "ach_road_warrior",
    label: "Road Warrior",
    source: { type: "ach", achId: "ath_10" },
    kind: "permanent",
    tiered: { baseMult: 1.055, perTier: 0.028, branch: BR.ATHLETICS },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // DAILY PERKS (Framework) — اثرشان هر روز براساس todayStats محاسبه می‌شود
  // این قواعد ثابت‌اند، ولی خروجی روزانه در multixp.recomputeDailyPerks تولید می‌شود.

  {
    id: "daily_momentum",
    label: "Momentum (Daily)",
    source: { type: "daily" },
    kind: "daily",
    // هر ۵ کارِ امروز → +۵٪ Global (سقف +۲۰٪)
    dailyCompute: ({ todayStats }) => {
      const steps = Math.floor((todayStats.doneTasks || 0) / 5);
      const boost = Math.min(0.20, steps * 0.05);
      return boost > 0 ? { globalMult: 1 + boost } : null;
    },
  },

  // نمونه‌ی روزانه‌ی شاخه‌محور (اختیاری)
   {
    id: "fitness_burst",
    label: "Fitness Burst",
    // قبلاً اشتباه: requires: { branchAt: { HEALTH: 1 } }  ← همین باعث می‌شد با اولین تسک بیاید
    requires: { branchAtToday: { HEALTH: 3 } }, // ✅ امروز 3 تسک Health
    effects: {
      branchMult: { HEALTH: 1.1 }
    }
  },
  // Additional achievements coverage
  {
    id: "ach_deep_focus",
    label: "Deep Focus",
    source: { type: "ach", achId: "focus_25" },
    kind: "permanent",
    tiered: { baseMult: 1.03, perTier: 0.01 },
  },
  {
    id: "ach_steps_streak",
    label: "Steps Streak",
    source: { type: "ach", achId: "week_steps" },
    kind: "permanent",
    tiered: { baseMult: 1.04, perTier: 0.015, branch: BR.HEALTH },
  },
  {
    id: "ach_seven_day_rhythm",
    label: "7-Day Rhythm",
    source: { type: "ach", achId: "week_7" },
    kind: "permanent",
    tiered: { baseMult: 1.02, perTier: 0.015 },
  },
  {
    id: "ach_fortnight_flow",
    label: "Fortnight Flow",
    source: { type: "ach", achId: "week_14" },
    kind: "permanent",
    tiered: { baseMult: 1.03, perTier: 0.02 },
  },
  {
    id: "ach_month_momentum",
    label: "Month Momentum",
    source: { type: "ach", achId: "week_21" },
    kind: "permanent",
    tiered: { baseMult: 1.035, perTier: 0.02 },
  },
  {
    id: "ach_habit_hero",
    label: "Habit Hero",
    source: { type: "ach", achId: "week_28" },
    kind: "permanent",
    tiered: { baseMult: 1.04, perTier: 0.02 },
  },

  // Social achievements
  {
    id: "ach_friendly_face",
    label: "Friendly Face",
    source: { type: "ach", achId: "soc_1" },
    kind: "permanent",
    tiered: { baseMult: 1.05, perTier: 0.025, branch: BR.SOCIAL },
  },
  {
    id: "ach_social_star",
    label: "Social Star",
    source: { type: "ach", achId: "soc_5" },
    kind: "permanent",
    tiered: { baseMult: 1.055, perTier: 0.028, branch: BR.SOCIAL },
  },
  {
    id: "ach_community_leader",
    label: "Community Leader",
    source: { type: "ach", achId: "soc_10" },
    kind: "permanent",
    tiered: { baseMult: 1.06, perTier: 0.03, branch: BR.SOCIAL },
  },
  {
    id: "ach_social_luminary",
    label: "Social Luminary",
    source: { type: "ach", achId: "soc_20" },
    kind: "permanent",
    tiered: { baseMult: 1.065, perTier: 0.03, branch: BR.SOCIAL },
  },

  // Learning achievements
  {
    id: "ach_curious_mind",
    label: "Curious Mind",
    source: { type: "ach", achId: "learn_1" },
    kind: "permanent",
    tiered: { baseMult: 1.05, perTier: 0.025, branch: BR.WISDOM },
  },
  {
    id: "ach_knowledge_seeker",
    label: "Knowledge Seeker",
    source: { type: "ach", achId: "learn_5" },
    kind: "permanent",
    tiered: { baseMult: 1.055, perTier: 0.028, branch: BR.WISDOM },
  },
  {
    id: "ach_wise_scholar",
    label: "Wise Scholar",
    source: { type: "ach", achId: "learn_10" },
    kind: "permanent",
    tiered: { baseMult: 1.06, perTier: 0.03, branch: BR.WISDOM },
  },
  {
    id: "ach_polymath",
    label: "Polymath",
    source: { type: "ach", achId: "learn_20" },
    kind: "permanent",
    tiered: { baseMult: 1.065, perTier: 0.03, branch: BR.WISDOM },
  },

  // Health achievements
  {
    id: "ach_wellness_beginner",
    label: "Wellness Beginner",
    source: { type: "ach", achId: "health_1" },
    kind: "permanent",
    tiered: { baseMult: 1.05, perTier: 0.025, branch: BR.HEALTH },
  },
  {
    id: "ach_vitality_booster",
    label: "Vitality Booster",
    source: { type: "ach", achId: "health_5" },
    kind: "permanent",
    tiered: { baseMult: 1.055, perTier: 0.028, branch: BR.HEALTH },
  },
  {
    id: "ach_health_guru",
    label: "Health Guru",
    source: { type: "ach", achId: "health_10" },
    kind: "permanent",
    tiered: { baseMult: 1.06, perTier: 0.03, branch: BR.HEALTH },
  },
  {
    id: "ach_life_force",
    label: "Life Force",
    source: { type: "ach", achId: "health_20" },
    kind: "permanent",
    tiered: { baseMult: 1.065, perTier: 0.03, branch: BR.HEALTH },
  },
  {
    id: "ach_weekly_wins",
    label: "Weekly Wins",
    source: { type: "ach", achId: "trd_week_2" },
    kind: "permanent",
    tiered: { baseMult: 1.04, perTier: 0.02, branch: BR.TRADE },
  },
  {
    id: "ach_pump_day",
    label: "Pump Day",
    source: { type: "ach", achId: "str_today_2" },
    kind: "permanent",
    tiered: { baseMult: 1.04, perTier: 0.02, branch: BR.STRENGTH },
  },
  {
    id: "ach_sprint_session",
    label: "Sprint Session",
    source: { type: "ach", achId: "ath_today_2" },
    kind: "permanent",
    tiered: { baseMult: 1.04, perTier: 0.02, branch: BR.ATHLETICS },
  },
  {
    id: "ach_morning_master",
    label: "Morning Master",
    source: { type: "ach", achId: "morning_master" },
    kind: "permanent",
    tiered: { baseMult: 1.03, perTier: 0.015, branch: BR.WISDOM },
  },
  {
    id: "ach_three_in_a_row",
    label: "Three-in-a-Row",
    source: { type: "ach", achId: "streak_3" },
    kind: "permanent",
    tiered: { baseMult: 1.03, perTier: 0.015 },
  },
  {
    id: "ach_level_5",
    label: "Level 5",
    source: { type: "ach", achId: "lvl_5" },
    kind: "permanent",
    tiered: { baseMult: 1.04, perTier: 0.02 },
  },
  {
    id: "ach_level_10",
    label: "Level 10",
    source: { type: "ach", achId: "lvl_10" },
    kind: "permanent",
    tiered: { baseMult: 1.04, perTier: 0.02 },
  },
  {
    id: "ach_level_20",
    label: "Level 20",
    source: { type: "ach", achId: "lvl_20" },
    kind: "permanent",
    tiered: { baseMult: 1.04, perTier: 0.02 },
  },
  {
    id: "ach_level_30",
    label: "Level 30",
    source: { type: "ach", achId: "lvl_30" },
    kind: "permanent",
    tiered: { baseMult: 1.05, perTier: 0.02 },
  },
  {
    id: "ach_rookie_10",
    label: "Rookie 10",
    source: { type: "ach", achId: "tot_10" },
    kind: "permanent",
    tiered: { baseMult: 1.03, perTier: 0.015, branch: BR.TRADE },
  },
  {
    id: "ach_worker_50",
    label: "Worker 50",
    source: { type: "ach", achId: "tot_50" },
    kind: "permanent",
    tiered: { baseMult: 1.035, perTier: 0.018, branch: BR.TRADE },
  },
  {
    id: "ach_grinder_200",
    label: "Grinder 200",
    source: { type: "ach", achId: "tot_200" },
    kind: "permanent",
    tiered: { baseMult: 1.05, perTier: 0.025, branch: BR.TRADE },
  },
  {
    id: "ach_machine_500",
    label: "Machine 500",
    source: { type: "ach", achId: "tot_500" },
    kind: "permanent",
    tiered: { baseMult: 1.06, perTier: 0.03, branch: BR.TRADE },
  },

  // Meta streaks
  {
    id: "ach_five_alive",
    label: "Five Alive",
    source: { type: "ach", achId: "streak_5" },
    kind: "permanent",
    tiered: { baseMult: 1.02, perTier: 0.01 },
  },
  {
    id: "ach_lucky_seven",
    label: "Lucky Seven",
    source: { type: "ach", achId: "streak_7" },
    kind: "permanent",
    tiered: { baseMult: 1.025, perTier: 0.012 },
  },
  {
    id: "ach_perfect_ten",
    label: "Perfect Ten",
    source: { type: "ach", achId: "streak_10" },
    kind: "permanent",
    tiered: { baseMult: 1.03, perTier: 0.015 },
  },
];
