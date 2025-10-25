// src/hooks/useToastQueue.js
import { useEffect, useRef, useState } from "react";
import { uid } from "../utils/constants.js";

export default function useToastQueue(defaultMs = 1500) {
  const [toastQueue, setToastQueue] = useState([]);
  const [currentToast, setCurrentToast] = useState(null); // {id, text, ms}
  const timerRef = useRef(null);

  const enqueueToast = (text, ms = defaultMs) => {
    setToastQueue(q => [...q, { id: uid(), text, ms }]);
  };

  useEffect(() => {
    if (currentToast || toastQueue.length === 0) return;
    setCurrentToast(toastQueue[0]);
    setToastQueue(q => q.slice(1));
  }, [toastQueue, currentToast]);

  useEffect(() => {
    if (!currentToast) return;
    timerRef.current && clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCurrentToast(null), currentToast.ms || defaultMs);
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, [currentToast, defaultMs]);

  return { currentToast, enqueueToast };
}

