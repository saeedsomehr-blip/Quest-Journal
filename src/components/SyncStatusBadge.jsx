// src/components/SyncStatusBadge.jsx
import React, { useEffect, useMemo, useState } from "react";
import { onStatus, getStatus, flushNow, getUser } from "../sync/index.js";

function fmtAgo(ts) {
  if (!Number.isFinite(ts) || ts <= 0) return "never";
  const d = Date.now() - ts;
  if (d < 5000) return "just now";
  const s = Math.floor(d / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export default function SyncStatusBadge() {
  const [status, setStatus] = useState(() => getStatus?.() || { state: "idle", error: "", lastSyncAt: null });
  const [user, setUser] = useState(() => (getUser?.() || null));

  useEffect(() => {
    let off = () => {};
    try { off = onStatus((s) => setStatus(s || { state: "idle", error: "" })); } catch {}
    const t = setInterval(() => setStatus((s) => ({ ...s })), 1000); // tick to refresh "ago"
    const t2 = setInterval(() => setUser((u) => (getUser?.() || u || null)), 5000);
    return () => { try { off(); } catch {}; clearInterval(t); clearInterval(t2); };
  }, []);

  const { label, color, hint } = useMemo(() => {
    const st = (status?.state || "idle").toLowerCase();
    const hasError = !!(status?.error);
    if (!user) {
      return { label: "Not signed in", color: "#64748b", hint: "Click settings to sign in" };
    }
    if (st === "disabled") {
      return { label: "Sync off", color: "#64748b", hint: "Firebase disabled" };
    }
    if (hasError) {
      return { label: "Sync error", color: "var(--danger)", hint: String(status.error || "Error") };
    }
    if (st === "syncing") {
      return { label: "Syncing…", color: "var(--accent)", hint: "Pushing changes" };
    }
    return { label: "Synced", color: "var(--success)", hint: "Up to date" };
  }, [status, user]);

  const ago = fmtAgo(Number(status?.lastSyncAt || 0));

  return (
    <button
      type="button"
      className="sync-badge"
      title={`${label}${ago ? ` • ${ago}` : ""}${hint ? `\n${hint}` : ""}`}
      onClick={() => { try { flushNow?.(); } catch {} }}
    >
      <span className="sync-dot" style={{ background: color }} aria-hidden />
      <span className="sync-text mono">{label}{user ? (ago ? ` · ${ago}` : "") : ""}</span>
    </button>
  );
}

