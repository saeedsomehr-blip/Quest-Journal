// src/theme/fairy/FairyStage.jsx
import { useEffect, useRef, useState } from "react";
/* ================= Shaders ================= */
const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = (aPos + 1.0) * 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;
varying vec2 vUv;

uniform float uTime;
uniform vec2  uResolution;
uniform float uDark;
uniform float uMotion;

// hash/noise/fbm
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float t=0.0, a=0.5;
  for(int i=0;i<5;i++){ t+=a*noise(p); p*=2.02; a*=0.5; }
  return t;
}

// tiny stars
float star(vec2 uv, float s){
  float n = hash(floor(uv*s));
  return step(0.997, n);
}

void main(){
  vec2 res=uResolution;
  vec2 uv=vUv;
  vec2 p = (uv-0.5)*vec2(res.x/res.y,1.0)+0.5;

  float t=uTime;
  float dark = uDark;

  // background gradient (fairy greenish)
  vec3 top = mix(vec3(0.90,1.00,0.96), vec3(0.16,0.18,0.22), dark*0.7);
  vec3 bot = mix(vec3(0.74,0.93,0.86), vec3(0.08,0.10,0.14), dark*0.7);
  vec3 col = mix(top, bot, uv.y);

  // aurora bands
  float mot = mix(0.0,1.0,uMotion);
  vec2 au = p*vec2(1.2,1.0) + vec2(0.0, 0.02*sin(t*0.2));
  float a1 = fbm(au*1.2 + vec2(0.0,  0.03*t*mot));
  float a2 = fbm(au*1.8 + vec2(0.0, -0.02*t*mot));
  float band = smoothstep(0.45, 0.92, a1 + 0.6*a2);
  vec3 c1 = vec3(0.60,0.95,0.82);
  vec3 c2 = vec3(0.86,0.74,0.97);
  vec3 aur = mix(c1,c2,band);
  col = mix(col, aur, 0.6);

  // star field
  float s1 = star(uv+vec2(t*0.004,0.0), 480.0);
  float s2 = star(uv*1.8+vec2(-t*0.003,0.01), 700.0);
  float s3 = star(uv*2.6+vec2(t*0.002,-0.01), 1000.0);
  col += vec3(1.1,1.1,1.2)*(s1*0.16+s2*0.12+s3*0.08);

  // soft vignette
  float vg = smoothstep(0.95, 0.35, length(uv-0.5));
  col = mix(col, col*0.93, vg * (0.10 + 0.05*dark));

  gl_FragColor = vec4(col, 1.0);
}
`;

/* ================= Helpers ================= */
function usePrefersReducedMotion() {
  const ref = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => (ref.current = !!mq.matches);
    set();
    mq.addEventListener?.("change", set);
    return () => mq.removeEventListener?.("change", set);
  }, []);
  return ref;
}

/* ============== Overlay (Canvas 2D): Butterflies + Orbs + Sparkles ============== */
function useOverlaySpritesFairy({ activeFairy }) {
  const ref = useRef(null);
  useEffect(() => {
    const cvs = ref.current;
    if (!activeFairy || !cvs) return;
    const ctx = cvs.getContext("2d"); if (!ctx) return;

    const S = {
      w: 0, h: 0, raf: 0,
      boxes: [],
      bugs: [],
      orbs: [],
      bursts: [],
      mouse: { x: 0, y: 0, seen: false, inCard: false, magnetOn: false },
    };
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const readCards = () => {
      S.boxes = Array.from(document.querySelectorAll(".card")).map(el => el.getBoundingClientRect());
    };
    const pointInCards = (x,y) => S.boxes.some(r => x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom);

    const resize = () => {
      S.w = innerWidth; S.h = innerHeight;
      cvs.width  = Math.floor(S.w*dpr);
      cvs.height = Math.floor(S.h*dpr);
      cvs.style.width  = S.w+"px";
      cvs.style.height = S.h+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
      readCards();
    };
    resize(); addEventListener("resize", resize);

    // Mouse tracking (canvas has pointerEvents:none → listen on window)
    const handleMove = (e) => {
      S.mouse.x = e.clientX; S.mouse.y = e.clientY; S.mouse.seen = true;
      S.mouse.inCard = pointInCards(S.mouse.x, S.mouse.y);
      S.mouse.magnetOn = S.mouse.seen && !S.mouse.inCard; // بیرون کارت → جذب روشن
    };
    const handleLeave = () => {
      S.mouse.seen = false;
      S.mouse.magnetOn = false;
    };
    addEventListener("mousemove", handleMove, { passive:true });
    addEventListener("mouseleave", handleLeave);

    // butterflies
    const N = 35;
    for (let i=0;i<N;i++){
      let x, y, tries=0;
      do { x=Math.random()*S.w; y=Math.random()*S.h*0.65+S.h*0.15; tries++; if (tries>40) break; }
      while (pointInCards(x,y));
      const size = 0.5 + Math.random()*0.9;

      // type: 0=default, 1=emoji-like, 2=yellow-orange-red, 3=blue-gold
      let type = 0;
      const r = Math.random();
      if (r < 0.05) type = 1;
      else if (r < 0.10) type = 2;
      else if (r < 0.15) type = 3;
      S.bugs.push({ x,y, vx:(Math.random()*2-1)*0.25, vy:(Math.random()*2-1)*0.2, a:0, t: Math.random()*6.28, size, type });
    }
    // orbs
    const M = 20;
    for (let i=0;i<M;i++){
      S.orbs.push({ x:Math.random()*S.w, y:Math.random()*S.h*0.7, r:2+Math.random()*3, vx:(Math.random()*2-1)*0.06, vy:(Math.random()*2-1)*0.05 });
    }

    // params
    const MAG_FORCE       = 0.06;
    const MAG_RANDOM_JIT  = 0.008;
    const MAX_MAG_SPEED   = 2.2;
    const DAMPING_MAG     = 0.96;  // فقط در حالت جذب
    const MAX_FREE_SPEED  = 0.9;   // دقیقاً مثل نسخه اصلی

    const draw = () => {
      ctx.clearRect(0,0,S.w,S.h);

      // orbs
      for (const o of S.orbs) {
        o.x += o.vx; o.y += o.vy;
        o.vx += (Math.random()*2-1)*0.003;
        o.vy += (Math.random()*2-1)*0.003;
        if (o.x < -20) o.x = S.w+20;
        if (o.x > S.w+20) o.x = -20;
        if (o.y < 0) { o.y=0; o.vy*=-0.5; }
        if (o.y > S.h){ o.y=S.h; o.vy*=-0.5; }
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r*8);
        g.addColorStop(0, "rgba(255,255,255,0.32)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x,o.y,o.r*4,0,6.283); ctx.fill();
      }

      // butterflies
      for (const b of S.bugs) {
        // keep them out of cards
        for (const r of S.boxes) {
          const inside = b.x>=r.left&&b.x<=r.right&&b.y>=r.top&&b.y<=r.bottom;
          if (!inside) continue;
          const dxL=Math.abs(b.x-r.left), dxR=Math.abs(r.right-b.x);
          const dyT=Math.abs(b.y-r.top),  dyB=Math.abs(r.bottom-b.y);
          const m = Math.min(dxL,dxR,dyT,dyB);
          if (m===dxL) b.vx = -Math.abs(b.vx)-1.0;
          if (m===dxR) b.vx =  Math.abs(b.vx)+1.0;
          if (m===dyT) b.vy = -Math.abs(b.vy)-1.0;
          if (m===dyB) b.vy =  Math.abs(b.vy)+1.0;
        }

        // time & base waves
        b.t += 0.15;
        const waveX = Math.sin(b.t * 0.8) * 0.4;
        const waveY = Math.cos(b.t * 0.6) * 0.3;

        if (S.mouse.magnetOn) {
          // ----- حالت جذب (بیرون کارت) -----
          const dx = (S.mouse.x - b.x);
          const dy = (S.mouse.y - b.y);
          const dist = Math.hypot(dx, dy) + 1e-3;
          const pull = MAG_FORCE * Math.min(1.0, 140 / dist);
          b.vx += (dx / dist) * pull + (Math.random()*2-1)*MAG_RANDOM_JIT;
          b.vy += (dy / dist) * pull + (Math.random()*2-1)*MAG_RANDOM_JIT;

          // کمی موج همزمان
          b.vx += waveX * 0.04;
          b.vy += waveY * 0.04;

          // میرایی و محدودیت مخصوص جذب
          b.vx *= DAMPING_MAG; b.vy *= DAMPING_MAG;

          const spMag = Math.hypot(b.vx,b.vy);
          if (spMag > MAX_MAG_SPEED) {
            b.vx = b.vx / spMag * MAX_MAG_SPEED;
            b.vy = b.vy / spMag * MAX_MAG_SPEED;
          }

          // گردباد خیلی خفیف
          if (spMag > 0.01) {
            const swirl = 0.03;
            const px = b.vx, py = b.vy;
            b.vx = px * (1 - swirl) - py * swirl;
            b.vy = py * (1 - swirl) + px * swirl;
          }

        } else {
          // ----- حالت پرواز عادی (داخل کارت) — دقیقاً مثل کد اصلی -----
          b.vx += waveX * 0.08 + (Math.random()*2-1)*0.01;
          b.vy += waveY * 0.08 + (Math.random()*2-1)*0.01;
          b.vx *= 10.96; b.vy *= 10.96;     // انرژی‌دهی نسخهٔ اصلی
          const spFree = Math.hypot(b.vx,b.vy);
          if (spFree > MAX_FREE_SPEED) {     // همان لیمیت 0.9
            b.vx = b.vx / spFree * MAX_FREE_SPEED;
            b.vy = b.vy / spFree * MAX_FREE_SPEED;
          }
        }

        // integrate + bounds
        b.x += b.vx; b.y += b.vy;
        if (b.x < -60) b.x = S.w+60;
        if (b.x > S.w+60) b.x = -60;
        if (b.y < S.h*0.06){ b.y=S.h*0.06; b.vy*=-0.3; }
        if (b.y > S.h*0.96){ b.y=S.h*0.96; b.vy*=-0.3; }

        // orientation + wings
        b.a = Math.atan2(b.vy,b.vx);
        const wingFreq = S.mouse.magnetOn ? 1.8 : 1.2;
        const wingAmp  = S.mouse.magnetOn ? 0.32 : 0.25;
        const wing = 0.7 + wingAmp*Math.sin(b.t*wingFreq);
        const sz = 6.0*b.size;

        // colors
        let L0, L1, R0, R1, BODY;
        switch (b.type) {
          case 1:
            L0 = "rgba(255,240,200,0.92)";
            L1 = "rgba(255,185,135,0.48)";
            R0 = "rgba(255,235,210,0.92)";
            R1 = "rgba(255,200,160,0.48)";
            BODY = "rgba(255,236,200,0.65)";
            break;
          case 2:
            L0 = "rgba(255,250,190,0.92)";
            L1 = "rgba(255,180,100,0.50)";
            R0 = "rgba(255,240,170,0.92)";
            R1 = "rgba(255,140,110,0.50)";
            BODY = "rgba(255,230,170,0.66)";
            break;
          case 3:
            L0 = "rgba(200,230,255,0.92)";
            L1 = "rgba(150,200,255,0.48)";
            R0 = "rgba(255,235,180,0.92)";
            R1 = "rgba(255,210,120,0.46)";
            BODY = "rgba(230,245,255,0.62)";
            break;
          default:
            L0 = "rgba(255,245,255,0.90)";
            L1 = "rgba(220,200,255,0.45)";
            R0 = "rgba(240,255,245,0.90)";
            R1 = "rgba(200,255,230,0.45)";
            BODY = "rgba(255,255,240,0.60)";
        }

        ctx.save();
        ctx.translate(b.x,b.y);
        ctx.rotate(b.a);
        ctx.globalCompositeOperation = "lighter";

        // left wing
        const gL = ctx.createRadialGradient(-sz,0,0, -sz,0, sz*1.6);
        gL.addColorStop(0, L0);
        gL.addColorStop(0.6, L1);
        gL.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gL;
        ctx.beginPath(); ctx.ellipse(-sz,0, sz*1.3, sz*0.8*wing, 0,0,6.283); ctx.fill();

        // right wing
        const gR = ctx.createRadialGradient( sz,0,0,  sz,0, sz*1.6);
        gR.addColorStop(0, R0);
        gR.addColorStop(0.6, R1);
        gR.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gR;
        ctx.beginPath(); ctx.ellipse(sz,0, sz*1.3, sz*0.8*wing, 0,0,6.283); ctx.fill();

        // body
        ctx.fillStyle = BODY;
        ctx.fillRect(-1.2,-3,2.4,6);

        ctx.restore();
      }

      S.raf = requestAnimationFrame(draw);
    };

    draw();
    const mo = new MutationObserver(readCards);
    mo.observe(document.body, { childList:true, subtree:true, attributes:true });

    return () => {
      cancelAnimationFrame(S.raf);
      removeEventListener("resize", resize);
      removeEventListener("mousemove", handleMove);
      removeEventListener("mouseleave", handleLeave);
      mo.disconnect();
    };
  }, [activeFairy]);

  return ref;
}

/* ================= Stage ================= */
export default function FairyStage({ dark }) {
  const [ok, setOk] = useState(false);
  const glRef = useRef(null);
  const spritesRef = useOverlaySpritesFairy({ activeFairy: true });

  // Apply theme font globally while Fairy is active
  useEffect(() => {
    const prev = document.body.style.fontFamily;
    document.body.style.fontFamily = '"Quicksand", "Comfortaa", sans-serif';
    return () => { document.body.style.fontFamily = prev; };
  }, []);

  const reduceRef = usePrefersReducedMotion();

  useEffect(() => {
    const cvs = glRef.current; if (!cvs) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      cvs.width  = Math.floor(innerWidth*dpr);
      cvs.height = Math.floor(innerHeight*dpr);
      cvs.style.width  = innerWidth+"px";
      cvs.style.height = innerHeight+"px";
    };
    resize(); addEventListener("resize", resize);

    const gl = cvs.getContext("webgl", { alpha:true, antialias:true, premultipliedAlpha:true });
    if (!gl) { setOk(false); return () => removeEventListener("resize", resize); }

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(sh));
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);

    let fragOK = gl.getShaderParameter(fs, gl.COMPILE_STATUS);
    let prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    let linkOK = gl.getProgramParameter(prog, gl.LINK_STATUS);

    if (!fragOK || !linkOK) {
      const SAFE_FRAG = `
        precision mediump float;
        varying vec2 vUv;
        void main(){
          vec3 top = vec3(0.9,1.0,0.96);
          vec3 bot = vec3(0.74,0.93,0.86);
          vec3 col = mix(top,bot,vUv.y);
          gl_FragColor = vec4(col,1.0);
        }
      `;
      const fs2 = compile(gl.FRAGMENT_SHADER, SAFE_FRAG);
      prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs2);
      gl.linkProgram(prog);
      linkOK = gl.getProgramParameter(prog, gl.LINK_STATUS);
    }

    if (!linkOK) { setOk(false); return () => removeEventListener("resize", resize); }

    document.documentElement.classList.add("stage-on");
    setOk(true);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1,-1,  1,-1, -1, 1,
      -1, 1,  1,-1,  1, 1
    ]), gl.STATIC_DRAW);

    const aPos  = gl.getAttribLocation(prog, "aPos");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uRes  = gl.getUniformLocation(prog, "uResolution");
    const uDark = gl.getUniformLocation(prog, "uDark");
    const uMot  = gl.getUniformLocation(prog, "uMotion");

    let raf=0, start=performance.now();
    const draw=()=>{
      const t=(performance.now()-start)/1000;
      gl.viewport(0,0,cvs.width,cvs.height);
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      if (uTime) gl.uniform1f(uTime, t);
      if (uRes)  gl.uniform2f(uRes, cvs.width, cvs.height);
      if (uDark) gl.uniform1f(uDark, dark?1.0:0.0);
      if (uMot)  gl.uniform1f(uMot, reduceRef.current?0.0:1.0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf=requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      document.documentElement.classList.remove("stage-on");
      gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs);
    };
  }, [dark]);

  return (
    <>
      {/* WebGL aurora background */}
      <canvas
        ref={glRef}
        aria-hidden
        style={{ position:"fixed", inset:0, zIndex:-1, pointerEvents:"none", background:"transparent" }}
      />
      {/* 2D overlay butterflies/orbs */}
      <canvas
        ref={spritesRef}
        aria-hidden
        style={{ position:"fixed", inset:0, zIndex:-1, pointerEvents:"none" }}
      />
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&family=Comfortaa:wght@300;400;500;600;700&display=swap');
        
        :root[data-skin="fairy"] body,
        :root[data-skin="fairy"] .app-root,
        :root[data-skin="fairy"] .card,
        :root[data-skin="fairy"] button,
        :root[data-skin="fairy"] input,
        :root[data-skin="fairy"] textarea,
        :root[data-skin="fairy"] select {
          font-family: "Quicksand", "Comfortaa", sans-serif !important;
          letter-spacing: 0.3px;
        }
      `}</style>
    </>
  );
}
