// src/repos.js
// یک لایه‌ی خیلی ساده برای CRUD از نگاه UI.
// در فاز مونولیت، این repo فقط "به App بگه داده تغییر کرده" تا موتور سینک flush کند.
// بعداً می‌تونی اینجا رو به مسیرهای چندسندی (tasks/lists/...) ارتقا بدی بدون تغییر UI.

// Correct relative path: this file lives in src/sync, so index.js is sibling
import { notifyLocalChange } from "./index.js";

// ---- الگو:
// UI هر جا چیزی را تغییر می‌دهد، علاوه‌بر setState خودش، یکی از این متدها را صدا بزند
// تا موتور سینک بفهمد باید flush کند. فعلاً همه‌شان فقط notify می‌کنند.

export const repos = {
  tasks: {
    created() { notifyLocalChange(); },
    updated() { notifyLocalChange(); },
    deleted() { notifyLocalChange(); },
  },
  lists: {
    created() { notifyLocalChange(); },
    updated() { notifyLocalChange(); },
    deleted() { notifyLocalChange(); },
  },
  settings: {
    updated() { notifyLocalChange(); },
  },
  profile: {
    updated() { notifyLocalChange(); },
  },
  templates: {
    dailyChanged() { notifyLocalChange(); },
    weeklyChanged() { notifyLocalChange(); },
  },
  day: {
    changed() { notifyLocalChange(); },
  },
  week: {
    changed() { notifyLocalChange(); },
  },
};

// اگر دوست داشتی به‌جای call مستقیم، یک emitter تزریق کنی:
let _externalChangeEmitter = null;
export function setChangeEmitter(fn) { _externalChangeEmitter = fn; }
export function emitChange() {
  try { _externalChangeEmitter?.(); } catch {}
  notifyLocalChange();
}
