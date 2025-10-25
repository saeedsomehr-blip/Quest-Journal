// src/components/TopAchievements.jsx
import React, { useMemo } from "react";
import { ACH_CATALOG } from "../core/achievements.js";


// Map catalog by id to ensure we show canonical icon/label like Achievements tab
const CATALOG_BY_ID = (() => {
  try {
    const map = {};
    (ACH_CATALOG || []).forEach((it) => { if (it && it.id) map[it.id] = it; });
    return map;
  } catch {
    return {};
  }
})();

/**
 * ورودی: ach = {
 *   unlocked: [
 *     { id, label, tier, icon, gainedAt, type, family?, baseId? }
 *   ]
 * }
 *
 * هدف: نمایش ۵ تا از بالاترین تروفی‌های «به‌روز» کاربر.
 * - اگر از یک تروفی چند «Tier» مختلف گرفته شده، فقط بالاترین Tier همان خانواده نشان داده می‌شود.
 * - مرتب‌سازی: اول tier بالاتر، بعد جدیدتر (gainedAt).
 * - props:
 *    - limit? = 5  (می‌تونی تعداد را تغییر بدی)
 */
export default function TopAchievements({ ach, limit = 10 }) {
  const top = useMemo(() => {
    if (!ach) return [];

    // 1) دی‌داپلیکیت بر اساس خانواده‌ی اچیومنت
    //    familyKey: اولویت با a.family یا a.baseId؛ در غیر این صورت بر اساس type
    const source = [
      ...(Array.isArray(ach.unlocked) ? ach.unlocked : []),
      ...(Array.isArray(ach.ephemeralDaily) ? ach.ephemeralDaily : []),
      ...(Array.isArray(ach.ephemeralWeekly) ? ach.ephemeralWeekly : []),
    ];
    if (source.length === 0) return [];
    const bestPerFamily = new Map();
    for (const a of source) {
      const familyKey = (a.family || a.baseId || a.type || "").toLowerCase();
      const prev = bestPerFamily.get(familyKey);

      if (!prev) {
        bestPerFamily.set(familyKey, a);
        continue;
      }

      const prevTier = prev.tier || 0;
      const curTier = a.tier || 0;

      // اگر Tier جدید بالاتره، جایگزین کن
      if (curTier > prevTier) {
        bestPerFamily.set(familyKey, a);
      } else if (curTier === prevTier) {
        // اگر Tier مساوی بود، جدیدتر را نگه دار
        const prevTime = new Date(prev.gainedAt || 0).getTime();
        const curTime  = new Date(a.gainedAt  || 0).getTime();
        if (curTime > prevTime) bestPerFamily.set(familyKey, a);
      }
    }

    // 2) مرتب‌سازی خانواده‌های یکتا
    const unique = [...bestPerFamily.values()];
    unique.sort((a, b) => {
      const ta = a.tier || 0, tb = b.tier || 0;
      if (tb !== ta) return tb - ta;
      const da = new Date(a.gainedAt || 0).getTime();
      const db = new Date(b.gainedAt || 0).getTime();
      return db - da;
    });

    // 3) تنها n مورد اول
    const preferred = ["social", "learning", "health", "meta"];
    const isPref = (a) => preferred.includes((a.type || "").toLowerCase());
    const ordered = [
      ...unique.filter(isPref),
      ...unique.filter((a) => !isPref(a)),
    ];
    return ordered.slice(0, limit);
  }, [ach, limit]);

  if (top.length === 0) return null;

  return (
    <div className="top-achievements" style={{ columnGap: 10, rowGap: 14, marginTop: 10 }}>
      {top.map((a) => {
        const rawKey = (a.family || a.baseId || a.type || 'generic').toString();
        const safeKey = rawKey.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'generic';
        return (
          <div
            key={a.id}
            className="ach-pill"
            data-ach-type={safeKey}
            title={`${(CATALOG_BY_ID[a?.id]?.label ?? a.label)}${a.tier ? ` (Tier ${a.tier})` : ''}`}
          >
            <span className="ach-pill-icon">{CATALOG_BY_ID[a?.id]?.icon ?? a.icon ?? '🏅'}</span>
            <span className="ach-pill-label">{CATALOG_BY_ID[a?.id]?.label ?? a.label}</span>
            {a.tier ? (<span className="ach-pill-tier">Tier {a.tier}</span>) : null}
          </div>
        );
      })}
    </div>
  );
}
