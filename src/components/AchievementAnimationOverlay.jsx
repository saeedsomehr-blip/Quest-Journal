// src/components/AchievementAnimationOverlay.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import LottieLayer from "../theme/witch/components/LottieLayer.jsx";

export default function AchievementAnimationOverlay({
  visible,
  animationUrl,
  message,
  onClose,
  durationMs = 4000,   // ⬅️ بعد ۴ ثانیه
  allowClose = true,
  playSound = false,    // ⬅️ صدا خاموش
  loop = false,
  zIndex = 9999,
  speed = 1,
}) {
  const [mounted, setMounted] = useState(false);
  const portalRootRef = useRef(null);
  const closeOnceRef = useRef(false); // ⬅️ فقط یک‌بار close

  const prefersReducedMotion = useMemo(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false,
    []
  );

  // Create portal
  useEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("data-ach-overlay-root", "1");
    document.body.appendChild(el);
    portalRootRef.current = el;
    setMounted(true);
    return () => { el.remove(); };
  }, []);

  // Reset close guard when دوباره visible می‌شویم
  useEffect(() => {
    if (visible) closeOnceRef.current = false;
  }, [visible]);

  // Auto close
  useEffect(() => {
    if (!visible) return;

    if (playSound && !prefersReducedMotion) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "triangle";
          o.frequency.value = 1180;
          g.gain.value = 0.0001;
          o.connect(g).connect(ctx.destination);
          const t0 = ctx.currentTime;
          g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
          o.start(t0);
          o.stop(t0 + 0.27);
        }
      } catch {}
    }

    const t = setTimeout(() => {
      if (!closeOnceRef.current) {
        closeOnceRef.current = true;
        onClose?.(); // ⬅️ والد visible=false می‌کند => پنجره بسته می‌شود
      }
    }, Math.max(1200, durationMs));

    return () => clearTimeout(t);
  }, [visible, playSound, prefersReducedMotion, durationMs, onClose]);

  // ESC
  useEffect(() => {
    if (!visible || !allowClose) return;
    const onKey = (e) => { if (e.key === "Escape" && !closeOnceRef.current) { closeOnceRef.current = true; onClose?.(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, allowClose, onClose]);

  const onBackdropClick = (e) => {
    if (!visible || !allowClose) return;
    if (e.target?.dataset?.achOverlay === "backdrop" && !closeOnceRef.current) {
      closeOnceRef.current = true;
      onClose?.();
    }
  };

  if (!mounted || !portalRootRef.current || !visible) return null;

  const backdropStyle = {
    position: "fixed", inset: 0, zIndex,
    background: "radial-gradient(circle at center, rgba(0,0,0,0.66), rgba(0,0,0,0.92))",
    backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 24, color: "#fff", textAlign: "center"
  };

  // مشکی مات برای خوانایی
  const cardStyle = {
    width: "min(92vw, 520px)",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.88)",
    color: "#fff",
    boxShadow: "0 10px 40px rgba(0,0,0,.55)",
    padding: "18px 18px 10px",
    display: "grid", gap: 10,
    animation: "ach-pop .38s ease-out",
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Achievement unlocked"
      data-ach-overlay="backdrop"
      style={backdropStyle}
      onClick={onBackdropClick}
    >
      <style>{`
        @keyframes ach-pop {
          from { transform: translateY(8px) scale(.98); opacity: .0; }
          to   { transform: translateY(0)   scale(1);   opacity: 1; }
        }
      `}</style>

      <div style={{ position: "relative" }}>
        {allowClose && (
           <button
           className="icon-btn"
           data-role="closer"
            type="button"
            aria-label="Close"
            onClick={() => { if (!closeOnceRef.current) { closeOnceRef.current = true; onClose?.(); } }}
            style={{
              position: "absolute", top: 8, right: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              borderRadius: 10, fontSize: 12, padding: "6px 8px", cursor: "pointer"
            }}
          >
            ✕
          </button>
        )}

        <div style={cardStyle}>
          {message && (
            <div style={{
              fontSize: "clamp(18px, 2.4vw, 22px)",
              fontWeight: 800, letterSpacing: ".02em",
              textShadow: "0 0 10px rgba(255,255,255,.35)"
            }}>
              {message}
            </div>
          )}

          <div
            style={{
              width: "min(86vw, 380px)",
              height: "min(86vw, 380px)",
              margin: "0 auto",
              position: "relative"
            }}
          >
            <LottieLayer
              src={animationUrl}
              speed={speed}
              loop={loop}
              autoplay={true}
              zIndex={1}
              ignoreReducedMotion={true}
              style={{ position: "relative", width: "100%", height: "100%" }}
            />
          </div>

          <div style={{ marginTop: 6, fontSize: 14, opacity: 0.9, letterSpacing: ".02em" }}>
            Achievement Unlocked 🏆
          </div>
        </div>
      </div>
    </div>,
    portalRootRef.current
  );
}
