// src/theme/witch/components/LottieLayer.jsx
import React, { useEffect, useRef, useState } from "react";

/**
 * Props:
 *  - src: string (URL ماژول ایمپورت‌شدهٔ .lottie یا json)
 *  - speed: number
 *  - loop: boolean = true
 *  - autoplay: boolean = true
 *  - zIndex: number
 *  - style: React.CSSProperties
 *  - ignoreReducedMotion: boolean = false   ← اگر true باشد، حتی با reduced-motion هم پخش می‌شود
 */
export default function LottieLayer({
  src,
  speed = 1,
  loop = true,
  autoplay = true,
  zIndex = 1,
  style = {},
  ignoreReducedMotion = false,
}) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);

  // بارگذاری وب‌کامپوننت dotlottie-player (فقط یک‌بار در کل اپ)
  useEffect(() => {
    if (window.customElements && window.customElements.get("dotlottie-player")) {
      setReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://unpkg.com/@dotlottie/player-component@latest/dist/dotlottie-player.js";
    script.async = true;
    script.onload = () => setReady(true);
    script.onerror = () => setReady(true); // اجازه بده حداقل DOM بسازیم
    document.head.appendChild(script);
    return () => {
      // اسکریپت رو نگه می‌داریم؛ حذف لازم نیست
    };
  }, []);

  // reduced-motion
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // ساخت/به‌روزرسانی پلیر
  useEffect(() => {
    if (!hostRef.current || !ready) return;

    // اگر از قبل ساخته شده، فقط ویژگی‌ها را آپدیت کن
    let player = playerRef.current;
    if (!player) {
      player = document.createElement("dotlottie-player");
      playerRef.current = player;
      // استایل پلیر
      player.style.width = "100%";
      player.style.height = "100%";
      player.style.pointerEvents = "none"; // لایه تزئینی
      hostRef.current.appendChild(player);
    }

    // تنظیم خصیصه‌ها
    player.setAttribute("src", src);
    player.setAttribute("background", "transparent");
    player.setAttribute("speed", String(speed));
    if (loop) player.setAttribute("loop", "");
    else player.removeAttribute("loop");

    // اگر reduced-motion روشن است اما می‌خواهیم نادیده بگیریم
    const shouldAutoplay = ignoreReducedMotion ? autoplay : (reduce ? false : autoplay);
    if (shouldAutoplay) player.setAttribute("autoplay", "");
    else player.removeAttribute("autoplay");

    // اگر autoplay خاموش شد ولی می‌خوای وقتی ظاهر شد پخش بشه (مثلاً بعداً با کد)
    if (!shouldAutoplay) {
      player.pause?.();
    } else {
      // بعضی وقت‌ها نیاز به تأخیر کوچیکه تا src لود شه
      const t = setTimeout(() => player.play?.(), 0);
      return () => clearTimeout(t);
    }
  }, [src, speed, loop, autoplay, ready, reduce, ignoreReducedMotion]);

  return (
    <div
      ref={hostRef}
      aria-hidden
      style={{
        position: "absolute",
        zIndex,
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}
