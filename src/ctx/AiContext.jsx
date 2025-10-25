// src/ctx/AiContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { askAI, askAIStream } from "../utils/ai.js";

const AiCtx = createContext(null);

export function AiProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [model, setModel] = useState("openrouter/auto");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const r = await fetch("/api/auth/openrouter/me", { credentials: "include" });
      const j = await r.json();
      setConnected(!!j.connected);
    } catch { setConnected(false); }
  }

  useEffect(() => { refresh(); }, []);

  function loginOpenRouter() {
    window.location.href = "/api/auth/openrouter/login";
  }

  async function logoutOpenRouter() {
    await fetch("/api/auth/openrouter/logout", { method: "POST", credentials: "include" });
    setConnected(false);
  }

  async function chat(messages, opts = {}) {
    setBusy(true);
    try {
      const txt = await askAI({ messages, model: opts.model || model });
      return txt || null;
    } finally { setBusy(false); }
  }

  async function chatStream(messages, opts = {}) {
    setBusy(true);
    try {
      let final = "";
      const onToken = opts.onToken || (()=>{});
      final = await askAIStream({ messages, model: opts.model || model, onToken });
      return final || null;
    } finally { setBusy(false); }
  }

  async function chatBYOK({ baseUrl, apiKey, model: m, messages }) {
    const endpoint = `${String(baseUrl||"").replace(/\/$/, "")}/chat/completions`;
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ messages, model: m || "openrouter/auto" })
    });
    const j = await r.json().catch(()=>null);
    return j?.choices?.[0]?.message?.content || j?.content || null;
  }

  const api = useMemo(() => ({
    connected, busy, model, setModel,
    loginOpenRouter, logoutOpenRouter, refresh,
    chat, chatStream, chatBYOK
  }), [connected, busy, model]);

  return <AiCtx.Provider value={api}>{children}</AiCtx.Provider>;
}

export function useAI() {
  return useContext(AiCtx);
}
