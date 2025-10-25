import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fetch from "node-fetch";
import 'dotenv/config';

const ENV = {
  PORT: (process.env.PORT || "5175").trim(),
  CORS_ORIGIN: (process.env.CORS_ORIGIN || "http://127.0.0.1:5173").trim(),
  PRIMARY_AI_BASE: (process.env.PRIMARY_AI_BASE || "https://openrouter.ai/api/v1").trim().replace(/\/$/, ""),
  PRIMARY_AI_KEY: (process.env.PRIMARY_AI_KEY || "").trim(),
  PRIMARY_AI_MODEL: (process.env.PRIMARY_AI_MODEL || "x-ai/grok-4-fast:free").trim(),
  PRIMARY_IMAGE_MODEL: (process.env.PRIMARY_IMAGE_MODEL || "google/gemini-2.5-flash-image-preview").trim(),
};

const app = express();
app.use(cors({ origin: ENV.CORS_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "4mb" }));

function normalizeChatContent(json) {
  return (
    json?.choices?.[0]?.message?.content ??
    json?.choices?.[0]?.delta?.content ??
    json?.content ?? ""
  );
}

function pickOpenRouterSource(req) {
  if (req.headers["x-api-key"] && req.headers["x-base-url"]) {
    return {
      apiKey: req.headers["x-api-key"],
      baseUrl: String(req.headers["x-base-url"]).replace(/\/$/, ""),
      model: req.headers["x-model"] || ENV.PRIMARY_AI_MODEL,
      via: "byok",
    };
  }
  if (ENV.PRIMARY_AI_KEY) {
    return {
      apiKey: ENV.PRIMARY_AI_KEY,
      baseUrl: ENV.PRIMARY_AI_BASE,
      model: ENV.PRIMARY_AI_MODEL,
      via: "env",
    };
  }
  throw new Error("No OpenRouter key available.");
}

// --- daily image quota (3/day) ---
const imageQuota = new Map();
function nextMidnightTs() { const t = new Date(); t.setHours(24,0,0,0); return t.getTime(); }
function userKey(req) { return req.header("x-user-id") || req.body?.userId || req.ip || "anon"; }
function tryConsumeQuota(req, max=3) {
  const k = userKey(req);
  const now = Date.now();
  let rec = imageQuota.get(k);
  if (!rec || now >= rec.resetAt) rec = { count: 0, resetAt: nextMidnightTs() };
  if (rec.count >= max) { imageQuota.set(k, rec); return { ok:false, key:k, resetAt: rec.resetAt }; }
  rec.count += 1; imageQuota.set(k, rec); return { ok:true, key:k, resetAt: rec.resetAt };
}
function rollbackQuota(k){ const r=imageQuota.get(k); if(r){ r.count=Math.max(0,r.count-1); imageQuota.set(k,r);} }

// ---------- image helpers ----------
function extractImageData(j) {
  // 1) { output: ["data:image/png;base64,..."] } or ["https://..."] or ["<raw base64>"]
  if (Array.isArray(j?.output) && j.output.length) {
    const v = j.output[0];
    if (typeof v === "string") {
      if (v.startsWith("data:") || v.startsWith("http")) return v;
      return `data:image/png;base64,${v}`;
    }
  }
  // 2) { data: [{b64_json: "..."}] }
  if (Array.isArray(j?.data) && j.data[0]?.b64_json) {
    return `data:image/png;base64,${j.data[0].b64_json}`;
  }
  // 3) { images: [{ b64: "..." }] }
  if (Array.isArray(j?.images) && j.images[0]?.b64) {
    return `data:image/png;base64,${j.images[0].b64}`;
  }
  // 4) responses-style: choices[].message.content (array or string)
  const content = j?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    // محتویاتی مثل: [{type:'output_image', image_url:'...'}] یا متن با data:
    for (const part of content) {
      if (!part) continue;
      if (typeof part === "string" && (part.startsWith("data:") || part.startsWith("http"))) return part;
      if (typeof part?.text === "string" && (part.text.startsWith("data:") || part.text.startsWith("http"))) return part.text;
      if (part?.image_url) return part.image_url;
      if (part?.b64_json) return `data:image/png;base64,${part.b64_json}`;
    }
  } else if (typeof content === "string") {
    if (content.startsWith("data:") || content.startsWith("http")) return content;
  }
  // 5) fallback: candidates/content style
  const parts = j?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    for (const p of parts) {
      if (p?.inline_data?.data) return `data:${p.inline_data.mime_type||"image/png"};base64,${p.inline_data.data}`;
      if (typeof p?.text === "string" && (p.text.startsWith("data:") || p.text.startsWith("http"))) return p.text;
    }
  }
  return null;
}

async function callOpenRouterImagesGenerate(src, { model, prompt, size }) {
  const endpoint = `${src.baseUrl}/images/generate`;
  const body = { model, prompt, size: size || "512x512", n: 1 };
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${src.apiKey}` },
    body: JSON.stringify(body),
  });
  const ct = r.headers.get("content-type") || "";
  const j = ct.includes("application/json") ? await r.json().catch(()=>null) : null;
  return { ok: r.ok, status: r.status, json: j, text: !j ? await r.text().catch(()=>null) : null };
}

async function callOpenRouterResponses(src, { model, prompt }) {
  const endpoint = `${src.baseUrl}/responses`;
  // چند بدنه‌ی محتمل را تست می‌کنیم:
  const candidates = [
    { model, input: prompt }, // format جدید
    { model, prompt },        // برخی پیاده‌سازی‌ها
    { model, messages: [{ role: "user", content: prompt }] }, // fallback شبیه chat
  ];
  for (const body of candidates) {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${src.apiKey}` },
      body: JSON.stringify(body),
    });
    const ct = r.headers.get("content-type") || "";
    const j = ct.includes("application/json") ? await r.json().catch(()=>null) : null;
    if (r.ok) return { ok: true, status: r.status, json: j, text: null };
    // اگر 404/400/422 برگشت، بعدی را امتحان می‌کنیم
  }
  return { ok: false, status: 400, json: null, text: "responses fallback failed" };
}

// ---------- routes ----------
app.get("/api/ai/test", (_req, res) => {
  res.json({
    ok: true,
    chat: { base: ENV.PRIMARY_AI_BASE, model: ENV.PRIMARY_AI_MODEL, keyConfigured: !!ENV.PRIMARY_AI_KEY },
    image: { model: ENV.PRIMARY_IMAGE_MODEL }
  });
});

app.post("/api/ai/chat", async (req, res) => {
  try {
    const src = pickOpenRouterSource(req);
    const model = req.body.model || src.model;
    const doStream = (String(req.query.stream||"").trim() === "1") || !!req.body?.stream;
    const endpoint = `${src.baseUrl}/chat/completions`;
    const body = { model, messages: req.body.messages || [], temperature: req.body.temperature ?? 0.8, ...(doStream?{stream:true}:{}) };

    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${src.apiKey}` },
      body: JSON.stringify(body),
    });

    if (doStream) {
      if (!r.ok) {
        const j = await r.json().catch(()=>null);
        return res.status(r.status).json({ error: "upstream_error", details: j?.error || j || null });
      }
      // Stream SSE back to client as-is
      res.status(200);
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      if (typeof res.flushHeaders === 'function') res.flushHeaders();
      try {
        for await (const chunk of r.body) {
          res.write(chunk);
        }
      } catch (e) {
        // ignore broken pipe
      } finally {
        res.end();
      }
      return;
    }

    const j = await r.json().catch(()=>null);
    if (!r.ok) {
      return res.status(r.status).json({ error: "upstream_error", details: j?.error || j || null });
    }
    return res.json({ content: normalizeChatContent(j), model, via: src.via });
  } catch (e) {
    return res.status(500).json({ error: "proxy_failed", details: String(e) });
  }
});

app.post("/api/ai/image", async (req, res) => {
  const qk = userKey(req);
  try {
    const { prompt, size } = req.body || {};
    if (!prompt || typeof prompt !== "string") return res.status(400).json({ error: "prompt_required" });

    const quota = tryConsumeQuota(req, 3);
    if (!quota.ok) {
      return res.status(429).json({
        error: "quota_exhausted",
        message: `Daily image quota exceeded (3/day). Resets at ${new Date(quota.resetAt).toLocaleString()}`,
        resetAt: quota.resetAt,
      });
    }

    const src = pickOpenRouterSource(req);
    const model = req.body.model || ENV.PRIMARY_IMAGE_MODEL;

    // 1) تلاش با /images/generate
    let resp = await callOpenRouterImagesGenerate(src, { model, prompt, size });
    let img = resp.ok ? extractImageData(resp.json) : null;

    // 2) اگر جواب نگرفتیم، روی /responses تست کن
    if (!img) {
      const resp2 = await callOpenRouterResponses(src, { model, prompt });
      if (resp2.ok) img = extractImageData(resp2.json);
      if (!img && !resp.ok && resp2.ok) {
        // اگر اولی fail بود ولی دومی ok، اینو به عنوان پاسخ استفاده کن
        resp = resp2;
      }
      if (!img && resp2.json) {
        // شاید خروجی در فیلد دیگری باشد؛ آخرین پاسخ را برای debug برگردانیم
        rollbackQuota(qk);
        return res.status(500).json({ error: "no_image_returned", debug: resp2.json });
      }
    }

    if (!img) {
      rollbackQuota(qk);
      return res.status(resp.ok ? 500 : (resp.status || 500)).json({
        error: "upstream_error",
        details: resp.json || resp.text || null,
      });
    }

    const dataUrl = img.startsWith("data:") ? img : `data:image/png;base64,${img}`;
    return res.json({ image: dataUrl, provider: "openrouter", model, via: src.via });
  } catch (e) {
    rollbackQuota(qk);
    return res.status(500).json({ error: "image_failed", details: String(e) });
  }
});

app.listen(Number(ENV.PORT), () => {
  console.log(`[ai-proxy] listening on http://127.0.0.1:${ENV.PORT}`);
  console.log(`[ai-proxy] CORS: ${ENV.CORS_ORIGIN}`);
});
