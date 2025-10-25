// src/components/AchievementsPanel.jsx
import React, { useMemo } from "react";
import { ACH_CATALOG } from "../core/achievements.js";

// Index current catalog by id to prefer latest icon/label
const CATALOG_BY_ID = (() => {
  try {
    const map = {};
    (ACH_CATALOG || []).forEach((it) => { if (it && it.id) map[it.id] = it; });
    return map;
  } catch { return {}; }
})();

/**
 * Compact floating sidebar showing only earned achievements.
 * - Stays outside main card (fixed on the right).
 * - Small footprint; scrolls if long.
 * Expected shapes supported:
 *  - Array of { id, label|name, icon, unlocked|earned, earnedAt }
 *  - Object with { earned: [...] } or { items: [...] }
 */
export default function AchievementsPanel({ ach }) {
  const earned = useMemo(() => {
    if (!ach) return [];
    // normalize a few likely shapes
    const list =
      Array.isArray(ach) ? ach :
      Array.isArray(ach?.earned) ? ach.earned :
      Array.isArray(ach?.items) ? ach.items :
      [];

    return list
      .filter(a => (a.unlocked ?? a.earned ?? a.isEarned ?? a.done ?? false))
      .map(a => ({
        id: a.id || a.key || a.slug || String(a.label || a.name || Math.random()),
        name: a.label || a.name || "Achievement",
        icon: a.icon || "🏅",
        earnedAt: a.earnedAt || a.date || null
      }));
  }, [ach]);

  if (!earned.length) return null;

  return (
    <aside className="ach-sidebar">
      <div className="ach-header">Medals</div>
      <div className="ach-list">
        {earned.map(a => (
          <div key={a.id} className="ach-item" title={CATALOG_BY_ID[a.id]?.label ?? a.name}>
            <div className="ach-ico">{CATALOG_BY_ID[a.id]?.icon ?? a.icon}</div>
            <div className="ach-meta">
              <div className="ach-name">{CATALOG_BY_ID[a.id]?.label ?? a.name}</div>
              {a.earnedAt ? <div className="ach-date">{new Date(a.earnedAt).toLocaleDateString()}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
