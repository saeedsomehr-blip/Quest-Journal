// src/components/AiConnect.jsx
import React, { useEffect, useState } from "react";
import { useAI } from "../ctx/AiContext.jsx";

const BYOK_KEY = "qj_ai_byok_v1";

function readBYOK() {
  try {
    const raw = localStorage.getItem(BYOK_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function saveBYOK(v) {
  localStorage.setItem(BYOK_KEY, JSON.stringify(v));
}
function clearBYOK() {
  localStorage.removeItem(BYOK_KEY);
}

export default function AiConnect() {
  const ai = useAI(); // { connected, loginOpenRouter, logoutOpenRouter, chatBYOK, ... }
  const [baseUrl, setBaseUrl] = useState("https://openrouter.ai/api/v1");
  const [apiKey, setApiKey]   = useState("");
  const [model, setModel]     = useState("openrouter/auto");
  const [status, setStatus]   = useState("");

  // Load existing BYOK (if any)
  useEffect(() => {
    const s = readBYOK();
    if (s?.baseUrl) setBaseUrl(s.baseUrl);
    if (s?.apiKey)  setApiKey(s.apiKey);
    if (s?.model)   setModel(s.model);
    if (s?.enabled) setStatus("BYOK is ENABLED (requests will prefer your key)");
  }, []);

  async function testAndSave() {
    setStatus("Testing…");
    try {
      const endpoint = `${String(baseUrl||"").replace(/\/$/, "")}/chat/completions`;
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          messages: [{ role: "user", content: "ping" }],
          model
        })
      });
      const j = await r.json().catch(()=>null);
      if (!r.ok) {
        setStatus("Failed: " + (j?.error?.message || j?.error || r.status));
        return;
      }
      saveBYOK({ apiKey, baseUrl, model, enabled: true });
      setStatus("OK — saved & enabled");
    } catch (e) {
      setStatus("Error: " + (e?.message || String(e)));
    }
  }

  function disableBYOK() {
    const s = readBYOK();
    if (s) saveBYOK({ ...s, enabled: false });
    setStatus("BYOK disabled — proxy/OAuth will be used");
  }

  function clearStored() {
    clearBYOK();
    setStatus("BYOK cleared");
  }

  return (
    <div className="card" style={{ display:"grid", gap:12 }}>
      <h2>Connect AI</h2>

      {/* OAuth via local proxy (only when /api is available) */}
      <div style={{ display:"grid", gap:6 }}>
        <b>Sign in with OpenRouter</b>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {!ai?.connected
            ? <button className="btn primary" onClick={ai?.loginOpenRouter}>Sign in</button>
            : <>
                <span className="badge on">Connected</span>
                <button className="btn" onClick={ai?.logoutOpenRouter}>Log out</button>
              </>
          }
        </div>
      </div>

      <hr />

      {/* BYOK */}
      <details open>
        <summary><b>Alternative: BYOK (Direct key)</b></summary>
        <div style={{ display:"grid", gap:8, marginTop:8 }}>
          <input
            type="text"
            placeholder="Base URL"
            value={baseUrl}
            onChange={e=> setBaseUrl(e.target.value)}
          />
          <input
            type="text"
            placeholder="API Key"
            value={apiKey}
            onChange={e=> setApiKey(e.target.value)}
          />
          <input
            type="text"
            placeholder="Model (e.g. openai/gpt-4o-mini)"
            value={model}
            onChange={e=> setModel(e.target.value)}
          />

          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <button className="btn primary" onClick={testAndSave}>Test Connection</button>
            <button className="btn" onClick={disableBYOK}>Disable BYOK</button>
            <button className="btn" onClick={clearStored}>Clear stored</button>
            {status && <span className="hint">{status}</span>}
          </div>
          <div className="hint">
            When BYOK is enabled, the app calls your base URL directly from the device (no local proxy needed).
          </div>
        </div>
      </details>
    </div>
  );
}

