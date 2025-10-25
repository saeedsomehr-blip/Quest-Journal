const API = import.meta.env.VITE_AI_PROXY_URL;

export async function aiChat({ model = "openrouter/auto", messages = [], ...opts }) {
  if (!API) throw new Error("VITE_AI_PROXY_URL is not set");
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false, ...opts }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI error ${res.status}: ${txt}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}
