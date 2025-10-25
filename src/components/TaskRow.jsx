import React, { useEffect, useMemo, useRef, useState } from "react";
import { epicifyTask } from "../utils/ai.js";
import { QUEST_TYPES } from "../core/constants.js";

/* ========= helpers ========= */
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

/** تبدیل مقدار xp بچه به XP واقعی (اگر درصدی باشد بر مبنای XP والد محاسبه می‌شود) */
function toChildXpValue(xp, parentBase) {
  if (typeof xp === "string" && xp.trim().endsWith("%")) {
    const pct = parseFloat(xp) || 0;
    return Math.max(0, Math.round((pct / 100) * parentBase));
  }
  return Math.max(0, parseInt(xp || 0, 10) || 0);
}
function sumChildXP(children, parentBase) {
  return (children || []).reduce((a, c) => a + toChildXpValue(c?.xp, parentBase), 0);
}
function usedChildPercent(children, parentBase) {
  if (!parentBase || parentBase <= 0) return 0;
  const sum = sumChildXP(children, parentBase);
  return Math.round((sum / parentBase) * 100);
}

/* ========= inline minimal modal ========= */
function SubAddModal({
  open,
  onClose,
  onSubmit,
  perCap = 99,
  totalCap = 200,
  defaultTitle = "",
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [pct, setPct] = useState(Math.min(10, Math.max(1, perCap)));
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle || "");
      setPct(Math.min(10, Math.max(1, perCap)));
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, perCap, defaultTitle]);

  if (!open) return null;

  const capReached = perCap <= 0 || totalCap <= 0;

  const submit = () => {
    const t = (title || "").trim();
    if (!t) return;
    // اگر سقف پر شده باشد، XP = 1 (نه درصد)
    if (capReached) {
      onSubmit?.({ title: t, percent: 1, forceOne: true });
      return;
    }
    const p = Math.max(1, Math.min(99, parseInt(pct, 10) || 1, perCap));
    onSubmit?.({ title: t, percent: p, forceOne: false });
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add subtask"
    >
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <b>Add subtask</b>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <label className="hint" htmlFor="st-title">
            Subtask title
          </label>
          <input
            id="st-title"
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") onClose();
            }}
          />

          <label className="hint" htmlFor="st-pct">
            {capReached ? (
              <>
                Total cap reached — new subtasks will have <b>1 XP</b>.
              </>
            ) : (
              <>
                Percent of parent XP{" "}
                <span className="mono">(1–{Math.max(0, perCap)}%, total ≤ {totalCap}%)</span>
              </>
            )}
          </label>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 10, alignItems: "center" }}
          >
            <input
              id="st-pct-range"
              type="range"
              min={1}
              max={Math.max(1, perCap)}
              step={1}
              value={capReached ? 1 : Math.min(pct, perCap)}
              onChange={(e) => setPct(parseInt(e.target.value, 10))}
              disabled={capReached}
            />
            <input
              id="st-pct"
              type="number"
              min={1}
              max={Math.max(1, perCap)}
              step={1}
              value={capReached ? 1 : Math.min(pct, perCap)}
              onChange={(e) => setPct(parseInt(e.target.value || "0", 10))}
              disabled={capReached}
            />
          </div>

          {capReached && (
            <div className="hint" style={{ color: "var(--text-muted,#888)" }}>
              You’ve reached the 200% total cap. New subtasks will be added with <b>1 XP</b>.
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn primary" type="button" onClick={submit} disabled={!title.trim()}>
              {capReached ? "Add (1 XP)" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========= component ========= */
export default function TaskRow(props) {
  const {
    t,
    childrenOf,
    onToggle,
    onRemove,
    onAddSubtask,
    onMilestoneToggle,
    onUpdate,
    timeLeft,
    lastBoost,
  } = props;

  const parentBase = Math.max(1, parseInt(t?.baseXp ?? t?.xp ?? 1, 10) || 1);

  const kids = childrenOf(t.id);
  const kidsSorted = useMemo(() => {
    try {
      const arr = Array.isArray(kids) ? [...kids] : [];
      return arr.sort((a, b) => {
        const ax = a?.createdAt || "";
        const bx = b?.createdAt || "";
        if (ax === bx) return 0;
        return ax < bx ? -1 : 1;
      });
    } catch {
      return kids;
    }
  }, [kids]);

  const [addDlgOpen, setAddDlgOpen] = useState(false); // modal for new subtask
  const [openChildMenuId, setOpenChildMenuId] = useState(null); // ellipsis menu for child
  const [editingChildId, setEditingChildId] = useState(null); // inline rename (child)
  const [editingTitle, setEditingTitle] = useState("");
  const [editingParent, setEditingParent] = useState(false); // inline rename (parent/root task)

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const [liveDesc, setLiveDesc] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    function onDoc(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const deadlineText = t.done ? null : timeLeft(t.deadline);
  const questTypeKey = (t?.questType ?? "BASIC").toString().toUpperCase();
  const q = QUEST_TYPES[questTypeKey] || QUEST_TYPES.BASIC;

  const pct = useMemo(() => percentMilestones(t), [t?.subtasks]);
  const milestones = useMemo(
    () => (Array.isArray(t?.subtasks) ? t.subtasks.filter((s) => s?.isMilestone) : []),
    [t?.subtasks]
  );

  // caps: each subtask ≤ 99% ; total of all subtasks ≤ 200% of parent XP
  const usedPct = usedChildPercent(kidsSorted, parentBase); // already consumed by children
  const totalCapLeft = Math.max(0, 200 - usedPct);
  const perCap = Math.max(0, Math.min(99, totalCapLeft));

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
      // Keep onUpdate for desc if provided; safe no-op otherwise
      onUpdate?.(t.id, { desc: final });
    } catch (e) {
      alert("AI failed: " + e.message);
    } finally {
      setIsStreaming(false);
    }
  }

  const canEdit = !t.done;

  return (
    <div className={`task ${t.done ? "done" : ""}`}>
      <input type="checkbox" checked={t.done} onChange={() => onToggle(t.id)} aria-label="Toggle task done" />

      <div className="title">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            {editingParent ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  className="text-input"
                  autoFocus
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && editingTitle.trim()) {
                      props.onRenameTitle?.(t.id, editingTitle.trim());
                      setEditingParent(false);
                      setEditingTitle("");
                    }
                    if (e.key === "Escape") {
                      setEditingParent(false);
                      setEditingTitle("");
                    }
                  }}
                  aria-label="Edit task title"
                />
                <button
                  className="btn primary"
                  onClick={() => {
                    const v = (editingTitle || "").trim();
                    if (!v) return;
                    props.onRenameTitle?.(t.id, v);
                    setEditingParent(false);
                    setEditingTitle("");
                  }}
                  type="button"
                >
                  Save
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setEditingParent(false);
                    setEditingTitle("");
                  }}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="title-main">{t.title}</div>
            )}
          </div>
          <span className="badge" title="Quest type" style={{ whiteSpace: "nowrap" }}>
            {q.label}
          </span>

          {/* parent menu */}
          {!t.parentId && !t.done && (
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                className="icon-btn"
                title="More"
                onClick={() => setMenuOpen((v) => !v)}
                type="button"
                aria-haspopup
                aria-expanded={menuOpen}
              >
                ...
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
                      if (!canEdit) return;
                      setEditingParent(true);
                      setEditingTitle(t.title || "");
                      setMenuOpen(false);
                    }}
                    type="button"
                    disabled={!canEdit}
                  >
                    Edit
                  </button>
                  <button
                    className="btn"
                    onClick={async () => {
                      await aiForThis();
                      setMenuOpen(false);
                    }}
                    type="button"
                    disabled={!canEdit}
                    title="Generate epic story"
                  >
                    AI Story
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      onRemove(t.id);
                      setMenuOpen(false);
                    }}
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
          {isStreaming || liveDesc ? <div>{liveDesc}</div> : t.desc && <div>{t.desc}</div>}

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
                  <label key={m?.id || `milestone-${idx}`} className={`milestone-item ${isChecked ? "done" : ""}`}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={() => {
                        if (!isDisabled) props.onMilestoneToggle?.(t.id, fallbackId);
                      }}
                    />
                    <span className="milestone-title">{m?.title || `Milestone ${idx + 1}`}</span>
                    {weight > 0 && <span className="milestone-weight mono">{weight}%</span>}
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
            <div className={`deadline ${deadlineText.startsWith("Overdue") ? "overdue" : ""}`}>{deadlineText}</div>
          )}
        </div>
      </div>

      <div className="xp mono">{t.xp} XP</div>

      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn" onClick={() => setAddDlgOpen(true)} disabled={!canEdit} type="button">
          + Sub
        </button>
      </div>

      {/* ===== children (subtasks) ===== */}
      {kidsSorted?.length > 0 && (
        <div className="subtask-list" style={{ gridColumn: "1 / -1", display: "grid", gap: 8, marginTop: 8 }}>
          {kidsSorted.map((c) => {
            const childCanEdit = !c.done;
            return (
              <div key={c.id} className={`task ${c.done ? "done" : ""}`} style={{ marginLeft: 16 }}>
                <input
                  type="checkbox"
                  checked={c.done}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggle(c.id);
                  }} // ensure checkbox toggles reliably
                  aria-label="Toggle subtask done"
                />
                <div className="title" style={{ minWidth: 120 }}>
                  {editingChildId === c.id ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        className="text-input"
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editingTitle.trim()) {
                            props.onRenameTitle?.(c.id, editingTitle.trim());
                            setEditingChildId(null);
                            setEditingTitle("");
                          }
                          if (e.key === "Escape") {
                            setEditingChildId(null);
                            setEditingTitle("");
                          }
                        }}
                        aria-label="Edit subtask title"
                      />
                      <button
                        className="btn primary"
                        onClick={() => {
                          const v = (editingTitle || "").trim();
                          if (!v) return;
                          props.onRenameTitle?.(c.id, v);
                          setEditingChildId(null);
                          setEditingTitle("");
                        }}
                        type="button"
                      >
                        Save
                      </button>
                      <button
                        className="btn"
                        onClick={() => {
                          setEditingChildId(null);
                          setEditingTitle("");
                        }}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="title-main">{c.title}</div>
                      {c.desc && <div className="hint" style={{ marginTop: 4 }}>{c.desc}</div>}
                    </>
                  )}
                </div>
                <div className="xp mono">{c.xp} XP</div>

                {/* child row actions: ellipsis menu */}
                <div className="menuWrap" style={{ position: "relative" }}>
                  <button
                    className="icon-btn more"
                    aria-label="More actions"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenChildMenuId(openChildMenuId === c.id ? null : c.id);
                    }}
                    type="button"
                  >
                    ⋯
                  </button>
                  {openChildMenuId === c.id && (
                    <div
                      className="task-menu"
                      role="menu"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: "absolute",
                        top: "110%",
                        right: 0,
                        zIndex: 40,
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: 6,
                        boxShadow: "0 10px 26px rgba(0,0,0,.12)",
                        minWidth: 160,
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <button
                        role="menuitem"
                        onClick={() => {
                          if (!childCanEdit) return;
                          setEditingChildId(c.id);
                          setEditingTitle(c.title || "");
                          setOpenChildMenuId(null);
                        }}
                        disabled={!childCanEdit}
                      >
                        Edit title
                      </button>
                      <button
                        role="menuitem"
                        className="danger"
                        onClick={() => {
                          onRemove(c.id);
                          setOpenChildMenuId(null);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Add subtask modal (caps enforced) ===== */}
      <SubAddModal
        open={addDlgOpen}
        onClose={() => setAddDlgOpen(false)}
        perCap={perCap}
        totalCap={totalCapLeft}
        onSubmit={({ title, percent, forceOne }) => {
          if (forceOne || totalCapLeft <= 0) {
            // سقف پر شده ⇒ XP = 1
            onAddSubtask(t.id, title, 1, () => setAddDlgOpen(false));
          } else {
            const p = Math.max(1, Math.min(99, percent, perCap)); // enforce again
            onAddSubtask(t.id, title, `${p}%`, () => setAddDlgOpen(false));
          }
        }}
      />
    </div>
  );
}
