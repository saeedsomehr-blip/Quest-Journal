// theme/witch/components/MagicBook.jsx
import React from "react";

export default function MagicBook({
  top = "10vh",
  right = "2vw",
  scale = 0.85,
  zIndex = 20,
}) {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const SIGILS = [
    { col: "rgba(190,120,255,1)", glyph: "ᚠ" },
    { col: "rgba(120,255,180,1)", glyph: "ᚱ" },
    { col: "rgba(255,110,110,1)", glyph: "ᛇ" },
    { col: "rgba(120,180,255,1)", glyph: "ᛞ" },
    { col: "rgba(255,200,120,1)", glyph: "ᛟ" },
    { col: "rgba(255,160,220,1)", glyph: "ᚹ" },
  ];

  const [active, setActive] = React.useState(0);
  const [hoverAll, setHoverAll] = React.useState(false);

  React.useEffect(() => {
    if (reduce) return;
    let prev = -1, alive = true, t;
    const tick = () => {
      if (!alive) return;
      let n;
      do { n = Math.floor(Math.random() * SIGILS.length); } while (n === prev);
      prev = n;
      setActive(n);
      const next = 1400 + Math.random() * 1600;
      t = setTimeout(tick, next);
    };
    tick();
    return () => { alive = false; clearTimeout(t); };
  }, [reduce]);

  // ── Geometry
  const BOOK_W = 420;
  const BOOK_H = 280;
  const PAGE_W = 180;
  const PAGE_H = 250;
  const GUTTER = 10;
  const LEFT_X = 18;
  const TOP_Y = 16;
  const INNER_W = PAGE_W * 2 + GUTTER;
  const INNER_H = PAGE_H;

  // نیمه‌باز: صفحات کمی به داخل خم شوند
  const PAGE_TILT_DEG = -10;       // زاویه‌ی خم صفحات
  const COVER_EXTRA_TILT = 6;     // جلد کمی بسته‌تر از صفحات
  const OPEN_X = 0.80;            // فشردگی افقی محتوا (0.80 یعنی نیمه‌بازتر از قبل)

  const cx = PAGE_W + GUTTER / 2;
  const cy = INNER_H * 0.5;
  const R = Math.min(PAGE_W, PAGE_H) * 0.59;
  const rx = R * OPEN_X; // شعاع افقی بیضی
  const ry = R;          // شعاع عمودی بیضی

  const baseAngles = [-40, 0, 45, 130, 175, 225].map((a) => (a * Math.PI) / 180);

  // ── نوشته‌های لاتین
  const SCRIBBLES = [
    "Vitae lumen arcana est.",
    "Sanguis lunae vinculum magnum.",
    "Obscura veritas in tenebris latet.",
    "Arcanum potentia verbo revelatur.",
    "In flamma spiritus renascitur.",
    "Sigillum aeternum custodit animam.",
    "Lux et umbra pactum vetustum.",
    "Silentium magiae resonat in corde.",
    "In nocte luna scripta vivunt.",
    "Animus et umbra unum fiunt.",
    "Verba antiqua potentiam servant.",
    "In sanguine magia fluit.",
    "Aeterna mysteria sub luna latent.",
    "Corpus et spiritus in circulo ligantur."
    ,
  ];

  // اندازه/موقعیت ثابت برای نوشته‌ها (یک بار)
  const NOTES = React.useRef(null);
  if (!NOTES.current) {

    const seeded = (i) => {
      const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      return s - Math.floor(s);
    };

    // حاشیه‌ی امن تا نوشته‌ها از محدوده‌ی دو صفحه بیرون نزنند
    const MARGIN = 16;
    const rxoClamp = Math.min(rx * 0.18, cx - MARGIN, INNER_W - MARGIN - cx);
    const ryoClamp = Math.min(ry * 0.18, cy - MARGIN, INNER_H - MARGIN - cy);

    NOTES.current = Array.from({ length: SCRIBBLES.length }, (_, i) => {
      const ang = (i / SCRIBBLES.length) * Math.PI * 2;

      // بیرون از بیضی ولی داخل حاشیه‌ی امن
      const rxo = rxoClamp;
      const ryo = ryoClamp;

      const x = cx + Math.cos(ang) * rxo;
      const y = cy + Math.sin(ang) * ryo;

      // زاویه‌ی متن مماس بر مسیر بیضی
      const rot = (ang * 180) / Math.PI + 90;

      const s = 11 + seeded(i) * 6;                       // 11..17 px (ثابت)
      const dur =25 + Math.round(seeded(i + 7) * 6);     // 10..16s
      const delay = Math.round(seeded(i + 13) * 40) / 50; // 0..4s
      const amp = 40 + Math.round(seeded(i + 23) * 10) / 10; // 2..3deg

      return { x, y, rot, s, dur, delay, amp };
    });
  }

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top,
        right,
        zIndex,
        transform: `scale(${scale})`,
        transformOrigin: "top right",
        pointerEvents: "none",
        opacity: .85
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Dancing+Script:wght@500&display=swap');

        /* هاله‌ی نرم برای سیجیل (فقط opacity تغییر می‌کند) */
        @keyframes haloFade {
          0%,100% { opacity: .55; }
          50%     { opacity: .95; }
        }

        /* چرخش بسیار ملایم نوشته‌ها (بدون تغییر اندازه) */
        @keyframes scribbleRock {
          0%,100% { transform: rotate(deg); }
          50%     { transform: rotate(var(--amp, 2deg)); }
        }
      `}</style>

      <div
        style={{
          width: BOOK_W,
          height: BOOK_H,
          position: "relative",
          transform:
            "perspective(1100px) rotateY(-16deg) rotateX(10deg) rotateZ(-1.2deg)",
          transformStyle: "preserve-3d",
          filter: "drop-shadow(0 16px 28px rgba(0,0,0,.35))",
        }}
      >
        {/* ـــــ جلد نیمه‌باز: دو نیمه چپ/راست با خمیدگی کمی بیشتر از صفحات ـــــ */}
        {/* جلد چپ */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: BOOK_W / 2,
            height: BOOK_H,
            background:
              "linear-gradient(135deg, #2d1b12 0%, #3b2418 55%, #2a1a11 100%)",
            borderTopLeftRadius: 10,
            borderBottomLeftRadius: 10,
            boxShadow:
              "inset 0 0 0 2px rgba(255,215,160,.12), inset 0 0 24px rgba(0,0,0,.35)",
            transformStyle: "preserve-3d",
            transform: `rotateY(${PAGE_TILT_DEG + COVER_EXTRA_TILT}deg) translateZ(-6px)`,
            zIndex: 0,
          }}
        />
        {/* جلد راست */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: BOOK_W / 2,
            height: BOOK_H,
            background:
              "linear-gradient(225deg, #2d1b12 0%, #3b2418 55%, #2a1a11 100%)",
            borderTopRightRadius: 10,
            borderBottomRightRadius: 10,
            boxShadow:
              "inset 0 0 0 2px rgba(255,215,160,.12), inset 0 0 24px rgba(0,0,0,.35)",
            transformStyle: "preserve-3d",
            transform: `rotateY(${-PAGE_TILT_DEG - COVER_EXTRA_TILT}deg) translateZ(-6px)`,
            zIndex: 0,
          }}
        />

        {/* لبه صفحات (block لبه‌ی کاغذها) */}
        <div
          style={{
            position: "absolute",
            left: 14,
            right: 14,
            top: 14,
            bottom: 14,
            borderRadius: 8,
            background:
              "repeating-linear-gradient(90deg, #efe9dc 0 3px, #f6f2e9 3px 6px)",
            boxShadow:
              "inset 0 0 0 1px rgba(0,0,0,.06), inset 0 30px 38px rgba(0,0,0,.10)",
            zIndex: 1,
          }}
        />

        {/* صفحات (هر کدام کمی به داخل خم شده‌اند) */}
        {[0, 1].map((p) => (
          <div
            key={p}
            style={{
              position: "absolute",
              left: LEFT_X + (PAGE_W + GUTTER) * p,
              top: TOP_Y,
              width: PAGE_W,
              height: PAGE_H,
              borderRadius: 8,
              overflow: "hidden",
              background:
                "linear-gradient(180deg,#f6f1e7,#efe9dc 58%,#ebe4d5)",
              boxShadow:
                "inset 0 0 0 1px rgba(0,0,0,.08), inset 0 20px 30px rgba(0,0,0,.06)",
              transformStyle: "preserve-3d",
              transform: `rotateY(${p === 0 ? PAGE_TILT_DEG : -PAGE_TILT_DEG}deg)`,
              zIndex: 2,
            }}
          />
        ))}

        {/* شیرازه (کمی باریک‌تر) */}
        <div
          style={{
            position: "absolute",
            left: LEFT_X + PAGE_W * 1.01339,
            top: TOP_Y - 2,
            width: GUTTER / 1.8,
            height: PAGE_H + 4,
            borderRadius: 3,
            background:
              "linear-gradient(180deg, #4a2f20, #5a3726 60%, #452a1d)",
            boxShadow:
              "inset 0 0 0 1px rgba(255,215,160,.12), inset 0 0 12px rgba(0,0,0,.3)",
            zIndex: 3,
          }}
        />

        {/* محتوای کتاب: داخل محدوده‌ی صفحات و با clip طبیعی */}
        <svg
          width={INNER_W}
          height={INNER_H}
          viewBox={`0 0 ${INNER_W} ${INNER_H}`}
          style={{
            position: "absolute",
            left: LEFT_X,
            top: TOP_Y,
            pointerEvents: "auto",
            overflow: "hidden",     // برای اطمینان از عدم بیرون‌زدگی
            zIndex: 4,
          }}
          onMouseLeave={() => setHoverAll(false)}
        >
          {/* نوشته‌های جادویی واقعی – اندازه ثابت + چرخش خیلی ملایم */}
          <g fontFamily="'Great Vibes','Dancing Script',cursive">
            {NOTES.current.map((n, idx) => (
              <g
                key={idx}
                transform={`translate(${n.x},${n.y}) rotate(${n.rot})`}
              >
                <g
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    animation: reduce
                      ? "none"
                      : `scribbleRock ${n.dur}s ease-in-out ${n.delay}s infinite alternate`,
                    ["--amp"]: `${n.amp}deg`,
                    willChange: "transform",
                  }}
                >
                  <text
                    x={0}
                    y={0}
                    fontSize={1.2*n.s}
                    fill="rgba(40,30,20,0.7)"
                    letterSpacing="0.9"
                    style={{ opacity: 0.9 }}
                  >
                    {SCRIBBLES[idx % SCRIBBLES.length]}
                  </text>
                </g>
              </g>
            ))}
          </g>

          {/* بیضی ریچوال (به‌جای دایره) + خطوط هماهنگ با rx/ry */}
          <g
            stroke="rgba(60,52,44,.65)"
            strokeWidth="1.2"
            fill="none"
            opacity="0.9"
          >
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
            <ellipse cx={cx} cy={cy} rx={rx * 1.14} ry={ry * 1.14} opacity=".5" />
            {/* محور عمودی */}
            <line x1={cx} y1={cy - ry} x2={cx} y2={cy + ry} opacity=".65" />
            {/* محور افقی */}
            <line x1={cx - rx} y1={cy} x2={cx + rx} y2={cy} opacity=".65" />
            {/* قطرها */}
            <line
              x1={cx - rx * 0.72}
              y1={cy - ry * 0.72}
              x2={cx + rx * 0.72}
              y2={cy + ry * 0.72}
              opacity=".4"
            />
            <line
              x1={cx - rx * 0.72}
              y1={cy + ry * 0.72}
              x2={cx + rx * 0.72}
              y2={cy - ry * 0.72}
              opacity=".4"
            />
          </g>

          {/* سیجیل‌ها با هاله‌ی جدا (روی محیط بیضی) */}
          {SIGILS.map((s, i) => {
            const ang = baseAngles[i];
            const x = cx + Math.cos(ang) * rx;
            const y = cy + Math.sin(ang) * ry;
            const lit = hoverAll || i === active;

            return (
              <g key={i} transform={`translate(${x},${y})`}>
                <circle
                  r={16}
                  fill="transparent"
                  style={{ cursor: "pointer", pointerEvents: "auto" }}
                  onMouseEnter={() => {
                    setHoverAll(true);
                    setTimeout(() => setHoverAll(false), 1600);
                  }}
                />
                <defs>
                  <radialGradient id={`glow-${i}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={s.col} stopOpacity="0.9" />
                    <stop offset="60%" stopColor={s.col} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={s.col} stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle
                  r={18}
                  fill={`url(#glow-${i})`}
                  style={{
                    opacity: lit ? 0.9 : 0,
                    transition: "opacity 220ms ease",
                    animation: lit ? "haloFade 1.6s ease-in-out infinite" : "none",
                  }}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily="'IM Fell DW Pica SC','Times New Roman',serif"
                  fontSize="35"
                  fill={lit ? s.col : "rgba(60,52,44,.85)"}
                  style={{
                    transform: "translateY(-1px)",
                    transition: "fill 220ms ease",
                  }}
                >
                  {s.glyph}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
