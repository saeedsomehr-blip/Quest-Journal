import React from "react";
import "./character.css";

function TierBadge({ bg="#e2e8f0", gradient, children, tierName, tierNumber }) {
  const backgroundStyle = gradient 
    ? { background: `linear-gradient(135deg, ${gradient})` }
    : { background: bg };

  return (
    <div className="char-badge" style={backgroundStyle}>
      <div className="char-glow" />
      <div className="char-emoji">{children}</div>
    </div>
  );
}

export default function Character({ level=1, celebrate=false }) {
  // Advanced tier system with 8 tiers
  const getTierInfo = (level) => {
    if (level >= 50) return { tier: 8, name: "Divine", emoji: "👑", gradient: "#ffd700, #ffed4e, #fbbf24" };
    if (level >= 40) return { tier: 7, name: "Mythic", emoji: "🌟", gradient: "#a855f7, #c084fc, #e879f9" };
    if (level >= 30) return { tier: 6, name: "Legendary", emoji: "🐉", gradient: "#dc2626, #ef4444, #f87171" };
    if (level >= 20) return { tier: 5, name: "Epic", emoji: "⚡", gradient: "#7c3aed, #8b5cf6, #a78bfa" };
    if (level >= 15) return { tier: 4, name: "Master", emoji: "⚔️", gradient: "#f59e0b, #fbbf24, #fcd34d" };
    if (level >= 10) return { tier: 3, name: "Expert", emoji: "🛡️", gradient: "#059669, #10b981, #34d399" };
    if (level >= 5) return { tier: 2, name: "Adventurer", emoji: "🗡️", gradient: "#0ea5e9, #38bdf8, #7dd3fc" };
    return { tier: 1, name: "Novice", emoji: "🧭", gradient: "#64748b, #94a3b8, #cbd5e1" };
  };

  const tierInfo = getTierInfo(level);

  // Enhanced tier badge with gradient and tier information
  const view = (
    <TierBadge 
      gradient={tierInfo.gradient}
      tierName={tierInfo.name}
      tierNumber={tierInfo.tier}
    >
      {tierInfo.emoji}
    </TierBadge>
  );

  return (
    <div className={`char-wrap ${celebrate ? "celebrate" : ""}`}>
      <div className="tier-banner">
        <span className="tier-icon" aria-hidden="true">&#9733;</span>
        <span className="tier-label">{tierInfo.name}</span>
        <span className="tier-sep" aria-hidden="true"></span>
        <span className="tier-rank"><span className="tier-word">Tier</span><span className="tier-num">{tierInfo.tier}</span></span>
      </div>
      {view}
      {celebrate && (
        <div className="confetti">
          {Array.from({length: 24}).map((_,i)=><span key={i} style={{"--i":i}} />)}
        </div>
      )}
      <div className="char-level">Lv {level}</div>
    </div>
  );
}
