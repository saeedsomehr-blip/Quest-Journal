import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const LS_KEY_TAB_DONE = "qj_tour_done_v1";
const TAB_KEYS = {
  tasks: "qj_tour_tasks_done",
  music: "qj_tour_music_done",
  story: "qj_tour_story_done",
  ach:   "qj_tour_ach_done",
  journal:"qj_tour_journal_done",
};

function readFlag(k){ try{return localStorage.getItem(k)==="1";}catch{return false;} }
function writeFlag(k){ try{localStorage.setItem(k,"1");}catch{} }
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

function useRafState(initial){
  const [v, set] = useState(initial);
  const raf = useRef(0);
  const setRaf = (next) => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(()=> set(typeof next==="function" ? next(v) : next));
  };
  useEffect(()=>()=>cancelAnimationFrame(raf.current),[]);
  return [v, setRaf];
}

// ---- Safe querying helpers ----
function safeQuery(sel){
  try { return document.querySelector(sel); }
  catch { return null; }
}

function getRect(selector){
  let el = null;
  if (Array.isArray(selector)){
    for (const s of selector){
      el = typeof s === "string" ? safeQuery(s) : s;
      if (el) break;
    }
  } else {
    el = typeof selector === "string" ? safeQuery(selector) : selector;
  }
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { el, top:r.top, left:r.left, width:r.width, height:r.height, right:r.right, bottom:r.bottom };
}

/* ---------------- Scroll helpers: bring POPUP into view (not just target) ---------------- */
function getScrollParent(node) {
  for (let p = node && node.parentElement; p; p = p.parentElement) {
    const s = getComputedStyle(p);
    const canScrollY = /(auto|scroll|overlay)/.test(s.overflowY);
    if (canScrollY && p.scrollHeight > p.clientHeight) return p;
  }
  return document.scrollingElement || document.documentElement;
}

/**
 * Scroll so that popup will be visible; optionally center the popup itself.
 * - popupHeight: estimated popup height
 * - alignPopupCenter: if true, center popup vertically (useful for Forest/Add)
 * - popupOffsetY: vertical offset applied to popup (e.g., when we lift Add step)
 */
function scrollIntoViewForTour(targetEl, {
  popupHeight = 260,
  popupMargin = 16,
  stickyTop = 0,
  behavior = 'smooth',
  place = 'bottom',
  alignPopupCenter = false,
  popupOffsetY = 0,   // NEW
} = {}) {
  if (!targetEl) return;

  const scroller = getScrollParent(targetEl);
  const isWindow = scroller === document.scrollingElement || scroller === document.documentElement;

  const viewportTop    = isWindow ? window.scrollY : scroller.scrollTop;
  const viewportHeight = isWindow ? window.innerHeight : scroller.clientHeight;
  const viewportBottom = viewportTop + viewportHeight;

  const rect = targetEl.getBoundingClientRect();
  const baseTop = isWindow ? rect.top + window.scrollY
                           : rect.top + scroller.scrollTop - scroller.getBoundingClientRect().top;
  const baseBottom = baseTop + rect.height;

  let nextScrollTop = null;

  if (alignPopupCenter) {
    // شبیه‌سازی جای پاپ‌آپ نسبت به تارگت
    const pad = 2;
    let popupTop;
    if (place === 'bottom') {
      popupTop = baseBottom + pad;
    } else if (place === 'top') {
      popupTop = baseTop - pad - popupHeight;
    } else if (place === 'left' || place === 'right') {
      popupTop = baseTop + rect.height/2 - popupHeight/2; // تقریبی
    } else {
      popupTop = baseTop; // fallback
    }

    // مرکز پاپ‌آپ (با احتساب offset) را وسط viewport بیاور
    const popupCenter = (popupTop + popupOffsetY) + popupHeight/2;
    const viewportCenter = viewportTop + (viewportHeight - stickyTop)/2 + stickyTop;
    nextScrollTop = Math.max(0, Math.round(viewportTop + (popupCenter - viewportCenter)));
  } else {
    // فقط مطمئن شو پاپ‌آپ جا می‌شود
    const desiredTop = baseTop - stickyTop - popupMargin - (place === 'bottom' ? popupHeight : 0);
    const desiredBot = baseBottom + popupMargin + (place === 'top' ? popupHeight : 0);

    if (desiredBot > viewportBottom) nextScrollTop = desiredBot - viewportHeight;
    if (desiredTop < viewportTop)   nextScrollTop = nextScrollTop == null ? Math.max(0, desiredTop) : Math.min(nextScrollTop, Math.max(0, desiredTop));
  }

  if (nextScrollTop != null) {
    if (isWindow) window.scrollTo({ top: nextScrollTop, behavior });
    else scroller.scrollTo({ top: nextScrollTop, behavior });
  }
}

function StepsFor(tab){
  if(tab==="tasks"){
    return [
      {
        id:"welcome",
        // همون سلکتورهای تب‌ها + یک گزینهٔ مستقیم‌تر برای پروژه‌ی خودت
        selector: [
          "[data-tour='tabs']",
          ".top-tabs",
          ".tabs-row",
          ".app-root .tabs",
          ".app-root > div:has(> .tab)"   // در بعضی وب‌ویوها ممکنه کار نکنه؛ بقیه کفایت می‌کنن
        ],
        title:"Welcome to QuestJournal!",
        body:"This app aims to help you live your life like a game. In a sense, when you actually think about it, you are a main character in a RPG adventure! Now, let's dive in and explore how you can use this app to organize your tasks and level up your life.",
        place:"bottom"  // مثل Top Tabs
      },
      {
        id:"tabs",
        selector: [
          "[data-tour='tabs']",
          ".top-tabs",
          ".tabs-row",
          ".app-root .tabs",
          ".app-root > div:has(> .tab)"
        ],
        title:"Top Tabs",
        body:"Switch between the app's main areas: Tasks, Tavern (music playlists), Story, Achievements, and Journal.",
        place:"bottom"
      },
      {
        id:"progress",
        selector: [".progress-shell"],
        title:"Your Progress",
        body:"Track your overall XP progress here. Completing tasks grants XP. Below, each branch of your character grows with related tasks.",
        place:"bottom"
      },
      {
        id:"add",
        selector: [".add.addTaskBar", ".add-task-bar", ".addtask", ".add-task"],
        title:"Add & Allocate XP",
        body:"This is where you add tasks. Click the XP button to assign a base XP, then allocate it to the related sub-attributes.",
        place:"bottom" // می‌ماند bottom، ولی بالاتر نمایش داده می‌شود (ADD_LIFT)
      },
      {
        id:"challenges",
        selector: [".daily-challenges", ".weekly-challenges", ".challenge-list"],
        title:"Daily & Weekly Challenges",
        body:"Finish these to earn extra XP on top of your tasks.",
        place:"top"
      },
    ];
  }
  if(tab==="music"){
    return [
      {
        id:"tavern",
        selector: [".music-tab", ".tavern", ".music"],
        title:"Tavern",
        body:"Upload your focus playlists and listen while you work. As you level up, exclusive playlists unlock for you.",
        place:"bottom"
      }
    ];
  }
  if(tab==="story"){
    return [
      {
        id:"story",
        selector: [".story-tab", ".story"],
        title:"Story",
        body:"This is where your character’s story lives. Add your origin and follow your chronicle as you progress.",
        place:"bottom"
      },
      {
        id:"forest",
        selector: [".sf-forest", ".sf-grid"],
        title:"Skill Forest",
        body:"A forest of your skills. As you level up different branches, you unlock new feats and abilities.",
        place:"top" // برای این استپ، پاپ‌آپ را وسط صفحه می‌آوریم
      }
    ];
  }
  if(tab==="ach"){
    return [
      {
        id:"ach",
        selector: [".achievements", ".ach-hall", ".ach-list"],
        title:"Achievements",
        body:"See your rewards and trophies here. Achievements grant perks that help you earn even more XP.",
        place:"bottom"
      }
    ];
  }
  if(tab==="journal"){
    return [
      {
        id:"journal",
        selector: [".journal", ".journal-tab"],
        title:"Journal",
        body:"Here, you can write a page about your day as if you were a lost rebel, a battle-worn mercenary, or a hermit philosopher.\nNote: Sketch creation is still inactive due to the lack of a free API for image generation models.",
        place:"bottom"
      }
    ];
  }
  return [];
}

export default function Tour({ enabled=true, activeTab="tasks" }){
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useRafState(null);
  const steps = useMemo(()=>StepsFor(activeTab), [activeTab]);
  const tabKey = TAB_KEYS[activeTab];

  useEffect(() => {
    if (!enabled) return setOpen(false);
    const allDone = readFlag(LS_KEY_TAB_DONE);
    const tabDone = tabKey ? readFlag(tabKey) : false;
    if (!allDone && !tabDone) setOpen(true);
  }, [enabled, activeTab, tabKey]);

  // clamp idx on steps change (ضد کرش)
  useEffect(() => {
    if (!open) return;
    if (!steps.length) { setIdx(0); return; }
    setIdx(i => clamp(i, 0, steps.length - 1));
  }, [open, steps.length]);

  /* ------- measure target & auto-scroll so POPUP is visible/centered ------- */
  useLayoutEffect(()=>{
    if(!open || !steps.length) return;
    const step = steps[idx];
    if(!step) return;

    const update = ()=> setRect(getRect(step.selector));
    update();

    const targetEl = (Array.isArray(step.selector)
      ? step.selector.map(s => (typeof s==="string" ? safeQuery(s) : s)).find(Boolean)
      : (typeof step.selector==="string" ? safeQuery(step.selector) : step.selector)) || null;

    const doScroll = () => {
      if (!targetEl) return;
      const tabs = document.querySelector('.top-tabs');
      let stickyTop = 0;
      if (tabs) stickyTop += tabs.getBoundingClientRect().height;

      const place = (step?.id === 'add') ? 'bottom' : (step.place || 'bottom');
      const isAdd = step?.id === 'add';
      const alignPopupCenter = isAdd || step?.id === 'forest'; // Add + Forest را وسط بیاور

      scrollIntoViewForTour(targetEl, {
        popupHeight: 280,            // کمی بزرگ‌تر برای اطمینان
        popupMargin: 16,
        stickyTop,
        behavior: 'smooth',
        place,
        alignPopupCenter,
        popupOffsetY: isAdd ? -ADD_LIFT : 0, // مرکز واقعی پاپ‌آپ با لیفت
      });
    };
    requestAnimationFrame(doScroll);

    let ro = null;
    if (typeof window !== "undefined" && "ResizeObserver" in window && targetEl){
      ro = new ResizeObserver(update);
      ro.observe(targetEl);
    }
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update, true);

    return ()=>{
      if (ro) ro.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update, true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, idx, steps, activeTab]);

  if(!open || !steps.length) return null;

  const step = steps[idx] || steps[0];
  if (!step) return null;

  const vw = window.innerWidth, vh = window.innerHeight;

  /* --------- popup positioning (with 'add' LIFT) --------- */
  const ADD_LIFT = 120; // مقدار بالا بردن برای استپ add (px)

  let top = vh*0.18, left = vw/2, align = "center";
  if(rect){
    const pad = 2;
    const place = (step?.id === 'add') ? 'bottom' : step.place || 'bottom';
    if(place==="bottom"){
      top = clamp(rect.bottom + pad, 8, vh - 8);
      if (step?.id === 'add') top = clamp(top - ADD_LIFT, 8, vh - 8); // بالاتر بیار
      left = clamp(rect.left + rect.width/2, 120, vw - 120);
      align = "center";
    }else if(place==="top"){
      top = clamp(rect.top - pad, 8, vh - 8);
      left = clamp(rect.left + rect.width/2, 120, vw - 120);
      align = "center";
    }else if(place==="left"){
      top = clamp(rect.top + rect.height/2, 8, vh - 8);
      left = clamp(rect.left - pad, 120, vw - 120);
      align = "right";
    }else if(place==="right"){
      top = clamp(rect.top + rect.height/2, 8, vh - 8);
      left = clamp(rect.right + pad, 120, vw - 120);
      align = "left";
    }
  }

  const isLast = idx === steps.length - 1;

  const closeForTab = ()=>{
    setOpen(false);
    if(tabKey) writeFlag(tabKey);
    const allSeen = Object.values(TAB_KEYS).every(k => readFlag(k));
    if(allSeen) writeFlag(LS_KEY_TAB_DONE);
  };

  return (
    <>
      {/* Popup */}
      <div
        className="tour-pop"
        role="dialog"
        aria-live="polite"
        style={{
          position:"fixed",
          zIndex: 9999,
          top,
          left,
          transform: `translate(${align==="center"?"-50%":align==="right"?"-100%":"0"}, ${rect && (((step?.id==='add')? 'bottom' : step.place)==="top"?"-100%":"0")})`,
          maxWidth: "min(420px, 92vw)",
          pointerEvents:"auto"
        }}
      >
        <div className="tour-card">
          <div className="tour-head">
            <strong>{step?.title ?? ""}</strong>
            <button className="tour-x" aria-label="Close" onClick={closeForTab}>×</button>
          </div>
          <div className="tour-body">{step?.body ?? ""}</div>
          <div className="tour-actions">
            <button className="tour-skip" onClick={closeForTab}>Skip</button>
            <div style={{flex:1}} />
            {idx>0 && <button className="tour-btn" onClick={()=>setIdx(i=>clamp(i-1,0,steps.length-1))}>Back</button>}
            <button
              className="tour-btn primary"
              onClick={()=>{
                if(isLast) closeForTab();
                else setIdx(i=>clamp(i+1,0,steps.length-1));
              }}
            >
              {isLast ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>

      {/* Inline styles (scoped) */}
      <style>{`
        .tour-card{
          background: rgba(255,255,255,.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0,0,0,.08);
          box-shadow: 0 8px 28px rgba(0,0,0,.16);
          border-radius: 14px;
          padding: 12px 12px 10px;
          color: #1d2230;
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto;
        }
        .dark .tour-card{ background: rgba(20,22,30,.92); color:#e9ecf3; border-color: rgba(255,255,255,.08); }
        .tour-head{ display:flex; align-items:center; gap:8px; margin-bottom:6px; }
        .tour-head strong{ font-size: 14px; letter-spacing:.2px; }
        .tour-x{
          margin-left:auto; border:0; background:transparent; font-size:18px; line-height:1;
          color:inherit; cursor:pointer; opacity:.7;
        }
        .tour-x:hover{ opacity:1; }
        .tour-body{ font-size: 13px; line-height: 1.45; opacity:.92; }
        .tour-actions{ display:flex; align-items:center; gap:8px; margin-top:10px; }
        .tour-btn, .tour-skip{
          border:1px solid rgba(0,0,0,.12);
          background:#fff; color:#111; padding:6px 10px; border-radius:10px; font-size:12px; cursor:pointer;
        }
        .dark .tour-btn, .dark .tour-skip{ background:#1d2230; color:#e9ecf3; border-color: rgba(255,255,255,.12); }
        .tour-btn.primary{ background:#3b82f6; border-color:#3b82f6; color:#fff; }
        .tour-skip{ background:transparent; border-color:transparent; text-decoration: underline; opacity:.8; }
        .tour-skip:hover{ opacity:1; }
        @media (max-width: 480px){
          .tour-card{ border-radius: 12px; padding: 10px; }
          .tour-body{ font-size: 12px; }
        }
      `}</style>
    </>
  );
}