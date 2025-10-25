// src/components/XPOverview.jsx
import React, { useEffect, useState } from "react";
import { XP_TYPES, XP_META, loadMultiXP, levelFromXP } from "../core/multixp.js";

export default function XPOverview() {
  const [mxp, setMxp] = useState(loadMultiXP());
  useEffect(() => {
    const on = () => setMxp(loadMultiXP());
    window.addEventListener("storage", on);
    const id = setInterval(on, 1000); // lightweight poll in local page
    return () => { window.removeEventListener("storage", on); clearInterval(id); };
  }, []);

  return (
    <div className="xp-overview">
      {XP_TYPES.map(t => {
        const val = mxp.xp[t] || 0;
        const meta = XP_META[t];
        const { level, into, span } = levelFromXP(val);
        const pct = span ? Math.min(100, Math.round((into / span) * 100)) : 0;
        return (
          <div key={t} className="xp-pill">
            <span className="xp-ico" style={{ background: meta.color }}>{meta.icon}</span>
            <div className="xp-info">
              <div className="xp-name">{t}</div>
              <div className="xp-meta">
                <span className="mono">Lv {level}</span>
                <span className="mono">{val} XP</span>
              </div>
              <div className="xp-bar">
                <div style={{ width: `${pct}%`, background: meta.color }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
