export default {
  async fetch(request, env) {
    // ---- CORS ----
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Use POST" }), {
        status: 405,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const apiKey = env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing OPENROUTER_API_KEY" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Parse input
    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // حداقل فیلدها
    const {
      model = "openrouter/auto",
      messages = [],
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty,
      stop,
      stream = false,
    } = payload || {};

    const body = {
      model,
      messages,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(max_tokens !== undefined ? { max_tokens } : {}),
      ...(top_p !== undefined ? { top_p } : {}),
      ...(frequency_penalty !== undefined ? { frequency_penalty } : {}),
      ...(presence_penalty !== undefined ? { presence_penalty } : {}),
      ...(stop !== undefined ? { stop } : {}),
      stream, // اگر true بود، پاس‌ترو می‌کنیم
    };

    const upstream = "https://openrouter.ai/api/v1/chat/completions";
    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // اختیاری اما مفید برای شناسنامه درخواست
      "HTTP-Referer": env.HTTP_REFERER || "https://quest-journal.local",
      "X-Title": env.X_TITLE || "Quest Journal",
    };

    const resp = await fetch(upstream, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    // پاس‌ترو استریم (Server-Sent Events)
    if (stream && resp.body) {
      return new Response(resp.body, {
        status: resp.status,
        headers: {
          ...cors,
          "Content-Type": resp.headers.get("Content-Type") || "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    // حالت نان‌استریم
    const text = await resp.text();
    return new Response(text, {
      status: resp.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  },
};
