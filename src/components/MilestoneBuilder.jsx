// src/components/MilestoneBuilder.jsx
import React, { useMemo, useState } from "react";

/**
 * Props:
 * - defaultCount: number (3..5)
 * - onCancel: () => void
 * - onCreate: ({ milestones }) => void           // اگر می‌خوای بیرون تبدیل به subtasks کنی
 * - onCreateSubtasks?: (subtasks) => void        // اگر اینو بدی، مستقیم ساب‌تسک می‌سازه
 *
 * هر milestone: { id, title, weight }  -- weight جمعاً باید 100 بشه
 */
export default function MilestoneBuilder({
  defaultCount = 3,
  onCancel,
  onCreate,
  onCreateSubtasks,
}) {
  const initCount = Math.min(5, Math.max(3, defaultCount));
  const presetWeights = [15, 35, 50];
  const [rows, setRows] = useState(
    Array.from({ length: initCount }, (_, i) => ({
      id: `ms_${i+1}`,
      title: `Milestone ${i+1}`,
      weight: initCount === 3 ? presetWeights[i] ?? Math.round(100 / initCount) : Math.round(100 / initCount),
    }))
  );

  const total = useMemo(() => rows.reduce((a,b)=>a + (Number(b.weight)||0), 0), [rows]);
  const over = total !== 100;

  function updateTitle(i, v) {
    const next = rows.slice();
    next[i] = { ...next[i], title: v };
    setRows(next);
  }
  function updateWeight(i, v) {
    const w = Math.max(0, Math.min(100, parseInt(v||"0",10)));
    const next = rows.slice();
    next[i] = { ...next[i], weight: w };
    setRows(next);
  }
  function addRow() {
    if (rows.length >= 5) return;
    setRows(prev => [...prev, { id:`ms_${prev.length+1}`, title:`Milestone ${prev.length+1}`, weight:0 }]);
  }
  function removeRow(i) {
    if (rows.length <= 3) return;
    setRows(prev => prev.filter((_, idx) => idx !== i));
  }

  function handleCreate() {
    if (over) return;
    const milestones = rows.map(r => ({ id:r.id, title:r.title.trim() || r.id, weight:Number(r.weight)||0 }));
    if (typeof onCreateSubtasks === "function") {
      const subtasks = milestones.map(m => ({
        id: `sub_${m.id}`,
        title: m.title,
        isMilestone: true,
        milestoneWeight: m.weight,   // درصد آزادسازی
        done: false,
        paid: false,
      }));
      onCreateSubtasks(subtasks);
    }
    onCreate?.({ milestones });
  }

  return (
    <div className="modal" onClick={e=>e.stopPropagation()}>
      <div className="modal-header">
        <b>Milestones</b>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn" onClick={addRow} disabled={rows.length>=5}>+ Row</button>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn primary" onClick={handleCreate} disabled={over}>Create</button>
        </div>
      </div>

      <div className="sf-card" style={{ padding:12 }}>
        <div className="hint" style={{ marginBottom:8 }}>
          Define 3–5 milestones. Total weight must equal <b>100%</b>. For Main/Epic quests, XP will be released per milestone.
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 120px 80px", gap:8, alignItems:"center" }}>
          <div className="hint">Title</div>
          <div className="hint">Weight %</div>
          <div />
          {rows.map((r, i) => (
            <React.Fragment key={r.id}>
              <input type="text" value={r.title} onChange={e=>updateTitle(i, e.target.value)} />
              <input type="number" min={0} max={100} value={r.weight} onChange={e=>updateWeight(i, e.target.value)} />
              <button className="btn" onClick={()=>removeRow(i)} disabled={rows.length<=3}>✕</button>
            </React.Fragment>
          ))}
        </div>

        <div className="row-sb" style={{ marginTop:10 }}>
          <div className="hint">Total</div>
          <div className="mono" style={{ color: over ? "var(--danger)" : "inherit" }}>{total}%</div>
        </div>
      </div>
    </div>
  );
}
