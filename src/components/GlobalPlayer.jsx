// src/components/GlobalPlayer.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useMusic } from "../ctx/MusicContext";

function normalizeYouTube(url) {
  try {
    if (typeof url === "string") url = url.replace("yout0.be", "youtu.be"); // تایپوهای رایج
    const u = new URL(url);
    const origin =
      typeof window !== "undefined" && window.location && window.location.origin
        ? window.location.origin
        : "";
    const baseVideo = "https://www.youtube.com/embed/";
    const baseList = "https://www.youtube.com/embed/videoseries";
    const qs = (params) => {
      const sp = new URLSearchParams({ autoplay: "1", enablejsapi: "1" });
      if (origin) sp.set("origin", origin);
      for (const [k, v] of Object.entries(params || {})) if (v != null) sp.set(k, String(v));
      return `?${sp.toString()}`;
    };

    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch" && u.searchParams.get("v")) {
        const id = u.searchParams.get("v");
        return `${baseVideo}${id}${qs()}`;
      }
      if (u.pathname === "/playlist" && u.searchParams.get("list")) {
        const list = u.searchParams.get("list");
        return `${baseList}${qs({ list })}`;
      }
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return `${baseVideo}${id}${qs()}`;
    }
  } catch {}
  return null;
}

export function addYouTubeToQueue(rawUrl, ctx, title) {
  const embed = normalizeYouTube(rawUrl);
  if (!embed) return false;
  ctx.addYouTube(rawUrl, embed, title);
  // تضمین: بلافاصله پخش را روشن کن تا پلیر روی موبایل ظاهر شود
  if (typeof ctx.play === "function") ctx.play();
  return true;
}

// Normalize Spotify links to embed
function normalizeSpotify(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("open.spotify.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean); // [type,id]
    if (parts.length < 2) return null;
    const type = parts[0];
    const id = parts[1];
    if (!id) return null;
    return `https://open.spotify.com/embed/${type}/${id}`;
  } catch {
    return null;
  }
}

// Normalize SoundCloud links to embed
function normalizeSoundCloud(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("soundcloud.com")) return null;
    const esc = encodeURIComponent(url);
    return `https://w.soundcloud.com/player/?url=${esc}&auto_play=true`;
  } catch {
    return null;
  }
}

// Try all known providers
function normalizeExternal(url) {
  return normalizeYouTube(url) || normalizeSpotify(url) || normalizeSoundCloud(url) || null;
}

// Add any supported link (YouTube, Spotify, SoundCloud) to queue
export function addLinkToQueue(rawUrl, ctx, title) {
  const embed = normalizeExternal(rawUrl);
  if (!embed) return false;
  // detect provider for labeling
  let provider = "ext";
  try {
    const h = new URL(rawUrl).hostname;
    if (h.includes("youtu")) provider = "yt";
    else if (h.includes("spotify")) provider = "spotify";
    else if (h.includes("soundcloud")) provider = "soundcloud";
  } catch {}
  ctx.addEmbed(rawUrl, embed, title, provider);
  // بلافاصله پخش را روشن کن تا پلیر روی موبایل نمایش داده شود
  if (typeof ctx.play === "function") ctx.play();
  return true;
}

export default function GlobalPlayer() {
  const m = useMusic();
  const audioRef = useRef(null);
  const iframeRef = useRef(null);
  const progRef = useRef(null);
  const [time, setTime] = useState({ cur: 0, dur: 0 });

  const current = m.current;
  const isFile = current?.type === "file";
  // تشخیص ساده برای یوتیوب: هم با type=yt و هم URL embed
  const isYouTube = useMemo(() => {
    if (!current?.src) return false;
    if (current?.type === "yt") return true;
    try {
      const u = new URL(current.src);
      return u.hostname.includes("youtube.com");
    } catch {
      return false;
    }
  }, [current]);

  // ——— وقتی صف از خالی → غیرخالی شد: اگر ترک فعالی نداریم، بپر روی 0 و play کن
  const prevLen = useRef(m.queue.length);
  useEffect(() => {
    if (prevLen.current === 0 && m.queue.length > 0) {
      if (!m.current && typeof m.jump === "function") m.jump(0);
      if (typeof m.play === "function") m.play();
    }
    prevLen.current = m.queue.length;
  }, [m.queue.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ————————————————— volume sync
  useEffect(() => {
    if (isFile && audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, m.volume ?? 1));
      return;
    }
    if (isYouTube && iframeRef.current && typeof m.volume === "number") {
      const vol = Math.round(Math.max(0, Math.min(1, m.volume)) * 100); // 0..100
      try {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "setVolume", args: [vol] }),
          "*"
        );
      } catch {}
    }
  }, [m.volume, isFile, isYouTube]);

  // ————————————————— play/pause sync
  useEffect(() => {
    if (!current) return;
    if (isFile && audioRef.current) {
      if (m.playing) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
      return;
    }
    if (isYouTube && iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({
            event: "command",
            func: m.playing ? "playVideo" : "pauseVideo",
            args: [],
          }),
          "*"
        );
      } catch {}
    }
  }, [current, m.playing, isFile, isYouTube]);

  // وقتی ترک یوتیوب عوض شد، کمی صبر کن تا پلیر init بشه و ولوم/پلی ست شود
  useEffect(() => {
    if (!isYouTube || !current) return;
    const t = setTimeout(() => {
      if (!iframeRef.current) return;
      const vol = Math.round(Math.max(0, Math.min(1, m.volume ?? 1)) * 100);
      try {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "setVolume", args: [vol] }),
          "*"
        );
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({
            event: "command",
            func: m.playing ? "playVideo" : "pauseVideo",
            args: [],
          }),
          "*"
        );
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [current?.id, isYouTube]); // یا current.src اگر id ندارید

  // ————————————————— فایل‌های محلی: sync time/progress
  useEffect(() => {
    if (!isFile || !audioRef.current) return;
    const a = audioRef.current;
    const onTime = () => setTime({ cur: a.currentTime || 0, dur: a.duration || 0 });
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onTime);
    a.addEventListener("ended", onTime);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onTime);
      a.removeEventListener("ended", onTime);
    };
  }, [isFile, current]);

  function fmt(s) {
    if (!Number.isFinite(s)) return "0:00";
    const mnt = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${mnt}:${String(sec).padStart(2, "0")}`;
  }

  // رندر: ریشهٔ پلیر همیشه کلاس/اتریبیوت playing را بر اساس m.playing می‌گیرد
  if (!current) {
    return (
      <div
        className={`global-player ${m.playing ? "is-playing" : ""}`}
        data-playing={m.playing ? "true" : undefined}
      >
        <div className="gp-title">No track</div>
        <div className="gp-controls">
          <button className="btn" disabled>⏮</button>
          <button className="btn" disabled>▶</button>
          <button className="btn" disabled>⏭</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`global-player ${m.playing ? "is-playing" : ""}`}
      data-playing={m.playing ? "true" : undefined}
    >
      <div className="gp-title" title={current.title}>
        {current.title}
      </div>

      <div className="gp-controls">
        <button className="btn" onClick={m.prev}>⏮</button>
        <button className="btn" onClick={m.toggle}>{m.playing ? "⏸" : "▶"}</button>
        <button className="btn" onClick={m.next}>⏭</button>
      </div>

      <div className="gp-vol">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={m.volume}
          onChange={(e) => m.setVolume(parseFloat(e.target.value || "0"))}
        />
      </div>

      <div className="gp-view">
        {isFile ? (
          <>
            <audio ref={audioRef} src={current.src} autoPlay onEnded={m.next} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 220 }}>
              <input
                ref={progRef}
                type="range"
                min={0}
                max={Math.max(0, time.dur || 0)}
                step={1}
                value={Math.min(time.cur || 0, time.dur || 0)}
                onChange={(e) => {
                  const a = audioRef.current;
                  if (a) a.currentTime = parseFloat(e.target.value) || 0;
                }}
                style={{ flex: 1 }}
              />
              <div className="hint" style={{ minWidth: 80, textAlign: "right" }}>
                {fmt(time.cur)} / {fmt(time.dur)}
              </div>
            </div>
          </>
        ) : (
          <iframe
            ref={iframeRef}
            title="embedded-player"
            src={current.src}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}
      </div>
    </div>
  );
}
