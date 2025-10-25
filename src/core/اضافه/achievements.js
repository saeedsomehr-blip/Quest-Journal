// src/core/achievements.js
// ─────────────────────────────────────────────────────────────────────────────
// Storage shape: { unlocked: [{ id, label, tier, type, icon, gainedAt, xpReward, description }] }
// evaluateAchievements(ctx, prev, awardFn?) → nextState
//   ctx: { tasks, level }
//   awardFn payload: { global?: number, multi?: Record<string, number>, reason?: string }
// ─────────────────────────────────────────────────────────────────────────────

import { loadProfile } from "./profile.js";

// Public load/save (localStorage)
export function loadAchievements() {
  try { return JSON.parse(localStorage.getItem("qj_ach_v2") || "{}"); }
  catch { return {}; }
}
export function saveAchievements(ach) {
  try { localStorage.setItem("qj_ach_v2", JSON.stringify(ach || {})); }
  catch {}
}

// Sync unlocked display fields with the latest catalog (non-destructive)
export function reconcileAchievementsWithCatalog(ach, catalog) {
  try {
    const byId = {};
    (catalog || []).forEach((it) => { if (it && it.id) byId[it.id] = it; });
    const unlocked = Array.isArray(ach?.unlocked) ? ach.unlocked : [];
    const nextUnlocked = unlocked.map((u) => {
      const fresh = byId[u?.id];
      if (!fresh) return u;
      return {
        ...u,
        label: fresh.label ?? u.label,
        icon: fresh.icon ?? u.icon,
        type: fresh.type ?? u.type,
        tier: fresh.tier ?? u.tier,
        description: fresh.description ?? u.description,
      };
    });
    return { ...(ach || {}), unlocked: nextUnlocked };
  } catch {
    return ach;
  }
}

// helpers for daily/weekly reset
function todayISO() { return new Date().toISOString().slice(0, 10); }
function weekKeyOf(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * ACH_BLUEPRINT/ACH_CATALOG
 * type: productivity | social | learning | health | strength | trade | athletics | weekly | evergreen | time | meta
 * tier: higher = better (ascending per type)
 * xpAwards: branch XP distribution (keys: WISDOM, STRENGTH, SOCIAL, TRADE, HEALTH, ATHLETICS)
 * scope: life | daily | weekly
 */
const ACH_BLUEPRINT = [
  {
    "type": "productivity",
    "items": [
      {
        "id": "prod_1",
        "order": 1,
        "scope": "daily",
        "label": "Task Starter",
        "icon": "🌱",
        "need": {
          "doneToday": 1
        },
        "xpReward": 5,
        "xpAwards": {
          "TRADE": 8,
          "STRENGTH": 4
        },
        "description": "Complete your first task of the day. Momentum begins here."
      },
      {
        "id": "focus_25",
        "order": 2,
        "scope": "daily",
        "tier": 1,
        "label": "Deep Focus",
        "icon": "🔍",
        "need": {
          "doneToday": 2
        },
        "xpReward": 10,
        "xpAwards": {
          "TRADE": 12,
          "STRENGTH": 6
        },
        "description": "Complete two focused tasks in a single day."
      },
      {
        "id": "prod_3",
        "order": 1,
        "scope": "daily",
        "tier": 2,
        "label": "Task Sprinter",
        "icon": "🏃‍♀️",
        "need": {
          "doneToday": 3
        },
        "xpReward": 15,
        "xpAwards": {
          "TRADE": 18,
          "STRENGTH": 8
        },
        "description": "Finish 3 tasks in a single day to build rhythm."
      },
      {
        "id": "prod_5",
        "order": 1,
        "scope": "daily",
        "tier": 3,
        "label": "Task Master",
        "icon": "🔧",
        "need": {
          "doneToday": 5
        },
        "xpReward": 30,
        "xpAwards": {
          "TRADE": 30,
          "STRENGTH": 12
        },
        "description": "Finish 5 tasks in one day. Serious focus."
      },
      {
        "id": "prod_10",
        "order": 1,
        "scope": "daily",
        "tier": 4,
        "label": "Productivity Legend",
        "icon": "🌟",
        "need": {
          "doneToday": 10
        },
        "xpReward": 50,
        "xpAwards": {
          "TRADE": 60,
          "STRENGTH": 20
        },
        "description": "Crush 10 tasks in a day. Legendary output."
      }
    ]
  },
  {
    "type": "social",
    "items": [
      {
        "id": "soc_1",
        "order": 1,
        "scope": "life",
        "tier": 1,
        "label": "Friendly Face",
        "icon": "👋",
        "need": {
          "totalDone": 5,
          "socialTasks": 1
        },
        "xpReward": 10,
        "xpAwards": {
          "SOCIAL": 14,
          "WISDOM": 4
        },
        "description": "Complete one social task (e.g., call a friend)."
      },
      {
        "id": "soc_5",
        "order": 1,
        "scope": "life",
        "tier": 2,
        "label": "Social Star",
        "icon": "👥",
        "need": {
          "totalDone": 20,
          "socialTasks": 5
        },
        "xpReward": 25,
        "xpAwards": {
          "SOCIAL": 30,
          "WISDOM": 8
        },
        "description": "Complete 5 social tasks; nurture your connections."
      },
      {
        "id": "soc_10",
        "order": 1,
        "scope": "life",
        "tier": 3,
        "label": "Community Leader",
        "icon": "🤗",
        "need": {
          "totalDone": 50,
          "socialTasks": 10
        },
        "xpReward": 50,
        "xpAwards": {
          "SOCIAL": 60,
          "WISDOM": 12
        },
        "description": "Complete 10 social tasks; you lead by relating."
      },
      {
        "id": "soc_20",
        "order": 1,
        "scope": "life",
        "tier": 4,
        "label": "Social Luminary",
        "icon": "💬",
        "need": { "totalDone": 100, "socialTasks": 20 },
        "xpReward": 90,
        "xpAwards": { "SOCIAL": 110, "WISDOM": 20 },
        "description": "Complete 20 social tasks; your network thrives."
      }
    ]
  },
  {
    "type": "learning",
    "items": [
      {
        "id": "learn_1",
        "order": 1,
        "scope": "life",
        "tier": 1,
        "label": "Curious Mind",
        "icon": "🕯️",
        "need": {
          "totalDone": 5,
          "learningTasks": 1
        },
        "xpReward": 10,
        "xpAwards": {
          "WISDOM": 16
        },
        "description": "Complete one learning task (e.g., study or read)."
      },
      {
        "id": "learn_5",
        "order": 1,
        "scope": "life",
        "tier": 2,
        "label": "Knowledge Seeker",
        "icon": "📖",
        "need": {
          "totalDone": 20,
          "learningTasks": 5
        },
        "xpReward": 25,
        "xpAwards": {
          "WISDOM": 34
        },
        "description": "Complete 5 learning tasks; expand your horizons."
      },
      {
        "id": "learn_10",
        "order": 1,
        "scope": "life",
        "tier": 3,
        "label": "Wise Scholar",
        "icon": "🧑‍🎓",
        "need": {
          "totalDone": 50,
          "learningTasks": 10
        },
        "xpReward": 50,
        "xpAwards": {
          "WISDOM": 70
        },
        "description": "Complete 10 learning tasks; mastery in motion."
      },
      {
        "id": "learn_20",
        "order": 1,
        "scope": "life",
        "tier": 4,
        "label": "Polymath",
        "icon": "🧠",
        "need": { "totalDone": 100, "learningTasks": 20 },
        "xpReward": 100,
        "xpAwards": { "WISDOM": 120 },
        "description": "Complete 20 learning tasks; breadth and depth."
      }
    ]
  },
  {
    "type": "health",
    "items": [
      {
        "id": "health_1",
        "order": 1,
        "scope": "life",
        "tier": 1,
        "label": "Wellness Beginner",
        "icon": "🧘‍♀️",
        "need": {
          "totalDone": 5,
          "healthTasks": 1
        },
        "xpReward": 10,
        "xpAwards": {
          "HEALTH": 12,
          "ATHLETICS": 6
        },
        "description": "Complete one health task (e.g., short workout or breathwork)."
      },
      {
        "id": "health_5",
        "order": 1,
        "scope": "life",
        "tier": 2,
        "label": "Vitality Booster",
        "icon": "🍎",
        "need": {
          "totalDone": 20,
          "healthTasks": 5
        },
        "xpReward": 25,
        "xpAwards": {
          "HEALTH": 28,
          "ATHLETICS": 12
        },
        "description": "Complete 5 health tasks; stronger body and mind."
      },
      {
        "id": "health_10",
        "order": 1,
        "scope": "life",
        "tier": 3,
        "label": "Health Guru",
        "icon": "🌿",
        "need": {
          "totalDone": 50,
          "healthTasks": 10
        },
        "xpReward": 50,
        "xpAwards": {
          "HEALTH": 60,
          "ATHLETICS": 20
        },
        "description": "Complete 10 health tasks; wellness is your way."
      },
      {
        "id": "health_20",
        "order": 1,
        "scope": "life",
        "tier": 4,
        "label": "Life Force",
        "icon": "⚡️",
        "need": { "totalDone": 100, "healthTasks": 20 },
        "xpReward": 100,
        "xpAwards": { "HEALTH": 120, "ATHLETICS": 40 },
        "description": "Complete 20 health tasks; resilient body and mind."
      }
    ]
  },
  {
    "type": "strength",
    "items": [
      {
        "id": "str_1",
        "order": 1,
        "scope": "life",
        "tier": 1,
        "label": "Iron Start",
        "icon": "🏋️",
        "need": {
          "totalDone": 5
        },
        "xpReward": 15,
        "xpAwards": {
          "STRENGTH": 16
        },
        "description": "Complete 5 strength-oriented tasks."
      },
      {
        "id": "str_today_2",
        "order": 2,
        "scope": "daily",
        "tier": 1,
        "label": "Pump Day",
        "icon": "💪",
        "need": {
          "doneToday": 2
        },
        "xpReward": 10,
        "xpAwards": {
          "STRENGTH": 18
        },
        "description": "Do 2 strength tasks today."
      },
      {
        "id": "str_5",
        "order": 1,
        "scope": "life",
        "tier": 2,
        "label": "Hard Hitter",
        "icon": "🥊",
        "need": {
          "totalDone": 25
        },
        "xpReward": 35,
        "xpAwards": {
          "STRENGTH": 40
        },
        "description": "Complete 25 strength tasks overall."
      },
      {
        "id": "str_10",
        "order": 1,
        "scope": "life",
        "tier": 3,
        "label": "Powerhouse",
        "icon": "🔩",
        "need": { "totalDone": 50 },
        "xpReward": 60,
        "xpAwards": { "STRENGTH": 70 },
        "description": "Complete 50 strength tasks overall."
      },
      {
        "id": "str_20",
        "order": 1,
        "scope": "life",
        "tier": 4,
        "label": "Titan",
        "icon": "🗿",
        "need": { "totalDone": 100 },
        "xpReward": 110,
        "xpAwards": { "STRENGTH": 130 },
        "description": "Complete 100 strength tasks overall."
      }
    ]
  },
  {
    "type": "trade",
    "items": [
      {
        "id": "trd_1",
        "order": 1,
        "scope": "life",
        "tier": 1,
        "label": "Deal Maker",
        "icon": "🤝",
        "need": {
          "totalDone": 5
        },
        "xpReward": 15,
        "xpAwards": {
          "TRADE": 20
        },
        "description": "Complete 5 trade tasks overall."
      },
      {
        "id": "trd_week_2",
        "order": 2,
        "scope": "weekly",
        "tier": 1,
        "label": "Weekly Wins",
        "icon": "📈",
        "need": {
          "activeDaysInLast": 4
        },
        "xpReward": 60,
        "xpAwards": {
          "TRADE": 40,
          "WISDOM": 16
        },
        "description": "Active 4 days this week with trade focus."
      },
      {
        "id": "trd_5",
        "order": 1,
        "scope": "life",
        "tier": 2,
        "label": "Market Mover",
        "icon": "💸",
        "need": {
          "totalDone": 25
        },
        "xpReward": 35,
        "xpAwards": {
          "TRADE": 45
        },
        "description": "Complete 25 trade tasks overall."
      },
      {
        "id": "trd_10",
        "order": 1,
        "scope": "life",
        "tier": 3,
        "label": "Rainmaker",
        "icon": "💰",
        "need": { "totalDone": 50 },
        "xpReward": 70,
        "xpAwards": { "TRADE": 80 },
        "description": "Complete 50 trade tasks overall."
      },
      {
        "id": "trd_20",
        "order": 1,
        "scope": "life",
        "tier": 4,
        "label": "Tycoon",
        "icon": "🏦",
        "need": { "totalDone": 100 },
        "xpReward": 120,
        "xpAwards": { "TRADE": 140 },
        "description": "Complete 100 trade tasks overall."
      }
    ]
  },
  {
    "type": "athletics",
    "items": [
      {
        "id": "ath_1",
        "order": 1,
        "scope": "life",
        "tier": 1,
        "label": "Quick Feet",
        "icon": "🏃‍♂️",
        "need": {
          "totalDone": 5
        },
        "xpReward": 15,
        "xpAwards": {
          "ATHLETICS": 18
        },
        "description": "Complete 5 athletics tasks overall."
      },
      {
        "id": "ath_today_2",
        "order": 2,
        "scope": "daily",
        "tier": 1,
        "label": "Sprint Session",
        "icon": "⚡",
        "need": {
          "doneToday": 2
        },
        "xpReward": 10,
        "xpAwards": {
          "ATHLETICS": 18
        },
        "description": "Do 2 athletics tasks today."
      },
      {
        "id": "ath_5",
        "order": 1,
        "scope": "life",
        "tier": 2,
        "label": "Trail Runner",
        "icon": "🌄",
        "need": {
          "totalDone": 20
        },
        "xpReward": 35,
        "xpAwards": {
          "ATHLETICS": 42
        },
        "description": "Complete 20 athletics tasks overall."
      },
      {
        "id": "ath_10",
        "order": 1,
        "scope": "life",
        "tier": 3,
        "label": "Road Warrior",
        "icon": "🚴‍♀️",
        "need": { "totalDone": 35 },
        "xpReward": 60,
        "xpAwards": { "ATHLETICS": 70 },
        "description": "Complete 35 athletics tasks overall."
      },
      {
        "id": "ath_20",
        "order": 1,
        "scope": "life",
        "tier": 4,
        "label": "Ultra Runner",
        "icon": "🏅",
        "need": { "totalDone": 50 },
        "xpReward": 90,
        "xpAwards": { "ATHLETICS": 110 },
        "description": "Complete 50 athletics tasks overall; endurance unlocked."
      }
    ]
  },
  {
    "type": "weekly",
    "items": [
      {
        "id": "week_steps",
        "order": 1,
        "scope": "weekly",
        "tier": 1,
        "label": "Steps Streak",
        "icon": "👟",
        "need": {
          "activeDaysInLast": 5
        },
        "xpReward": 60,
        "xpAwards": {
          "HEALTH": 30,
          "ATHLETICS": 30
        },
        "description": "Stay active on 5 days this week."
      },
      {
        "id": "week_7",
        "order": 2,
        "scope": "weekly",
        "tier": 1,
        "label": "7-Day Rhythm",
        "icon": "🗓️",
        "need": {
          "activeDaysInLast": 7
        },
        "xpReward": 40,
        "xpAwards": {
          "TRADE": 12,
          "SOCIAL": 12,
          "WISDOM": 12,
          "HEALTH": 12,
          "ATHLETICS": 12,
          "STRENGTH": 12
        },
        "description": "Stay active 7 consecutive days (at least one task per day)."
      },
      {
        "id": "week_14",
        "order": 3,
        "scope": "weekly",
        "tier": 2,
        "label": "Fortnight Flow",
        "icon": "🔄",
        "need": {
          "activeDaysInLast": 14
        },
        "xpReward": 80,
        "xpAwards": {
          "TRADE": 20,
          "SOCIAL": 20,
          "WISDOM": 20,
          "HEALTH": 20,
          "ATHLETICS": 20,
          "STRENGTH": 20
        },
        "description": "Stay active 14 consecutive days. Habits locked in."
      },
      {
        "id": "week_21",
        "order": 4,
        "scope": "weekly",
        "tier": 3,
        "label": "Month Momentum",
        "icon": "📅",
        "need": { "activeDaysInLast": 21 },
        "xpReward": 120,
        "xpAwards": {},
        "description": "Be active on 21 of the last 30 days."
      },
      {
        "id": "week_28",
        "order": 5,
        "scope": "weekly",
        "tier": 4,
        "label": "Habit Hero",
        "icon": "🦸",
        "need": { "activeDaysInLast": 28 },
        "xpReward": 180,
        "xpAwards": {},
        "description": "Be active on 28 of the last 30 days."
      }
    ]
  },
  {
    "type": "evergreen",
    "items": [
      {
        "id": "lvl_5",
        "order": 1,
        "scope": "life",
        "tier": 1,
        "label": "Level 5",
        "icon": "🌟",
        "need": {
          "levelAtLeast": 5
        },
        "xpReward": 25,
        "xpAwards": {
          "WISDOM": 8,
          "STRENGTH": 8
        },
        "description": "Reach level 5. You're on track."
      },
      {
        "id": "lvl_10",
        "order": 2,
        "scope": "life",
        "tier": 2,
        "label": "Level 10",
        "icon": "🔥",
        "need": {
          "levelAtLeast": 10
        },
        "xpReward": 50,
        "xpAwards": {
          "WISDOM": 12,
          "STRENGTH": 12
        },
        "description": "Reach level 10. Consistency paying off."
      },
      {
        "id": "lvl_20",
        "order": 3,
        "scope": "life",
        "tier": 3,
        "label": "Level 20",
        "icon": "⚙️",
        "need": {
          "levelAtLeast": 20
        },
        "xpReward": 120,
        "xpAwards": {
          "WISDOM": 20,
          "STRENGTH": 20
        },
        "description": "Reach level 20. A serious milestone."
      },
      {
        "id": "lvl_30",
        "order": 4,
        "scope": "life",
        "tier": 4,
        "label": "Level 30",
        "icon": "👑",
        "need": { "levelAtLeast": 30 },
        "xpReward": 200,
        "xpAwards": { "WISDOM": 30, "STRENGTH": 30 },
        "description": "Reach level 30. Elite status."
      },
      {
        "id": "tot_10",
        "order": 4,
        "scope": "life",
        "tier": 1,
        "label": "Rookie 10",
        "icon": "🎯",
        "need": {
          "totalDone": 10
        },
        "xpReward": 15,
        "xpAwards": {
          "TRADE": 10
        },
        "description": "Complete 10 tasks overall."
      },
      {
        "id": "tot_50",
        "order": 5,
        "scope": "life",
        "tier": 2,
        "label": "Worker 50",
        "icon": "🔨",
        "need": {
          "totalDone": 50
        },
        "xpReward": 40,
        "xpAwards": {
          "TRADE": 30
        },
        "description": "Complete 50 tasks overall."
      },
      {
        "id": "tot_200",
        "order": 6,
        "scope": "life",
        "tier": 3,
        "label": "Grinder 200",
        "icon": "⚒️",
        "need": {
          "totalDone": 200
        },
        "xpReward": 150,
        "xpAwards": {
          "TRADE": 80,
          "STRENGTH": 20
        },
        "description": "Complete 200 tasks overall. Relentless."
      },
      {
        "id": "tot_500",
        "order": 7,
        "scope": "life",
        "tier": 4,
        "label": "Machine 500",
        "icon": "🤖",
        "need": { "totalDone": 500 },
        "xpReward": 300,
        "xpAwards": { "TRADE": 140, "STRENGTH": 40 },
        "description": "Complete 500 tasks overall. Unstoppable."
      }
    ]
  },
  {
    "type": "time",
    "items": [
      {
        "id": "time_early",
        "order": 1,
        "scope": "daily",
        "tier": 1,
        "label": "Early Bird",
        "icon": "🌅",
        "need": {
          "anyDoneBetween": [
            5,
            8
          ]
        },
        "xpReward": 15,
        "xpAwards": {
          "WISDOM": 10,
          "HEALTH": 6
        },
        "description": "Complete a task between 5-8 AM."
      },
      {
        "id": "morning_master",
        "order": 2,
        "scope": "daily",
        "tier": 1,
        "label": "Morning Master",
        "icon": "☀️",
        "need": {
          "anyDoneBetween": [
            6,
            9
          ]
        },
        "xpReward": 12,
        "xpAwards": {
          "WISDOM": 8,
          "HEALTH": 6
        },
        "description": "Complete a task between 6-9 AM."
      },
      {
        "id": "time_night",
        "order": 3,
        "scope": "daily",
        "tier": 1,
        "label": "Night Owl",
        "icon": "🌙",
        "need": {
          "anyDoneBetween": [
            0,
            5
          ]
        },
        "xpReward": 15,
        "xpAwards": {
          "WISDOM": 6,
          "STRENGTH": 10
        },
        "description": "Complete a task between midnight and 5 AM."
      }
    ]
  },
  {
    "type": "meta",
    "items": [
      {
        "id": "streak_3",
        "order": 1,
        "scope": "daily",
        "tier": 1,
        "label": "Three-in-a-Row",
        "icon": "🔗",
        "need": {
          "doneToday": 3
        },
        "xpReward": 12,
        "xpAwards": {
          "TRADE": 12,
          "STRENGTH": 12
        },
        "description": "Hit a mini streak today (3 tasks)."
      },
      {
        "id": "streak_5",
        "order": 2,
        "scope": "daily",
        "tier": 2,
        "label": "Five Alive",
        "icon": "🔥",
        "need": { "doneToday": 5 },
        "xpReward": 20,
        "xpAwards": {},
        "description": "Complete 5 tasks in a day."
      },
      {
        "id": "streak_7",
        "order": 3,
        "scope": "daily",
        "tier": 3,
        "label": "Lucky Seven",
        "icon": "🍀",
        "need": { "doneToday": 7 },
        "xpReward": 32,
        "xpAwards": {},
        "description": "Complete 7 tasks in a day."
      },
      {
        "id": "streak_10",
        "order": 4,
        "scope": "daily",
        "tier": 4,
        "label": "Perfect Ten",
        "icon": "🎖️",
        "need": { "doneToday": 10 },
        "xpReward": 50,
        "xpAwards": {},
        "description": "Complete 10 tasks in a day."
      }
    ]
  }
];

export const ACH_CATALOG = ACH_BLUEPRINT.flatMap(({ type, items }) =>
  items
    .slice()
    .sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0) || (a.order ?? 0) - (b.order ?? 0))
    .map(({ order, ...rest }) => ({ ...rest, type }))
);



// ────────────────────────────────────────────────────────────────────────────
// Summarize tasks (legacy category-based path still supported)
function summarize(tasks) {
  const done = (Array.isArray(tasks) ? tasks : []).filter(t => t.done);
  const now = Date.now();
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);

  const doneToday = done.filter(t => {
    const d = new Date(t.doneAt || t.createdAt || 0).getTime();
    return d >= startOfToday.getTime();
  }).length;

  const totalDone = done.length;

  // active days (last 30d)
  const days = new Set();
  for (const t of done) {
    const ts = new Date(t.doneAt || t.createdAt || 0).getTime();
    if (Number.isFinite(ts) && (now - ts) <= 30 * 86400000) {
      days.add(new Date(ts).toISOString().slice(0, 10));
    }
  }

  // category counts (optional—only if you set task.category)
  const socialTasks   = done.filter(t => t.category === "social").length;
  const learningTasks = done.filter(t => t.category === "learning").length;
  const healthTasks   = done.filter(t => t.category === "health").length;

  function anyDoneBetween(hStart, hEnd) {
    return done.some(t => {
      const d = new Date(t.doneAt || t.createdAt || 0);
      const h = d.getHours();
      return h >= hStart && h < hEnd;
    });
  }

  return {
    doneToday,
    totalDone,
    activeDaysCount: days.size,
    anyDoneBetween,
    socialTasks,
    learningTasks,
    healthTasks,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Need checks (legacy, uses task.category if present)
function meetsNeed(need, ctx, sum) {
  if (!need) return false;

  if (need.doneToday != null)         return sum.doneToday >= need.doneToday;
  if (need.activeDaysInLast != null)  return sum.activeDaysCount >= need.activeDaysInLast;
  if (need.levelAtLeast != null)      return (ctx.level || 0) >= need.levelAtLeast;

  // with category constraint
  if (need.totalDone != null && need.socialTasks != null)
    return sum.totalDone >= need.totalDone && sum.socialTasks >= need.socialTasks;

  if (need.totalDone != null && need.learningTasks != null)
    return sum.totalDone >= need.totalDone && sum.learningTasks >= need.learningTasks;

  if (need.totalDone != null && need.healthTasks != null)
    return sum.totalDone >= need.totalDone && sum.healthTasks >= need.healthTasks;

  if (need.totalDone != null)         return sum.totalDone >= need.totalDone;

  if (need.anyDoneBetween) {
    const [hs, he] = need.anyDoneBetween;
    return sum.anyDoneBetween(hs, he);
  }
  return false;
}

// ────────────────────────────────────────────────────────────────────────────
// NEW: Branch-based unlocking via profile lifetime counters (≥50% rule upstream)
const BRANCH_THRESHOLDS = {
  social:    [1, 5, 10, 20],
  learning:  [1, 5, 10, 20], // maps to WISDOM
  health:    [1, 5, 10, 20],
  strength:  [1, 5, 10, 20],
  trade:     [1, 5, 10, 20],
  athletics: [1, 5, 10, 20],
};
const TYPE_TO_BRANCH = {
  social:   "SOCIAL",
  learning: "WISDOM",
  health:   "HEALTH",
  strength: "STRENGTH",
  trade:    "TRADE",
  athletics:"ATHLETICS",
};

function unlockBranchByProfileCounters(unlockedArr, awardFn) {
  const prof = loadProfile();
  const counts = prof?.lifetime?.doneByBranch || {};

  const has = (id) => unlockedArr.some(u => u.id === id);

  for (const a of ACH_CATALOG) {
    const type = (a.type || "").toLowerCase();
    if (!BRANCH_THRESHOLDS[type]) continue;        // only types with branch thresholds defined
    const tier = Number(a.tier || 0);
    if (tier < 1) continue;

    const branch = TYPE_TO_BRANCH[type];
    const need = BRANCH_THRESHOLDS[type][Math.min(tier - 1, BRANCH_THRESHOLDS[type].length - 1)];
    const have = Number(counts?.[branch] || 0);

    if (!has(a.id) && have >= need) {
      // unlock + award
      unlockedArr.push({
        id: a.id,
        label: a.label,
        tier: a.tier,
        type: a.type,
        icon: a.icon || "🏆",
        gainedAt: new Date().toISOString(),
        xpReward: a.xpReward || 0,
        description: a.description || "",
      });
      if (typeof awardFn === "function") {
        awardFn({
          global: a.xpReward || 0,
          multi:  a.xpAwards || {},
          reason: `Achievement: ${a.label}`,
        });
      }
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
export function applyBranchTaskAchievements(achState) {
  try {
    const prof = loadProfile();
    const counts = prof?.lifetime?.doneByBranch || {};

    const src = Array.isArray(achState?.all) ? achState.all : ACH_CATALOG;
    const nextUnlocked = [...(achState?.unlocked || [])];
    const unlockedSet = new Set(nextUnlocked.map((a) => a.id));

    for (const item of src) {
      const type = (item.type || '').toLowerCase();
      const tier = Number(item.tier || 0);
      if (!BRANCH_THRESHOLDS[type] || tier < 1) continue;

      const branch = TYPE_TO_BRANCH[type];
      const need = BRANCH_THRESHOLDS[type][Math.min(tier - 1, BRANCH_THRESHOLDS[type].length - 1)];
      const have = Number(counts?.[branch] || 0);

      if (have >= need && !unlockedSet.has(item.id)) {
        nextUnlocked.push({
          id: item.id,
          label: item.label,
          icon: item.icon || 'P1',
          type: item.type,
          tier: item.tier,
          description: item.description || '',
          gainedAt: new Date().toISOString(),
          unlocked: true,
          xpReward: item.xpReward || 0,
        });
        unlockedSet.add(item.id);
      }
    }

    return { ...(achState || {}), unlocked: nextUnlocked };
  } catch {
    return achState || { unlocked: [] };
  }
}

// Evaluate & unlock (legacy + branch-counters)
export function evaluateAchievements(ctx, prev, awardFn) {
  const safePrev = prev && typeof prev === "object" ? prev : {};
  const unlocked = Array.isArray(safePrev.unlocked) ? [...safePrev.unlocked] : [];
  // ephemeral
  const lastDaily = safePrev.lastDaily || null;
  const lastWeekly = safePrev.lastWeekly || null;
  const today = todayISO();
  const thisWeek = weekKeyOf();
  const dailyNow = today !== lastDaily ? [] : Array.isArray(safePrev.ephemeralDaily) ? [...safePrev.ephemeralDaily] : [];
  const weeklyNow = thisWeek !== lastWeekly ? [] : Array.isArray(safePrev.ephemeralWeekly) ? [...safePrev.ephemeralWeekly] : [];

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

    // one-shot rewards for first unlock of this id
    if (typeof awardFn === "function") {
      awardFn({
        global: a.xpReward || 0,
        multi:  a.xpAwards || {},
        reason: `Achievement: ${a.label}`,
      });
    }
  };

  // Legacy (category / time / productivity / weekly / level / totals)
  // Note: For branch-specific types (strength/trade/athletics), skip legacy
  // total-based unlocking to ensure they only unlock from branch counts.
  const sum = summarize(ctx.tasks || []);
  const BRANCH_STRICT = new Set(["strength", "trade", "athletics"]);
  for (const a of ACH_CATALOG) {
    const scope = a.scope || "life";
    const t = (a.type || "").toLowerCase();
    if (scope === "life") {
      if (BRANCH_STRICT.has(t)) continue; // handled by branch counters below
      if (!has(a.id) && meetsNeed(a.need, ctx, sum)) add(a);
    }
  }

  // NEW: branch-based unlocks backed by lifetime counters
  unlockBranchByProfileCounters(unlocked, awardFn);

  // Helper: read today's branch counts (written by award.js)
  function readTodayBranchCounts() {
    try {
      const key = `qj_stats_today_${todayISO()}`;
      const stats = JSON.parse(localStorage.getItem(key) || "null") || {};
      return stats.doneByBranch || {};
    } catch { return {}; }
  }

  // Ephemeral unlocks
  const todayByBranch = readTodayBranchCounts();
  for (const a of ACH_CATALOG) {
    const scope = a.scope || "life";
    const t = (a.type || "").toLowerCase();
    const isBranchStrict = t === "strength" || t === "trade" || t === "athletics";

    if (scope === "daily") {
      // For branch-strict types, require branch-specific doneToday
      if (isBranchStrict && a?.need?.doneToday != null) {
        const branch = TYPE_TO_BRANCH[t];
        const have = Number(todayByBranch?.[branch] || 0);
        if (have >= a.need.doneToday) {
          if (!dailyNow.find(x => x.id === a.id)) dailyNow.push({ id: a.id, label: a.label, tier: a.tier, type: a.type, icon: a.icon, gainedAt: new Date().toISOString(), description: a.description });
        }
      } else if (meetsNeed(a.need, ctx, sum)) {
        if (!dailyNow.find(x => x.id === a.id)) dailyNow.push({ id: a.id, label: a.label, tier: a.tier, type: a.type, icon: a.icon, gainedAt: new Date().toISOString(), description: a.description });
      }
    }

    if (scope === "weekly") {
      // Keep existing behavior for weekly. If later needed, branch-specific
      // weekly checks can be added similarly using per-day stats history.
      if (meetsNeed(a.need, ctx, sum)) {
        if (!weeklyNow.find(x => x.id === a.id)) weeklyNow.push({ id: a.id, label: a.label, tier: a.tier, type: a.type, icon: a.icon, gainedAt: new Date().toISOString(), description: a.description });
      }
    }
  }

  const next = { unlocked, ephemeralDaily: dailyNow, ephemeralWeekly: weeklyNow, lastDaily: today, lastWeekly: thisWeek };
  if (JSON.stringify(next) !== JSON.stringify(safePrev)) return next;
  return safePrev;
}
