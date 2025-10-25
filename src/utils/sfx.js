// src/utils/sfx.js
let audioCtx = null;

function getCtx() {
  const Ctx = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
  if (!Ctx) return null;
  if (audioCtx) return audioCtx;
  audioCtx = new Ctx();
  return audioCtx;
}

export function sfxArp() {
  try {
    const ctx = getCtx(); if (!ctx) return;
    const nowT = ctx.currentTime;
    const notes = [880, 1174, 1568];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, nowT + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.2, nowT + i * 0.06 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, nowT + i * 0.06 + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(nowT + i * 0.06);
      o.stop(nowT + i * 0.06 + 0.2);
    });
  } catch {}
}

export function sfxCoin() {
  try {
    const ctx = getCtx(); if (!ctx) return;
    const nowT = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(800, nowT);
    o.frequency.exponentialRampToValueAtTime(1600, nowT + 0.08);
    g.gain.setValueAtTime(0.0001, nowT);
    g.gain.exponentialRampToValueAtTime(0.25, nowT + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, nowT + 0.18);
    o.connect(g).connect(ctx.destination);
    o.start(nowT);
    o.stop(nowT + 0.2);
  } catch {}
}

export function sfxChime() {
  try {
    const ctx = getCtx(); if (!ctx) return;
    const nowT = ctx.currentTime;
    const makeBell = (f, delay, dur = 0.5) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, nowT + delay);
      g.gain.exponentialRampToValueAtTime(0.18, nowT + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, nowT + delay + dur);
      o.connect(g).connect(ctx.destination);
      o.start(nowT + delay);
      o.stop(nowT + delay + dur + 0.02);
    };
    makeBell(1200, 0.00, 0.42);
    makeBell(1800, 0.09, 0.38);
  } catch {}
}

export function playRandomSfx() {
  const pick = Math.random();
  if (pick < 0.34) sfxCoin(); else if (pick < 0.67) sfxChime(); else sfxArp();
}

