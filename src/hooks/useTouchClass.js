// src/hooks/useTouchClass.js
import { useEffect } from "react";

export default function useTouchClass() {
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse), (any-pointer: coarse)");
    const apply = () => document.documentElement.classList.toggle("is-touch", mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);
}

