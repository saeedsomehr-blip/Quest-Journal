import React, { useEffect, useMemo, useRef, useState } from "react";
import { todayStr } from "../core/challenges.js";
import { generateSketch } from "../utils/ai.js";
import { loadEntry, saveEntry, listRecent, getImageURL, saveImageDataURL } from "../utils/journalStore.js";
import { buildSketchPrompt } from "../utils/sketchPrompt.js";

const MAX_CHARS = 1200;

function ymd(dateISO) { return (dateISO || todayStr()); }
function addDays(iso, delta) {
  const d = new Date(iso || new Date().toISOString());
  d.setDate(d.getDate() + delta);
  return d.toISOString();
}
function idOf(iso) { return (iso || "").slice(0,10).replaceAll("-",""); } // yyyymmdd

export default function JournalTab() {
  const [dateISO, setDateISO] = useState(new Date().toISOString());
  const [text, setText] = useState("");
  const [status, setStatus] = useState("idle"); // idle | saving | generating | error
  const [imgUrl, setImgUrl] = useState(null);
  const [meta, setMeta] = useState({ provider:null, model:null, seed:null });

  const curId = useMemo(()=> idOf(dateISO), [dateISO]);
  const charsLeft = MAX_CHARS - (text?.length || 0);
  const overLimit = charsLeft < 0;

  useEffect(() => {
    let mounted = true;
    (async () => {
      const e = loadEntry(curId);
      if (!mounted) return;
      setText(e?.text || "");
      setMeta(e?.sketch?.meta || {});
      const u = await getImageURL(curId).catch(()=>null);
      if (!mounted) return;
      setImgUrl(u);
    })();
    return () => { mounted = false; };
  }, [curId]);

  async function doSave() {
    if (overLimit) return;
    setStatus("saving");
    const now = new Date().toISOString();
    const entry = {
      id: curId,
      dateISO: ymd(dateISO),
      text: (text || "").slice(0, MAX_CHARS),
      sketch: {
        status: imgUrl ? "ready" : "none",
        meta,
      },
      meta: { createdAt: loadEntry(curId)?.meta?.createdAt || now, updatedAt: now },
    };
    saveEntry(entry);
    setStatus("idle");
  }

  async function doGenerate(regen=false) {
    try {
      if ((text || "").trim().length < 12) {
        alert("Write a few lines first (≥12 chars).");
        return;
      }
      setStatus("generating");
      const prompt = await buildSketchPrompt(text);
      const resp = await generateSketch(prompt, {
        size: "512x512",
        negative_prompt: "text, letters, words, typography, watermark, logos, identifiable faces, photo-real face",
      });
      await saveImageDataURL(curId, resp.image);
      setImgUrl(resp.image);
      const now = new Date().toISOString();
      const existing = loadEntry(curId) || { id: curId, dateISO: ymd(dateISO), text: text.slice(0,MAX_CHARS) };
      const entry = {
        ...existing,
        text: (regen ? existing.text : text).slice(0, MAX_CHARS),
        sketch: { status: "ready", meta: { provider: resp.provider, model: resp.model, seed: resp.seed } },
        meta: { createdAt: existing?.meta?.createdAt || now, updatedAt: now },
      };
      saveEntry(entry);
      setMeta(entry.sketch.meta);
      setStatus("idle");
    } catch (e) {
      console.error(e);
      setStatus("error");
      alert("Image generation failed: " + (e.message || e));
      setStatus("idle");
    }
  }

  async function download() {
    if (!imgUrl) return;
    const a = document.createElement("a");
    a.href = imgUrl;
    a.download = `journal_${curId}.jpg`;
    a.click();
  }

  const recent = useMemo(()=> listRecent(10), [dateISO]);

  return (
    <div className="card" style={{ display:"grid", gap:12 }}>
      {/* Header */}
      <div className="row-sb" style={{ alignItems:"center" }}>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button className="btn" onClick={()=>setDateISO(addDays(dateISO, -1))}>◀︎</button>
          <h3 style={{ margin:0 }}>{(ymd(dateISO)).slice(0,10)}</h3>
          <button className="btn" onClick={()=>setDateISO(addDays(dateISO, +1))}>▶︎</button>
        </div>
        <div className="hint">One page a night • Max {MAX_CHARS} chars</div>
      </div>

      {/* Responsive columns */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))", gap:12 }}>
        {/* Left: editor */}
        <div className="sf-card" style={{ display:"grid", gap:8, padding:12 }}>
          <div className="row-sb">
            <b>Journal entry</b>
            <span className={`hint ${overLimit ? "error":""}`}>
              {Math.max(0, charsLeft)} / {MAX_CHARS}
            </span>
          </div>
          <textarea
            value={text}
            placeholder="Write about your day like a wandering mercenary..."
            onChange={(e)=> setText(e.target.value)}
            /* ارتفاع تطبیقی به‌جای rows ثابت */
            style={{ minHeight: "clamp(200px, 40vh, 420px)" }}
          />
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
            <button className="btn" onClick={doSave} disabled={overLimit || status==="saving"}>
              {status==="saving" ? "Saving…" : "Save"}
            </button>
            <button className="btn" onClick={()=>doGenerate(false)} disabled={overLimit || status==="generating"}>
              {status==="generating" ? "Generating…" : "Generate sketch"}
            </button>
            <button className="btn" onClick={()=>doGenerate(true)} disabled={!imgUrl || status==="generating"}>Regenerate</button>
          </div>
        </div>

        {/* Right: sketch pane */}
        <div className="sf-card" style={{ padding:12, display:"grid", gap:8 }}>
          <b>Sketch</b>
          <div style={{
            border:"1px dashed var(--border)",
            borderRadius:12,
            aspectRatio:"1 / 1",        /* مربعِ قابل‌انعطاف */
            width:"100%",
            display:"grid",
            placeItems:"center",
            background:"var(--muted)"
          }}>
            {imgUrl ? (
              <img
                src={imgUrl}
                alt="journal sketch"
                style={{ width:"100%", height:"100%", objectFit:"contain", borderRadius:12 }}
              />
            ) : (
              <div className="hint">No sketch yet — click “Generate sketch”.</div>
            )}
          </div>
          <div className="row-sb" style={{ gap:8, flexWrap:"wrap" }}>
            <span className="hint">Model: {meta?.model || "—"} {meta?.provider ? `• ${meta.provider}` : ""}</span>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn" onClick={download} disabled={!imgUrl}>Download</button>
            </div>
          </div>
        </div>
      </div>

      {/* Archive strip */}
      <div className="sf-card" style={{ padding:12 }}>
        <b>Recent pages</b>
        <div style={{ display:"flex", gap:8, overflowX:"auto", marginTop:8 }}>
          {recent.length === 0 && <div className="hint">No entries yet.</div>}
          {recent.map(e => (
            <button
              key={e.id}
              className="btn"
              style={{ padding:0, borderRadius:12, overflow:"hidden" }}
              onClick={()=> setDateISO(new Date(e.dateISO).toISOString())}
            >
              <div style={{ width:120, height:120, background:"var(--muted)", display:"grid", placeItems:"center" }}>
                {e.thumb
                  ? <img src={e.thumb} alt={e.id} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                  : <span className="hint">{e.id.slice(4,6)}/{e.id.slice(6)}</span>}
              </div>
              <div className="mono" style={{ padding:"4px 8px" }}>
                {e.id.slice(0,4)}-{e.id.slice(4,6)}-{e.id.slice(6)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
