// src/hooks/useTheme.js
import { useEffect } from "react";

export default function useTheme(settings) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.skin = settings?.skin || "classic";
    if (settings?.dark) root.classList.add("dark"); else root.classList.remove("dark");
  }, [settings?.dark, settings?.skin]);
}

