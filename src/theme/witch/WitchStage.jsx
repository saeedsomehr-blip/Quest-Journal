// src/theme/witch/WitchStage.jsx
import React from "react";
import WitchBackground from "./components/WitchBackground.jsx";
import WitchMoonHalo   from "./components/WitchMoonHalo.jsx";
import WitchLightning  from "./components/WitchLightning.jsx";
import WitchEyes       from "./components/WitchEyes.jsx";
import MagicBook       from "./components/MagicBook.jsx";
import LottieLayer     from "./components/LottieLayer.jsx";

// ⬅️ مهم: .lottie ها را از داخل src به‌صورت ماژول ایمپورت کن
import astronautLottieURL from "../../assets/Lottie/Astronaut.lottie";
import witchLottieURL     from "../../assets/Lottie/witch.lottie";

export default function WitchStage({ dark = false }) {
  React.useEffect(() => {
    const prev = document.body.style.fontFamily;
    document.body.style.fontFamily = '"Cinzel", "Philosopher", serif';
    return () => { document.body.style.fontFamily = prev; };
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <WitchBackground dark={dark} />
      <WitchMoonHalo />

      {/* Astronaut - Light Theme.lottie — کوچیک و پایین ماه (جاشو خودت تنظیم کن) */}
      <LottieLayer
  src={astronautLottieURL}
  zIndex={4}
  speed={1}
  ignoreReducedMotion={true}   // ← اضافه کن
  style={{
    width: 80, height: 80,
    top: "22%", left: "13%",
    transform: "translate(-50%, 0)",
  }}
/>

<LottieLayer
  src={witchLottieURL}
  zIndex={7}
  speed={1}
  ignoreReducedMotion={true}   // ← اضافه کن
  style={{
    width: 3200, height: 320,
    top: "90%", left: "10.5%",
    transform: "translate(-50%, -50%)",
    opacity: 0.5,
  }}
/>

      <MagicBook top="10vh" right="2vw" scale={0.7} zIndex={8} />
      <WitchLightning />
      <WitchEyes dark={dark} />
    </div>
  );
}
