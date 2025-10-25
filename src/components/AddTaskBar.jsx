// src/components/AddTaskBar.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { epicifyTask } from "../utils/ai.js";
import { XP_TYPES, XP_META, loadMultiXP, computeBuffBreakdown } from "../core/multixp.js";
import { suggestXP, bandFor, stepFor } from "../core/xpSuggest.js";
import { QUEST_TYPES, QUEST_UNITS_LABEL } from "../core/constants.js";
import MilestoneBuilder from "./MilestoneBuilder.jsx";
import "./AddTaskBar.css";

/* ---------- helpers ---------- */
function sumMapValues(obj) {
  return Object.values(obj || {}).reduce((acc, v) => {
    const n = parseInt(v, 10);
    return acc + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);
}
function clampAllocation(nextMap, key, base) {
  const total = sumMapValues(nextMap);
  if (total <= base) return nextMap;
  const cur = parseInt(nextMap[key] || 0, 10) || 0;
  const over = total - base;
  const newVal = Math.max(0, cur - over);
  return { ...nextMap, [key]: newVal ? String(newVal) : "" };
}
function primaryBranchOf(allocMap) {
  const total = sumMapValues(allocMap);
  if (total <= 0) return null;
  let best = null, bestVal = 0;
  for (const k of XP_TYPES) {
    const v = parseInt(allocMap?.[k] || 0, 10) || 0;
    if (v > bestVal) { bestVal = v; best = k; }
  }
  return bestVal / total >= 0.5 ? best : null;
}

/* ---------- component ---------- */
export default function AddTaskBar({
  text, setText,
  aiText, setAiText,
  xpInput, setXpInput,
  deadlineAmt, setDeadlineAmt,
  deadlineUnit, setDeadlineUnit,
  setAbsoluteDue,
  recur, setRecur,
  desc, setDesc,
  onAdd,
  level = 1,
}) {
  const titleRef = useRef(null);
  const wrapRef = useRef(null);

  const [questType, setQuestType] = useState("BASIC");
  const [duration, setDuration] = useState(1);

  const [showDue, setShowDue] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);

  const [xpWizardOpen, setXpWizardOpen] = useState(false);
  const [allocOpen, setAllocOpen] = useState(false);
  const [alloc, setAlloc] = useState({});
  const [xpSliders, setXpSliders] = useState(null);

  const [showMB, setShowMB] = useState(false);
  const [pendingSubtasks, setPendingSubtasks] = useState(null);

  const [buffs, setBuffs] = useState(() => computeBuffBreakdown(loadMultiXP()));
  useEffect(() => {
    const id = setInterval(() => setBuffs(computeBuffBreakdown(loadMultiXP())), 1500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onDoc(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) { setShowDue(false); setShowRepeat(false); }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const safeBase = !xpInput ? 1 : Math.max(1, parseInt(xpInput, 10) || 1);
  const totalAlloc = sumMapValues(alloc);
  const remaining = Math.max(0, safeBase - totalAlloc);

  const branchPreview = useMemo(() => {
    const out = {};
    XP_TYPES.forEach((t) => {
      const raw = parseInt(alloc[t], 10) || 0;
      const mBranch = (buffs?.branchMul?.[t] || 1);
      const final = raw > 0 ? Math.round(raw * mBranch) : 0;
      out[t] = { raw, final, delta: final - raw, mult: mBranch };
    });
    return out;
  }, [alloc, buffs]);

  const totalsPreview = useMemo(() => {
    const raw = XP_TYPES.reduce((s, t) => s + (branchPreview[t].raw || 0), 0);
    const deltaBranch = XP_TYPES.reduce((s, t) => s + (branchPreview[t].delta || 0), 0);
    return { raw, deltaBranch, finalNoGlobal: raw + deltaBranch };
  }, [branchPreview]);

  const gMul = buffs?.globalMul || 1;
  const gDelta = xpInput ? Math.max(0, Math.round(xpInput * (gMul - 1))) : 0;

  const currentPrimary = primaryBranchOf(alloc);

  async function handleAI() {
    const title = (text || "").trim();
    if (!title) { titleRef.current?.focus(); return; }
    try {
      let final = "";
      await epicifyTask(title, desc, {
        stream: true,
        onToken: (_tok, full) => {
          final = full;
          setDesc(full);
          setAiText?.(full);
        },
      });
    } catch (e) {
      alert("AI failed: " + e.message);
    }
  }

  function updateAlloc(t, raw) {
    const base = !xpInput ? 1 : Math.max(1, parseInt(xpInput, 10) || 1);
    let val = raw === "" ? "" : String(Math.max(0, parseInt(raw, 10) || 0));
    const next = { ...alloc, [t]: val };
    const clamped = clampAllocation(next, t, base);
    setAlloc(clamped);
  }
  function clearAllocAll() { setAlloc({}); }
  function fillEven() {
    const base = !xpInput ? 1 : Math.max(1, parseInt(xpInput, 10) || 1);
    const per = Math.max(0, Math.floor(base / XP_TYPES.length));
    const rest = Math.max(0, base - per * XP_TYPES.length);
    const next = Object.fromEntries(XP_TYPES.map((t, i) => [t, String(per + (i < rest ? 1 : 0))]));
    setAlloc(next);
  }

  function typeLocked(q) {
    const t = QUEST_TYPES[q];
    return (level || 1) < (t?.unlockLvl || 1);
  }

  function handleAdd() {
    const title = (text || aiText || "").trim();
    if (!title) { titleRef.current?.focus(); return; }

    const xpAwards = {};
    for (const t of XP_TYPES) {
      const v = parseInt(alloc[t] || 0, 10);
      if (Number.isFinite(v) && v > 0) xpAwards[t] = v;
    }
    const primary = primaryBranchOf(xpAwards) || undefined;
    const qmeta = QUEST_TYPES[questType] || QUEST_TYPES.BASIC;

    const task = {
      title,
      description: desc || "",
      baseXp: Math.max(1, parseInt(xpInput || 1, 10)),
      xpBase: Math.max(1, parseInt(xpInput || 1, 10)),
      xpAwards,
      primaryBranch: primary,
      questType,
      duration: Math.max(0.25, Number(duration) || 0.25),
      createdAt: new Date().toISOString(),
      done: false,
      escrow: { mode: qmeta.escrow, paid: false },
      deadlineAmt,
      deadlineUnit,
      recur,
      ...(pendingSubtasks ? { subtasks: pendingSubtasks.map(s => ({ ...s })) } : {}),
    };

    onAdd?.(task);

    setAlloc({});
    setXpInput(undefined);
    setDuration(1);
    setQuestType("BASIC");
    setXpSliders(null);
    setPendingSubtasks(null);
    setShowMB(false);
  }

  // dark-mode input text tweak
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const fieldStyle = isDark
    ? { backgroundColor: "#10254fff", color: "#98a5c5ff", transition: "background-color 0.3s ease, color 0.3s ease" }
    : {};

  return (
    <section className="add addTaskBar add-task-bar" ref={wrapRef}>
      {/* main row items as direct children (no extra wrappers) */}
      <input
        ref={titleRef}
        type="text"
        className="titleInput"
        placeholder="Task title..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={fieldStyle}
      />

      <div className="xpGroup" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span className="xpLabel">XP</span>
        <input
          className="xpInput"
          type="number"
          value={xpInput ?? ""}
          placeholder="-"
          readOnly
          title="Select XP via the wizard"
          style={{ width: "clamp(70px, 18vw, 90px)", ...fieldStyle }}
        />
        {xpInput ? (
          <small className="hint mono" title={`global buff ×${gMul.toFixed(2)}`}>+{Math.max(0, Math.round(xpInput * (gMul - 1)))}</small>
        ) : null}
        <button className="btn" onClick={() => setXpWizardOpen(true)} title="Choose XP">XP...</button>
        <button className="btn" onClick={() => setAllocOpen(true)} title="Allocate branches" disabled={!xpInput}>
          Allocate...
        </button>
      </div>

      {/* Due */}
      <div className="dueWrap" style={{ position: "relative" }}>
        <button className="btn" onClick={() => { setShowDue(v => !v); setShowRepeat(false); }}>Due ▾</button>
        {showDue && (
          <div
            style={{
              position: "absolute",
              top: "110%",
              right: 0,
              zIndex: 30,
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 10,
              boxShadow: "0 10px 26px rgba(0,0,0,.12)",
              width: "min(92vw, 320px)",
              display: "grid",
              gap: 8,
            }}
          >
            <b>Set deadline</b>

            <div className="hint">Relative:</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <input
                className="dueInput"
                type="number"
                min={1}
                value={deadlineAmt}
                onChange={(e) => {
                  const n = parseInt(e.target.value || 1, 10);
                  setDeadlineAmt(Number.isFinite(n) && n > 0 ? n : 1);
                }}
                placeholder="2"
                style={fieldStyle}
              />
              <select value={deadlineUnit} onChange={(e) => setDeadlineUnit(e.target.value)} className="dueSelect" style={fieldStyle}>
                <option value="min">min</option>
                <option value="h">h</option>
                <option value="d">d</option>
              </select>
            </div>

            <div className="hint">Absolute:</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input
                type="date"
                onChange={(e) => {
                  const d = e.target.value;
                  if (!d) return setAbsoluteDue?.(null);
                  const iso = new Date(`${d}T23:59:59`).toISOString();
                  setAbsoluteDue?.(iso);
                }}
                style={fieldStyle}
              />
              <input
                type="time"
                onChange={(e) => {
                  const t = e.target.value;
                  if (!t) return;
                  const d = new Date();
                  const [H, M] = t.split(":").map((x) => parseInt(x || "0", 10));
                  d.setHours(H); d.setMinutes(M); d.setSeconds(0); d.setMilliseconds(0);
                  setAbsoluteDue?.(d.toISOString());
                }}
                style={fieldStyle}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn" onClick={() => setShowDue(false)}>Close</button>
            </div>
          </div>
        )}
      </div>

      {/* Repeat */}
      <div className="repeatWrap" style={{ position: "relative" }}>
        <button className="btn" onClick={() => { setShowRepeat(v => !v); setShowDue(false); }}>Repeat ⟳</button>
        {showRepeat && (
          <div
            style={{
              position: "absolute",
              top: "110%",
              right: 0,
              zIndex: 30,
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 10,
              boxShadow: "0 10px 26px rgba(0,0,0,.12)",
              width: "min(92vw, 280px)",
              display: "grid",
              gap: 8,
            }}
          >
            <b>Repeat ⟳</b>
            <select value={recur} onChange={(e) => setRecur(e.target.value)} style={fieldStyle}>
              <option value="none">No repeat</option>
              <option value="daily">Repeat: daily</option>
              <option value="weekly">Repeat: weekly</option>
              <option value="monthly">Repeat: monthly</option>
            </select>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn" onClick={() => setShowRepeat(false)}>Close</button>
            </div>
          </div>
        )}
      </div>

      <button className="btn aiBtn" onClick={handleAI} title="AI story">✨</button>
      <button className="btn addBtn primary" onClick={handleAdd} title="Add this task">+ Add</button>

      {/* Description / Notes */}
      <div className="notesWrap" style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
        <span className="xpLabel">Description / Notes</span>
        <textarea
          rows={3}
          placeholder="Write notes... or click ✨ AI story"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          style={fieldStyle}
        />
      </div>

      {/* XP WIZARD */}
      {xpWizardOpen && (
        <div className="modal-backdrop" style={{ alignItems: "flex-start", paddingTop: 50 }} onClick={() => setXpWizardOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <b>Choose XP</b>
              <button className="icon-btn" onClick={() => setXpWizardOpen(false)} title="Close">✕</button>
            </div>

            <XPWizard
              level={level}
              buffs={buffs}
              initQuestType={questType}
              initDuration={duration}
              initSliders={xpSliders}
              typeLocked={typeLocked}
              onCancel={() => setXpWizardOpen(false)}
              onSlidersChange={(s) => setXpSliders(s)}
              onApply={({ xpBase, questType: qt, duration: dur, openMilestones }) => {
                setQuestType(qt);
                setDuration(dur);
                setXpInput(xpBase);
                setXpWizardOpen(false);
                if (openMilestones) setShowMB(true);
                else setAllocOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Milestone Builder */}
      {showMB && (
        <div className="modal-backdrop" onClick={() => setShowMB(false)}>
          <MilestoneBuilder
            defaultCount={questType === "EPIC" ? 4 : 3}
            onCancel={() => setShowMB(false)}
            onCreateSubtasks={(subs) => setPendingSubtasks(subs)}
            onCreate={() => { setShowMB(false); setAllocOpen(true); }}
          />
        </div>
      )}

      {/* Allocation Modal */}
      {allocOpen && (
        <div className="modal-backdrop" onClick={() => setAllocOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ alignItems: "flex-start" }}>
              <div>
                <b>Allocate XP branches</b>
                {currentPrimary && (
                  <div className="hint" style={{ marginTop: 4 }}>
                    <span
                      className="chip"
                      style={{
                        borderColor: XP_META[currentPrimary]?.color,
                        color: XP_META[currentPrimary]?.color,
                      }}
                    >
                      {currentPrimary} task
                    </span>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={clearAllocAll}>Clear</button>
                <button className="btn" onClick={fillEven}>Even split</button>
                <button className="btn primary" onClick={() => setAllocOpen(false)}>Done</button>
              </div>
            </div>

            <div className="row-sb" style={{ marginBottom: 6 }}>
              <span className="hint">Base XP to split</span>
              <span className="mono">
                {safeBase}{" "}
                {gDelta > 0 ? (
                  <small className="hint mono" title={`global buff ×${gMul.toFixed(2)}`}> (+{gDelta})</small>
                ) : null}
              </span>
            </div>
            <div className="row-sb" style={{ marginBottom: 12 }}>
              <span className="hint">Allocated</span>
              <span className="mono">{totalAlloc} / {safeBase} (remaining: {remaining})</span>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:8 }}>
              {XP_TYPES.map((t) => {
                const color = XP_META[t]?.color || "#4b5563";
                const icon  = XP_META[t]?.icon  || "*";
                const val   = alloc[t] ?? "";
                const view  = branchPreview[t];
                return (
                  <div key={t} className="xp-pill" style={{ padding: 8 }}>
                    <span className="xp-ico" style={{ background: color }}>{icon}</span>
                    <div className="xp-info">
                      <div className="xp-name">{t}</div>
                      <div className="xp-meta" style={{ justifyContent:"space-between", alignItems:"center" }}>
                        <span className="hint">
                          Allocated{" "}
                          {view.delta > 0 ? (
                            <span className="chip mono" title={`branch buff ×${view.mult.toFixed(2)}`}>+{view.delta}</span>
                          ) : null}
                        </span>
                        <input
                          className="xp-chip-input"
                          type="number"
                          min={0}
                          inputMode="numeric"
                          placeholder="0"
                          value={val}
                          onChange={(e) => updateAlloc(t, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
                          }}
                          style={{ width: 80, ...fieldStyle }}
                        />
                      </div>
                      {view.final > 0 ? (
                        <div className="hint mono" style={{ marginTop: 4 }}>
                          {"->"} {view.raw} <span style={{ opacity: 0.7 }}>+{view.delta}</span> = <b>{view.final}</b>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hint mono" style={{ marginTop: 8, textAlign: "right" }}>
              Allocated sum: {totalsPreview.raw}
              {totalsPreview.deltaBranch > 0 ? (
                <> {"•"} branch buff: +{totalsPreview.deltaBranch} {"->"} {totalsPreview.finalNoGlobal}</>
              ) : null}
            </div>

            <div className="hint" style={{ marginTop: 8 }}>
              Global buff applies to total XP once (shown as + near the base), while branch buffs apply to each allocation. Unallocated amount remains as global XP only.
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- XP Wizard ---------- */
export function XPWizard({
  level = 1,
  buffs,
  initQuestType = "BASIC",
  initDuration = 1,
  initSliders = null,
  typeLocked = () => false,
  onCancel,
  onApply,
  onSlidersChange,
}) {
  const [questType, setQuestType] = useState(initQuestType);
  const [duration, setDuration] = useState(initDuration);

  const _init = initSliders || {};
  const [difficulty, setDifficulty] = useState(_init.difficulty ?? 50);
  const [importance, setImportance] = useState(_init.importance ?? 50);
  const [energy, setEnergy]       = useState(_init.energy ?? 50);
  const [pride, setPride]         = useState(_init.pride ?? 50);
  useEffect(() => { onSlidersChange?.({ difficulty, importance, energy, pride }); }, [difficulty, importance, energy, pride, onSlidersChange]);

  const suggested = useMemo(
    () => suggestXP({ questType, duration, sliders: { difficulty, importance, energy, pride }, level }),
    [questType, duration, difficulty, importance, energy, pride, level]
  );
  const range = useMemo(() => bandFor(suggested), [suggested]);

  const [chosen, setChosen] = useState(suggested);
  useEffect(() => {
    const { min, max } = range;
    setChosen(prev => Math.min(max, Math.max(min, Number.isFinite(prev) ? prev : suggested)));
  }, [range, suggested]);

  // Allow fine-grained control: use step=1 for slider/number
  const step = 1;
  const gMul = buffs?.globalMul || 1;
  const gDelta = Math.max(0, Math.round(chosen * (gMul - 1)));
  // Keep exact chosen value (no rounding to 5s) for full freedom
  const baseRounded = chosen;

  const unit = QUEST_TYPES[questType]?.unit || "h";
  const unitLabel = QUEST_UNITS_LABEL[unit] || "hours";
  const durCfg = useMemo(() => {
    switch (questType) {
      case "BASIC": return { min: 0.25, max: 12, step: 0.25, sliderMax: 12 };
      case "SIDE":  return { min: 1, max: 30, step: 1, sliderMax: 30 };
      case "MAIN":  return { min: 1, max: 26, step: 1, sliderMax: 26 };
      case "EPIC":  return { min: 1, max: 12, step: 1, sliderMax: 12 };
      default:      return { min: 0.25, max: 12, step: 0.25, sliderMax: 12 };
    }
  }, [questType]);

  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const fieldStyle = isDark ? { backgroundColor: "#10254fff", color: "#98a5c5ff" } : {};

  return (
    <div style={{ display:"grid", gap:12 }}>
      <div className="sf-card" style={{ padding: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div className="hint" style={{ marginRight: 6 }}>Quest Type:</div>
        {["BASIC","SIDE","MAIN","EPIC"].map(q => {
          const t = QUEST_TYPES[q];
          const locked = typeLocked(q);
          const titleText = locked ? `Unlock at Lv ${t?.unlockLvl}` : t.label;
          return (
            <button
              key={q}
              className={`tab ${questType===q ? "active" : ""}`}
              onClick={() => !locked && setQuestType(q)}
              title={titleText}
              disabled={locked}
              style={{ position: "relative" }}
              aria-label={titleText}
            >
              {t.label}
              {locked && <span className="hint" style={{ marginLeft: 6 }}>🔒</span>}
            </button>
          );
        })}
      </div>

      <div className="sf-card" style={{ padding:12 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div>
            <div className="hint">Suggested (base)</div>
            <div className="mono" style={{ fontSize:22, fontWeight:800 }}>{suggested}</div>
            <div className="hint" style={{ marginTop:4 }}>
              Global preview: <span className="mono">+{gDelta}</span>
            </div>
          </div>

          <div style={{ flex:1, minWidth:280 }}>
            <div className="hint" style={{ marginBottom:4 }}>
              Pick base XP: <b className="mono">{range.min.toLocaleString()}</b> - <b className="mono">{range.max.toLocaleString()}</b>
            </div>
            <input
              type="range"
              min={range.min}
              max={range.max}
              step={step}
              value={chosen}
              onChange={e => setChosen(parseInt(e.target.value, 10))}
              style={{ width:"100%" }}
            />
          </div>

          <div style={{ width:170, textAlign:"right" }}>
            <div className="hint">Base XP</div>
            <div className="mono" style={{ fontSize:20, fontWeight:800 }}>
              {chosen} {gDelta>0 ? <span className="hint" style={{ fontSize:14 }}>(+{gDelta})</span> : null}
            </div>
            <input
              className="xpInput"
              type="number"
              min={range.min}
              max={range.max}
              step={step}
              value={chosen}
              onChange={e => {
                const n = parseInt(e.target.value || 0, 10);
                if (!Number.isFinite(n)) return;
                setChosen(Math.min(range.max, Math.max(range.min, n)));
              }}
              style={fieldStyle}
            />
          </div>
        </div>
      </div>

      <div className="sf-card" style={{ padding:12 }}>
        <div className="hint">How many {unitLabel} will it take?</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 200px", gap:10, alignItems:"center", marginTop:6 }}>
          <input
            type="number"
            min={durCfg.min}
            max={durCfg.max}
            step={durCfg.step}
            value={duration}
            onChange={(e) => setDuration(Math.max(durCfg.min, Math.min(durCfg.max, Number(e.target.value || 0))))}
            style={{ width:"100%", ...fieldStyle }}
          />
          <input
            type="range"
            min={durCfg.min}
            max={durCfg.sliderMax}
            step={durCfg.step}
            value={Math.min(durCfg.sliderMax, duration)}
            onChange={(e) => setDuration(Number(e.target.value))}
            style={{ width:"100%" }}
          />
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:12 }}>
        <QBlock label="How difficult was this task?" value={difficulty} setValue={setDifficulty} fieldStyle={fieldStyle} />
        <QBlock label="How important/critical was it?" value={importance} setValue={setImportance} fieldStyle={fieldStyle} />
        <QBlock label="How much energy did it take?"   value={energy}     setValue={setEnergy}     fieldStyle={fieldStyle} />
        <QBlock label="How proud/satisfied are you with doing it?" value={pride} setValue={setPride} fieldStyle={fieldStyle} />
      </div>

      <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button
          className="btn primary"
          onClick={() => onApply({
            xpBase: chosen,
            questType,
            duration,
            openMilestones: ["MAIN","EPIC"].includes(questType),
          })}
        >
          Continue {["MAIN","EPIC"].includes(questType) ? "-> Milestones" : "-> Allocate"}
        </button>
      </div>
    </div>
  );
}

function QBlock({ label, value, setValue, fieldStyle }) {
  return (
    <div className="sf-card" style={{ padding:12 }}>
      <div className="hint">{label}</div>
      <input
        type="number" min={1} max={100}
        value={value}
        onChange={e => setValue(Math.max(1, Math.min(100, parseInt(e.target.value || "1", 10))))}
        style={{ width:"100%", margin:"6px 0", ...fieldStyle }}
      />
      <input
        type="range" min={1} max={100}
        value={value}
        onChange={e => setValue(parseInt(e.target.value, 10))}
        style={{ width:"100%" }}
      />
    </div>
  );
}
