// src/theme/misty/MistyStage.jsx
import { useEffect, useRef } from "react";

export default function MistyStage({ dark = false, intensity = 1 }) {
  const skyRef = useRef(null);
  const cloudRef = useRef(null);

  // ---------- utils ----------
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const k = clamp01(intensity);

  function rng(seed = 1337) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // [0,1)
    };
  }

  const R = 1024; // سبک
  function makeNoise1(rand) {
    const g = new Float32Array(R);
    for (let i = 0; i < R; i++) g[i] = rand() * 2 - 1;
    const smooth = t => t * t * (3 - 2 * t);
    return (x) => {
      const xi = Math.floor(x) % R, xf = x - Math.floor(x);
      const a = g[(xi + R) % R], b = g[(xi + 1 + R) % R];
      return a + (b - a) * smooth(xf);
    };
  }
  function makeNoise2(rand) {
    const n1 = makeNoise1(rand);
    return (x, y) => (n1(x) + n1(y)) * 0.5; // سریع
  }
  function fbm2(n2, x, y) { // 2 اکتاو (سبک)
    let a = 0, amp = 0.6, fx = x, fy = y;
    for (let i = 0; i < 2; i++) {
      a += (n2(fx, fy) * 0.5 + 0.5) * amp;
      fx *= 2.0; fy *= 2.0; amp *= 0.6;
    }
    return a;
  }
  const smoothstep = (a,b,x)=>{ const t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };
  const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

  // ---------- palettes ----------
  // سپیده‌ی آبی با ته‌مایه‌ی خیلی کم ارغوانی/صورتی نزدیک افق
  const L_BOTTOM = "#cfe4f2"; // آبی خیلی روشنِ سرد
  const L_MID    = "#5b78a5"; // آبی ملایم
  const L_TOP    = "#1b2a49"; // آبیِ بسیار تیره (سرمه‌ای)
  // دارک (شب پرستاره)
  const D_BOTTOM = "#0b1020", D_MID = "#1e1b4b", D_TOP = "#312e81";
  const [B,M,T] = dark ? [D_BOTTOM,D_MID,D_TOP] : [L_BOTTOM,L_MID,L_TOP];

  // ---------- dark sky (stars) ----------
  useEffect(() => {
    const cvs = skyRef.current; if (!cvs) return;
    const ctx = cvs.getContext("2d", { alpha: true }); if (!ctx) return;

    let w=0,h=0,dpr=Math.min(2,devicePixelRatio||1),raf=0;
    const resize=()=>{ w=innerWidth; h=innerHeight;
      cvs.width=Math.floor(w*dpr); cvs.height=Math.floor(h*dpr);
      cvs.style.width=w+"px"; cvs.style.height=h+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0); };
    resize(); addEventListener("resize",resize);

    const rand=rng(2025);
    const STAR_COUNT = dark ? Math.floor((w*h)/1600*(0.9+0.4*k)) : 0;
    const stars = Array.from({length:STAR_COUNT}, () => ({
      x: rand()*w, y: rand()*h, r: 0.5+rand()*1.0,
      baseA: 0.22+rand()*0.45, twk: 0.7+rand()*1.6, phase: rand()*Math.PI*2, tint: 0.9+rand()*0.2
    }));

    const loop=()=> {
      const t=performance.now()/1000;
      ctx.clearRect(0,0,w,h);
      if (dark) {
        ctx.globalCompositeOperation="screen";
        for (const s of stars) {
          const a = s.baseA * (0.7 + 0.3*Math.sin(t*s.twk + s.phase));
          ctx.fillStyle = `rgba(${Math.floor(200*s.tint)},${Math.floor(210*s.tint)},255,${a})`;
          ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
        }
        ctx.globalCompositeOperation="source-over";
      }
      raf=requestAnimationFrame(loop);
    };
    loop();

    return ()=>{ cancelAnimationFrame(raf); removeEventListener("resize",resize); };
  }, [dark, k]);

  // ---------- mouse (hit-test + smoothing) ----------
  const mouse = useRef({ x: 0, y: 0, fx: 0, fy: 0, strength: 0 });
  useEffect(() => {
    const onMove = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const overCard = !!el?.closest?.(".card");
      mouse.current.x = e.clientX; mouse.current.y = e.clientY;
      const target = overCard ? 0 : 1;
      mouse.current.strength += (target - mouse.current.strength) * 0.25; // نرم
    };
    const onLeave = () => { mouse.current.strength = 0; };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // ---------- clouds (fast, blue-tinted, full-height dynamic coverage) ----------
  useEffect(() => {
    const cvs = cloudRef.current; if (!cvs) return;
    const ctx = cvs.getContext("2d", { alpha: true }); if (!ctx) return;

    let w=0,h=0,dpr=Math.min(2,devicePixelRatio||1),raf=0;
    const resize=()=>{ w=innerWidth; h=innerHeight;
      cvs.width=Math.floor(w*dpr); cvs.height=Math.floor(h*dpr);
      cvs.style.width=w+"px"; cvs.style.height=h+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0); };
    resize(); addEventListener("resize",resize);

    // offscreen 1/5 رزولوشن برای عملکرد
    const off=document.createElement("canvas");
    const setOff=()=>{ off.width=Math.max(1,Math.floor(w/5)); off.height=Math.max(1,Math.floor(h/5)); };
    setOff(); const octx=off.getContext("2d");

    const rand=rng(7777);
    const n2 = makeNoise2(rand);
    const nVelX = makeNoise2(rand); // میدان سرعت ارزان
    const nVelY = makeNoise2(rand);

    // تاینـت‌ها: سفیدِ سرد و خاکستری-آبی (نم‌دار)
    const baseAlpha = dark ? (0.12 + 0.05*k) : (0.15 + 0.06*k);
    const whiteTint = dark ? [225,235,255] : [246,251,255];
    const rainTint  = dark ? [165,182,205] : [170,188,210];
    const RAIN_TINT  = 0.42;
    const RAIN_ALPHA = 0.16;

    // جریان و جزئیات
    const fbmScale = dark ? 0.010 : 0.0115;
    const flowScale = 0.0048;
    const flowSpeed = 150;        // حرکت واضح‌تر
    const evolveZ   = 0.22;

    // پوشش پویا (کم/پر ابری) + باند عمودی/افقی
    const coverScale1=0.00006, coverScale2=0.00006;
    const COVERAGE_STRENGTH = 0.4;

    // ماسک باران برای تنوع رنگی
    const rainScale = 0.030;

    // تعامل موس
    const REVEAL_RADIUS=150, REVEAL_STRENGTH= dark?0.46:0.58, REPEL_FORCE=34;

    const img = () => octx.createImageData(off.width, off.height);
    let buffer = img();

    // cap 20fps
    let tPrev=performance.now(), acc=0, phase=0;
    const targetDt=1/20;
    const lerp = (a,b,t)=>a+(b-a)*t;

    const loop=()=> {
      const now=performance.now();
      let dt=Math.min(0.08,(now-tPrev)/1000);
      tPrev=now; acc+=dt;

      if (acc>=targetDt) {
        const step=acc; acc=0; phase+=step;

        if (off.width!==Math.max(1,Math.floor(w/5)) || off.height!==Math.max(1,Math.floor(h/5))) {
          setOff(); buffer=img();
        }
        const data=buffer.data;

        // mouse smoothing
        mouse.current.fx = lerp(mouse.current.fx || mouse.current.x, mouse.current.x, 0.15);
        mouse.current.fy = lerp(mouse.current.fy || mouse.current.y, mouse.current.y, 0.15);

        const ow=off.width, oh=off.height;
        const cx=(mouse.current.fx/Math.max(1,w))*ow;
        const cy=(mouse.current.fy/Math.max(1,h))*oh;
        const mStr=mouse.current.strength;

        const ang = Math.sin(phase*0.14)*0.22;
        const sa = Math.sin(ang), ca = Math.cos(ang);

        for (let y=0;y<oh;y++) {
          // باند عمودی/افقی متحرک برای جابه‌جایی پوشش در ارتفاع
          const bandCore = Math.sin(y*0.018 + phase*0.33) * 0.75
                         + Math.sin((y*0.006 + phase*0.12) + (0.5*Math.sin(phase*0.2)));
          const bandX = Math.sin((y*0.012 + (y*0.0) + phase*0.18)) * 0.25;
          const band = 0.5 + 0.5 * (bandCore + bandX);
          const bandNoise = fbm2(n2, (y*0.0018 + phase*0.1), (y*0.0016 - phase*0.07));
          const bandWeight = smoothstep(0.25, 0.8, band) * (0.55 + 0.45*bandNoise);

          for (let x=0;x<ow;x++) {

            // میدان سرعت ارزان: دو سمپل نویز + نرمال‌سازی + چرخش ملایم
            let vx = nVelX(x*flowScale + phase*0.09, y*flowScale - phase*0.07);
            let vy = nVelY(x*flowScale - phase*0.08, y*flowScale + phase*0.06);
            const mag=Math.max(0.0001,Math.hypot(vx,vy)); vx/=mag; vy/=mag;
            const rvx = vx*ca - vy*sa, rvy = vx*sa + vy*ca;

            let px = x + rvx * flowSpeed * step;
            let py = y + rvy * flowSpeed * step;

            // پوشش کم‌فرکانس (دو مقیاس) + اعمال باند پویا
            const cov1 = fbm2(n2, (x + phase*15)*coverScale1, (y - phase*12)*coverScale1);
            const cov2 = fbm2(n2, (x - phase*10)*coverScale2, (y + phase*13)*coverScale2);
            let cov = 0.1*cov1 + 0.05*cov2;
            cov = clamp01( cov*(1 - 0.30*bandWeight) + (0.30*bandWeight) );

            const hole = smoothstep(0.55, 0.82, 1 - cov);
            const holeMul = 1 - hole * COVERAGE_STRENGTH;

            // تعامل موس (نرم)
            let revealMul = 0;
            if (mStr>0.001) {
              const rx=px-cx, ry=py-cy, r2=rx*rx+ry*ry, r=Math.sqrt(r2)||1e-4;
              const g=Math.exp(-r2/(2*REVEAL_RADIUS*REVEAL_RADIUS));
              revealMul = REVEAL_STRENGTH * mStr * g;
              px += (rx/r) * (REPEL_FORCE * g * mStr * 0.30);
              py += (ry/r) * (REPEL_FORCE * g * mStr * 0.30);
            }

            // چگالی و رنگ
            const sx=px*fbmScale, sy=py*fbmScale;
            let v = fbm2(n2, sx + phase*evolveZ, sy - phase*evolveZ);
            v = v * Math.sqrt(Math.max(0,v)); // ~گاما 1.5

            const rain = fbm2(n2, x*rainScale, y*rainScale);
            const rainy = smoothstep(0.45, 0.85, rain);
            const rTint = [
              Math.round(whiteTint[0]*(1-RAIN_TINT*rainy) + rainTint[0]*(RAIN_TINT*rainy)),
              Math.round(whiteTint[1]*(1-RAIN_TINT*rainy) + rainTint[1]*(RAIN_TINT*rainy)),
              Math.round(whiteTint[2]*(1-RAIN_TINT*rainy) + rainTint[2]*(RAIN_TINT*rainy)),
            ];

            const aBase = (baseAlpha + 0.34*v) * holeMul + (RAIN_ALPHA * rainy);
            const A = Math.max(0, Math.min(255, (aBase * (1 - revealMul)) * 255));

            const idx = (y*ow + x)*4;
            data[idx  ] = rTint[0];
            data[idx+1] = rTint[1];
            data[idx+2] = rTint[2];
            data[idx+3] = A;
          }
        }

        octx.putImageData(buffer,0,0);
      }

      // compose
      ctx.clearRect(0,0,w,h);
      ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality="high";
      ctx.globalCompositeOperation="lighter";
      ctx.drawImage(off, 0,0,off.width,off.height, 0,0, w, h);

      // مه افقی خیلی ملایم (کمتر از قبل تا پایین همیشه مه‌آلود دیده نشه)
      const grad = ctx.createLinearGradient(0,h,0,0);
      grad.addColorStop(0.0, `rgba(255,255,255,${dark?0.06:0.09})`);
      grad.addColorStop(0.35, `rgba(255,255,255,${dark?0.045:0.07})`);
      grad.addColorStop(0.75, `rgba(255,255,255,${dark?0.020:0.035})`);
      grad.addColorStop(1.0, `rgba(255,255,255,0)`);
      ctx.globalCompositeOperation="screen";
      ctx.fillStyle=grad; ctx.fillRect(0,0,w,h);

      ctx.globalCompositeOperation="source-over";
      raf=requestAnimationFrame(loop);
    };
    loop();

    return ()=>{ cancelAnimationFrame(raf); removeEventListener("resize",resize); };
  }, [dark, k]);

  // ---------- background gradient ----------
  // لایه‌ی بسیار کم‌رنگِ صورتی نزدیک افق برای حس سپیده
  const background = `
    linear-gradient(180deg, ${T} 0%, ${M} 50%, ${B} 100%),
    radial-gradient(140% 90% at 50% 110%, rgba(255,170,155,${dark?0:0.12}) 0%, rgba(255,170,155,0) 40%),
    radial-gradient(120% 80% at 50% 120%, rgba(0,0,0,${dark?0.33*k:0.10*k}) 0%, rgba(0,0,0,0) 60%)
  `;

  return (
    <>
      {/* گرادیان آسمان */}
      <div
        aria-hidden
        style={{
          position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
          background,
          // backgroundAttachment:"fixed", // حذف برای اسکرول روون‌تر
          willChange:"transform, opacity"
        }}
      />
      {/* ستاره‌ها (فقط دارک) */}
      <canvas
        ref={skyRef}
        aria-hidden
        style={{ position:"absolute", inset:0, zIndex:1, pointerEvents:"none",
          opacity: dark ? 1 : 0, transition:"opacity 300ms ease", willChange:"opacity" }}
      />
      {/* ابرها */}
      <canvas
        ref={cloudRef}
        aria-hidden
        style={{ position:"absolute", inset:0, zIndex:2, pointerEvents:"none", willChange:"transform, opacity" }}
      />
      {/* مهِ جلویی خیلی خفیف (ارغوانی بسیار کم) */}
      <div
        aria-hidden
        style={{
          position:"absolute", inset:0, zIndex:3, pointerEvents:"none",
          mixBlendMode: dark ? "screen" : "soft-light",
          opacity: dark ? 0.45 : 0.55,
          background: `
            radial-gradient(60% 40% at 35% 88%, rgba(170,150,220,${dark?0.05:0.06}), transparent 70%),
            radial-gradient(55% 35% at 70% 85%, rgba(170,150,220,${dark?0.04:0.05}), transparent 70%)
          `,
          animation: "mist-shift-adv 18s ease-in-out infinite",
          willChange:"transform, filter"
        }}
      />
      {/* وینیت ملایم */}
      <div
        aria-hidden
        style={{
          position:"absolute", inset:0, zIndex:4, pointerEvents:"none",
          background: `
            radial-gradient(120% 80% at 50% -10%, rgba(0,0,0,${dark?0.30:0.14}), transparent 60%),
            radial-gradient(80% 60% at 50% 110%, rgba(0,0,0,${dark?0.25:0.10}), transparent 60%)
          `,
          mixBlendMode:"multiply"
        }}
      />
      <style>{`
        @keyframes mist-shift-adv {
          0%   { transform: translateX(0) translateY(0) scale(1);   filter: blur(1.5px) brightness(1); }
          25%  { transform: translateX(8px) translateY(-2px) scale(1.012); filter: blur(1.6px) brightness(1.02); }
          50%  { transform: translateX(-6px) translateY(2px) scale(1.010);  filter: blur(1.7px) brightness(1.03); }
          75%  { transform: translateX(7px) translateY(-1px) scale(1.014);  filter: blur(1.6px) brightness(1.02); }
          100% { transform: translateX(0) translateY(0) scale(1);   filter: blur(1.5px) brightness(1); }
      `}</style>
    </>
  );
}
