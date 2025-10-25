import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  auth, provider,
  onAuthStateChanged, signOut,
  signInWithPopup, signInWithRedirect, getRedirectResult
} from "../lib/firebase";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      setAuthReady(true);
    });
    // اگر redirect استفاده شد نتیجه رو بخون
    getRedirectResult(auth).catch(()=>{});
    return () => unsub();
  }, []);

  const signIn = async () => {
    const isStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches;
    const isAndroid = /Android/i.test(navigator.userAgent);
    try {
      if (isAndroid || isStandalone) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (e) {
      alert("Sign-in failed: " + (e?.message || e));
    }
  };

  const value = useMemo(() => ({
    user, authReady,
    signIn,
    signOut: () => signOut(auth).catch(()=>{})
  }), [user, authReady]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
