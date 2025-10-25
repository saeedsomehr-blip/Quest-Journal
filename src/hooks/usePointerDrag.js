// src/hooks/usePointerDrag.js
import { useCallback, useRef } from "react";

export default function usePointerDrag({ onStart, onMove, onEnd } = {}) {
  const draggingRef = useRef(null);

  const onPointerDown = useCallback((e, payload) => {
    const startX = e.clientX, startY = e.clientY;
    const st = { startX, startY, lastX: startX, lastY: startY, payload, pointerId: e.pointerId, captured: false };
    draggingRef.current = st;
    // Delay capture until we detect actual drag movement to preserve click/doubleclick on children
    try { onStart && onStart(st, e); } catch {}
  }, [onStart]);

  const onPointerMove = useCallback((e) => {
    const st = draggingRef.current; if (!st) return;
    // If movement passes a small threshold, capture the pointer to ensure smooth drag
    const dx0 = e.clientX - st.startX;
    const dy0 = e.clientY - st.startY;
    if (!st.captured && (Math.abs(dx0) > 3 || Math.abs(dy0) > 3)) {
      try { e.currentTarget?.setPointerCapture?.(st.pointerId); st.captured = true; } catch {}
    }
    st.lastX = e.clientX; st.lastY = e.clientY;
    try { onMove && onMove(st, e); } catch {}
  }, [onMove]);

  const end = useCallback((e) => {
    const st = draggingRef.current; if (!st) return;
    draggingRef.current = null;
    try { onEnd && onEnd(st, e); } catch {}
  }, [onEnd]);

  const onPointerUp = end, onPointerCancel = end, onLostPointerCapture = end;

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture };
}
