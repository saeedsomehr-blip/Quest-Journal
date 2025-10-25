import React, { useEffect, useRef } from "react";

export default function WitchEyes({ dark = false }) {
  const hostRef = useRef(null);

  useEffect(() => {
    if (!dark) return; // فقط در دارک‌مود فعال
    const host = hostRef.current;
    if (!host) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
    const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    window.addEventListener("pointermove", onMove, { passive: true });

    // --- ابزار ساخت سیلوئت (SVG به صورت data-uri) ---
    const mkSilhouette = ({
      kind = "mush",
      opacity = 0.25,
      scale = 1,
      dx = 0,
      dy = 0,
      flip = false
    } = {}) => {
      const div = document.createElement("div");
      div.style.position = "absolute";
      // این آفست‌ها بدن رو کمی زیر چشم‌ها می‌نشونه
      div.style.left = `${-60 + dx}px`;
      div.style.top  = `${-40 + dy}px`;
      div.style.width = "140px";
      div.style.height = "120px";
      div.style.pointerEvents = "none";
      div.style.zIndex = "-1";
      div.style.opacity = String(opacity);
      div.style.transform = `scale(${scale}) ${flip ? "scaleX(-1)" : ""}`;
      div.style.filter = "drop-shadow(0 10px 20px rgba(0,0,0,.85))";

      let svg = "";
      if (kind === "mush") {
        // بدن «ژله‌ای» خاکستری/سیاه با لکه‌ی سایه زیرش
        svg = `
          <svg xmlns='http://www.w3.org/2000/svg' width='140' height='120' viewBox='0 0 140 120'>
            <defs>
              <linearGradient id='mushSkin' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%'  stop-color='#2a2a2a'/>
                <stop offset='60%' stop-color='#1a1a1a'/>
                <stop offset='100%' stop-color='#0c0c0c'/>
              </linearGradient>
              <filter id='soft' x='-20%' y='-20%' width='140%' height='140%'>
                <feGaussianBlur in='SourceGraphic' stdDeviation='0.7'/>
              </filter>
            </defs>

            <!-- لکه‌ی سایه روی زمین -->
            <ellipse cx='70' cy='102' rx='38' ry='10'
              fill='rgba(0,0,0,0.55)' filter='url(#soft)'/>

            <!-- توده‌ی بی‌حال با لبه‌های موج‌دار -->
            <g fill='url(#mushSkin)' stroke='rgba(0,0,0,0.6)' stroke-width='1' filter='url(#soft)'>
              <path d='M38,77
                       Q22,70 20,58
                       Q18,44 30,34
                       Q44,24 62,27
                       Q70,22 84,27
                       Q100,34 104,49
                       Q108,64 98,76
                       Q84,88 66,92
                       Q50,90 38,77 Z'/>

              <!-- برآمدگی‌های نرم دو طرف -->
              <ellipse cx='28' cy='60' rx='9' ry='12' transform='rotate(-18 28 60)' opacity='0.9'/>
              <ellipse cx='106' cy='64' rx='10' ry='12' transform='rotate(14 106 64)' opacity='0.9'/>

              <!-- تاجِ نرم بالایی -->
              <path d='M50,36
                       Q44,26 54,21
                       Q66,18 78,21
                       Q88,25 82,36
                       Q76,44 64,45
                       Q56,44 50,36 Z' opacity='0.95'/>

              <!-- برجستگی‌های کوچک برای حس ژله -->
              <circle cx='44' cy='50' r='5' opacity='0.55'/>
              <circle cx='88' cy='54' r='4' opacity='0.5'/>
              <ellipse cx='64' cy='74' rx='7' ry='4' opacity='0.45'/>
            </g>
          </svg>`;
      }
      div.style.background = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") center/contain no-repeat`;
      return div;
    };

    // --- ابزار ساخت یک جفت چشم ---
    const mkEye = (size = 14) => {
      const eye = document.createElement("div");
      eye.style.position = "absolute";
      eye.style.width = `${size}px`;
      eye.style.height = `${Math.round(size * 0.75)}px`;
      eye.style.left = "0";
      eye.style.top = "0";
      eye.style.pointerEvents = "none";
      eye.style.transform = "translate(-50%,-50%)";
      eye.style.willChange = "transform, filter, opacity, background";
      return eye;
    };

    const mkPair = (x, y, opts = {}) => {
      const group = document.createElement("div");
      group.style.position = "absolute";
      group.style.left = `${x}px`;
      group.style.top = `${y}px`;
      group.style.width = "1px";
      group.style.height = "1px";
      group.style.pointerEvents = "none";
      group.style.willChange = "transform, opacity";
      host.appendChild(group);

      // سیلوئت (اختیاری)
      if (opts.silhouette) {
        const sil = mkSilhouette(opts.silhouette);
        group.appendChild(sil);
      }

      const size = opts.size ?? 16;
      const gap = opts.gap ?? 18;

      const L = mkEye(size);
      const R = mkEye(size);
      L.style.transform += ` translateX(-${gap / 2}px)`;
      R.style.transform += ` translateX(${gap / 2}px)`;

      group.appendChild(L);
      group.appendChild(R);

      return {
        group, L, R, x, y,
        baseGlow: opts.baseGlow ?? 0.18,
        glowBoost: opts.glowBoost ?? 1.0,
        phase: Math.random() * 6.283,
        life: 1, state: "fixed",
        eyePhase: Math.random() * 6.283, // فاز برای حرکت چشم‌ها
        hoverPhase: Math.random() * 6.283 // فاز برای افکت شناور
      };
    };

    // --- موجودات ثابت: سمت راست پایین + بدن mush ---
    const fixed = [
      mkPair(innerWidth - 240, innerHeight - 95, {
        size: 16, gap: 18, baseGlow: 0.35, glowBoost: 3.0,
        silhouette: { kind: "mush", opacity: 0.95, scale: 1.05, dx: -4, dy: 6 }
      }),
      mkPair(innerWidth - 120, innerHeight - 90, {
        size: 16, gap: 18, baseGlow: 0.38, glowBoost: 3.0,
        silhouette: { kind: "mush", opacity: 0.92, scale: 1.0, dx: -6, dy: 8 }
      }),
    ];

    // --- چشم‌های تصادفی ---
    const randomEyes = [];
    let nextSpawn = performance.now() + 400 + Math.random() * 600;

    const spawnRand = () => {
      const x = 40 + Math.random() * (innerWidth - 80);
      const y = 60 + Math.random() * (innerHeight - 160);
      const g = mkPair(x, y, {
        size: 14 + Math.random() * 6,
        gap: 14 + Math.random() * 10,
        baseGlow: 0.18 + Math.random() * 0.12,
        glowBoost: 1.5,
      });
      g.life = 0;
      g.state = "fadeIn";
      g.holdFor = 1200 + Math.random() * 1400;
      g.born = performance.now();
      randomEyes.push(g);
    };

    // تغییر اندازه: آپدیت مکان موجودات ثابت
    const onResize = () => {
      fixed[0].x = innerWidth - 240; fixed[0].y = innerHeight - 95;
      fixed[1].x = innerWidth - 120; fixed[1].y = innerHeight - 90;
      fixed.forEach((g) => { g.group.style.left = `${g.x}px`; g.group.style.top = `${g.y}px`; });
    };
    window.addEventListener("resize", onResize);

    // --- حلقهٔ رندر ---
    let raf = 0;
    const tick = () => {
      const now = performance.now();

      if (now > nextSpawn) {
        spawnRand();
        nextSpawn = now + (reduce ? 1200 : 500) + Math.random() * (reduce ? 1500 : 800);
      }

      const updatePair = (g, blinkSpeed = 0.32) => {
        const dx = mouse.x - g.x;
        const dy = mouse.y - g.y;
        const dist = Math.hypot(dx, dy);
        const proximity = Math.max(0, 1 - dist / 320);

        g.phase += reduce ? 0.0015 : 0.003;
        g.eyePhase += reduce ? 0.001 : 0.082; // سرعت حرکت چشم‌ها
        g.hoverPhase += reduce ? 0.002 : 0.006; // سرعت افکت شناور
        const auto = 0.55 + 0.45 * Math.sin(g.phase);
        const blink = Math.sin(g.phase * blinkSpeed) < -0.92 ? 0.0 : 1.0;

        if (g.state === "fadeIn") {
          g.life += 0.045;
          if (g.life >= 1) { g.life = 1; g.state = "hold"; g.born = now; }
        } else if (g.state === "hold") {
          if (now - g.born > g.holdFor) g.state = "fadeOut";
        } else if (g.state === "fadeOut") {
          g.life -= 0.025;
          if (g.life <= 0) g.life = 0;
        }

        const base = g.baseGlow;
        const MAX_GLOW = 1.8;
        const glowRaw = (base + 0.65 * proximity) * auto * blink * (g.life ?? 1) * g.glowBoost;
        const glow = Math.min(MAX_GLOW, glowRaw);
        const glowA = Math.min(1.0, glow);
        const glare = Math.max(0.0, glow - 1.0);

        const setEye = (el) => {
          el.style.background = `
            radial-gradient(closest-side, rgba(255,255,255,${0.08 * glowA}), rgba(0,0,0,0) 40%),
            radial-gradient(closest-side, rgba(180,255,220,${0.30 * glowA}), rgba(0,0,0,0) 60%),
            radial-gradient(closest-side, rgba(120,220,160,${0.95 * glowA}), rgba(90,150,90,${0.55 * glowA}) 60%, rgba(0,0,0,0) 100%)
          `;
          el.style.filter = `drop-shadow(0 0 ${8 + glowA * 16 + glare * 18}px rgba(120,220,160,${0.6 * glowA + 0.35 * glare}))`;
          el.style.opacity = String(0.38 + glowA * 0.62);
        };

        // حرکت عمودی چشم‌ها فقط برای موجودات ثابت
        if (g.state === "fixed") {
          // چشم راست موجود اول: حرکت به پایین
          if (g === fixed[0]) {
            const eyeMoveR = Math.sin(g.eyePhase) > 0.8 ? 4 * Math.sin(g.eyePhase) : 0; // حرکت تا 4px
            g.R.style.transform = `translate(-50%, -50%) translateX(${g.gap / 2}px) translateY(${eyeMoveR}px)`;
            g.L.style.transform = `translate(-50%, -50%) translateX(-${g.gap / 2}px)`; // چشم چپ ثابت
          }
          // چشم چپ موجود دوم: حرکت به بالا
          if (g === fixed[1]) {
            const eyeMoveL = Math.sin(g.eyePhase) > 0.8 ? -4 * Math.sin(g.eyePhase) : 0; // حرکت تا 4px
            g.L.style.transform = `translate(-50%, -50%) translateX(-${g.gap / 2}px) translateY(${eyeMoveL}px)`;
            g.R.style.transform = `translate(-50%, -50%) translateX(${g.gap / 2}px)`; // چشم راست ثابت
          }
          // افکت شناور برای کل گروه
          const hoverOffset = 10 * Math.sin(g.hoverPhase); // حرکت عمودی 2px
          g.group.style.transform = `translateY(${hoverOffset}px)`;
        }

        setEye(g.L);
        setEye(g.R);

        if (g.state === "fadeOut" && g.life <= 0) {
          g.group.remove();
          return false;
        }
        return true;
      };

      fixed.forEach((g) => updatePair(g, 0.26));
      for (let i = randomEyes.length - 1; i >= 0; i--) {
        if (!updatePair(randomEyes[i], 0.36)) randomEyes.splice(i, 1);
      }

      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      // پاکسازی
      const n = host.childNodes.length;
      for (let i = n - 1; i >= 0; i--) host.removeChild(host.childNodes[i]);
    };
  }, [dark]);

  return (
    <div
      ref={hostRef}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 9,
        pointerEvents: "none",
        opacity: dark ? 1 : 0,
        transition: "opacity .25s ease",
      }}
    />
  );
}