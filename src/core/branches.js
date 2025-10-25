// src/core/branches.js
// Single source of truth for branch constants & UI meta

export const BR = {
  WISDOM: "WISDOM",
  HEALTH: "HEALTH",
  STRENGTH: "STRENGTH",
  SOCIAL: "SOCIAL",
  TRADE: "TRADE",
  ATHLETICS: "ATHLETICS",
};

export const XP_TYPES = Object.keys(BR);

// Optional UI metadata shared across components (colors/icons)
export const XP_META = {
  WISDOM:    { color: "#6366f1", icon: "🧠" },
  HEALTH:    { color: "#22c55e", icon: "💚" },
  STRENGTH:  { color: "#ef4444", icon: "💪" },
  SOCIAL:    { color: "#f59e0b", icon: "🗣️" },
  TRADE:     { color: "#06b6d4", icon: "💼" },
  ATHLETICS: { color: "#10b981", icon: "🏃‍♂️" },
};
