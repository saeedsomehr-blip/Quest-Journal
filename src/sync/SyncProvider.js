// src/ctx/SyncProvider.jsx
// یک Context سبک برای user/status و اکشن‌های signIn/signOut/flush.
// App.jsx فقط این Provider رو wrap کنه و از هوک‌ها/Context برای نمایش وضعیت استفاده کنه.

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  init as syncInit,
  onStatus, getStatus,
  onUser,   getUser,
  signIn as syncSignIn,
  signOutNow as syncSignOut,
  flushNow as syncFlush,
} from "../sync/index.js";

const SyncCtx = createContext({
  user: null,
  status: { state: "idle", error: "", lastSyncAt: null },
  signIn: () => {},
  signOut: () => {},
  flush: () => {},
});

export function SyncProvider({ children }) {
  const [user, setUser] = useState(getUser());
  const [status, setStatus] = useState(getStatus());

  useEffect(() => {
    // راه‌اندازی موتور سینک یکبار
    syncInit();

    // اشتراک در تغییرات
    const offStatus = onStatus((s) => setStatus(s));
    const offUser   = onUser((u) => setUser(u));
    return () => { offStatus(); offUser(); };
  }, []);

  const api = useMemo(() => ({
    user, status,
    signIn:  () => syncSignIn(),
    signOut: () => syncSignOut(),
    flush:   () => syncFlush(),
  }), [user, status]);

  return <SyncCtx.Provider value={api}>{children}</SyncCtx.Provider>;
}

export function useSync() {
  return useContext(SyncCtx);
}
