// src/core/achievements.catalog.js
// ─────────────────────────────────────────────────────────────
// Full catalog with requested changes:
// - Meta → streak-based (life-scope) 3/5/7/10 days (≥3 tasks/day)
// - Productivity all daily (Task Starter tier: 0)
// - Add daily “2 tasks today” for Social/Learning/Health/Trade (like Strength/Athletics)
// - Weekly replaced with 3 items (15k legacy xp; 5k/10k in a specific branch)
// - Strength/Trade/Athletics life thresholds: 1 / 5 / 15 / 40 tasks
// Exports: ACH_BLUEPRINT, ACH_CATALOG
// ─────────────────────────────────────────────────────────────

export const ACH_BLUEPRINT = [
  // ───────────────────────────────────────────────────────────
  // Productivity (all daily; Task Starter tier 0)
  // ───────────────────────────────────────────────────────────
  {
    "type": "productivity",
    "items": [
      {
        "id": "prod_1",
        "order": 1,
        "scope": "daily",
        "tier": 0, // ← changed to Tier 0
        "label": "Task Starter",
        "icon": "🌱",
        "need": { "doneToday": 1 },
        "description": "You've started your adventure today! Keep the momentum."
      },
      {
        "id": "focus_25",
        "order": 2,
        "scope": "daily",
        "tier": 1,
        "label": "Deep Focus",
        "icon": "🔍",
        "need": { "doneToday": 2 },
        "description": "Complete two focused tasks today."
      },
      {
        "id": "prod_3",
        "order": 3,
        "scope": "daily",
        "tier": 2,
        "label": "Task Sprinter",
        "icon": "🏃‍♀️",
        "need": { "doneToday": 3 },
        "xpReward": 15,
        "description": "Cruising through the day—keep going!"
      },
      {
        "id": "prod_5",
        "order": 4,
        "scope": "daily",
        "tier": 3,
        "label": "Task Master",
        "icon": "🔧",
        "need": { "doneToday": 5 },
        "xpReward": 30,
        "description": "Finish 5 tasks today. Serious focus."
      },
      {
        "id": "prod_10",
        "order": 5,
        "scope": "daily",
        "tier": 4,
        "label": "Productivity Legend",
        "icon": "🌟",
        "need": { "doneToday": 10 },
        "xpReward": 50,
        "description": "Crush 10 tasks in a day. Legendary output."
      }
    ]
  },

  // ───────────────────────────────────────────────────────────
  // Social (life + NEW daily 2-tasks)
  // ───────────────────────────────────────────────────────────
  {
    "type": "social",
    "items": [
      // NEW daily branch-specific
      {
        "id": "soc_today_2",
        "order": 0,
        "scope": "daily",
        "tier": 1,
        "label": "Social Hour",
        "icon": "🙂",
        "need": { "doneToday": 2 }, // checked per-branch in eval (see note)
        "xpReward": 10,
        "xpAwards": { "SOCIAL": 16 },
        "description": "Complete 2 social tasks today."
      },

      {
        "id": "soc_1",
        "order": 1,
        "scope": "life",
        "tier": 1,
        "label": "Friendly Face",
        "icon": "👋",
        "need": { "totalDone": 5, "socialTasks": 1 },
        "xpReward": 10,
        "xpAwards": { "SOCIAL": 14, "WISDOM": 4 },
        "description": "Complete one social task (e.g., call a friend)."
      },
      {
        "id": "soc_5",
        "order": 2,
        "scope": "life",
        "tier": 2,
        "label": "Social Star",
        "icon": "👥",
        "need": { "totalDone": 20, "socialTasks": 5 },
        "xpReward": 25,
        "xpAwards": { "SOCIAL": 30, "WISDOM": 8 },
        "description": "Complete 5 social tasks; nurture your connections."
      },
      {
        "id": "soc_10",
        "order": 3,
        "scope": "life",
        "tier": 3,
        "label": "Community Leader",
        "icon": "🤗",
        "need": { "totalDone": 50, "socialTasks": 10 },
        "xpReward": 50,
        "xpAwards": { "SOCIAL": 60, "WISDOM": 12 },
        "description": "Complete 10 social tasks; you lead by relating."
      },
      {
        "id": "soc_20",
        "order": 4,
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

  // ───────────────────────────────────────────────────────────
  // Learning (life + NEW daily 2-tasks)
  // ───────────────────────────────────────────────────────────
  {
    "type": "learning",
    "items": [
      // NEW daily branch-specific
      {
        "id": "learn_today_2",
        "order": 0,
        "scope": "daily",
        "tier": 1,
        "label": "Study Streak",
        "icon": "📚",
        "need": { "doneToday": 2 }, // checked per-branch in eval (see note)
        "xpReward": 10,
        "xpAwards": { "WISDOM": 16 },
        "description": "Complete 2 learning tasks today."
      },

      {
        "id": "learn_1",
        "order": 1,
        "scope": "life",
        "tier": 1,
        "label": "Curious Mind",
        "icon": "🕯️",
        "need": { "totalDone": 5, "learningTasks": 1 },
        "xpReward": 10,
        "xpAwards": { "WISDOM": 16 },
        "description": "Complete one learning task (e.g., study or read)."
      },
      {
        "id": "learn_5",
        "order": 2,
        "scope": "life",
        "tier": 2,
        "label": "Knowledge Seeker",
        "icon": "📖",
        "need": { "totalDone": 20, "learningTasks": 5 },
        "xpReward": 25,
        "xpAwards": { "WISDOM": 34 },
        "description": "Complete 5 learning tasks; expand your horizons."
      },
      {
        "id": "learn_10",
        "order": 3,
        "scope": "life",
        "tier": 3,
        "label": "Wise Scholar",
        "icon": "🧑‍🎓",
        "need": { "totalDone": 50, "learningTasks": 10 },
        "xpReward": 50,
        "xpAwards": { "WISDOM": 70 },
        "description": "Complete 10 learning tasks; mastery in motion."
      },
      {
        "id": "learn_20",
        "order": 4,
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

  // ───────────────────────────────────────────────────────────
  // Health (life + NEW daily 2-tasks)
  // ───────────────────────────────────────────────────────────
  {
    "type": "health",
    "items": [
      // NEW daily branch-specific
      {
        "id": "health_today_2",
        "order": 0,
        "scope": "daily",
        "tier": 1,
        "label": "Healthy Habits",
        "icon": "🥗",
        "need": { "doneToday": 2 }, // checked per-branch in eval (see note)
        "xpReward": 10,
        "xpAwards": { "HEALTH": 14, "ATHLETICS": 4 },
        "description": "Complete 2 health tasks today."
      },

      {
        "id": "health_1",
        "order": 1,
        "scope": "life",
        "tier": 1,
        "label": "Wellness Beginner",
        "icon": "🧘‍♀️",
        "need": { "totalDone": 5, "healthTasks": 1 },
        "xpReward": 10,
        "xpAwards": { "HEALTH": 12, "ATHLETICS": 6 },
        "description": "Complete one health task (e.g., short workout or breathwork)."
      },
      {
        "id": "health_5",
        "order": 2,
        "scope": "life",
        "tier": 2,
        "label": "Vitality Booster",
        "icon": "🍎",
        "need": { "totalDone": 20, "healthTasks": 5 },
        "xpReward": 25,
        "xpAwards": { "HEALTH": 28, "ATHLETICS": 12 },
        "description": "Complete 5 health tasks; stronger body and mind."
      },
      {
        "id": "health_10",
        "order": 3,
        "scope": "life",
        "tier": 3,
        "label": "Health Guru",
        "icon": "🌿",
        "need": { "totalDone": 50, "healthTasks": 10 },
        "xpReward": 50,
        "xpAwards": { "HEALTH": 60, "ATHLETICS": 20 },
        "description": "Complete 10 health tasks; wellness is your way."
      },
      {
        "id": "health_20",
        "order": 4,
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

  // ───────────────────────────────────────────────────────────
  // Strength (life thresholds changed + existing daily)
  // ───────────────────────────────────────────────────────────
  {
    "type": "strength",
    "items": [
      {
        "id": "str_today_2",
        "order": 0,
        "scope": "daily",
        "tier": 1,
        "label": "Pump Day",
        "icon": "💪",
        "need": { "doneToday": 2 },
        "xpReward": 10,
        "xpAwards": { "STRENGTH": 0 },
        "description": "Do 2 strength tasks today."
      },
      {
        "id": "str_1",
        "order": 1,
        "scope": "life",
        "tier": 1,
        "label": "Iron Start",
        "icon": "🏋️",
        "need": { "totalDone": 1 }, // ← 1
        "xpReward": 12,
        "xpAwards": { "STRENGTH": 0 },
        "description": "Complete 1 strength task."
      },
      {
        "id": "str_5",
        "order": 2,
        "scope": "life",
        "tier": 2,
        "label": "Hard Hitter",
        "icon": "🥊",
        "need": { "totalDone": 5 }, // ← 5
        "xpReward": 24,
        "xpAwards": { "STRENGTH": 28 },
        "description": "Complete 5 strength tasks."
      },
      {
        "id": "str_15",
        "order": 3,
        "scope": "life",
        "tier": 3,
        "label": "Powerhouse",
        "icon": "🔩",
        "need": { "totalDone": 15 }, // ← 15
        "xpReward": 48,
        "xpAwards": { "STRENGTH": 60 },
        "description": "Complete 15 strength tasks."
      },
      {
        "id": "str_40",
        "order": 4,
        "scope": "life",
        "tier": 4,
        "label": "Titan",
        "icon": "🗿",
        "need": { "totalDone": 40 }, // ← 40
        "xpReward": 80,
        "xpAwards": { "STRENGTH": 110 },
        "description": "Complete 40 strength tasks."
      }
    ]
  },

  // ───────────────────────────────────────────────────────────
  // Trade (life thresholds changed + NEW daily)
  // ───────────────────────────────────────────────────────────
  {
    "type": "trade",
    "items": [
      // NEW daily branch-specific
      {
        "id": "trd_today_2",
        "order": 0,
        "scope": "daily",
        "tier": 1,
        "label": "Deal Day",
        "icon": "📊",
        "need": { "doneToday": 2 },
        "xpReward": 10,
        "xpAwards": { "TRADE": 18 },
        "description": "Complete 2 trade tasks today."
      },

      {
        "id": "trd_1",
        "order": 1,
        "scope": "life",
        "tier": 1,
        "label": "Deal Maker",
        "icon": "🤝",
        "need": { "totalDone": 1 }, // ← 1
        "xpReward": 12,
        "xpAwards": { "TRADE": 16 },
        "description": "Complete 1 trade task."
      },
      {
        "id": "trd_5",
        "order": 2,
        "scope": "life",
        "tier": 2,
        "label": "Market Mover",
        "icon": "💸",
        "need": { "totalDone": 5 }, // ← 5
        "xpReward": 24,
        "xpAwards": { "TRADE": 30 },
        "description": "Complete 5 trade tasks."
      },
      {
        "id": "trd_15",
        "order": 3,
        "scope": "life",
        "tier": 3,
        "label": "Rainmaker",
        "icon": "💰",
        "need": { "totalDone": 15 }, // ← 15
        "xpReward": 48,
        "xpAwards": { "TRADE": 62 },
        "description": "Complete 15 trade tasks."
      },
      {
        "id": "trd_40",
        "order": 4,
        "scope": "life",
        "tier": 4,
        "label": "Tycoon",
        "icon": "🏦",
        "need": { "totalDone": 40 }, // ← 40
        "xpReward": 80,
        "xpAwards": { "TRADE": 100 },
        "description": "Complete 40 trade tasks."
      }
    ]
  },

  // ───────────────────────────────────────────────────────────
  // Athletics (life thresholds changed + existing daily)
  // ───────────────────────────────────────────────────────────
  {
    "type": "athletics",
    "items": [
      {
        "id": "ath_today_2",
        "order": 0,
        "scope": "daily",
        "tier": 1,
        "label": "Sprint Session",
        "icon": "⚡",
        "need": { "doneToday": 2 },
        "xpReward": 10,
        "xpAwards": { "ATHLETICS": 18 },
        "description": "Do 2 athletics tasks today."
      },
      {
        "id": "ath_1",
        "order": 1,
        "scope": "life",
        "tier": 1,
        "label": "Quick Feet",
        "icon": "🏃‍♂️",
        "need": { "totalDone": 1 }, // ← 1
        "xpReward": 12,
        "xpAwards": { "ATHLETICS": 14 },
        "description": "Complete 1 athletics task."
      },
      {
        "id": "ath_5",
        "order": 2,
        "scope": "life",
        "tier": 2,
        "label": "Trail Runner",
        "icon": "🌄",
        "need": { "totalDone": 5 }, // ← 5
        "xpReward": 24,
        "xpAwards": { "ATHLETICS": 30 },
        "description": "Complete 5 athletics tasks."
      },
      {
        "id": "ath_15",
        "order": 3,
        "scope": "life",
        "tier": 3,
        "label": "Road Warrior",
        "icon": "🚴‍♀️",
        "need": { "totalDone": 15 }, // ← 15
        "xpReward": 48,
        "xpAwards": { "ATHLETICS": 62 },
        "description": "Complete 15 athletics tasks."
      },
      {
        "id": "ath_40",
        "order": 4,
        "scope": "life",
        "tier": 4,
        "label": "Ultra Runner",
        "icon": "🏅",
        "need": { "totalDone": 40 }, // ← 40
        "xpReward": 80,
        "xpAwards": { "ATHLETICS": 100 },
        "description": "Complete 40 athletics tasks."
      }
    ]
  },

  // ───────────────────────────────────────────────────────────
  // Weekly (REPLACED)
  // ───────────────────────────────────────────────────────────
  {
    "type": "weekly",
    "items": [
      {
        "id": "week_legacy_15k",
        "order": 1,
        "scope": "weekly",
        "tier": 1,
        "label": "Weekly Grinder",
        "icon": "⏫",
        "need": { "weeklyLegacyXP": 15000 }, // evaluated in eval (custom)
        "xpReward": 100,
        "xpAwards": { "WISDOM": 20, "STRENGTH": 20 },
        "description": "Earn 15,000 legacy XP this week."
      },
      {
        "id": "week_branch_5k",
        "order": 2,
        "scope": "weekly",
        "tier": 2,
        "label": "Focused Week • 5k",
        "icon": "🎯",
        "need": { "weeklyBranchXP": 5000 }, // evaluated in eval (custom)
        "xpReward": 120,
        "xpAwards": { },
        "description": "Earn 5,000 XP in a specific category this week."
      },
      {
        "id": "week_branch_10k",
        "order": 3,
        "scope": "weekly",
        "tier": 3,
        "label": "Focused Week • 10k",
        "icon": "🏹",
        "need": { "weeklyBranchXP": 10000 }, // evaluated in eval (custom)
        "xpReward": 160,
        "xpAwards": { },
        "description": "Earn 10,000 XP in a specific category this week."
      }
    ]
  },

  // ───────────────────────────────────────────────────────────
  // Evergreen (unchanged)
  // ───────────────────────────────────────────────────────────
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
        "need": { "levelAtLeast": 5 },
        "xpReward": 25,
        "xpAwards": { "WISDOM": 8, "STRENGTH": 8 },
        "description": "Reach level 5. You're on track."
      },
      {
        "id": "lvl_10",
        "order": 2,
        "scope": "life",
        "tier": 2,
        "label": "Level 10",
        "icon": "🔥",
        "need": { "levelAtLeast": 10 },
        "xpReward": 50,
        "xpAwards": { "WISDOM": 12, "STRENGTH": 12 },
        "description": "Reach level 10. Consistency paying off."
      },
      {
        "id": "lvl_20",
        "order": 3,
        "scope": "life",
        "tier": 3,
        "label": "Level 20",
        "icon": "⚙️",
        "need": { "levelAtLeast": 20 },
        "xpReward": 120,
        "xpAwards": { "WISDOM": 20, "STRENGTH": 20 },
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
        "order": 5,
        "scope": "life",
        "tier": 1,
        "label": "Rookie 10",
        "icon": "🎯",
        "need": { "totalDone": 10 },
        "xpReward": 15,
        "xpAwards": { "TRADE": 10 },
        "description": "Complete 10 tasks overall."
      },
      {
        "id": "tot_50",
        "order": 6,
        "scope": "life",
        "tier": 2,
        "label": "Worker 50",
        "icon": "🔨",
        "need": { "totalDone": 50 },
        "xpReward": 40,
        "xpAwards": { "TRADE": 30 },
        "description": "Complete 50 tasks overall."
      },
      {
        "id": "tot_200",
        "order": 7,
        "scope": "life",
        "tier": 3,
        "label": "Grinder 200",
        "icon": "⚒️",
        "need": { "totalDone": 200 },
        "xpReward": 150,
        "xpAwards": { "TRADE": 80, "STRENGTH": 20 },
        "description": "Complete 200 tasks overall. Relentless."
      },
      {
        "id": "tot_500",
        "order": 8,
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

  // ───────────────────────────────────────────────────────────
  // Time-of-Day (unchanged; already daily)
  // ───────────────────────────────────────────────────────────
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
        "need": { "anyDoneBetween": [5, 8] },
        "xpReward": 15,
        "xpAwards": { "WISDOM": 0, "HEALTH": 0 },
        "description": "Complete a task between 5-8 AM."
      },
      {
        "id": "morning_master",
        "order": 2,
        "scope": "daily",
        "tier": 1,
        "label": "Morning Master",
        "icon": "☀️",
        "need": { "anyDoneBetween": [6, 9] },
        "xpReward": 12,
        "xpAwards": { "WISDOM": 0, "HEALTH": 0 },
        "description": "Complete a task between 6-9 AM."
      },
      {
        "id": "time_night",
        "order": 3,
        "scope": "daily",
        "tier": 1,
        "label": "Night Owl",
        "icon": "🌙",
        "need": { "anyDoneBetween": [0, 5] },
        "xpReward": 15,
        "xpAwards": { "WISDOM": 0, "STRENGTH": 0 },
        "description": "Complete a task between midnight and 5 AM."
      }
    ]
  },

  // ───────────────────────────────────────────────────────────
  // Meta (CHANGED → streak-based; scope: life)
  // ───────────────────────────────────────────────────────────
  {
    "type": "meta",
    "items": [
      {
        "id": "streak_3",
        "order": 1,
        "scope": "life", // ← changed from daily
        "tier": 1,
        "label": "Three-in-a-Row",
        "icon": "🔗",
        "need": {}, // handled by streak logic in evaluateAchievements
        "xpReward": 12,
        "xpAwards": { "TRADE": 12, "STRENGTH": 12 },
        "description": "Maintain a 3-day streak (≥3 tasks/day)."
      },
      {
        "id": "streak_5",
        "order": 2,
        "scope": "life",
        "tier": 2,
        "label": "Five Alive",
        "icon": "🔥",
        "need": {},
        "xpReward": 20,
        "xpAwards": {},
        "description": "Maintain a 5-day streak (≥3 tasks/day)."
      },
      {
        "id": "streak_7",
        "order": 3,
        "scope": "life",
        "tier": 3,
        "label": "Lucky Seven",
        "icon": "🍀",
        "need": {},
        "xpReward": 32,
        "xpAwards": {},
        "description": "Maintain a 7-day streak (≥3 tasks/day)."
      },
      {
        "id": "streak_10",
        "order": 4,
        "scope": "life",
        "tier": 4,
        "label": "Perfect Ten",
        "icon": "🎖️",
        "need": {},
        "xpReward": 50,
        "xpAwards": {},
        "description": "Maintain a 10-day streak (≥3 tasks/day)."
      }
    ]
  }
];

export const ACH_CATALOG = ACH_BLUEPRINT.flatMap(({ type, items }) =>
  items
    .slice()
    .sort(
      (a, b) =>
        (a.tier ?? 0) - (b.tier ?? 0) ||
        (a.order ?? 0) - (b.order ?? 0)
    )
    .map(({ order, ...rest }) => ({ ...rest, type }))
);
