// src/theme/fairy/FairyMagnetOverlay.jsx
import { useEffect, useRef } from "react";

/**
 * Drop-in overlay that renders "mouse-attracted" butterflies
 * when the pointer is OUTSIDE any .card. When pointer is inside
 * a .card, the overlay fades out (so only the original butterflies remain).
 *
 * Usage: render <FairyMagnetOverlay active={skin==='fairy'} /> somewhere
 * AFTER <FairyStage /> so this canvas sits on top of the -1 z-index stack.
 */
export default function FairyMagnetOverlay({ active = true }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!active) return;
    const cvs = document.createElement("canvas");
    ref.current = cvs;
    Object.assign(cvs.style, {
      position: "fixed",
      inset: "0",
      zIndex: -1,            // same as FairyStage; later in DOM -> on top
      pointerEvents: "none", // don't block UI
      transition: "opacity 180ms ease",
      opacity: "0",
    });
    document.body.appendChild(cvs);
    const ctx = cvs.getContext("2d");
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const S = {
      w: 0, h: 0, raf: 0,
      bugs: [],
      boxes: [],
      mouse: { x: 0, y: 0, insideCard: true, seenOnce: false },
      alpha: 0, // overlay fade
    };

    const readCards = () => {
      S.boxes = Array.from(document.querySelectorAll(".card"))
        .map(el => el.getBoundingClientRect());
    };
    const resize = () => {
      S.w = innerWidth; S.h = innerHeight;
      cvs.width = Math.floor(S.w * dpr);
      cvs.height = Math.floor(S.h * dpr);
      cvs.style.width = S.w + "px";
      cvs.style.height = S.h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      readCards();
    };
    resize();
    addEventListener("resize", resize);

    const pointInCards = (x, y) =>
      S.boxes.some(r => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);

    const onMove = (e) => {
      const x = e.clientX, y = e.clientY;
      S.mouse.x = x; S.mouse.y = y; S.mouse.seenOnce = true;
      S.mouse.insideCard = pointInCards(x, y);
    };
    addEventListener("pointermove", onMove, { passive: true });

    // seed a small flock (lighter than the built-in ones)
    const N = 14;
    for (let i = 0; i < N; i++) {
      S.bugs.push({
        x: Math.random() * S.w,
        y: Math.random() * S.h * 0.8 + S.h * 0.1,
        vx: (Math.random() * 2 - 1) * 0.2,
        vy: (Math.random() * 2 - 1) * 0.2,
        t: Math.random() * 6.283,
        size: 0.7 + Math.random() * 0.9,
      });
    }

    // simple radial wing gradient helper
    const drawButterfly = (b) => {
      const wing = 0.65 + 0.28 * Math.sin(b.t * 1.25);
      const sz = 5.5 * b.size;
      const a = Math.atan2(b.vy, b.vx);

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(a);
      ctx.globalCompositeOperation = "lighter";

      const gL = ctx.createRadialGradient(-sz, 0, 0, -sz, 0, sz * 1.5);
      gL.addColorStop(0, "rgba(255,250,240,0.92)");
      gL.addColorStop(0.6, "rgba(210,200,255,0.45)");
      gL.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gL;
      ctx.beginPath();
      ctx.ellipse(-sz, 0, sz * 1.2, sz * 0.78 * wing, 0, 0, Math.PI * 2);
      ctx.fill();

      const gR = ctx.createRadialGradient(sz, 0, 0, sz, 0, sz * 1.5);
      gR.addColorStop(0, "rgba(240,255,245,0.92)");
      gR.addColorStop(0.6, "rgba(190,255,230,0.45)");
      gR.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gR;
      ctx.beginPath();
      ctx.ellipse(sz, 0, sz * 1.2, sz * 0.78 * wing, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,240,0.58)";
      ctx.fillRect(-1.15, -3, 2.3, 6);
      ctx.restore();
    };

    const step = () => {
      ctx.clearRect(0, 0, S.w, S.h);

      // fade overlay: show only when mouse is outside any card and has moved at least once
      const targetAlpha = S.mouse.seenOnce && !S.mouse.insideCard ? 1 : 0;
      S.alpha += (targetAlpha - S.alpha) * 0.15;
      cvs.style.opacity = S.alpha.toFixed(3);

      const attract = S.alpha > 0.01 ? { x: S.mouse.x, y: S.mouse.y } : null;

      for (const b of S.bugs) {
        b.t += 0.14;

        // base flutter (subtle)
        b.vx += Math.sin(b.t * 0.8) * 0.035 + (Math.random() * 2 - 1) * 0.006;
        b.vy += Math.cos(b.t * 0.7) * 0.035 + (Math.random() * 2 - 1) * 0.006;

        // attraction when outside cards
        if (attract) {
          const dx = attract.x - b.x;
          const dy = attract.y - b.y;
          const d = Math.hypot(dx, dy) + 1e-3;
          const pull = Math.min(0.12, 80 / (d * d)); // strong when close, soft when far
          b.vx += (dx / d) * pull;
          b.vy += (dy / d) * pull;
        }

        // limit speed
        const sp = Math.hypot(b.vx, b.vy);
        const lim = 1.05;
        if (sp > lim) {
          b.vx = (b.vx / sp) * lim;
          b.vy = (b.vy / sp) * lim;
        }

        // integrate
        b.x += b.vx;
        b.y += b.vy;

        // soft world bounds
        if (b.x < -60) b.x = S.w + 60;
        if (b.x > S.w + 60) b.x = -60;
        if (b.y < S.h * 0.06) { b.y = S.h * 0.06; b.vy *= -0.3; }
        if (b.y > S.h * 0.96) { b.y = S.h * 0.96; b.vy *= -0.3; }

        drawButterfly(b);
      }

      S.raf = requestAnimationFrame(step);
    };

    const mo = new MutationObserver(readCards);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true });

    step();

    return () => {
      cancelAnimationFrame(S.raf);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onMove);
      mo.disconnect();
      cvs.remove();
    };
  }, [active]);

  return null;
}
