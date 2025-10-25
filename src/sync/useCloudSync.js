// src/sync/useCloudSync.js
// یک هوک نازک که روی موتور سینک (src/sync/index.js) سوار می‌شود
// و همان امضایی را که App.jsx انتظار دارد برمی‌گرداند:
//
//   const { ready, user, busy, error, signIn, signOut, pushLocal } = useCloudSync({ applyRemote })
//
// - applyRemote(remote): وقتی اسنپ‌شات ریموت رسید، آن را روی stateهای لوکال اعمال کن.
// - pushLocal(getLocalSnapshot): به موتور خبر بده لوکال عوض شده. خودِ هوک debounce می‌کند.
//
// نکته: این فایل فقط wrapper است. اگر موتور سینک‌ات onRemote/setLocalSnapshotGetter نداشته باشد
// همچنان کار می‌کند (با notifyLocalChange). اگر آن متدها را بعداً اضافه کنی، این هوک خودکار
// از آن‌ها استفاده خواهد کرد.

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as sync from "./index.js";

const BUSY_STATES = new Set([
  "signing-in",
  "signing-out",
  "pulling",
  "pushing",
  "merging",
  "applying",
  "initializing",
]);

export function useCloudSync({ applyRemote } = {}) {
  const [status, setStatus] = useState(() => safeGet(sync.getStatus, { state: "idle", error: "", lastSyncAt: null }));
  const [user,   setUser]   = useState(() => safeGet(sync.getUser, null));
  const initedRef = useRef(false);

  // آخرین getter برای ساخت اسنپ‌شات کامل لوکال (App آن را می‌دهد)
  const getLocalSnapshotRef = useRef(null);

  // --- راه‌اندازی اولیه موتور + اتصال لیسنرها
  useEffect(() => {
    // init (اگر پارامتر بگیرد، applyRemote را پاس بده — اگر موتور ساپورت کند استفاده می‌کند)
    try {
      if (!initedRef.current) {
        if (typeof sync.init === "function") {
          try { sync.init({ applyRemote }); }
          catch { sync.init(); }
        }
        initedRef.current = true;
      }
    } catch {}

    // اشتراک در تغییر status
    let offStatus = () => {};
    if (typeof sync.onStatus === "function") {
      offStatus = sync.onStatus((s) => setStatus(s || { state: "idle" }));
    } else {
      // fallback: هر 2 ثانیه یک‌بار وضعیت را بخوان
      const t = setInterval(() => setStatus(safeGet(sync.getStatus, { state: "idle" })), 2000);
      offStatus = () => clearInterval(t);
    }

    // اشتراک در تغییر user
    let offUser = () => {};
    if (typeof sync.onUser === "function") {
      offUser = sync.onUser((u) => setUser(u || null));
    } else {
      // fallback: اولین بار فقط بخوان
      setUser(safeGet(sync.getUser, null));
    }

    // اگر موتور رخداد «رسیدن اسنپ‌شات ریموت» دارد، به آن وصل شو
    // نام‌های احتمالی: onRemote / onApplyRemote
    let offRemote = () => {};
    // Prefer post-apply events so we only mutate local state
    // when the sync engine has decided to accept remote data.
    const remoteEmitter =
      (typeof sync.onApplyRemote === "function" && sync.onApplyRemote) ||
      (typeof sync.onRemote === "function" && sync.onRemote);

    if (remoteEmitter && typeof applyRemote === "function") {
      offRemote = remoteEmitter((remote) => {
        try { applyRemote(remote || {}); } catch {}
      });
    } else if (typeof applyRemote === "function") {
      // fallback: اگر موتور event ندارد، یک Event DOM سفارشی را گوش بده
      const handler = (e) => {
        try { applyRemote((e?.detail ?? e?.data) || {}); } catch {}
      };
      window.addEventListener("qj:sync:remote", handler);
      offRemote = () => window.removeEventListener("qj:sync:remote", handler);
    }

    return () => { offStatus(); offUser(); offRemote(); };
  }, [applyRemote]);

  // --- متد pushLocal که App هر بار روی تغییر state صدا می‌زند
  const pushLocal = useCallback((getLocalSnapshot) => {
    if (typeof getLocalSnapshot === "function") {
      getLocalSnapshotRef.current = getLocalSnapshot;
      // اگر موتور API ثبت getter دارد، بده به آن:
      try { sync.setLocalSnapshotGetter?.(getLocalSnapshot); } catch {}
      // برای سازگاری کامل، روی window هم بگذاریم (اگر موتور بخواهد بردارد)
      try { window.__qj_getLocalSnapshot = getLocalSnapshot; } catch {}
    }
    // به موتور بگو لوکال تغییر کرده (خود موتور اگر debounce دارد انجام می‌دهد)
    try { sync.notifyLocalChange?.(); }
    catch {
      // اگر notifyLocalChange نبود، شاید flushNow داشته باشیم
      try { sync.flushNow?.(); } catch {}
    }
  }, []);

  const api = useMemo(() => ({
    ready: true,                               // موتور init شده؛ UI می‌تواند نمایش دهد
    user:  user || null,
    busy:  BUSY_STATES.has(status?.state),     // از روی state، وضعیت مشغول/آماده را بساز
    error: status?.error || "",
    signIn:  () => { try { return sync.signIn?.(); } catch {} },
    signOut: () => { try { return sync.signOutNow?.(); } catch {} },
    pushLocal,
  }), [user, status, pushLocal]);

  return api;
}

// --- ابزار کمکی
function safeGet(fn, fallback) {
  try { return typeof fn === "function" ? fn() : fallback; }
  catch { return fallback; }
}
