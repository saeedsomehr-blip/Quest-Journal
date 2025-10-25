// src/theme/warrior/WarriorStage.jsx
import React from 'react';

export default function WarriorStage() {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    const prev = document.body.style.fontFamily;
    document.body.style.fontFamily = 'Cinzel, "Times New Roman", Times, serif';
    return () => { document.body.style.fontFamily = prev; };
  }, []);

  // تشخیص دارک/لایت از کلاس html.dark
  React.useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  // --- رونسِ لایت (اصلیِ قبلی) ---
  const lightRuneSVG = `
    <svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>
      <g fill='none' stroke='rgba(255,255,255,.08)' stroke-width='2'>
        <path d='M20 70 l20 -20 M40 70 l-20 -20'/>
        <circle cx='80' cy='40' r='10'/>
        <path d='M75 50 l10 18 l10 -18'/>
      </g>
    </svg>
  `;

   // --- سه نوع رونس برای دارک‌مود ---
  const darkRuneSVG_A = `
    <svg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'>
      <g fill='none' stroke='rgba(200,220,255,.12)' stroke-width='1.8'>
        <circle cx='70' cy='70' r='44' opacity='.9'/>
        <circle cx='70' cy='70' r='26' opacity='.7'/>
        <path d='M70 24 L70 116 M24 70 L116 70' opacity='.5'/>
      </g>
    </svg>
  `;
  const darkRuneSVG_B = `
    <svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'>
      <g fill='none' stroke='rgba(180,200,255,.14)' stroke-width='2'>
        <path d='M40 120 L80 40 L120 120 Z' opacity='.8'/>
        <circle cx='80' cy='80' r='18' opacity='.6'/>
        <path d='M60 90 L100 90' opacity='.6'/>
      </g>
    </svg>
  `;
  const darkRuneSVG_C = `
    <svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'>
      <g fill='none' stroke='rgba(160,190,255,.12)' stroke-width='1.5'>
        <path d='M20 80 L50 20 L80 80 Z' opacity='.75'/>
        <circle cx='50' cy='50' r='12' opacity='.5'/>
        <path d='M35 65 L65 65' opacity='.5'/>
      </g>
    </svg>
  `;
  // هاله‌ی پایین صحنه
  const bottomGlow = isDark
    ? 'radial-gradient(900px 480px at 50% 115%, rgba(40,60,120,.22), transparent 65%)'
    : 'radial-gradient(800px 400px at 50% 120%, rgba(153,27,27,.18), transparent 60%)';

  // نورپردازیِ متفاوت در دارک
  const darkLighting = `
    radial-gradient(1200px 600px at 50% -10%, rgba(180,210,255,.10), transparent 60%),
    radial-gradient(1600px 900px at 50% 110%, rgba(20,10,40,.35), transparent 60%)
  `;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* پس‌زمینه‌ی آتشین/خونی (اصلی) */}
      <div
        style={{
          position: "absolute", inset: 0, zIndex: 0,
          background: `
            radial-gradient(1200px 800px at 50% -10%, #3b0d0d, transparent 70%),
            linear-gradient(180deg, #1b1b1b, #2a0f0f 60%, #1a1a1a)
          `,
        }}
      />

      {/* نورپردازی فقط در دارک (خنک و ملایم) */}
      {isDark && (
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
            background: darkLighting,
            mixBlendMode: "screen",
            opacity: 0.6,
            animation: "warriorDarkLight 14s ease-in-out infinite",
          }}
        />
      )}

      {/* رونس + هالهٔ پایین (دارک/لایت متفاوت) */}
      <div
        style={{
          position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
          background: `
            ${
  isDark
    ? `
      url("data:image/svg+xml;utf8,${encodeURIComponent(darkRuneSVG_A)}"),
      url("data:image/svg+xml;utf8,${encodeURIComponent(darkRuneSVG_B)}"),
      url("data:image/svg+xml;utf8,${encodeURIComponent(darkRuneSVG_C)}")
    `
    : `url("data:image/svg+xml;utf8,${encodeURIComponent(lightRuneSVG)}")`
},

            ${bottomGlow}
          `,
          backgroundRepeat: "repeat, no-repeat",
          backgroundSize: `${isDark ? '140px 140px' : '120px 120px'}, cover`,
          backgroundPosition: "0 0, center",
          opacity: .9
        }}
      />

      {/* emberهای چشمک‌زن (بدون تغییر) */}
      <div
        style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
          background: `
            radial-gradient(2px 2px at 10% 80%, rgba(255,120,120,.7), transparent 60%),
            radial-gradient(2px 2px at 30% 75%, rgba(255,160,120,.7), transparent 60%),
            radial-gradient(2px 2px at 70% 82%, rgba(255,120,160,.7), transparent 60%),
            radial-gradient(2px 2px at 85% 78%, rgba(255,160,160,.7), transparent 60%)
          `,
          animation: "warriorEmbers 6s ease-in-out infinite",
        }}
      />

      <style>{`
        @keyframes warriorEmbers {
          0%,100% { opacity:.08 }
          50%     { opacity:.16 }
        }
        @keyframes warriorDarkLight {
          0%, 100% { filter: brightness(1); transform: translateY(0); }
          50%      { filter: brightness(1.06); transform: translateY(-2px); }
        }
      `}</style>

      <style>{`
        :root[data-skin="warrior"] body,
        :root[data-skin="warrior"] .app-root,
        :root[data-skin="warrior"] .card,
        :root[data-skin="warrior"] button,
        :root[data-skin="warrior"] input,
        :root[data-skin="warrior"] textarea,
        :root[data-skin="warrior"] select {
          font-family: "Cinzel", "Times New Roman", Times, serif !important;
        }
      `}</style>
    </div>
  );
}
