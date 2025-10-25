// src/theme/desert/DesertStage.jsx
/**
 * Desert Theme - Complete JSX Implementation
 * شامل تمام انیمیشن‌ها، بافت‌ها، و جزئیات نسخه CSS اصلی
 */
import { useEffect, useState } from 'react';

export default function DesertStage() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // تشخیص حالت Dark Mode
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    
    return () => observer.disconnect();
  }, []);

  // Apply theme font globally while Desert is active
  useEffect(() => {
    const prev = document.body.style.fontFamily;
    document.body.style.fontFamily = "Papyrus, fantasy";
    return () => { document.body.style.fontFamily = prev; };
  }, []);

  // SVG با تمام جزئیات (خطوط موجی + تپه‌های شن + بوته‌ها)
  const sandDunesSVG = `
    <svg xmlns='http://www.w3.org/2000/svg' width='960' height='480' viewBox='0 0 960 480'>
      <g fill='none' stroke='${isDark ? 'rgba(150,120,90,.2)' : 'rgba(200,150,80,.2)'}' stroke-width='1.5' stroke-linecap='round'>
        <path d='M0 120 C 80 100, 160 140, 240 120 C 320 100, 400 140, 480 120 C 560 100, 640 140, 720 120 C 800 100, 880 140, 960 120'/>
        <path d='M0 200 C 80 180, 160 220, 240 200 C 320 180, 400 220, 480 200 C 560 180, 640 220, 720 200 C 800 180, 880 220, 960 200'/>
        <path d='M0 280 C 80 260, 160 300, 240 280 C 320 260, 400 300, 480 280 C 560 260, 640 300, 720 280 C 800 260, 880 300, 960 280'/>
      </g>
      <g fill='${isDark ? 'rgba(130,100,50,.25)' : 'rgba(180,130,60,.25)'}'>
        <path d='M100 440 C 120 430, 140 440, 160 430 C 180 420, 200 430, 220 420 L 240 440 Z'/>
        <path d='M400 435 C 420 425, 440 435, 460 425 C 480 415, 500 425, 520 415 L 540 435 Z'/>
        <path d='M700 430 C 720 420, 740 430, 760 420 C 780 410, 800 420, 820 410 L 840 430 Z'/>
      </g>
      <g fill='${isDark ? 'rgba(110,80,30,.3)' : 'rgba(150,110,50,.3)'}'>
        <path d='M50 450 C 60 445, 70 450, 80 445 C 90 440, 100 445, 110 440 L 120 450 Z' transform='translate(200,0)'/>
        <path d='M50 450 C 60 445, 70 450, 80 445 C 90 440, 100 445, 110 440 L 120 450 Z' transform='translate(400,0)'/>
        <path d='M50 450 C 60 445, 70 450, 80 445 C 90 440, 100 445, 110 440 L 120 450 Z' transform='translate(600,0)'/>
      </g>
    </svg>
  `;

  return (
    <>
      <div style={{ position: 'absolute', inset: 0 }}>
        {/* لایه پس‌زمینه اصلی - گرادیانت شن */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            background: isDark
              ? `radial-gradient(2400px 1000px at 50% 120%, rgba(80, 60, 30, .28) 20%, rgba(60, 40, 20, .18) 50%, transparent 70%),
                 linear-gradient(180deg, #2a1f0f, #3a2f1f 50%, #2a1f0f 70%, #1f180a)`
              : `radial-gradient(2400px 1000px at 50% 120%, rgba(245, 180, 95, .28) 20%, rgba(220, 160, 80, .18) 50%, transparent 70%),
                 linear-gradient(180deg, #f9e4b7, #f4d9a3 50%, #eecf8f 70%, #d9b67f)`,
            backgroundAttachment: 'fixed',
            backgroundSize: 'cover',
          }}
        />

        {/* لایه بافت شن با SVG + انیمیشن دوگانه */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background: `
              url("data:image/svg+xml;utf8,${encodeURIComponent(sandDunesSVG)}"),
              radial-gradient(2400px 1000px at 50% 120%, ${isDark ? 'rgba(80, 60, 30, .28)' : 'rgba(245, 180, 95, .28)'} 20%, ${isDark ? 'rgba(60, 40, 20, .18)' : 'rgba(220, 160, 80, .18)'} 50%, transparent 70%),
              repeating-linear-gradient(175deg, ${isDark ? 'rgba(150, 120, 90, .15)' : 'rgba(245, 158, 11, .15)'} 0px, ${isDark ? 'rgba(150, 120, 90, .15)' : 'rgba(245, 158, 11, .15)'} 4px, ${isDark ? 'rgba(120, 90, 60, .08)' : 'rgba(220, 140, 70, .08)'} 4px, ${isDark ? 'rgba(120, 90, 60, .08)' : 'rgba(220, 140, 70, .08)'} 10px)
            `,
            backgroundRepeat: 'repeat-x, no-repeat, repeat',
            backgroundSize: '960px 480px, 100% 100%, auto',
            backgroundPosition: 'bottom center, center, center',
            opacity: isDark ? 0.75 : 0.85,
            mixBlendMode: 'multiply',
            animation: 'qj-sand-ripple 14s ease-in-out infinite, qj-dune-shift 12s ease-in-out infinite',
          }}
        />

        {/* لایه نور محیطی (گلوی شن) - app-root::before */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            pointerEvents: 'none',
            background: isDark
              ? `radial-gradient(400px 200px at 20% 80%, rgba(150,120,90,.25), rgba(120,90,60,.1) 60%, transparent 80%),
                 radial-gradient(360px 180px at 80% 85%, rgba(130,100,70,.2), rgba(100,70,40,.05) 60%, transparent 80%)`
              : `radial-gradient(400px 200px at 20% 80%, rgba(255,200,120,.35), rgba(255,180,100,.15) 60%, transparent 80%),
                 radial-gradient(360px 180px at 80% 85%, rgba(255,180,100,.3), rgba(220,160,80,.1) 60%, transparent 80%)`,
            backgroundSize: '100% 100%',
            filter: 'blur(4px)',
            animation: 'qj-sand-ripple 10s ease-in-out infinite 0.2s',
            mixBlendMode: 'screen',
          }}
        />

        {/* ذرات نور درخشان (ستاره‌های کوچک) - app-root::after */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            pointerEvents: 'none',
            background: isDark
              ? `radial-gradient(6px 6px at 15% 20%, rgba(255,255,200,.8), transparent 70%),
                 radial-gradient(5px 5px at 40% 30%, rgba(255,255,200,.75), transparent 70%),
                 radial-gradient(7px 7px at 70% 25%, rgba(255,255,200,.8), transparent 70%),
                 radial-gradient(5px 5px at 30% 15%, rgba(255,255,200,.7), transparent 70%)`
              : `radial-gradient(6px 6px at 15% 20%, rgba(255,230,180,.7), transparent 70%),
                 radial-gradient(5px 5px at 40% 30%, rgba(255,230,180,.65), transparent 70%),
                 radial-gradient(7px 7px at 70% 25%, rgba(255,230,180,.7), transparent 70%)`,
            backgroundSize: '100% 100%',
            filter: 'blur(0.6px)',
            animation: 'qj-sand-ripple 8s ease-in-out infinite 0.3s',
            mixBlendMode: 'screen',
            opacity: 0.9,
          }}
        />

        {/* خورشید سوزان (ستاره سفید/نارنجی) — با درخشش کم شب و هاله‌ی آبی سرد */}
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '80%',
            width: '120px',
            height: '110px',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            zIndex: 4,
            pointerEvents: 'none',
            // روز: گرم و درخشان / شب: هسته گرم با لبه‌های سرد آبی و شفافیت کمتر
            background: isDark
              ? `
                radial-gradient(circle at center,
                  rgba(255,255,240,0.70) 0%,
                  rgba(255,225,185,0.40) 35%,
                  rgba(255,170,110,0.18) 65%,
                  rgba(170,200,255,0.10) 80%,
                  rgba(140,180,255,0.00) 100%)
              `
              : `
                radial-gradient(circle at center,
                  rgba(255,255,240,0.98) 0%,
                  rgba(255,235,200,0.92) 22%,
                  rgba(255,195,120,0.80) 45%,
                  rgba(255,150,60,0.55) 65%,
                  rgba(255,120,40,0.22) 78%,
                  rgba(255,120,40,0.00) 100%)
              `,
            // روز: گلوهای گرم / شب: گلو کم‌نور + یک هاله‌ی آبی خیلی ملایم
            boxShadow: isDark
              ? `
                0 0 18px 8px rgba(255,210,160,0.18),
                0 0 42px 18px rgba(255,150,80,0.10),
                0 0 70px 24px rgba(140,180,255,0.12)
              `
              : `
                0 0 32px 14px rgba(255,210,140,0.50),
                0 0 80px 36px rgba(255,150,70,0.22)
              `,
            filter: 'saturate(1.05) contrast(1.05)',
            animation: 'desert-sun-pulse 6s ease-in-out infinite',
          }}
        />
      </div>

      {/* انیمیشن‌های CSS - نسخه کامل از کد اصلی + پالس خورشید */}
      <style>{`
        @keyframes qj-sand-ripple {
          0% { 
            filter: brightness(1); 
            transform: translateX(0) scale(1); 
          }
          25% { 
            filter: brightness(1.05); 
            transform: translateX(3px) scale(1.02); 
          }
          50% { 
            filter: brightness(1.08); 
            transform: translateX(-2px) scale(1.01); 
          }
          75% { 
            filter: brightness(1.06); 
            transform: translateX(2px) scale(1.03); 
          }
          100% { 
            filter: brightness(1); 
            transform: translateX(0) scale(1); 
          }
        }

        @keyframes qj-dune-shift {
          0%, 100% { 
            transform: translateX(0) translateY(0) rotate(0deg); 
            opacity: .9; 
          }
          33% { 
            transform: translateX(8px) translateY(-3px) rotate(1deg); 
            opacity: .95; 
          }
          66% { 
            transform: translateX(-5px) translateY(2px) rotate(-1deg); 
            opacity: .92; 
          }
        }

        @keyframes qj-bush-sway {
          0%, 100% { 
            transform: translateX(0) rotate(0deg); 
          }
          50% { 
            transform: translateX(4px) rotate(2deg); 
          }
        }

        /* پالس خیلی ملایم خورشید */
        @keyframes desert-sun-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1);   filter: brightness(1); }
          50%      { transform: translate(-50%, -50%) scale(1.06); filter: brightness(1.12); }
        }
      `}</style>

      <style>{`
        :root[data-skin="desert"] body,
        :root[data-skin="desert"] .app-root,
        :root[data-skin="desert"] .card,
        :root[data-skin="desert"] button,
        :root[data-skin="desert"] input,
        :root[data-skin="desert"] textarea,
        :root[data-skin="desert"] select {
          font-family: "Papyrus", fantasy !important;
        }
      `}</style>
    </>
  );
}
