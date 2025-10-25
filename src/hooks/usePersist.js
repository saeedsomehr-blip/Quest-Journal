import { useEffect, useRef, useState } from "react";

export default function usePersist(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : (typeof initial === "function" ? initial() : initial);
    } catch {
      return typeof initial === "function" ? initial() : initial;
    }
  });

  const keyRef = useRef(key);
  keyRef.current = key;

  // Persist on local changes
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
  }, [key, state]);

  // Cross-tab sync: react to storage events for this key
  useEffect(() => {
    function onStorage(e) {
      try {
        if (!e) return;
        if (e.storageArea !== localStorage) return;
        if (e.key !== keyRef.current) return;
        const next = e.newValue != null ? JSON.parse(e.newValue) : (typeof initial === "function" ? initial() : initial);
        setState(next);
      } catch {
        // ignore parse errors and invalid events
      }
    }
    try { window.addEventListener("storage", onStorage); } catch {}
    return () => { try { window.removeEventListener("storage", onStorage); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [state, setState];
}
