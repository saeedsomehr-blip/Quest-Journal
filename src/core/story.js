// src/core/story.js
const K_INTRO = "qj_story_intro_v1";
const K_EPIS = "qj_story_episodes_v1";

export function loadStoryIntro() {
  try { return JSON.parse(localStorage.getItem(K_INTRO)) ?? ""; } catch { return ""; }
}
export function saveStoryIntro(text) {
  try { localStorage.setItem(K_INTRO, JSON.stringify(text || "")); } catch {}
}

export function loadEpisodes() {
  try { return JSON.parse(localStorage.getItem(K_EPIS)) ?? []; } catch { return []; }
}
export function saveEpisodes(list) {
  try { localStorage.setItem(K_EPIS, JSON.stringify(Array.isArray(list) ? list : [])); } catch {}
}

/** یک کمک‌تابع ساده برای ساخت فصل از وضعیت فعلی بدون AI */
export function craftChapter({ level, tasksDone = [], date = new Date() }) {
  const day = date.toLocaleDateString();
  const titles = tasksDone.map(t => `“${t.title}”`).slice(0, 5).join(", ");
  const lineA = titles
    ? `Today (${day}), our hero pushed forward: ${titles}.`
    : `Today (${day}), our hero trained in silence, sharpening the mind.`;
  const lineB = `Current level: ${level}. The journey continues…`;
  return `${lineA}\n${lineB}`;
}
