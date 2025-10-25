import React from "react";
import "@dotlottie/player-component";  // رجیستر وب‌کامپوننت
import squirrelUrl from "../assets/Lottie/squirrel.lottie";
import birdsUrl from "../assets/Lottie/Transparent_Birds.lottie";  // لوتی پرندگان

export default function Squirrel({ dark = false, style = {} }) {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // پیکربندی باندهای پرندگان (فقط در روز استفاده می‌شود)
  const bands = [
    { top: "8%",  duration: 42, delay:  0, dir: "right", size: 160 },
    { top: "18%", duration: 55, delay:  7, dir: "left",  size: 140 },
    { top: "28%", duration: 48, delay: 12, dir: "right", size: 180 },
    { top: "38%", duration: 62, delay:  4, dir: "left",  size: 150 },
    { top: "50%", duration: 58, delay: 10, dir: "right", size: 170 },
  ];

  return (
    <>
      {/* انیمیشن‌های پرواز سرتاسری (برای روز) */}
      {!dark && (
        <style>{`
          @keyframes birds-fly-right {
            0%   { transform: translateX(-20vw); opacity: 0; }
            5%   { opacity: 1; }
            95%  { opacity: 1; }
            100% { transform: translateX(120vw); opacity: 0; }
          }
          @keyframes birds-fly-left {
            0%   { transform: translateX(120vw); opacity: 0; }
            5%   { opacity: 1; }
            95%  { opacity: 1; }
            100% { transform: translateX(-20vw); opacity: 0; }
          }
        `}</style>
      )}

      <div
        style={{
          position: "absolute",
          // شب: سنجاب کنار زمین؛ روز: ظرف تمام‌صفحه برای پرندگان
          ...(dark
            ? {
                bottom: "2%",
                left: "85.73%",
                width: "100px",
                height: "100px",
                transform: "translateX(-50%)",
              }
            : {
                inset: 0,
                width: "100%",
                height: "100%",
              }),
          pointerEvents: "none",
          zIndex: 1, // بین far (0) و near (2)
          filter: dark
            ? "brightness(0.3) contrast(0.6) drop-shadow(0 2px 2px rgba(0,0,0,0.35))"
            : "drop-shadow(0 2px 2px rgba(0,0,0,0.25))",
          ...style,
        }}
      >
        {/* شب: سنجاب */}
        {dark ? (
          <dotlottie-player
            src={squirrelUrl}
            autoplay={!reduceMotion}
            loop
            style={{ width: "100%", height: "100%" }}
            speed={reduceMotion ? 0.5 : 1}
          />
        ) : (
          // روز: چند لایه پرنده با پرواز سرتاسری و بدون پاپ
          bands.map((b, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: b.top,
                left: 0,
                width: "100vw",
                height: b.size + "px",
                overflow: "visible",
                animation: `${
                  b.dir === "right" ? "birds-fly-right" : "birds-fly-left"
                } ${reduceMotion ? b.duration * 2 : b.duration}s linear infinite`,
                animationDelay: `${b.delay}s`,
              }}
            >
              {/* خود لوتیِ پرندگان—در بیرون کادر شروع می‌کند تا پاپ نشود */}
              <div
                style={{
                  position: "absolute",
                  left: b.dir === "right" ? "-20vw" : "120vw",
                  width: b.size + "px",
                  height: b.size + "px",
                }}
              >
                <dotlottie-player
                  src={birdsUrl}
                  autoplay={!reduceMotion}
                  loop
                  style={{ width: "100%", height: "100%" }}
                  speed={reduceMotion ? 0.6 : 1}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
