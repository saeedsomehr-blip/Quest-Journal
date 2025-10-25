// src/theme/witch/components/WitchLightning.jsx
import React from "react";

export default function WitchLightning() {
  return (
    <>
      {/* رعد و برق + لرزش دوربین بسیار خفیف */}
      <div
        style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
          background: `
            linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,.35) 40%, rgba(255,255,255,0) 60%),
            radial-gradient(1200px 800px at 50% 0, rgba(255,255,255,.15), transparent 70%)
          `,
          mixBlendMode: "screen",
          opacity: 0,
          animation: "witchLightning 22s linear infinite, witchShake .25s ease-in-out infinite alternate"
        }}
      />

      <style>{`
        @keyframes witchLightning {
          0%, 85%, 86.5%, 88%, 89.5%, 91%, 100% { opacity: 0; filter: brightness(1) }
          86%  { opacity: 1;   filter: brightness(1.5) }
          87%  { opacity: .6;  filter: brightness(1.3) }
          88.5%{ opacity: .3;  filter: brightness(1.2) }
          89%  { opacity: .7;  filter: brightness(1.35) }
          90%  { opacity: .2;  filter: brightness(1.1) }
        }
        @keyframes witchShake {
          0%,100% { transform: translate(0,0) }
          25% { transform: translate(2px,-1px) }
          50% { transform: translate(-3px,1px) }
          75% { transform: translate(1px,-2px) }
        }
        @media (prefers-reduced-motion: reduce) {
          div[style*="witchLightning"],
          div[style*="witchShake"] {
            animation-duration: .001ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </>
  );
}
