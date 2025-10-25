// src/theme/witch/elements/WitchMoonHalo.jsx
import React from "react";

export default function WitchMoonHalo() {
  return (
    <>
      {/* ماه + هاله‌های ابری */}
      <div
        style={{
          position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
          background: `
            radial-gradient(90px 90px at 20% 18%, rgba(255,255,240,.95), rgba(255,255,240,.7) 40%, rgba(255,255,240,0) 60%),
            radial-gradient(420px 200px at 30% 20%, rgba(255,255,255,.10), transparent 60%),
            radial-gradient(520px 240px at 68% 18%, rgba(255,255,255,.10), transparent 60%),
            radial-gradient(460px 220px at 80% 30%, rgba(255,255,255,.08), transparent 60%)
          `,
          animation: "witchClouds 34s ease-in-out infinite",
          filter: "blur(.25px) saturate(.98)"
        }}
      />

      <style>{`
        @keyframes witchClouds {
          0% { transform: translateX(-6%) translateY(-1%); filter: blur(0.4px) }
          50%{ transform: translateX( -4%) translateY( 0%); filter: blur(0.6px) }
          100%{transform: translateX(-6%) translateY(-1%); filter: blur(0.4px) }
        }
        @media (prefers-reduced-motion: reduce) {
          div[style*="witchClouds"] {
            animation-duration: .001ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </>
  );
}
