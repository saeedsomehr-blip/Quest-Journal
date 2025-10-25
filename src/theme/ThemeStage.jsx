// src/theme/ThemeStage.jsx
import { useEffect, useMemo } from "react";

import FairyStage   from "./fairy/FairyStage.jsx";
import MistyStage   from "./misty/MistyStage.jsx";
import DesertStage  from "./desert/DesertStage.jsx";
import ForestStage  from "./forest/ForestStage.jsx";
import WarriorStage from "./warrior/WarriorStage.jsx";
import ScholarStage from "./scholar/ScholarStage.jsx";
import WitchStage   from "./witch/WitchStage.jsx";
import ArtisanStage from "./artisan/ArtisanStage.jsx";

/**
 * props:
 *  - activeSkin: "fairy"|"misty"|"desert"|"forest"|"warrior"|"scholar"|"witch"|"artisan"|...
 *  - blockRect : DOMRect|null (???????)
 *  - dark      : boolean
 */
export default function ThemeStage({ activeSkin, blockRect, dark }) {
  useEffect(() => {
    document.documentElement.classList.add("stage-on");
    return () => document.documentElement.classList.remove("stage-on");
  }, []);

  const Stage = useMemo(() => {
    switch (activeSkin) {
      case "fairy":   return FairyStage;
      case "misty":   return MistyStage;
      case "desert":  return DesertStage;
      case "forest":  return ForestStage;
      case "warrior": return WarriorStage;
      case "scholar": return ScholarStage;
      case "witch":   return WitchStage;
      case "artisan": return ArtisanStage;
      default:        return null;
    }
  }, [activeSkin]);

  if (!Stage) return null;

  return (
    <div
      className="theme-stage"
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,          // place theme visuals behind main app content
        isolation: "isolate" // ?????? ??? ???? ????? ????
      }}
    >
      <Stage dark={dark} blockRect={blockRect} />
    </div>
  );
}

