// src/theme/witch/components/WitchBackground.jsx
import { useEffect, useRef } from "react";

export default function WitchBackground({ dark = false }) {
  const canvasRef = useRef(null);

  // Canvas: ذرات جادویی، شهاب‌سنگ‌ها، دودِ کلیک
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d", { alpha: true });

    let w = 0, h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      cvs.width = Math.floor(w * dpr);
      cvs.height = Math.floor(h * dpr);
      cvs.style.width = w + "px";
      cvs.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Floating mystical particles (fireflies)
    const particles = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: 1 + Math.random() * 2,
        hue: dark
          ? Math.random() < 0.5 ? 280 : 150
          : Math.random() < 0.5 ? 270 : 140,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Shooting stars (occasional)
    const stars = [];
    const spawnStar = () => {
      if (Math.random() < 0.02) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.5,
          vx: 3 + Math.random() * 4,
          vy: 1 + Math.random() * 2,
          life: 1.0,
          tail: [],
        });
      }
    };

    // Smoke trails on click
    const smokeTrails = [];
    const onClickSmoke = (e) => {
      const colors = dark
        ? ["rgba(160,120,255,", "rgba(120,255,180,", "rgba(180,150,255,"]
        : ["rgba(140,100,200,", "rgba(100,180,140,", "rgba(160,130,210,"];

      for (let i = 0; i < 8; i++) {
        smokeTrails.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 2,
          vy: -1 - Math.random() * 2,
          life: 1.0,
          color: colors[Math.floor(Math.random() * colors.length)],
          r: 6 + Math.random() * 10,
        });
      }
    };
    window.addEventListener("click", onClickSmoke);

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx += (Math.random() - 0.5) * 0.02;
        p.vy += (Math.random() - 0.5) * 0.02;

        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        p.phase += 0.05;
        const alpha = 0.4 + Math.sin(p.phase) * 0.3;

        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        grd.addColorStop(0, `hsla(${p.hue}, 80%, 60%, ${alpha})`);
        grd.addColorStop(1, `hsla(${p.hue}, 80%, 60%, 0)`);

        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
        ctx.fill();
      });

      // shooting stars
      spawnStar();
      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        s.tail.push({ x: s.x, y: s.y });
        if (s.tail.length > 12) s.tail.shift();

        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.015;

        if (s.life <= 0 || s.x > w || s.y > h) {
          stars.splice(i, 1);
          continue;
        }

        // tail
        for (let j = 0; j < s.tail.length; j++) {
          const t = s.tail[j];
          const alpha = (j / s.tail.length) * s.life * 0.6;
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.beginPath();
          ctx.arc(t.x, t.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // head
        ctx.fillStyle = `rgba(255,255,240,${s.life * 0.9})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // smoke trails
      for (let i = smokeTrails.length - 1; i >= 0; i--) {
        const sm = smokeTrails[i];
        sm.x += sm.vx;
        sm.y += sm.vy;
        sm.vx *= 0.98;
        sm.vy *= 0.96;
        sm.life -= 0.012;
        sm.r += 0.4;

        if (sm.life <= 0) {
          smokeTrails.splice(i, 1);
          continue;
        }

        const grd = ctx.createRadialGradient(sm.x, sm.y, 0, sm.x, sm.y, sm.r);
        grd.addColorStop(0, sm.color + sm.life * 0.4 + ")");
        grd.addColorStop(0.5, sm.color + sm.life * 0.2 + ")");
        grd.addColorStop(1, sm.color + "0)");

        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(sm.x, sm.y, sm.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("click", onClickSmoke);
    };
  }, [dark]);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* Moonlit night background (exact same palettes) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background: dark
            ? `radial-gradient(600px 400px at 20% 15%, rgba(200,200,240,.18), transparent 60%),
               radial-gradient(1400px 1000px at 50% 100%, rgba(80,50,120,.4), transparent 70%),
               linear-gradient(180deg, #0a0612, #1a0f2e 40%, #2a1845 70%, #1a0f2e)`
            : `radial-gradient(600px 400px at 20% 15%, rgba(220,220,255,.35), transparent 60%),
               radial-gradient(1400px 1000px at 50% 100%, rgba(140,100,180,.3), transparent 70%),
               linear-gradient(180deg, #2d1b4e, #4a2d6b 40%, #5e3d7f 70%, #3d2456)`,
          backgroundAttachment: "fixed",
        }}
      />

      {/* Stars layer (twinkle) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background: `
            radial-gradient(2px 2px at 15% 20%, white, transparent),
            radial-gradient(1px 1px at 45% 10%, white, transparent),
            radial-gradient(1px 1px at 70% 25%, rgba(255,255,255,.8), transparent),
            radial-gradient(2px 2px at 85% 15%, white, transparent),
            radial-gradient(1px 1px at 30% 8%, rgba(255,255,255,.7), transparent),
            radial-gradient(1px 1px at 60% 18%, white, transparent),
            radial-gradient(1px 1px at 25% 30%, rgba(255,255,255,.6), transparent)
          `,
          backgroundSize: "100% 100%",
          animation: "twinkle 4s ease-in-out infinite",
        }}
      />

      {/* Canvas effects: particles, shooting stars, click smoke */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
