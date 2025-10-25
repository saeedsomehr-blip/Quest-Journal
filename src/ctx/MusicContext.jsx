import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

// آیتم صف: { id, type: "yt" | "spotify" | "soundcloud" | "ext" | "file", title, src }
const MusicCtx = createContext(null);

/** Safe UUID generator:
 * 1) crypto.randomUUID (اگر بود)
 * 2) v4 با getRandomValues
 * 3) fallback ساده با Date.now + Math.random
 */
function safeUUID() {
  // 1) استاندارد
  try {
    const g = globalThis?.crypto;
    if (g && typeof g.randomUUID === "function") return g.randomUUID();
  } catch {}

  // 2) v4 دستی با getRandomValues
  try {
    const g = globalThis?.crypto;
    if (g?.getRandomValues) {
      const bytes = new Uint8Array(16);
      g.getRandomValues(bytes);
      // RFC4122 v4 bits
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    }
  } catch {}

  // 3) fallback نهایی (برای محیط‌های خیلی محدود)
  const t = Date.now().toString(16);
  const r = Math.random().toString(16).slice(2);
  return `${t}-${r.slice(0,4)}-${r.slice(4,8)}-${r.slice(8,12)}-${r.slice(12,20)}`;
}

export function MusicProvider({ children }) {
  const [queue, setQueue] = useState(() => {
    try { return JSON.parse(localStorage.getItem("qj_music_queue") || "[]"); } catch { return []; }
  });
  const [index, setIndex] = useState(() => {
    try { return Number(localStorage.getItem("qj_music_index") || 0); } catch { return 0; }
  });
  const [volume, setVolumeState] = useState(() => {
    try { return Number(localStorage.getItem("qj_music_vol") || 0.9); } catch { return 0.9; }
  });
  const [muted, setMutedState] = useState(() => {
    try { return localStorage.getItem("qj_music_muted") === "1"; } catch { return false; }
  });
  const [playing, setPlaying] = useState(true);

  const fileURLBag = useRef(new Map()); // ObjectURL برای فایل‌های محلی

  useEffect(() => { localStorage.setItem("qj_music_queue", JSON.stringify(queue)); }, [queue]);
  useEffect(() => { localStorage.setItem("qj_music_index", String(index)); }, [index]);
  useEffect(() => { localStorage.setItem("qj_music_vol", String(volume)); }, [volume]);
  useEffect(() => { localStorage.setItem("qj_music_muted", muted ? "1" : "0"); }, [muted]);

  useEffect(() => () => {
    for (const u of fileURLBag.current.values()) URL.revokeObjectURL(u);
    fileURLBag.current.clear();
  }, []);

  const current = queue[index] || null;

  const api = useMemo(() => ({
    queue, index, current, playing, volume, muted,

    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    toggle: () => setPlaying(p => !p),

    setVolume: (v) => setVolumeState(Math.max(0, Math.min(1, v))),
    setMuted: (b) => setMutedState(!!b),

    next: () => setIndex(i => (queue.length ? (i + 1) % queue.length : 0)),
    prev: () => setIndex(i => (queue.length ? (i - 1 + queue.length) % queue.length : 0)),
    jump: (i) => setIndex(() => (i >= 0 && i < queue.length ? i : 0)),

    clear: () => setQueue([]),

    reorder: (from, to) => {
      setQueue(q => {
        const src = Math.max(0, Math.min(q.length - 1, from|0));
        const dst = Math.max(0, Math.min(q.length - 1, to|0));
        if (!q.length || src === dst) return q;
        const copy = q.slice();
        const [item] = copy.splice(src, 1);
        copy.splice(dst, 0, item);
        setIndex(i => {
          if (i === src) return dst;
          if (src < i && i <= dst) return i - 1;
          if (dst <= i && i < src) return i + 1;
          return i;
        });
        return copy;
      });
    },

    addYouTube: (raw, embed, prettyTitle) => {
      const id = safeUUID();
      const title = prettyTitle || "YouTube Track";
      setQueue(q => [...q, { id, type: "yt", title, src: embed }]);
      return id;
    },

    addEmbed: (raw, embed, prettyTitle, provider = "ext") => {
      const id = safeUUID();
      let title = prettyTitle || "Track";
      try { title = title.replace(/^www\./, ""); } catch {}
      setQueue(q => [...q, { id, type: provider, title, src: embed }]);
      return id;
    },

    addFiles: (files) => {
      const items = Array.from(files || []).map(f => {
        const id = safeUUID();
        const url = URL.createObjectURL(f);
        fileURLBag.current.set(id, url);
        return { id, type: "file", title: f.name, src: url };
      });
      setQueue(q => [...q, ...items]);
    },

    removeAt: (i) => {
      setQueue(q => {
        const item = q[i];
        if (item?.type === "file") {
          const u = fileURLBag.current.get(item.id);
          if (u) { URL.revokeObjectURL(u); fileURLBag.current.delete(item.id); }
        }
        const copy = q.slice();
        copy.splice(i, 1);
        if (i < index) setIndex(idx => Math.max(0, idx - 1));
        if (i === index) setIndex(0);
        return copy;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [queue, index, current, playing, volume, muted]);

  return <MusicCtx.Provider value={api}>{children}</MusicCtx.Provider>;
}

export function useMusic() {
  const ctx = useContext(MusicCtx);
  if (!ctx) throw new Error("useMusic must be used within MusicProvider");
  return ctx;
}
