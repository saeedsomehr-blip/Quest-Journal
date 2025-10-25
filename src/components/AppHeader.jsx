// src/components/AppHeader.jsx
import React, { useEffect, useState } from "react";
import Character from "./Character.jsx";
import { ACH_CATALOG as ACH } from "../core/achievements.js"; // preserve existing import
import XPOverview from "./XPOverview.jsx";
import SyncStatusBadge from "./SyncStatusBadge.jsx";

export default function AppHeader({
  xp,
  level,
  nextIn,
  progressPct,
  ach,
  celebrate,
  onOpenSettings,
  origin,
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    try {
      const mqWidth = window.matchMedia("(max-width: 900px)");
      const mqCoarse = window.matchMedia("(pointer: coarse), (any-pointer: coarse)");
      const update = () => setIsMobile(Boolean(mqWidth.matches && mqCoarse.matches));
      update();
      mqWidth.addEventListener?.("change", update);
      mqCoarse.addEventListener?.("change", update);
      return () => {
        mqWidth.removeEventListener?.("change", update);
        mqCoarse.removeEventListener?.("change", update);
      };
    } catch {
      setIsMobile(false);
    }
  }, []);

  return (
    <header className="header">
      <div className="header-top">
        <div className="brand-left">
          <Character level={level} celebrate={celebrate} />
          <h1>Quest Journal</h1>
        </div>

        <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SyncStatusBadge />
          {isMobile && (
            <button
              type="button"
              className="icon-btn sm immersive-toggle"
              title="Fullscreen"
              aria-label="Toggle fullscreen"
              onClick={() => {
                try {
                  const ok =
                    window.matchMedia?.("(max-width: 900px)")?.matches &&
                    window.matchMedia?.("(pointer: coarse), (any-pointer: coarse)")?.matches;
                  if (!ok) return;
                  document.body.classList.toggle("is-immersive");
                  if (document.body.classList.contains("is-immersive")) {
                    window.scrollTo(0, 0);
                  }
                } catch {}
              }}
            >
              <span aria-hidden>⛶</span>
            </button>
          )}

          <button
            className="icon-btn"
            title="Settings"
            aria-label="Open settings"
            onClick={onOpenSettings}
          >
            <span aria-hidden>☰</span>
          </button>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="label">Legacy XP</div>
          <div className="value mono">{xp}</div>
        </div>
        <div className="stat">
          <div className="label">Next Level</div>
          <div className="value mono">{nextIn} XP</div>
        </div>
        <div className="stat">
          <div className="label">Progress</div>
          <div className="value mono">{Math.round(progressPct)}%</div>
        </div>
      </div>

      <div
        className="progress-shell"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Math.round(progressPct)}
      >
        <div
          className="progress-fill"
          style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
        />
      </div>

      {origin && (
        <div className="origin-banner">
          <strong>Origin:</strong> <span>{origin}</span>
        </div>
      )}

      {celebrate && <div className="toast">✨ LEVEL UP! ✨</div>}

      {/* multi-XP overview */}
      <XPOverview />
    </header>
  );
}
