// src/components/SkillForest.jsx
// Unified skill graph UI that reads from core/multixp (single source of truth).
// - Uses BR & XP_META from core/branches.js
// - Loads current state via loadMultiXP() (legacy migration happens in core)

import React, { useEffect, useMemo, useState } from "react";
import { BR, XP_META } from "../core/branches.js";
import { loadMultiXP, levelFromXP } from "../core/multixp.js";

/** Optional: read profile perks as fallback (kept for backward compatibility) */
const PROFILE_KEY = "qj_profile_v1";
function readProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null") || null; }
  catch { return null; }
}
function readPerksUnified(multi) {
  if (Array.isArray(multi?.perks)) return multi.perks;
  const prof = readProfile();
  const owned = prof?.perks?.owned;
  return Array.isArray(owned) ? owned : [];
}

/**
 * Graph data per branch:
 * nodes: { id, label, x, y, req: { branch, at }, icon? }
 * edges: { from, to }
 * x,y in [0..100] (percent) relative to branch canvas.
 */
const TREES = {
  [BR.WISDOM]: {
    color: XP_META.WISDOM.color,
    label: "Wisdom",
    nodes: [
      { id: "wis_learner",  label: "Learner",  x: 20, y: 75, req: { branch: BR.WISDOM, at: 5 },  icon: "📘" },
      { id: "wis_scholar",  label: "Scholar",  x: 50, y: 50, req: { branch: BR.WISDOM, at: 10 }, icon: "🧠" },
      { id: "wis_sage",     label: "Sage",     x: 80, y: 25, req: { branch: BR.WISDOM, at: 20 }, icon: "🦉" },
    ],
    edges: [
      { from: "wis_learner", to: "wis_scholar" },
      { from: "wis_scholar", to: "wis_sage" },
    ],
  },

  [BR.STRENGTH]: {
    color: XP_META.STRENGTH.color,
    label: "Strength",
    nodes: [
      { id: "str_grit",      label: "Grit",      x: 20, y: 75, req: { branch: BR.STRENGTH, at: 5 },  icon: "💪" },
      { id: "str_brute",     label: "Brute",     x: 50, y: 50, req: { branch: BR.STRENGTH, at: 10 }, icon: "🗡️" },
      { id: "str_gladiator", label: "Gladiator", x: 80, y: 25, req: { branch: BR.STRENGTH, at: 20 }, icon: "🛡️" },
    ],
    edges: [
      { from: "str_grit", to: "str_brute" },
      { from: "str_brute", to: "str_gladiator" },
    ],
  },

  [BR.SOCIAL]: {
    color: XP_META.SOCIAL.color,
    label: "Social",
    nodes: [
      { id: "soc_charm",    label: "Charm",    x: 20, y: 75, req: { branch: BR.SOCIAL, at: 5 },  icon: "😊" },
      { id: "soc_orator",   label: "Orator",   x: 50, y: 50, req: { branch: BR.SOCIAL, at: 12 }, icon: "🗣️" },
      { id: "soc_diplomat", label: "Diplomat", x: 80, y: 25, req: { branch: BR.SOCIAL, at: 20 }, icon: "🤝" },
    ],
    edges: [
      { from: "soc_charm", to: "soc_orator" },
      { from: "soc_orator", to: "soc_diplomat" },
    ],
  },

  [BR.TRADE]: {
    color: XP_META.TRADE.color,
    label: "Trade",
    nodes: [
      { id: "trd_haggler", label: "Haggler", x: 15, y: 70, req: { branch: BR.TRADE, at: 5 },  icon: "🪙" },
      { id: "trd_broker",  label: "Broker",  x: 50, y: 50, req: { branch: BR.TRADE, at: 12 }, icon: "💼" },
      { id: "trd_magnate", label: "Magnate", x: 85, y: 30, req: { branch: BR.TRADE, at: 20 }, icon: "👑" },
    ],
    edges: [
      { from: "trd_haggler", to: "trd_broker" },
      { from: "trd_broker",  to: "trd_magnate" },
    ],
  },

  [BR.HEALTH]: {
    color: XP_META.HEALTH.color,
    label: "Health",
    nodes: [
      { id: "hlt_focus",    label: "Focus",     x: 25, y: 75, req: { branch: BR.HEALTH, at: 5 },  icon: "🎯" },
      { id: "hlt_resolve",  label: "Resolve",   x: 50, y: 50, req: { branch: BR.HEALTH, at: 12 }, icon: "🧘" },
      { id: "hlt_ironbody", label: "Iron Body", x: 75, y: 25, req: { branch: BR.HEALTH, at: 20 }, icon: "🪨" },
    ],
    edges: [
      { from: "hlt_focus", to: "hlt_resolve" },
      { from: "hlt_resolve", to: "hlt_ironbody" },
    ],
  },

  [BR.ATHLETICS]: {
    color: XP_META.ATHLETICS.color,
    label: "Athletics",
    nodes: [
      { id: "ath_sprint", label: "Sprint", x: 20, y: 75, req: { branch: BR.ATHLETICS, at: 5 },  icon: "🏃" },
      { id: "ath_agile",  label: "Agile",  x: 50, y: 50, req: { branch: BR.ATHLETICS, at: 12 }, icon: "🌀" },
      { id: "ath_swift",  label: "Swift",  x: 80, y: 25, req: { branch: BR.ATHLETICS, at: 20 }, icon: "⚡" },
    ],
    edges: [
      { from: "ath_sprint", to: "ath_agile" },
      { from: "ath_agile", to: "ath_swift" },
    ],
  },
};

/** --- Graph drawing helpers --- */
function GraphEdges({ nodes, edges, stroke }) {
  const map = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"
         style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      {edges.map((e, i) => {
        const a = map.get(e.from), b = map.get(e.to);
        if (!a || !b) return null;
        const dx = (b.x - a.x);
        const cx1 = a.x + dx * 0.33, cy1 = a.y - 12;
        const cx2 = a.x + dx * 0.66, cy2 = b.y + 12;
        const d = `M ${a.x} ${a.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${b.x} ${b.y}`;
        return <path key={i} d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeOpacity="0.35" />;
      })}
    </svg>
  );
}

function GraphNode({ node, xpMap, ownedPerks, accent }) {
  const curXP = xpMap[node.req.branch] || 0;
  const curLevel = levelFromXP(curXP).level;
  const unlocked = curLevel >= node.req.at;
  const owned = ownedPerks.includes(node.id) || false;

  const dim = 92;
  const style = {
    position: "absolute",
    left: `${node.x}%`,
    top: `${node.y}%`,
    width: dim,
    padding: 8,
    borderRadius: 12,
    border: `1px solid ${unlocked ? accent : "var(--border)"}`,
    background: unlocked ? "var(--card)" : "var(--bg)",
    boxShadow: unlocked ? "0 6px 14px rgba(0,0,0,.12)" : "none",
    textAlign: "center",
    fontSize: 12,
    transform: `translate(-50%, -50%)${owned ? " scale(1.02)" : ""}`,
    transition: "transform .15s ease",
    zIndex: 1,
  };

  const icon = node?.icon || "⭐";

  return (
    <div className={`sf-node ${unlocked ? "unlocked" : "locked"} ${owned ? "owned" : ""}`}
         style={style}
         title={`${node.label} - Req ${node.req.branch} Lv ${node.req.at} - You: Lv ${curLevel}`}>
      <div style={{
        width: 26, height: 26, borderRadius: 999,
        background: unlocked ? accent : "#e5e7eb",
        color: unlocked ? "#fff" : "#9ca3af",
        display: "grid", placeItems: "center",
        margin: "0 auto 6px",
        fontSize: 14, fontWeight: 700,
        fontFamily: 'Segoe UI Emoji, Noto Color Emoji, Apple Color Emoji, Twemoji Mozilla, Segoe UI Symbol, sans-serif'
      }}>
        {icon}
      </div>
      <div style={{ fontWeight: 700, marginBottom: 2, opacity: unlocked ? 1 : 0.55 }}>{node.label}</div>
      <div className="hint" style={{ opacity: unlocked ? 1 : 0.6 }}>Req: {node.req.at} {node.req.branch}</div>
      <div className="hint" style={{ marginTop: 2, opacity: unlocked ? 1 : 0.7 }}>{owned ? "Owned" : unlocked ? "Unlocked" : "Locked"}</div>
    </div>
  );
}

function TraitTree({ traitKey, data, state, perks }) {
  const xp = state?.xp || {};
  const curXP = xp[traitKey] || 0;
  const curLevel = useMemo(() => levelFromXP(curXP).level, [curXP]);

  const nextAt = useMemo(() => {
    const thresholds = data.nodes.map(n => n.req.at).sort((a,b)=>a-b);
    for (const t of thresholds) if (curLevel < t) return t;
    return null;
  }, [curLevel, data.nodes]);

  const pct = useMemo(() => {
    const maxLvl = Math.max(1, ...data.nodes.map(n => n.req.at));
    return Math.min(100, Math.round((curLevel / maxLvl) * 100));
  }, [curLevel, data.nodes]);

  return (
    <section className="sf-card" style={{ overflow: "hidden" }}>
      <header className="sf-head">
        <div className="sf-head-left">
          <div className="sf-dot" style={{ background: data.color }} />
          <h3 className="sf-title">{data.label}</h3>
        </div>
        <div className="sf-head-right">
          <div className="sf-meter-wrap">
            <div className="sf-meter">
              <div className="sf-meter-fill" style={{ width: `${pct}%`, background: data.color }} />
            </div>
            <div className="sf-meter-caption">
              <span className="mono">Lvl {curLevel}</span>{" "}
              {nextAt ? <span className="hint">• next at {nextAt}</span> : <span className="hint">• max tier reached</span>}
            </div>
          </div>
        </div>
      </header>

      <div style={{
        position: "relative",
        height: 260,
        borderRadius: 12,
        background: "linear-gradient(180deg,var(--bg),transparent)"
      }}>
        <GraphEdges nodes={data.nodes} edges={data.edges} stroke={data.color} />
        {data.nodes.map(n => (
          <GraphNode key={n.id} node={n} xpMap={xp} ownedPerks={perks} accent={data.color} />
        ))}
      </div>
    </section>
  );
}

/** Skill Forest (all branches) */
export default function SkillForest({ profileVersion }) {
  const [multi, setMulti] = useState(loadMultiXP());
  const [perks, setPerks] = useState(readPerksUnified(loadMultiXP()));

  // Hard refresh when profileVersion bumps (App sets this after awards/perks)
  useEffect(() => {
    const next = loadMultiXP();
    setMulti(next);
    setPerks(readPerksUnified(next));
  }, [profileVersion]);

  // Soft polling in case something external updated multi-xp
  useEffect(() => {
    const id = setInterval(() => {
      const next = loadMultiXP();
      const nextPerks = readPerksUnified(next);
      if (JSON.stringify(next) !== JSON.stringify(multi)) setMulti(next);
      if (JSON.stringify(nextPerks) !== JSON.stringify(perks)) setPerks(nextPerks);
    }, 2000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multi, perks]);

  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <h2>Skill Forest</h2>
      <div className="sf-forest" style={{ display: "grid", gap: 12 }}>
        {Object.entries(TREES).map(([k, v]) => (
          <TraitTree key={k} traitKey={k} data={v} state={multi} perks={perks} />
        ))}
      </div>
    </div>
  );
}

