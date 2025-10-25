// src/theme/scholar/ScholarStage.jsx
import React, { useEffect, useRef, useState } from "react";

export default function ScholarStage({ dark = false }) {
  // فونت سراسری
  useEffect(() => {
    const prev = document.body.style.fontFamily;
    document.body.style.fontFamily = '"Cormorant Garamond", "Times New Roman", serif';
    return () => { document.body.style.fontFamily = prev; };
  }, []);

  /* ===================== Canvas نوشتن/نقاشی (فقط لایت) ===================== */
  const drawRef = useRef(null);
  const [canDraw, setCanDraw] = useState(false);

  useEffect(() => {
    const cvs = drawRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d", { alpha: true });

    let w = 0, h = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      w = innerWidth; h = innerHeight;
      cvs.width = Math.floor(w * dpr);
      cvs.height = Math.floor(h * dpr);
      cvs.style.width = w + "px";
      cvs.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    addEventListener("resize", resize);

    let strokes = []; // { pts:[{x,y,w}], t:number }
    const LIFE = 9.5; // پاک‌شدن بعد از ۵.۵ ثانیه
    const MAX_STROKES = 1200;

    let drawing = false;
    let last = null;
    let lastT = 0;
    let raf = 0;

    const startNoSelect = () => document.documentElement.classList.add("no-select");
    const endNoSelect = () => document.documentElement.classList.remove("no-select");

    function pointerDown(e) {
      if (dark) return; // لایت‌مود فقط
      const el = document.elementFromPoint(e.clientX, e.clientY);
      // روی کارت ننویس
      if (el?.closest?.(".card")) return;

      // جلوگیری از انتخاب متن هنگام کشیدن بیرون کارت‌ها
      e.preventDefault();
      startNoSelect();

      drawing = true;
      last = { x: e.clientX, y: e.clientY, w: 2.6 };
      lastT = performance.now();
      strokes.push({ pts: [last], t: lastT });
      if (strokes.length > MAX_STROKES) strokes.splice(0, strokes.length - MAX_STROKES);
      setCanDraw(true);
    }

    function pointerMove(e) {
      if (!drawing || dark) return;
      // جلوگیری از selection هنگام درگ
      e.preventDefault();

      const now = performance.now();
      const p = { x: e.clientX, y: e.clientY };
      const dt = Math.max(0.016, (now - lastT) / 1000);
      const dx = p.x - last.x, dy = p.y - last.y;
      const v = Math.hypot(dx, dy) / dt;     // سرعت پیکسل/ثانیه
      // ضخامت قلم پر: آهسته‌تر => ضخیم‌تر، تندتر => نازک‌تر
      const wCallig = 1.8 + 4.2 / (1.0 + 0.01 * v); //  ~1.8..5
      lastT = now;
      last = { x: p.x, y: p.y, w: wCallig };
      const s = strokes[strokes.length - 1];
      if (!s) return;
      const prev = s.pts[s.pts.length - 1];
      // کم‌کردن نقاط خیلی نزدیک برای سبک شدن
      if ((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2 > 0.8) s.pts.push(last);
    }

    function pointerUp() {
      if (!drawing) return;
      drawing = false;
      endNoSelect();
    }

    const drawAll = () => {
      ctx.clearRect(0, 0, w, h);
      if (!dark) {
        const now = performance.now();
        for (let i = 0; i < strokes.length; i++) {
          const s = strokes[i];
          const age = (now - s.t) / 1000;
          const k = Math.max(0, 1 - age / LIFE); // 1→0
          if (k <= 0) continue;

          const pts = s.pts;
          if (pts.length === 0) continue;

          // گذر «جوهر» سیاه: قلم پر با حاشیه خیلی لطیف
          // لایه diffuse خیلی ملایم برای بافت جوهر
          ctx.lineJoin = "round";
          ctx.lineCap  = "round";

          for (let j = 1; j < pts.length; j++) {
            const a = pts[j - 1], b = pts[j];
            const wAvg = (a.w + b.w) * 0.5;

            // diffuse (پرِ جوهر روی کاغذ)
            ctx.strokeStyle = `rgba(0,0,0,${0.08 * k})`;
            ctx.lineWidth = wAvg * 1.9;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();

            // جوهر اصلی (مشکی)
            ctx.strokeStyle = `rgba(8,8,8,${0.92 * k})`;
            ctx.lineWidth = wAvg;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        // پاکسازی stroke های منقضی
        if (strokes.length) {
          strokes = strokes.filter(s => (now - s.t) / 1000 < LIFE);
          if (!strokes.length) setCanDraw(false);
        }
      } else {
        if (canDraw) setCanDraw(false);
      }
      raf = requestAnimationFrame(drawAll);
    };
    drawAll();

    // لیسنرها: non-passive برای بتوانیم preventDefault کنیم
    window.addEventListener("pointerdown", pointerDown, { passive: false });
    window.addEventListener("pointermove", pointerMove, { passive: false });
    window.addEventListener("pointerup", pointerUp, { passive: false });
    window.addEventListener("pointercancel", pointerUp, { passive: false });
    window.addEventListener("blur", pointerUp);

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointercancel", pointerUp);
      window.removeEventListener("blur", pointerUp);
      endNoSelect();
    };
  }, [dark]);

  /* ===================== Glow شمع‌ها (دارک) با نگه‌داری 4–5s ===================== */
  const candleRef = useRef(null);
  useEffect(() => {
    const el = candleRef.current;
    if (!el) return;

    // دو شمع پایین چپ و پایین راست
    const hotspots = [
      { x: 14, y: 90, baseA: 0.92, lastBoost: 0, hold: 6800 }, // ms
      { x: 86, y: 90, baseA: 0.80, lastBoost: 0, hold: 6000 },
    ];

    let raf = 0;
    function onMove(e) {
      if (!dark) return;
      const cx = (e.clientX / innerWidth) * 100;
      const cy = (e.clientY / innerHeight) * 100;
      const now = performance.now();
      hotspots.forEach(h => {
        const d = Math.hypot(cx - h.x, cy - h.y);  // درصد
        if (d < 14) h.lastBoost = now;             // نزدیک شد: شروع/تمدید boost
      });
    }

    function tick() {
      const now = performance.now();
      hotspots.forEach((h, i) => {
        // اگر هنوز در نگه‌داری هستیم → دوبرابر، بعد نرم به پایه برگردد
        const since = now - h.lastBoost;
        const inHold = since < h.hold;
        // فِید تدریجی 700ms بعد از اتمام نگه‌داری
        const fade = Math.min(1, Math.max(0, 1 - (since - h.hold) / 1200));
        const alpha = inHold ? h.baseA * .89 : h.baseA * (0.3 + 0.7 * fade);
        el.style.setProperty(`--a${i}`, alpha.toFixed(3));
        el.style.setProperty(`--x${i}`, `${h.x}%`);
        el.style.setProperty(`--y${i}`, `${h.y}%`);
      });
      raf = requestAnimationFrame(tick);
    }
    tick();
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [dark]);

  /* ===================== پس‌زمینه‌ها ===================== */
  // خطوط کاغذ: ترکیبی از repeating-linear-gradient (خط صاف) + SVG راه‌راه ملایم موج‌دار
  const paperRules = `
    /* خطوط صاف نازک هر 24px */
    repeating-linear-gradient(
      to bottom,
      rgba(122,90,51,.14) 0px,
      rgba(122,90,51,.14) 1px,
      rgba(0,0,0,0) 1px,
      rgba(0,0,0,0) 24px
    ),
    /* موج ملایمِ نامنظّم برای طبیعی‌شدن خطوط */
    url("data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='48'>
         <path d='M0 12 C 120 10, 200 14, 320 12 C 440 10, 560 14, 800 12'
               stroke='rgba(122,90,51,0.08)' stroke-width='1' fill='none'/>
         <path d='M0 36 C 140 34, 240 38, 360 36 C 520 34, 640 38, 800 36'
               stroke='rgba(122,90,51,0.06)' stroke-width='1' fill='none'/>
       </svg>`
    )}")
  `;

  const lightPaper = `
    /* ستون طلایی ملایم سمت چپ */
    linear-gradient(90deg, rgba(212,175,55,.12) 0 10px, transparent 10px),
    /* dither لطیف برای حذف banding */
    repeating-linear-gradient(135deg, rgba(255,255,255,.03) 0 2px, rgba(0,0,0,.03) 2px 4px),
    /* الیاف کاغذ */
    url("data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>
         <g opacity='.08' stroke='%238a6a45' stroke-width='0.6' stroke-linecap='round'>
           <path d='M10 30c40 20 60-10 90 6'/>
           <path d='M30 120c30-8 60 18 100 10'/>
           <path d='M20 180c20 6 40 0 80 12'/>
         </g>
       </svg>`
    )}"),
    /* خطوط راهنما */
    ${paperRules},
    /* گرادیان‌های کرم چندایستگاهی */
    radial-gradient(1600px 900px at 40% -10%, #fffdf3 0%, rgba(255,253,243,0) 65%),
    linear-gradient(180deg, #f8edd6 0%, #f3e4c6 45%, #ecd7b3 75%, #e4caa2 100%)
  `;

  const darkBg = `
    radial-gradient(1200px 800px at 50% -10%, #111, transparent 70%),
    linear-gradient(180deg, #0e0e0e, #111 60%, #0c0c0c)
  `;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* پس‌زمینه */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background: dark ? darkBg : lightPaper,
          backgroundRepeat: dark
            ? "no-repeat, no-repeat"
            : "no-repeat, repeat, repeat, repeat-y, no-repeat, no-repeat",
          backgroundSize: dark
            ? "cover, cover"
            : "auto, 220px 220px, 220px 220px, 100% 48px, cover, cover",
          backgroundBlendMode: dark
            ? "normal, normal"
            : "overlay, multiply, normal, multiply, normal, normal",
          backgroundAttachment: "fixed",
        }}
      />

      {/* Glow شمع‌ها (فقط دارک) */}
      <div
        ref={candleRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          opacity: dark ? 1 : 0,
          transition: "opacity .3s ease",
          background: `
            radial-gradient(240px 170px at var(--x0,14%) var(--y0,90%), rgba(255,190,120, var(--a0,.22)), transparent 70%),
            radial-gradient(220px 160px at var(--x1,86%) var(--y1,90%), rgba(255,200,140, var(--a1,.20)), transparent 70%)
          `,
          mixBlendMode: "screen",
        }}
      />

      {/* بومِ نوشتن (فقط لایت) */}
      <canvas
        ref={drawRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: dark ? "none" : "auto",
          opacity: dark ? 0 : 1,
          transition: "opacity .25s ease",
        }}
      />

      {/* استایل‌ها: line-height و Drop Cap + جلوگیری از انتخاب متن هنگام نوشتن */}
      <style>{`
        :root[data-skin="scholar"] body,
        :root[data-skin="scholar"] .app-root,
        :root[data-skin="scholar"] .card,
        :root[data-skin="scholar"] button,
        :root[data-skin="scholar"] input,
        :root[data-skin="scholar"] textarea,
        :root[data-skin="scholar"] select {
          font-family: "Cormorant Garamond", "Times New Roman", serif !important;
        }
        :root[data-skin="scholar"] .app-root,
        :root[data-skin="scholar"] .card {
          line-height: 1.25;
          color: ${dark ? "#e9e4d8" : "#2a2116"};
        }
        :root[data-skin="scholar"] h1::first-letter,
        :root[data-skin="scholar"] h2::first-letter{
          font-size: 1.35em;
          color: ${dark ? "#d9b26a" : "#7a5833"};
          margin-right: .06em;
          text-shadow: ${dark ? "0 1px 0 rgba(255,220,160,.45)" : "0 1px 0 rgba(255,230,180,.65)"};
        }
        /* هنگام نوشتن بیرون کارت‌ها، هیچ متنی انتخاب نشود */
        .no-select, .no-select * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }
      `}</style>
    </div>
  );
}
