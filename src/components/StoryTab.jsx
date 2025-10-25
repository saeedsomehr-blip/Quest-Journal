import React, { useEffect, useMemo, useState } from "react";
import { todayStr } from "../core/challenges.js";
import SkillForest from "./SkillForest.jsx";

/**
 * StoryTab
 * - Main: Origin (top center, edit-in-place)
 * - Sidebar: Chronicles (collapsed to right)
 * - Bottom: SkillForest
 * - profileVersion: whenever XP/perks change, App bumps this so SkillForest refreshes.
 */
export default function StoryTab({ level, tasks, origin, setOrigin, profileVersion }) {
  // Origin editor state
  const [draft, setDraft] = useState(origin || "");
  const [editing, setEditing] = useState(false);

  // Keep draft synced with external origin changes
  useEffect(() => {
    setDraft(origin || "");
  }, [origin]);

  // Recent completed tasks (latest 8, most recent first)
  const recentDone = useMemo(() => {
    const done = tasks.filter(t => t.done);
    done.sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return tb - ta;
    });
    return done.slice(0, 8);
  }, [tasks]);
  // Chronicles pager (one item at a time)
  const [chronIndex, setChronIndex] = useState(0);
  useEffect(() => {
    if (recentDone.length === 0) { setChronIndex(0); return; }
    if (chronIndex > recentDone.length - 1) setChronIndex(recentDone.length - 1);
  }, [recentDone, chronIndex]);
  const canPrev = chronIndex < (recentDone.length - 1);
  const canNext = chronIndex > 0;
  const currentChron = recentDone[chronIndex] || null;

  function handleSave() {
    const v = (draft || "").trim();
    setOrigin(v);
    setEditing(false); // collapse after save
  }
  function handleCancel() {
    setDraft(origin || "");
    setEditing(false);
  }

  // Simple responsive breakpoint
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 960);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const gridDesktop = {
    display: "grid",
    gridTemplateColumns: "1.6fr 0.9fr",
    gap: 16,
  };
  const gridMobile = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 16,
  };

  return (
    <div className="card" style={{ display: "grid", gap: 16 }}>
      {/* Two-column layout */}
      <section style={isNarrow ? gridMobile : gridDesktop}>
        {/* MAIN COLUMN â€” Origin (moved to top center) */}
        <div className="sf-card" style={{ borderRadius: 16 }}>
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <h3 style={{ margin: 0 }}>Origin</h3>
            {!editing ? (
              <button className="btn" onClick={() => setEditing(true)}>Edit</button>
            ) : null}
          </header>

          {/* Read mode */}
          {!editing && (
            <div style={{ display: "grid", gap: 8 }}>
              {origin ? (
                <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 240, overflowY: "auto" }}>
                  {origin}
                </div>
              ) : (
                <div className="hint">
                  No origin set yet. Click "Edit" to write your backstory.
                </div>
              )}
            </div>
          )}

          {/* Edit mode */}
          {editing && (
            <div style={{ display: "grid", gap: 8 }}>
              <textarea
                rows={8}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Who are you? What's your quest?"
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn" onClick={handleCancel}>Cancel</button>
                <button className="btn primary" onClick={handleSave}>Save</button>
              </div>
              <div className="hint">
                Saved origin appears here, stays compact, and wonâ€™t take over the page.
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — Chronicles (pager) */}
        <aside className="sf-card" style={{ borderRadius: 16, position: "relative" }}>
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <h3 style={{ margin: 0 }}>Chronicles</h3>
            <span className="hint" style={{ margin: 8, fontSize: "12px" }}>Your latest completed quests</span>
          </header>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Level: {level}</span>
              <span className="hint">{recentDone.length ? `${recentDone.length - chronIndex} of ${recentDone.length}` : ""}</span>
            </div>
            {recentDone.length === 0 ? (
              <div className="empty">No adventures written yet — complete a quest to start your chronicles.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button className="btn" onClick={() => setChronIndex(i => Math.min(recentDone.length - 1, i + 1))} disabled={!canPrev}>&lt; Prev</button>
                  <button className="btn" onClick={() => setChronIndex(i => Math.max(0, i - 1))} disabled={!canNext}>Next &gt;</button>
                </div>
                {currentChron && (
                  <div style={{ border: "1px solid var(--card-border, #e5e7eb)", borderRadius: 12, padding: 10, maxHeight: 260, overflowY: "auto" }}>
                    <div style={{ fontWeight: 700 }}>{currentChron.title}</div>
                    <div className="hint" style={{ marginTop: 2 }}>{'\uD83D\uDD52'} {new Date(currentChron.createdAt).toLocaleString()}</div>
                    {currentChron.desc ? (
                      <div className="hint" style={{ marginTop: 6, overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
                        {currentChron.desc}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </section>

      {/* Skill Forest (unchanged) */}
      <SkillForest key={profileVersion ?? "skillforest"} profileVersion={profileVersion} />
    </div>
  );
}