import React from 'react';
import Squirrel from '../../components/Squirrel'; // اطمینان حاصل کنید که مسیر صحیح است

export default function ForestStage({ dark = false }) {
  React.useEffect(() => {
    const prev = document.body.style.fontFamily;
    document.body.style.fontFamily = 'Palatino, ui-serif, serif';
    return () => {
      document.body.style.fontFamily = prev;
    };
  }, []);

  return (
    <div
      key={dark ? 'dark' : 'light'}
      style={{
        position: 'absolute',
        inset: 0,
        fontFamily: 'Palatino, ui-serif, serif',
        background: dark
          ? 'radial-gradient(1200px 600px at 50% 20%, rgba(15,51,32,0.3), transparent 70%), linear-gradient(180deg, #0f3320, #1a4d2e 50%, #0f3320)'
          : 'radial-gradient(1200px 600px at 50% 20%, rgba(34,97,57,0.2), transparent 70%), linear-gradient(180deg, #ecfdf5, #d1fae5 50%, #a7f3d0)',
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
      }}
    >
      {/* Far layer: Hills with mist */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: dark
            ? `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='160' viewBox='0 0 480 160'><path d='M0 120 C 80 90, 140 140, 240 110 C 340 80, 400 130, 480 105 L 480 160 L 0 160 Z' fill='rgba(15,51,32,0.18)'/><path d='M0 130 C 90 100, 150 150, 240 120 C 330 90, 390 140, 480 115 L 480 160 L 0 160 Z' fill='rgba(15,51,32,0.15)'/></svg>"), radial-gradient(900px 420px at 50% 10%, rgba(255,255,255,0.55), transparent 60%), url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='440' height='240' viewBox='0 0 440 240'><g fill='%231a4d2e' opacity='0.3'><polygon points='40,220 120,60 200,220'/><rect x='116' y='220' width='16' height='20'/></g><g fill='%23153b24' opacity='0.3'><polygon points='260,220 320,100 380,220'/><rect x='312' y='220' width='12' height='20'/></g><g fill='%23266b40' opacity='0.25'><polygon points='160,220 200,120 240,220'/><rect x='198' y='220' width='10' height='20'/></g></svg>")`
            : `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='160' viewBox='0 0 480 160'><path d='M0 120 C 80 90, 140 140, 240 110 C 340 80, 400 130, 480 105 L 480 160 L 0 160 Z' fill='rgba(34,97,57,0.15)'/><path d='M0 130 C 90 100, 150 150, 240 120 C 330 90, 390 140, 480 115 L 480 160 L 0 160 Z' fill='rgba(34,97,57,0.12)'/></svg>"), radial-gradient(900px 420px at 50% 10%, rgba(255,255,255,0.5), transparent 60%), url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='440' height='240' viewBox='0 0 440 240'><g fill='%23328553' opacity='0.35'><polygon points='40,220 120,60 200,220'/><rect x='116' y='220' width='16' height='20'/></g><g fill='%232b6a45' opacity='0.35'><polygon points='260,220 320,100 380,220'/><rect x='312' y='220' width='12' height='20'/></g><g fill='%233e7f5a' opacity='0.30'><polygon points='160,220 200,120 240,220'/><rect x='198' y='220' width='10' height='20'/></g></svg>")`,
          backgroundRepeat: 'repeat-x, no-repeat, repeat-x',
          backgroundPosition: 'bottom center, top center, bottom center',
          backgroundSize: '480px 160px, cover, 440px 240px',
          animation: 'qj-wind 9s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          opacity: dark ? 0.85 : 0.9,
          filter: dark ? 'brightness(0.8) hue-rotate(20deg)' : 'saturate(1.06)',
        }}
      />

      {/* سنجاب زیر یکی از درخت‌ها */}
      <Squirrel dark={dark} />

      {/* Near layer: Bushes and sun rays/fireflies */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          background: dark
            ? `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='120' viewBox='0 0 360 120'><g fill='%23153b24' opacity='0.35'><path d='M40 100 C60 60, 100 80, 120 100 C140 80, 160 60, 180 100 C200 60, 220 80, 240 100 C260 80, 280 60, 300 100'/><rect x='160' y='100' width='8' height='20'/></g></svg>"), radial-gradient(2px 2px at 30% 20%, rgba(34,197,94,0.5), transparent 60%), radial-gradient(1.8px 1.8px at 70% 40%, rgba(34,197,94,0.45), transparent 60%)`
            : `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='120' viewBox='0 0 360 120'><g fill='%232b6a45' opacity='0.4'><path d='M40 100 C60 60, 100 80, 120 100 C140 80, 160 60, 180 100 C200 60, 220 80, 240 100 C260 80, 280 60, 300 100'/><rect x='160' y='100' width='8' height='20'/></g></svg>"), conic-gradient(from 280deg at 15% 5%, rgba(255,255,255,0.15), rgba(255,255,255,0) 35%), conic-gradient(from 260deg at 85% 6%, rgba(255,255,255,0.12), rgba(255,255,255,0) 30%)`,
          backgroundRepeat: dark ? 'repeat-x, repeat, repeat' : 'repeat-x, no-repeat, no-repeat',
          backgroundPosition: dark ? 'bottom center, center, center' : 'bottom center, top left, top right',
          backgroundSize: dark ? '360px 120px, 100px 200px, 120px 240px' : '360px 120px, 100% 100%, 100% 100%',
          animation: dark
            ? 'qj-bush-sway 12s ease-in-out infinite, firefly-pulse 5s ease-in-out infinite'
            : 'qj-bush-sway 12s ease-in-out infinite, sun-rays 10s ease-in-out infinite',
          mixBlendMode: dark ? 'screen' : 'lighten',
          opacity: 0.9,
        }}
      />

      {/* Leaf particles */}
      <div
        className="leaf-particles"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background: `radial-gradient(1.5px 1.5px at 20% 10%, rgba(34,197,94,0.4), transparent 60%), radial-gradient(1.8px 1.8px at 60% 30%, rgba(16,185,129,0.35), transparent 60%)`,
          backgroundRepeat: 'repeat',
          backgroundSize: '120px 300px, 160px 450px',
          mixBlendMode: 'screen',
          animation: 'leaf-fall 20s linear infinite',
          opacity: 0.6,
        }}
      />

      {/* Global styles for animations and card effects */}
      <style>{`
        @keyframes qj-wind {
          0% { transform: translateX(0); }
          50% { transform: translateX(6px); }
          100% { transform: translateX(0); }
        }
        @keyframes qj-bush-sway {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          50% { transform: translateX(4px) rotate(2deg); }
        }
        @keyframes leaf-fall {
          0% { transform: translateY(-100%) rotate(0deg); opacity: 0; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0.8; }
        }
        @keyframes sun-rays {
          0%, 100% { opacity: 0.85; filter: brightness(1); }
          50% { opacity: 0.9; filter: brightness(1.05); }
        }
        @keyframes firefly-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        .card {
          box-shadow: ${
            dark
              ? '0 8px 22px rgba(0,0,0,0.35), 0 0 0 3px rgba(34,197,94,0.12)'
              : '0 8px 22px rgba(0,0,0,0.12), 0 0 0 3px rgba(34,197,94,0.15)'
          };
          transition: box-shadow 0.3s ease;
        }
        .card:hover {
          box-shadow: ${
            dark
              ? '0 10px 26px rgba(0,0,0,0.4), 0 0 0 4px rgba(34,197,94,0.2)'
              : '0 10px 26px rgba(0,0,0,0.15), 0 0 0 4px rgba(34,197,94,0.25)'
          };
        }
        @media (prefers-reduced-motion: reduce) {
          .leaf-particles, .card, .card:hover {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition: none !important;
          }
        }
      `}</style>
      <style>{`
        :root[data-skin="forest"] body,
        :root[data-skin="forest"] .app-root,
        :root[data-skin="forest"] .card,
        :root[data-skin="forest"] button,
        :root[data-skin="forest"] input,
        :root[data-skin="forest"] textarea,
        :root[data-skin="forest"] select {
          font-family: Palatino, ui-serif, serif !important;
        }
      `}</style>
    </div>
  );
}