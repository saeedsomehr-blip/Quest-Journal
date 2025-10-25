import React, { useEffect, useMemo, useRef, useState } from "react";
import { epicifyTask } from "../utils/ai.js";
import { QUEST_TYPES } from "../core/constants.js";

function percentMilestones(task) {
  const subs = Array.isArray(task?.subtasks) ? task.subtasks : [];
  const totalW = subs
    .filter((s) => s?.isMilestone)
    .reduce((a, s) => a + Math.max(0, Number(s.milestoneWeight) || 0), 0);
  const doneW = subs
    .filter((s) => s?.isMilestone && s.done)
    .reduce((a, s) => a + Math.max(0, Number(s.milestoneWeight) || 0), 0);
  if (totalW <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((doneW / totalW) * 100)));
}

export default function TaskRow({
  t,
  childrenOf,
  onToggle,
  onRemove,
  onAddSubtask,
  onMilestoneToggle,
  onUpdate,
  timeLeft,
  lastBoost,
}) {
  const kids = childrenOf(t.id);
  const kidsSorted = useMemo(() => {
    try {
      const arr = Array.isArray(kids) ? [...kids] : [];
      return arr.sort((a, b) => {
        const ax = (a?.createdAt || "");
        const bx = (b?.createdAt || "");
        if (ax === bx) return 0;
        return ax < bx ? -1 : 1;
      });
    } catch {
      return kids;
    }
  }, [kids?.length]);
  const [addingSub, setAddingSub] = useState(false);
  const [newSubTitle, setNewSubTitle] = useState("");
  // Subtask XP now computed from parent XP via percentage; no free numeric input
  const [liveDesc, setLiveDesc] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const addRowRef = useRef(null);

  useEffect(() => {
    function onDoc(e){ if (!menuRef.current) return; if (!menuRef.current.contains(e.target)) setMenuOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (addingSub && addRowRef.current) {
      try { addRowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch {}
    }
  }, [addingSub]);

  useEffect(() => {
    if (addingSub && addRowRef.current) {
      try { addRowRef.current.scrollIntoView({ block: 'nearest' }); } catch {}
    }
  }, [newSubTitle]);

  const deadlineText = t.done ? null : timeLeft(t.deadline);
  const questTypeKey = ((t?.questType ?? "BASIC").toString().toUpperCase());
  const q = QUEST_TYPES[questTypeKey] || QUEST_TYPES.BASIC;

  const pct = useMemo(() => percentMilestones(t), [t?.subtasks]);
  const milestones = useMemo(
    () => (Array.isArray(t?.subtasks) ? t.subtasks.filter((s) => s?.isMilestone) : []),
    [t?.subtasks]
  );

  async function aiForThis() {
    try {
      setIsStreaming(true);
      let final = "";
      await epicifyTask(t.title, t.desc || "", {
        stream: true,
        onToken: (_tok, full) => {
          setLiveDesc(full);
          final = full;
        },
      });
      onUpdate?.(t.id, { desc: final });
    } catch (e) {
      alert("AI failed: " + e.message);
    } finally { setIsStreaming(false); }
  }

  function submitNewSub() {
    const title = newSubTitle.trim();
    if (!title) return;
    // Ask for importance percentage (0-200)
    let pctStr = prompt("Ø§ÛŒÙ† Ø³Ø§Ø¨â€ŒØªØ³Ú©ØŒ Ú†Ù†Ø¯ Ø¯Ø±ØµØ¯ Ø§Ø² ØªØ³Ú© Ø§ØµÙ„ÛŒ Ù...Ù‡Ù...Ù‡ØŸ (Û° ØªØ§ Û²Û°Û°)", "10");
    if (pctStr == null) return; // cancelled
    const pct = Math.max(1, Math.min(99, parseInt(pctStr, 10) || 0));
    onAddSubtask(t.id, title, pct, () => {
      setAddingSub(false);
      setNewSubTitle("");
    });
  }

  const canEdit = !t.done;

  return (
    <div className={`task ${t.done ? "done" : ""} ${addingSub ? "adding-sub" : ""}`}>
      <input
        type="checkbox"
        checked={t.done}
        onChange={() => onToggle(t.id)}
        aria-label="Toggle task done"
      />

      <div className="title">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 120 }}>{t.title}</div>
          <span className="badge" title="Quest type" style={{ whiteSpace: "nowrap" }}>
            {q.label}
          </span>
          {!t.parentId && !t.done && (
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                className="icon-btn"
                title="More"
                onClick={() => setMenuOpen(v => !v)}
                type="button"
                aria-haspopup
                aria-expanded={menuOpen}
              >
                Â·Â·Â·
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "110%",
                    zIndex: 40,
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    boxShadow: "0 10px 26px rgba(0,0,0,.12)",
                    minWidth: 160,
                    padding: 6,
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <button
                    className="btn"
                    onClick={() => {
                      const v = prompt("Edit title:", t.title || "");
                      if (v != null && v.trim() && onUpdate) onUpdate(t.id, { title: v.trim() });
                      setMenuOpen(false);
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="btn"
                    onClick={async () => { await aiForThis(); setMenuOpen(false); }}
                    type="button"
                    disabled={!canEdit}
                    title="Generate epic story"
                  >
                    âœ¨ AI story
                  </button>
                  <button
                    className="btn"
                    onClick={() => { onRemove(t.id); setMenuOpen(false); }}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="hint" style={{ marginTop: 4 }}>
          {(isStreaming || liveDesc) ? (
            <div>{liveDesc}</div>
          ) : (
            t.desc && <div>{t.desc}</div>
          )}

          {/* â›”ï¸ Ù‚Ø¨Ù„Ø§Ù‹ Ø§ÛŒÙ†Ø¬Ø§ Ø±ÛŒØ²Ù XP Ø´Ø§Ø®Ù‡â€ŒÙ‡Ø§ Ø±Ù†Ø¯Ø± Ù...ÛŒâ€ŒØ´Ø¯ Ú©Ù‡ Ø­Ø°Ù Ø´Ø¯ */}

          {["MAIN", "EPIC"].includes(questTypeKey) && (
            <span
              className="hint"
              title="Milestone progress"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6 }}
            >
              <progress className="bar" max={100} value={pct}></progress>
              <span className="mono">{pct}%</span>
            </span>
          )}

          {milestones.length > 0 && (
            <div className="milestone-list" style={{ marginTop: 6 }}>
              {milestones.map((m, idx) => {
                const weight = Math.max(0, Number(m?.milestoneWeight) || 0);
                const fallbackId = m?.id || String(idx);
                const isChecked = !!m?.done;
                const isDisabled = isChecked || !canEdit;
                return (
                  <label
                    key={m?.id || `milestone-${idx}`}
                    className={`milestone-item ${isChecked ? "done" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={() => {
                        if (!isDisabled) onMilestoneToggle?.(t.id, fallbackId);
                      }}
                    />
                    <span className="milestone-title">
                      {m?.title || `Milestone ${idx + 1}`}
                    </span>
                    {weight > 0 && (
                      <span className="milestone-weight mono">{weight}%</span>
                    )}
                  </label>
                );
              })}
            </div>
          )}

          {!!lastBoost && (
            <span className="hint" style={{ marginLeft: 8 }}>
              +Boost from subtasks: <b className="mono">+{lastBoost}</b>
            </span>
          )}

          {deadlineText && (
            <div
              className={`deadline ${deadlineText.startsWith("Overdue") ? "overdue" : ""}`}
            >
              {deadlineText}
            </div>
          )}
        </div>
      </div>

      <div className="xp mono">{t.xp} XP</div>

      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn" onClick={() => setAddingSub(true)} disabled={!canEdit} type="button">+ Sub</button>
      </div>

      {addingSub ? (
        <div ref={addRowRef} className="subtask-add" style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input
            className="text-input"
            autoFocus
            placeholder="Subtask titleâ€¦"
            value={newSubTitle}
            onChange={(e) => setNewSubTitle(e.target.value)}
            onFocus={(e) => { try { e.target.scrollIntoView({ block: 'nearest' }); } catch {} }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitNewSub();
            }}
            aria-label="Subtask title"
          />
          <button className="btn" onClick={submitNewSub} type="button">
            Add
          </button>
          <button
            className="btn"
            onClick={() => {
              setAddingSub(false);
              setNewSubTitle("");
            }}
            type="button"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          {kidsSorted?.length > 0 && (
            <div
              className="subtask-list"
              style={{ gridColumn: "1 / -1", display: "grid", gap: 8, marginTop: 8 }}
            >
              {kidsSorted.map((c) => {
                const childCanEdit = !c.done;
                return (
                  <div
                    key={c.id}
                    className={`task ${c.done ? "done" : ""}`}
                    style={{ marginLeft: 16 }}
                  >
                    <input
                      type="checkbox"
                      checked={c.done}
                      onChange={() => onToggle(c.id)}
                      aria-label="Toggle subtask done"
                    />
                    <div className="title">
                      <div>{c.title}</div>
                      {c.desc && (
                        <div className="hint" style={{ marginTop: 4 }}>
                          {c.desc}
                        </div>
                      )}
                    </div>
                    <div className="xp mono">{c.xp} XP</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {false && (
                        <button className="btn" type="button" disabled>
                          âœ¨ AI
                        </button>
                      )}
                      <button
                        className="btn icon-btn"
                        onClick={() => onRemove(c.id)}
                        aria-label="Delete child"
                        type="button"
                      >🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}





