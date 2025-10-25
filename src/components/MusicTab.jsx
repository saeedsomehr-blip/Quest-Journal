// src/tabs/MusicTab.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useMusic } from "../ctx/MusicContext";
import { addLinkToQueue } from "./GlobalPlayer";

export default function MusicTab({ level = 1 }) {
  const m = useMusic();
  const [link, setLink] = useState("");
  const [dragIdx, setDragIdx] = useState(null);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  // Playlists data
  const toLearn = [
    { id: "learn_1", title: "Dark Academia Radio", url: "https://www.youtube.com/watch?v=NMu6PjdTIgk", unlockAt: 2 },
    { id: "learn_2", title: "A Haunted Library", url: "https://youtu.be/3VJrQoXEtAk?list=RD3VJrQoXEtAk", unlockAt: 5 },
    { id: "learn_3", title: "romanticizing studying", url: "https://youtu.be/7kjeoOey2NI", unlockAt: 10 },
    { id: "learn_4", title: "Mystic Chants", url: "https://www.youtube.com/watch?v=P7zcsINktYs", unlockAt: 15 },
  ];
  const toRest = [
    { id: "rest_1", title: "dreamy Afternoon", url: "https://youtu.be/MWPYhebILb4", unlockAt: 1 },
    { id: "rest_2", title: "You need to rest", url: "https://youtu.be/OIuoF9Vw1yY", unlockAt: 3 },
    { id: "rest_3", title: "A quiet midnight", url: "https://youtu.be/m0Tve24ezNQ?list=RDm0Tve24ezNQ", unlockAt: 6 },
    { id: "rest_4", title: "Passing storm", url: "https://youtu.be/Abm_cwj-c9M", unlockAt: 10 },
    { id: "rest_5", title: "Yoga Nidra", url: "https://youtu.be/8mM5Oks8yZc", unlockAt: 15 },
  ];
  const toMotivate = [
    { id: "mot_1", title: "High Voltage", url: "https://youtu.be/WYFDvHyIqz0", unlockAt: 1 },
    { id: "mot_2", title: "finishing that one essay at 11:59 pm", url: "https://youtu.be/vYsIs1kwJ0E", unlockAt: 4 },
    { id: "mot_3", title: "keeping you awake", url: "https://youtu.be/CdbHAzNB1n0?list=RDCdbHAzNB1n0", unlockAt: 9 },
    { id: "mot_4", title: "Classical lo-fi", url: "https://youtu.be/ag7mdF9qEns?list=RDag7mdF9qEns", unlockAt: 15 },
  ];
  const toMove = [
    { id: "move_1", title: "Insanity", url: "https://youtu.be/fsvTquTxjU0?list=RDfsvTquTxjU0", unlockAt: 2 },
    { id: "move_2", title: "Bedroom mix!", url: "https://youtu.be/0k-pgwM17bA", unlockAt: 6 },
    { id: "move_3", title: "1999 Tokyo", url: "https://youtu.be/Li7O2uIxyq8?list=RDLi7O2uIxyq8", unlockAt: 10 },
  ];

  const sections = useMemo(() => ([
    { name: "To Learn", items: toLearn },
    { name: "To Rest", items: toRest },
    { name: "To Motivate", items: toMotivate },
    { name: "To Move", items: toMove },
    { name: "lectures to calibrate your mind", items: [] },
  ]), []);

  // Per-section open/close
  const [openSections, setOpenSections] = useState(() => ({
    "To Learn": true,
    "To Rest": true,
    "To Motivate": true,
    "To Move": true,
    "lectures to calibrate your mind": true,
  }));

  const allItems = useMemo(() => ([
    ...toLearn.map((x) => ({ ...x, cat: "To Learn" })),
    ...toRest.map((x) => ({ ...x, cat: "To Rest" })),
    ...toMotivate.map((x) => ({ ...x, cat: "To Motivate" })),
    ...toMove.map((x) => ({ ...x, cat: "To Move" })),
  ]), []);

  // Sequential encouragement toasts
  useEffect(() => {
    try {
      const LS = "qj_music_toast_seen_v1";
      const seen = new Set(JSON.parse(localStorage.getItem(LS) || "[]"));
      const newly = allItems.filter((it) => level >= (it.unlockAt || 1) && !seen.has(it.id));
      if (!newly.length) return;
      let i = 0;
      const next = () => {
        if (i >= newly.length) {
          localStorage.setItem(LS, JSON.stringify(Array.from(new Set([...seen, ...newly.map((n) => n.id)]))));
          setToast(null);
          return;
        }
        const it = newly[i++];
        setToast(`Unlocked: ${it.cat} - ${it.title}`);
        setTimeout(next, 2200);
      };
      next();
    } catch {}
  }, [level, allItems]);

  function onAddLink() {
    const raw = (link || "").trim();
    if (!raw) return;
    const ok = addLinkToQueue(raw, m);
    if (!ok) alert("Unsupported/invalid link.");
    else setLink("");
  }

  function onPickFiles(e) {
    const files = e.target.files;
    if (files?.length) m.addFiles(files);
    e.target.value = "";
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Tavern 🍻</h2>

      {/* ریسپانسیو: دیگه اندازهٔ ستون‌ها ثابت نیست */}
      <div className="tavern-grid">
        {/* Left: Daily Book */}
        <aside className="sf-card" style={{ minHeight: 220 }}>
          <h3 style={{ marginTop: 0 }}>📖 Daily Book</h3>
          <div className="hint" style={{ marginTop: 6 }}>coming soon</div>
        </aside>

        {/* Center: queue & inputs */}
        <section>
          <section style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Queue</h3>
            <ul style={{ marginTop: 8, paddingLeft: 0 }}>
              {m.queue.length === 0 && <div className="hint">Empty queue.</div>}
              {m.queue.map((it, i) => (
                <li
                  key={it.id}
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIdx != null && dragIdx !== i) m.reorder(dragIdx, i);
                    setDragIdx(null);
                  }}
                  onDragEnd={() => setDragIdx(null)}
                  style={{
                    listStyle: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                    border: dragIdx === i ? "1px dashed var(--border)" : "1px solid transparent",
                    borderRadius: 6,
                    padding: 4,
                  }}
                >
                  <button className="btn" onClick={() => m.jump(i)} style={{ padding: "4px 8px" }}>
                    {i === m.index ? "▶" : i + 1}
                  </button>
                  <span style={{ fontSize: 14, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {it.title} <span className="hint">({it.type})</span>
                  </span>
                  <button className="btn" onClick={() => m.removeAt(i)}>✕</button>
                </li>
              ))}
            </ul>
          </section>

          <section style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                style={{ flex: 1, minWidth: 260 }}
                placeholder="Paste link (YouTube, Spotify, SoundCloud)."
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAddLink()}
              />
              <button className="btn" onClick={onAddLink}>Add link</button>
            </div>

            <div style={{ paddingTop: 10 }}>
              <label className="hint">Add local audio files</label>
              <br />
              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={onPickFiles}
                style={{ display: "none" }}
              />
              <button
                className="btn"
                onClick={() => fileRef.current?.click()}
                style={{ padding: "4px 8px", fontSize: "14px", marginTop: 10 }}
              >
                Choose Files
              </button>
              <div className="hint" style={{ marginTop: 6 }}>Local files persist for this session.</div>
            </div>
          </section>
        </section>

        {/* Right: curated playlists */}
        <aside className="sf-card" style={{ minHeight: 220 }}>
          <h3 style={{ marginTop: 0 }}>Playlists</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {sections.map((sec) => (
              <section key={sec.name}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div className="xp-name" style={{ fontWeight: 700 }}>{sec.name}</div>
                  <button
                    className="icon-btn sm"
                    title={openSections[sec.name] ? "Collapse" : "Expand"}
                    onClick={() => setOpenSections((s) => ({ ...s, [sec.name]: !s[sec.name] }))}
                    aria-label={openSections[sec.name] ? "Collapse section" : "Expand section"}
                  >
                    {openSections[sec.name] ? "v" : ">"}
                  </button>
                </div>
                {openSections[sec.name] && (sec.items.length === 0 ? (
                  <div className="hint">Coming soon</div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {sec.items.map((pl) => {
                      const locked = (level || 1) < (pl.unlockAt || 1);
                      return (
                        <div
                          key={pl.id}
                          onClick={() => { if (!locked) addLinkToQueue(pl.url, m, pl.title); }}
                          role="button"
                          aria-disabled={locked}
                          title={locked ? `Unlocks at Lv ${pl.unlockAt}` : `Add to queue`}
                          style={{
                            position: "relative",
                            padding: "10px 12px",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            background: "var(--card)",
                            cursor: locked ? "not-allowed" : "pointer",
                            opacity: locked ? 0.6 : 1,
                            overflow: "hidden",
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{pl.title}</div>
                          <div className="hint" style={{ fontSize: 12 }}>{locked ? `Requires Lv ${pl.unlockAt}` : "Click to add to queue"}</div>
                          {locked && (
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(to bottom right, rgba(0,0,0,0.25), rgba(0,0,0,0.15))", color: "var(--muted)", fontWeight: 700 }}>
                              🔒 Lv {pl.unlockAt}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </section>
            ))}
          </div>
        </aside>
      </div>

      {/* Toast */}
      {toast && (
        <>
          <style>{`
            @keyframes toast-in {
              0%   { opacity: 0; transform: translateY(12px) scale(.98); }
              60%  { opacity: 1; transform: translateY(0) scale(1); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes toast-out {
              0%   { opacity: 1; transform: translateY(0) scale(1); }
              100% { opacity: 0; transform: translateY(6px) scale(.995); }
            }
            .music-toast-shell {
              position: fixed;
              inset-inline: 0;
              bottom: 20px;
              display: flex;
              justify-content: center;
              pointer-events: none;
              z-index: 1000;
            }
            .music-toast-card {
              direction: rtl;
              display: inline-flex;
              align-items: center;
              gap: 10px;
              padding: 12px 16px;
              border-radius: 12px;
              backdrop-filter: blur(8px);
              background:
                radial-gradient(120% 140% at 50% 0%, rgba(255,255,255,.18), rgba(255,255,255,.10)),
                linear-gradient(180deg, rgba(22,25,34,.90), rgba(22,25,34,.86));
              color: #fff;
              border: 1px solid rgba(255,255,255,.16);
              box-shadow:
                0 10px 30px rgba(0,0,0,.35),
                inset 0 0 0 1px rgba(255,255,255,.06);
              font-size: 14px;
              line-height: 1.6;
              pointer-events: auto;
              max-width: min(92vw, 520px);
              white-space: pre-wrap;
              overflow-wrap: anywhere;
              animation: toast-in .26s ease-out, toast-out .28s ease-in both;
              animation-delay: 0s, 1.95s;
            }
            .music-toast-icon {
              width: 26px; height: 26px;
              display: inline-grid; place-items: center;
              border-radius: 999px;
              background: rgba(255,255,255,.12);
              border: 1px solid rgba(255,255,255,.16);
              box-shadow: inset 0 0 12px rgba(255,255,255,.08);
              font-size: 14px;
              flex: 0 0 auto;
            }
          `}</style>

          <div className="music-toast-shell" aria-live="polite" aria-atomic="true">
            <div className="music-toast-card" role="status">
              <span className="music-toast-icon" aria-hidden>🔓</span>
              <span>{toast}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
