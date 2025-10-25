// src/utils/sketchPrompt.js
import { askAI } from "./ai.js";

/** پرامپت امن برای اسکچ مدادی؛ اگر AI در دسترس نبود، fallback ساده */
export async function buildSketchPrompt(text) {
  const base =
    "mysterious pencil sketch, monochrome graphite on old paper, cross-hatching, vignette, cinematic composition, no text, no letters, no logos, no watermark —";

  const user = (text || "").trim().replace(/\s+/g, " ").slice(0, 800);

  try {
    const summary = await askAI({
      messages: [
        { role: "system", content: "Summarize the journal into a compact scene prompt (≤220 chars). No names or private details. Focus on subject, setting, mood, key props." },
        { role: "user", content: user }
      ],
      temperature: 0.6,
    });
    const cleaned = (summary || "").replace(/["]/g, "").slice(0, 220);
    return `${base} ${cleaned}`;
  } catch {
    // fallback: چند کلیدواژه‌ ساده
    const kws = Array.from(new Set(
      user.toLowerCase().split(/[^a-zA-Z\u0600-\u06FF]+/).filter(w => w.length > 3)
    )).slice(0, 12).join(", ");
    return `${base} ${kws}`;
  }
}
