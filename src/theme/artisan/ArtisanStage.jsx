// src/theme/artisan/ArtisanStage.jsx
import React from 'react';

export default function ArtisanStage() {
  const [isDark, setIsDark] = React.useState(false);
  const effectsRef = React.useRef(null);
  const audioCtxRef = React.useRef(null);

  React.useEffect(() => {
    const prev = document.body.style.fontFamily;
    document.body.style.fontFamily = 'Lobster, cursive';
    return () => { document.body.style.fontFamily = prev; };
  }, []);

  React.useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  // ——— پیدا کردن بزرگ‌ترین کارت برای تشخیص «کلیک بیرون کارت»
  const biggestCardRect = React.useRef(null);
  const computeBiggestCard = React.useCallback(() => {
    const cards = Array.from(document.querySelectorAll('.card'));
    if (!cards.length) { biggestCardRect.current = null; return; }
    let best = null;
    for (const el of cards) {
      const r = el.getBoundingClientRect();
      const area = r.width * r.height;
      if (!best || area > best.area) best = { rect: r, area };
    }
    biggestCardRect.current = best ? best.rect : null;
  }, []);
  React.useEffect(() => {
    computeBiggestCard();
    window.addEventListener('resize', computeBiggestCard);
    window.addEventListener('scroll', computeBiggestCard, { passive: true });
    return () => {
      window.removeEventListener('resize', computeBiggestCard);
      window.removeEventListener('scroll', computeBiggestCard);
    };
  }, [computeBiggestCard]);

  // ——— صدا: یک چایم تصادفی (اسکیل پنتاتونیک، اکتاوهای متفاوت)
  function playRandomChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;

      const now = ctx.currentTime;

      // پنتاتونیک C با اکتاوهای نزدیک (حداقل 8 نت متفاوت)
      const base = [261.63, 293.66, 329.63, 392.00, 440.00]; // C D E G A
      const pool = [
        ...base,
        ...base.map(f => f * Math.pow(2, -1/1)), // اکتاو پایین تقریبی
        ...base.map(f => f * 2),                  // اکتاو بالا
      ];

      // 2 تا 4 نت کوتاه به‌صورت آربژیو تصادفی
      const count = 2 + Math.floor(Math.random() * 3);
      let tCursor = now;
      for (let i = 0; i < count; i++) {
        const freq = pool[Math.floor(Math.random() * pool.length)] * (1 + (Math.random() - 0.5) * 0.02);
        const panVal = (Math.random() * 2 - 1) * 0.6;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.value = freq;
        osc2.frequency.value = freq * 0.999;

        const gain = ctx.createGain();
        const pan = ctx.createStereoPanner();
        pan.pan.value = panVal;

        // envelope (هر بار کمی متفاوت)
        const a = 0.03 + Math.random() * 0.04;
        const d = 0.4 + Math.random() * 0.6;  // 0.4–1.0s
        const s = 0.0008;
        const r = 2.4 + Math.random() * 1.2;  // 2.4–3.6s
        const peak = 0.18 + Math.random() * 0.08;

        gain.gain.setValueAtTime(0.0001, tCursor);
        gain.gain.exponentialRampToValueAtTime(peak, tCursor + a);
        gain.gain.exponentialRampToValueAtTime(peak * 0.35, tCursor + a + d);
        gain.gain.exponentialRampToValueAtTime(s, tCursor + a + d + r);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(pan).connect(ctx.destination);

        osc1.start(tCursor);
        osc2.start(tCursor);
        const stopAt = tCursor + a + d + r + 0.2;
        osc1.stop(stopAt);
        osc2.stop(stopAt);

        tCursor += 0.08 + Math.random() * 0.18; // فاصلهٔ کوتاه بین نت‌ها
      }
    } catch (_) { /* ignore */ }
  }

  // ——— کلیک بیرون کارت: لایت → اسپلش پررنگ؛ دارک → چایم تصادفی
  React.useEffect(() => {
    const onClick = (e) => {
      const r = biggestCardRect.current;
      const inside = r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (inside) return;

      if (isDark) {
        playRandomChime();
        return;
      }

      // لایت: اسپلش نمایان‌تر با دو حلقهٔ هم‌مرکز
      const host = effectsRef.current;
      if (!host) return;

      const palette = ['#ffc7d0', '#fff0a6', '#bfffe6', '#c7ccff', '#ffc9f2', '#ffdcb3'];
      const c1 = palette[Math.floor(Math.random() * palette.length)];
      const c2 = palette[Math.floor(Math.random() * palette.length)];
      const { clientX: x, clientY: y } = e;
const MAX_SPLASHES = 14; // یا 10 اگر سیستم سبک‌تره

      const mk = (size, blur, opacity, color) => {
        const d = document.createElement('div');
        Object.assign(d.style, {
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%) scale(1)',
          background: color,
          pointerEvents: 'none',
          mixBlendMode: 'screen',
          opacity: String(opacity),
          filter: `blur(${blur}px)`,
          transition: 'transform 2200ms cubic-bezier(.22,.7,.18,1), opacity 2400ms ease-out, filter 2400ms ease-out',
        });
        host.appendChild(d);
        requestAnimationFrame(() => {
          d.style.transform = `translate(-50%, -50%) scale(${size})`;
          d.style.opacity = '0';
          d.style.filter = `blur(${blur + 10}px)`;
        });
        setTimeout(() => d.remove(), 2600);
      };

      mk(28, 2, 0.99, c1); // حلقهٔ بزرگ‌تر، پررنگ‌تر
      mk(12, 1, 0.95, c2); // حلقهٔ کوچک‌تر
    };

    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [isDark]);

  // ——— SVG گرین برای ازبین‌بردن بَندینگ گرادیان‌ها (dither)
  const grainDataUrl = React.useMemo(() => {
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'>
        <filter id='n'>
          <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>
          <feColorMatrix type='saturate' values='0'/>
          <feComponentTransfer>
            <feFuncA type='table' tableValues='0 0 0 .05 .1 .12 .14 .16 .14 .12 .1 0'/>
          </feComponentTransfer>
        </filter>
        <rect width='100%' height='100%' filter='url(#n)'/>
      </svg>`;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* پس‌زمینه هنری — پالت جدید دارک‌مود با هارمونی آرت */}
      <div
        style={{
          position: "absolute", inset: 0, zIndex: 0,
          background: isDark
            ? `
              radial-gradient(1200px 800px at 20% 0%, rgba(30,34,46,.55), transparent 60%),
              radial-gradient(1200px 800px at 120% 120%, rgba(46,26,48,.50), transparent 60%),
              conic-gradient(from 200deg at 30% 30%,
                #111319, #1a2230, #1b2a28, #251b2b, #2a2228, #111319),
              linear-gradient(180deg, #0f0f11 0%, #121215 100%)
            `
            : `
              radial-gradient(1800px 1000px at -10% 20%, rgba(255,255,255,.35), transparent 65%),
              radial-gradient(1800px 1000px at 120% 80%, rgba(255,255,255,.35), transparent 65%),
              conic-gradient(from 210deg at 30% 30%,
                #ffd1d1, #f8ffd1, #bfffe6, #c7ccff, #ffc9f2, #ffd1d1),
              linear-gradient(180deg, #ffffff, #fafafa)
            `,
          backgroundBlendMode: isDark ? 'screen, screen, normal, multiply' : 'screen, screen, multiply, normal',
          backgroundAttachment: "fixed",
          backgroundSize: "cover"
        }}
      />

      {/* لایه خطوط/درخشش لطیف */}
      <div
        style={{
          position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
          background: isDark
            ? `
              radial-gradient(1400px 900px at 50% 50%, rgba(255,255,255,.05), transparent 60%),
              repeating-linear-gradient(45deg, rgba(255,255,255,.03) 0px, rgba(255,255,255,.03) 2px, transparent 2px, transparent 6px)
            `
            : `
              radial-gradient(1400px 900px at 50% 50%, rgba(255,255,255,.07), transparent 60%),
              repeating-linear-gradient(45deg, rgba(255,255,255,.06) 0px, rgba(255,255,255,.06) 2px, transparent 2px, transparent 6px)
            `,
          mixBlendMode: isDark ? 'soft-light' : 'overlay',
          opacity: .95
        }}
      />

      {/* گرین برای از بین بردن banding */}
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          backgroundImage: grainDataUrl,
          backgroundSize: '160px 160px',
          opacity: isDark ? .18 : .12,
          mixBlendMode: 'overlay'
        }}
      />

      {/* پالس مرکزی خیلی لطیف */}
      <div
        style={{
          position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
          background: isDark
            ? "radial-gradient(1200px 800px at 50% 55%, rgba(255,255,255,.035), transparent 60%)"
            : "radial-gradient(1200px 800px at 50% 55%, rgba(255,255,255,.06), transparent 60%)",
          animation: "artisanPulse 7s ease-in-out infinite",
          mixBlendMode: "soft-light"
        }}
      />

      {/* میزبان اسپلش‌ها */}
      <div
        ref={effectsRef}
        aria-hidden
        style={{ position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none" }}
      />

      {/* انیمیشن‌ها و فونت کتگوری‌ها */}
      <style>{`
        @keyframes artisanPulse {
          0%,100% { filter: brightness(1) }
          50%     { filter: brightness(1.06) }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="artisanPulse"] { animation-duration: .001ms !important; animation-iteration-count: 1 !important; }
        }
      `}</style>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&display=swap');

        .category-title,
        [data-category-title] {
          font-family: 'Cinzel Decorative', 'Lobster', cursive !important;
          letter-spacing: 0.6px;
          text-shadow: ${isDark ? '0 1px 0 rgba(0,0,0,.35)' : '0 1px 0 rgba(255,255,255,.35)'};
        }

        :root[data-skin="artisan"] body,
        :root[data-skin="artisan"] .app-root,
        :root[data-skin="artisan"] .card,
        :root[data-skin="artisan"] button,
        :root[data-skin="artisan"] input,
        :root[data-skin="artisan"] textarea,
        :root[data-skin="artisan"] select {
          font-family: 'Lobster', cursive !important;
        }

        /* هالهٔ خیلی کوچک گرم برای کارت‌ها (در هر دو مود) */
        :root[data-skin="artisan"] .card {
          box-shadow:
            0 10px 22px rgba(0,0,0,0.18),
            0 0 0 2px ${isDark ? 'rgba(255,180,120,0.10)' : 'rgba(255,150,140,0.14)'},
            0 0 12px 0 ${isDark ? 'rgba(255,210,160,0.08)' : 'rgba(255,170,150,0.10)'};
        }
      `}</style>
    </div>
  );
}
