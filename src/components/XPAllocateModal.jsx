// src/components/XPAllocateModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { XP_TYPES, XP_META, loadMultiXP, computeBuffBreakdown } from "../core/multixp.js";

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

export default function XPAllocateModal({ xpBase = 1, initialAlloc = {}, onCancel, onApply }) {
  const [alloc, setAlloc] = useState(() => ({ ...(initialAlloc || {}) }));
  const [buffs, setBuffs] = useState(() => computeBuffBreakdown(loadMultiXP()));
  useEffect(() => {
    const id = setInterval(() => setBuffs(computeBuffBreakdown(loadMultiXP())), 1500);
    return () => clearInterval(id);
  }, []);

  const safeBase = Math.max(1, parseInt(xpBase || 1, 10));

  function updateAlloc(t, raw) {
    let val = raw === "" ? "" : String(Math.max(0, parseInt(raw, 10) || 0));
    const next = { ...alloc, [t]: val };
    const clamped = clampAllocation(next, t, safeBase);
    setAlloc(clamped);
  }

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

  return (
    <div className="modal-backdrop" style={{ alignItems: "flex-start", paddingTop: 50 }} onClick={onCancel}>
      <div className="modal" style={{ width: 'min(720px, 95vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3 style={{ margin: 0 }}>Allocate XP branches</h3><button className="icon-btn" onClick={onCancel} aria-label="Close">×</button></div>
        <div className="modal-body" style={{ display: 'grid', gap: 12 }}>
          <div className="sf-card" style={{ padding: 12 }}>
            <div className="hint">Base XP</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 800 }}>{safeBase}</div>
          </div>
          <div className="sf-card" style={{ padding: 12 }}>
            <div className="hint">Allocate</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
              {XP_TYPES.map((t) => (
                <label key={t} style={{ display: 'grid', gap: 6 }}>
                  <span className="hint" style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span className="xp-ico" style={{ background: (XP_META[t]?.color || '#4b5563') }}>{XP_META[t]?.icon || '*'}</span>
                    {t}
                  </span>
                  <input type="number" min={0} value={alloc[t] ?? ''} onChange={(e) => updateAlloc(t, e.target.value)} />
                  <small className="hint">final ×{(buffs?.branchMul?.[t] || 1).toFixed(2)} → <b className="mono">{branchPreview[t].final}</b></small>
                </label>
              ))}
            </div>
            <div className="hint" style={{ marginTop: 8 }}>Allocated sum: <b className="mono">{totalsPreview.raw}</b> / <b className="mono">{safeBase}</b></div>
          </div>
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={onCancel}>Back</button>
          <button className="btn primary" onClick={() => onApply({ alloc: alloc })}>Done</button>
        </div>
      </div>
    </div>
  );
}
