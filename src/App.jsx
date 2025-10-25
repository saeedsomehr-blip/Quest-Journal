﻿// src/App.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import AchievementAnimationOverlay from "./components/AchievementAnimationOverlay.jsx";
import { getAchievementAnimation } from "./core/achievementAnimations.js";
import usePersist from "./hooks/usePersist.js";
import useTick from "./hooks/useTick.js";
import useTouchClass from "./hooks/useTouchClass.js";
import useTheme from "./hooks/useTheme.js";
import useToastQueue from "./hooks/useToastQueue.js";
import { uid, PRAISES, SYMBOLS } from "./utils/constants.js";
import { levelProgress } from "./core/gamify.js";
import {
  loadTasks, saveTasks, loadXP, saveXP,
  loadLists, saveLists, loadActiveListId, saveActiveListId
} from "./core/storage.js";
import {
  loadDailyTemplates, saveDailyTemplates, loadWeeklyTemplates, saveWeeklyTemplates,
  ensureTodayState, ensureWeekState, DEFAULT_DAILY_XP, DEFAULT_WEEKLY_XP,
  todayStr, weekKeyOf, saveTodayState, saveWeekState, dayNameOf
} from "./core/challenges.js";
import {
  loadAchievements, saveAchievements, evaluateAchievements,
  reconcileAchievementsWithCatalog, ACH_CATALOG
} from "./core/achievements.js";
import { mergePerksFromAchievements, loadMultiXP, saveMultiXP } from "./core/multixp.js";
import { computeDeadlineISO, nextDeadline } from "./core/dates.js";
import { timeLeft } from "./utils/time.js";
import { playRandomSfx } from "./utils/sfx.js";
import JournalTab from "./components/JournalTab.jsx";
import { awardXPForTask, primaryBranchOf, releaseMilestonePayouts } from "./core/award.js";
import { loadProfile, saveProfile, migrateProfileFromLegacy, defaultProfile } from "./core/profile.js";
import { evaluateNewPerks, applyPerkEffects } from "./core/perkEngine.js";
import "./achievements-glow.css";
import TaskRow from "./components/TaskRow.jsx";
import { QUEST_TYPES } from "./core/constants.js";
import MusicTab from "./components/MusicTab.jsx";
import TopTabs from "./components/TopTabs.jsx";
import CalendarTab from "./components/CalendarTab.jsx";
import AppHeader from "./components/AppHeader.jsx";
import AddTaskBar from "./components/AddTaskBar.jsx";
import TopAchievements from "./components/TopAchievements.jsx";
import StoryTab from "./components/StoryTab.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import AchievementsHall from "./components/AchievementsHall.jsx";
import { MusicProvider } from "./ctx/MusicContext.jsx";
import GlobalPlayer from "./components/GlobalPlayer.jsx";
import ThemeStage from "./theme/ThemeStage.jsx";
// Non-intrusive guided tour (mask disabled)
import Tour from "./Tour.jsx";

/** 🔁 Cloud Sync via hook (Firebase logic is outside App) */
import { useCloudSync } from "./sync/useCloudSync";
import * as Sync from "./sync/index.js";

/* =========================
   App helpers
   ========================= */
// ✅ inbox را هم اضافه کردیم تا با لایهٔ استوریج یکی باشد
const DEFAULT_LISTS = [
  { id: "all", name: "All Quests" },
  { id: "main", name: "main quests" },
  { id: "side", name: "side quests" },
  { id: "contracts", name: "contracts" },
  { id: "inbox", name: "Inbox" },
];
const normalizeQuestType = (value) => {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "BASIC";
  return QUEST_TYPES[raw] ? raw : "BASIC";
};
const stamp = (obj) => ({ ...obj, updatedAt: new Date().toISOString() });

function makeEmptyAchievements() { return reconcileAchievementsWithCatalog({}, ACH_CATALOG); }
function clearLocalStorageByPrefix(prefix) {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  } catch {}
}

/* ---------- Merge helpers for remote apply ---------- */
const ts = (x) => {
  if (!x) return 0;
  if (typeof x === "string") return Date.parse(x) || 0;
  if (typeof x === "number") return x;
  return 0;
};
function mergeTasksByUpdatedAt(localArr, remoteArr) {
  const local = Array.isArray(localArr) ? localArr : [];
  const remote = Array.isArray(remoteArr) ? remoteArr : [];
  const map = new Map();
  for (const t of local) map.set(t.id, t);
  for (const r of remote) {
    const l = map.get(r.id);
    if (!l) {
      map.set(r.id, r);
    } else {
      const lt = ts(l.updatedAt || l.deletedAt || l.doneAt || l.createdAt);
      const rt = ts(r.updatedAt || r.deletedAt || r.doneAt || r.createdAt);
      if (rt > lt) {
        map.set(r.id, r);
      } else if (lt > rt) {
        map.set(r.id, l);
      } else {
        const lDel = !!l.deleted;
        const rDel = !!r.deleted;
        map.set(r.id, rDel && !lDel ? r : l);
      }
    }
  }
  // نگه‌داشتن آیتم‌های صرفاً لوکال (برای جلوگیری از رول‌بک)،
  // آیتم‌های صرفاً ریموت هم که اضافه شدند داخل map هستند.
  return Array.from(map.values());
}
function mergeCalendarEventsByUpdatedAt(localArr, remoteArr) {
  const local = Array.isArray(localArr) ? localArr : [];
  const remote = Array.isArray(remoteArr) ? remoteArr : [];
  const map = new Map();
  for (const t of local) if (t?.id) map.set(t.id, t);
  for (const r of remote) {
    if (!r?.id) continue;
    const l = map.get(r.id);
    if (!l) { map.set(r.id, r); continue; }
    const lt = ts(l.updatedAt || l.end || l.start);
    const rt = ts(r.updatedAt || r.end || r.start);
    map.set(r.id, rt >= lt ? r : l);
  }
  return Array.from(map.values());
}
function ensureListsPresent(arr) {
  const ids = new Set((arr || []).map(x => x?.id));
  const out = Array.isArray(arr) ? arr.slice() : [];
  if (!ids.has("all")) out.push({ id: "all", name: "All Quests" });
  if (!ids.has("inbox")) out.push({ id: "inbox", name: "Inbox" });
  // dedupe by id
  const seen = new Set();
  return out.filter(x => {
    const id = x?.id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return !!x?.name;
  });
}
function coerceActiveId(activeId, lists) {
  const has = (lid) => lists.some(x => x.id === lid);
  if (has(activeId)) return activeId;
  if (has("main")) return "main";
  if (has("inbox")) return "inbox";
  return (lists[0]?.id) || "main";
}

/* =========================
   Subtask cap helpers
   ========================= */
function toChildXpValue(xp, parentBase) {
  if (typeof xp === "string" && xp.trim().endsWith("%")) {
    const pct = parseFloat(xp) || 0;
    return Math.max(0, Math.round((pct / 100) * parentBase));
  }
  return Math.max(0, parseInt(xp || 0, 10) || 0);
}
function sumChildXP(children, parentBase) {
  return (children || []).reduce((a, c) => a + toChildXpValue(c?.xp, parentBase), 0);
}
function usedChildPercent(children, parentBase) {
  if (!parentBase || parentBase <= 0) return 0;
  const sum = sumChildXP(children, parentBase);
  return Math.round((sum / parentBase) * 100);
}

export default function App() {
  const [tab, setTab] = useState("tasks");
  useTouchClass();

  // ===== Persisted =====
  const [lists, setLists] = usePersist("qj_lists", () => (loadLists()?.length ? loadLists() : DEFAULT_LISTS));
  const [activeListId, setActiveListId] = usePersist("qj_active_list", () => loadActiveListId() || "main");
  const [tasks, setTasks] = usePersist("qj_tasks", () => {
    const arr = loadTasks();
    return arr.map(t => {
      const branch = (t.xpAwards && typeof t.xpAwards === "object") ? primaryBranchOf(t.xpAwards) : null;
      const category = t.category || (branch === "SOCIAL" ? "social" : branch === "WISDOM" ? "learning" : branch === "HEALTH" ? "health" : undefined);
      const questRaw = typeof t.questType === "string" ? t.questType.trim().toUpperCase() : "BASIC";
      const questType = QUEST_TYPES[questRaw] ? questRaw : "BASIC";
      return {
        ...t,
        listId: t.listId ?? "inbox",
        parentId: t.parentId ?? null,
        category, questType,
        updatedAt: t.updatedAt || t.doneAt || t.createdAt || new Date().toISOString(),
      };
    });
  });
  const [xp, setXp] = usePersist("qj_xp", loadXP);
  // Calendar free events (independent of tasks)
  const [calendarEvents, setCalendarEvents] = usePersist("qj_calendar_events", () => []);
  const [settings, setSettings] = usePersist("qj_settings_v1", () => ({ dark:false, animations:true, sounds:true, skin:"fairy" }));
  const [dailyTpl, setDailyTpl] = usePersist("qj_daily_tpl", loadDailyTemplates);
  const [weeklyTpl, setWeeklyTpl] = usePersist("qj_weekly_tpl", loadWeeklyTemplates);
  const [day, setDay] = usePersist("qj_day_state", () => ({ ...ensureTodayState(loadDailyTemplates()), updatedAt: Date.now() }));
  const [week, setWeek] = usePersist("qj_week_state", () => ({ ...ensureWeekState(loadWeeklyTemplates()), updatedAt: Date.now() }));
  const [ach, setAch] = usePersist("qj_ach", () => {
    const reconciled = reconcileAchievementsWithCatalog(loadAchievements(), ACH_CATALOG);
    try { saveAchievements(reconciled); } catch {}
    return reconciled;
  });
  const [origin, setOrigin] = usePersist("qj_story_origin", () => "");

  // Profile
  const [profileVersion, setProfileVersion] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    migrateProfileFromLegacy();
    const p = loadProfile() || {};
    if (!p.name) setProfileOpen(true);
    else setProfileName(p.name);
  }, []);

  function saveProfileName() {
    const name = (profileName || "").trim(); if (!name) return;
    const prev = loadProfile() || {};
    saveProfile({ ...prev, name, createdAt: prev.createdAt || new Date().toISOString(), updatedAt: Date.now() });
    enqueueToast(`Welcome, ${name}!`, 1500);
    setProfileVersion(v => v + 1);
    setProfileOpen(false);
  }

  // UI + misc state
  const [completedOpen, setCompletedOpen] = useState(true);
  const [anim, setAnim] = useState({ visible: false, url: "", message: "" });
  const [achQueue, setAchQueue] = useState([]);
  const { currentToast, enqueueToast } = useToastQueue(1500);
  const [symbols, setSymbols] = useState([]);
  const [text, setText] = useState("");
  const [aiText, setAiText] = useState("");
  const [xpInput, setXpInput] = useState("");
  const [deadlineAmt, setDeadlineAmt] = useState("");
  const [deadlineUnit, setDeadlineUnit] = useState("h");
  const [absoluteDue, setAbsoluteDue] = useState(null);
  const [desc, setDesc] = useState("");
  const [recur, setRecur] = useState("none");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const now = useTick(1000);

  // Rollover daily/weekly
  useEffect(() => {
    try { if (!day || day.date !== todayStr()) setDay(() => ({ ...ensureTodayState(dailyTpl), updatedAt: Date.now() })); } catch {}
    try { const wk = weekKeyOf(); if (!week || week.weekKey !== wk) setWeek(() => ({ ...ensureWeekState(weeklyTpl), updatedAt: Date.now() })); } catch {}
  }, [now, day?.date, week?.weekKey, dailyTpl, weeklyTpl]);

  // Theme
  useTheme(settings);

  // Level/Progress
  const { level, into, span, nextIn } = useMemo(() => levelProgress(xp), [xp]);
  const progressPct = Math.min(100, (into / Math.max(1, span)) * 100);
  const prevLevelRef = useRef(level);
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (!settings.animations) return;
    if (level > prevLevelRef.current) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 1500);
      prevLevelRef.current = level;
      return () => clearTimeout(t);
    }
    prevLevelRef.current = level;
  }, [level, settings.animations]);

  // Roots and children
  const childrenOf = (id) => tasks.filter(t => t.parentId === id && !t.deleted);
  const rootsOpen = useMemo(
    () => tasks.filter(t => !t.parentId && !t.deleted && (activeListId === "all" || t.listId === activeListId) && !t.done),
    [tasks, activeListId]
  );
  const rootsDone = useMemo(
    () => tasks.filter(t => !t.parentId && !t.deleted && (activeListId === "all" || t.listId === activeListId) && t.done),
    [tasks, activeListId]
  );

  // Save mirrors
  useEffect(() => {
    try {
      saveLists(lists); saveActiveListId(activeListId); saveTasks(tasks); saveXP(xp);
      saveDailyTemplates(dailyTpl); saveWeeklyTemplates(weeklyTpl);
      saveTodayState(day); saveWeekState(week); saveAchievements(ach);
    } catch {}
  }, [lists, activeListId, tasks, xp, dailyTpl, weeklyTpl, day, week, ach]);

  // GC: purge tombstoned tasks older than 30 days
  useEffect(() => {
    const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
    const cutoff = Date.now() - TTL_MS;
    // quick pre-check to avoid unnecessary setTasks
    let needsPurge = false;
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      if (t && t.deleted) {
        const del = ts(t.deletedAt);
        if (del && del < cutoff) { needsPurge = true; break; }
      }
    }
    if (!needsPurge) return;
    setTasks(prev => {
      const out = prev.filter(t => {
        if (!t?.deleted) return true;
        const del = ts(t.deletedAt);
        return !(del && del < cutoff);
      });
      return out.length === prev.length ? prev : out;
    });
  }, [tasks, setTasks]);

  // Perk merge when achievements change
  useEffect(() => { try { mergePerksFromAchievements(ach); } catch {} }, [ach]);

  // Achievement evaluation
  const lastActionRef = useRef(null); // 'add' | 'remove' | 'complete' | 'daily' | 'weekly' | null
  const isAwardAllowed = () => ["complete", "daily", "weekly"].includes(lastActionRef.current || "");
  useEffect(() => {
    const ctx = { tasks, level };
    const next = evaluateAchievements(ctx, ach, (payload) => {
      if (!isAwardAllowed()) return;
      try {
        const globalDelta = Number(payload?.global || 0);
        const multi = payload?.multi && typeof payload.multi === "object" ? payload.multi : null;
        const reason = payload?.reason || "Achievement";
        if (globalDelta) setXp(prev => prev + globalDelta);
        if (multi && Object.keys(multi).length) {
          const pseudo = { id: `ach_${Date.now()}`, title: reason, baseXp: 0, xpAwards: multi };
          awardXPForTask(pseudo, () => {}, false);
        }
        const m = /^Achievement:\s*(.+)$/.exec(reason);
        const label = m ? m[1] : null;
        if (settings?.animations !== false && label) {
          const conf = getAchievementAnimation(label);
          if (conf?.url) setAchQueue(q => [...q, { url: conf.url, message: conf.message || label }]);
        }
      } catch (e) { console.warn("Achievement awardFn failed:", e); }
    });
    if (JSON.stringify(next) !== JSON.stringify(ach)) setAch(next);
    lastActionRef.current = null;
  }, [tasks, level]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drain achievement animation queue
  useEffect(() => {
    if (!anim.visible && !anim.url && achQueue.length > 0) {
      const nxt = achQueue[0];
      setAnim({ visible: true, url: nxt.url, message: nxt.message });
      setAchQueue(q => q.slice(1));
    }
  }, [anim.visible, anim.url, achQueue]);

  const addSymbol = (char) => setSymbols(s => [...s.slice(-24), { id: uid(), char }]);

  function applyMilestonePayouts(task, subs) {
    let updatedSubs = subs;
    try {
      const payout = releaseMilestonePayouts(
        { ...task, subtasks: updatedSubs },
        { incGlobalXP: delta => setXp(prev => prev + delta) }
      );
      if (Array.isArray(payout?.applied) && payout.applied.length > 0) {
        const paidSet = new Set(payout.applied);
        updatedSubs = updatedSubs.map((sub, idx) => {
          if (!sub?.isMilestone) return sub;
          const key = `task:${task.id || '?'}:ms:${sub.id || idx}`;
          return paidSet.has(key) ? { ...sub, paid: true } : sub;
        });
      }
    } catch {}
    return updatedSubs;
  }

  // ===== Defaults / Reset =====
  function packDefaultState(opts = {}) {
    const { achMode = "fromStorage" } = opts; // "empty" | "fromStorage"
    const baseDaily = loadDailyTemplates();
    const baseWeekly = loadWeeklyTemplates();
    const nowTs = Date.now();
    return {
      v: 1,
      updatedAt: nowTs,
      meta: { updatedAt: nowTs }, // compat for older builds
      lists: DEFAULT_LISTS, activeListId: "main", tasks: [], xp: 0,
      dailyTpl: baseDaily, weeklyTpl: baseWeekly,
      day: { ...ensureTodayState(baseDaily), updatedAt: nowTs },
      week: { ...ensureWeekState(baseWeekly), updatedAt: nowTs },
      ach: achMode === "empty"
        ? makeEmptyAchievements()
        : reconcileAchievementsWithCatalog(loadAchievements(), ACH_CATALOG),
      origin: "", settings: { dark:false, animations:true, sounds:true, skin:"fairy" },
      profile: loadProfile() || {},
    };
  }
  function resetLocalToDefaults() {
    const d = packDefaultState({ achMode: "empty" });
    setLists(d.lists); setActiveListId(d.activeListId); setTasks(d.tasks); setXp(d.xp);
    setDailyTpl(d.dailyTpl); setWeeklyTpl(d.weeklyTpl); setDay(d.day); setWeek(d.week);
    setAch(d.ach); setOrigin(d.origin); setSettings(d.settings); saveProfile(d.profile);
  }
  function hardResetAccount() {
    clearLocalStorageByPrefix("qj_cache_v1:");
    clearLocalStorageByPrefix("qj_multixp");
    clearLocalStorageByPrefix("qj_stats_today_");
    clearLocalStorageByPrefix("qj_stats_week_");
    try {
      localStorage.removeItem("qj_last_uid");
      localStorage.removeItem("qj_day_state");
      localStorage.removeItem("qj_week_state");
      localStorage.removeItem("qj_multi_xp_v1");
    } catch {}

    const baseDaily = loadDailyTemplates();
    const baseWeekly = loadWeeklyTemplates();
    const emptyAch = makeEmptyAchievements();

    try {
      const prev = loadProfile() || {};
      saveProfile({
        name: prev?.name || "",
        perks: { owned: [] },
        counters: {},
        createdAt: prev.createdAt || new Date().toISOString(),
        updatedAt: Date.now()
      });
    } catch {}

    setLists(DEFAULT_LISTS);
    setActiveListId("main");
    setTasks([]); setXp(0);

    setDailyTpl(baseDaily); setWeeklyTpl(baseWeekly);
    const freshDay  = { ...ensureTodayState(baseDaily),  completedIds: [], updatedAt: Date.now() };
    const freshWeek = { ...ensureWeekState(baseWeekly), completedIds: [], updatedAt: Date.now() };
    setDay(freshDay); setWeek(freshWeek);

    setAch(emptyAch); setOrigin("");
    setSettings({ dark:false, animations:true, sounds:true, skin:"fairy" });
    setSymbols([]); setAchQueue([]); setAnim({ visible: false, url: "", message: "" });
    setProfileVersion(v => v + 1);
  }

  async function resetCloudAccount() {
    try {
      const defaults = packDefaultState({ achMode: "empty" });
      // For cloud reset, also reset the profile entirely (including lifetime counters/perks)
      try { defaults.profile = defaultProfile("reset"); } catch {}
      // 1) کلود را با فکتوری دیفالت جایگزین کن
      await Sync.resetRemoteToDefaults(defaults);

      // 2) لوکال را هم فوراً با همان دیفالت‌ها هم‌راستا کن
      setLists(defaults.lists);
      setActiveListId(defaults.activeListId);
      setTasks(defaults.tasks);
      setXp(defaults.xp);
      setDailyTpl(defaults.dailyTpl);
      setWeeklyTpl(defaults.weeklyTpl);
      setDay(defaults.day);
      setWeek(defaults.week);
      setAch(defaults.ach);
      setOrigin(defaults.origin);
      setSettings(defaults.settings);
      try { saveProfile(defaults.profile); } catch {}

      // 3) مارکرهای سینک را پاک کن تا بوت بعدی Cloud→Local باشد، نه برعکس
      try {
        localStorage.removeItem("qj_last_local_updated");
        const uid = (Sync.getUser?.() || {}).uid || (typeof window !== "undefined" ? "" : "");
        if (uid) localStorage.removeItem(`qj_last_local_updated:${uid}`);
        localStorage.removeItem("qj_last_uid");
      } catch {}

      enqueueToast("Cloud state reset (and local aligned)", 1500);
    } catch (e) {
      console.warn("Cloud reset failed:", e);
      enqueueToast("Cloud reset failed", 1500);
    }
  }

  // ===== Actions =====
  function addTask(payload = {}) {
    lastActionRef.current = "add";
    const providedTitle = typeof payload.title === "string" ? payload.title.trim() : "";
    const fallbackTitle = (text || aiText).trim();
    const title = providedTitle || fallbackTitle; if (!title) return;

    const baseCandidate = payload.baseXp ?? payload.xpBase ?? xpInput ?? 1;
    const baseXp = Math.max(1, parseInt(baseCandidate, 10) || 1);
    const xpAwards = (payload.xpAwards && typeof payload.xpAwards === "object") ? payload.xpAwards : {};

    const questType = normalizeQuestType(payload.questType);
    const primary = payload.primaryBranch ?? primaryBranchOf(xpAwards);
    const category = payload.category ?? (primary === "SOCIAL" ? "social" : primary === "WISDOM" ? "learning" : primary === "HEALTH" ? "health" : undefined);

    const descValue = (typeof payload.description === "string" ? payload.description : (payload.desc ?? desc ?? "")).trim();
    const createdAt = typeof payload.createdAt === "string" ? payload.createdAt : new Date().toISOString();
    const recurValue = payload.recur ?? recur;

    const deadline = payload.deadline ?? computeDeadlineISO({
      absoluteDue: payload.absoluteDue ?? absoluteDue,
      deadlineAmt: payload.deadlineAmt ?? deadlineAmt,
      deadlineUnit: payload.deadlineUnit ?? deadlineUnit,
      now: Date.now()
    });

    const listId = payload.listId ?? activeListId;
    const subtasks = Array.isArray(payload.subtasks)
      ? payload.subtasks.map((sub, idx) => ({
          ...sub,
          id: sub?.id || `ms_${idx + 1}`,
          isMilestone: !!sub?.isMilestone,
          milestoneWeight: Math.max(0, parseInt(sub?.milestoneWeight ?? sub?.weight ?? 0, 10) || 0),
          done: !!sub?.done, paid: !!sub?.paid,
        }))
      : undefined;
    const escrow = (payload.escrow && typeof payload.escrow === "object")
      ? { mode: payload.escrow.mode || (QUEST_TYPES[questType]?.escrow ?? "none"), paid: !!payload.escrow.paid }
      : { mode: QUEST_TYPES[questType]?.escrow ?? "none", paid: false };

    setTasks(p => [stamp({
      id: uid(), title,
      ...(descValue ? { desc: descValue } : {}),
      recur: recurValue,
      xp: baseXp, baseXp, xpBase: baseXp,
      xpAwards, ...(category ? { category } : {}),
      questType, escrow,
      done: !!payload.done && payload.done !== false,
      createdAt, deadline, parentId: payload.parentId ?? null, listId,
      ...(Array.isArray(subtasks) ? { subtasks } : {})
    }), ...p]);

    setText(""); setAiText(""); setXpInput("");
    setDeadlineAmt(""); setDeadlineUnit("h"); setAbsoluteDue(null);
    setDesc(""); setRecur("none");
  }

  function onAddSubtask(parentId, title, subXP, after) {
    const t = (title || "").trim(); if (!t) return;

    const parent = tasks.find(x => x.id === parentId);
    const parentListId = parent?.listId || activeListId;
    const parentBase = Math.max(1, parseInt(parent?.baseXp ?? parent?.xp ?? 1, 10) || 1);

    const currentKids = tasks.filter(x => x.parentId === parentId);
    const consumedPct = usedChildPercent(currentKids, parentBase);
    const capReached = consumedPct >= 200;

    let finalXP;
    if (capReached) {
      finalXP = 1;
    } else if (typeof subXP === "string" && subXP.trim().endsWith("%")) {
      const pct = Math.max(1, Math.min(200, parseInt(subXP.trim().slice(0, -1), 10) || 0));
      finalXP = Math.max(1, Math.round(parentBase * (pct / 100)));
    } else {
      finalXP = Math.max(1, parseInt(subXP || 1, 10));
    }

    setTasks(p => [stamp({
      id: uid(),
      title: t,
      xp: finalXP,
      done: false,
      createdAt: new Date().toISOString(),
      deadline: null,
      parentId,
      listId: parentListId,
    }), ...p]);

    after && after();
  }

  function onRenameTitle(taskId, newTitle) {
    const v = (newTitle || "").trim(); if (!v) return;
    setTasks(prev => prev.map(t => t.id === taskId ? stamp({ ...t, title: v }) : t));
  }

  function markMilestoneDone(taskId, milestoneKey) {
    if (!taskId) return;
    let celebration = null;
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === taskId); if (idx === -1) return prev;
      const task = prev[idx];
      const subs = Array.isArray(task.subtasks) ? task.subtasks : [];
      if (subs.length === 0) return prev;

      const targetIndex = subs.findIndex((s, i) => (s?.id ?? String(i)) === milestoneKey);
      if (targetIndex === -1) return prev;
      const target = subs[targetIndex];
      if (!target?.isMilestone || target.done) return prev;

      const weight = Math.max(0, Number(target?.milestoneWeight) || 0);
      celebration = { taskTitle: task.title, milestoneTitle: target?.title || null, weight };

      const stampAt = new Date().toISOString();
      let updatedSubs = subs.map((sub, i) => (i === targetIndex ? { ...sub, done: true, doneAt: sub?.doneAt || stampAt } : { ...sub }));
      let updatedTask = { ...task, subtasks: updatedSubs };
      updatedSubs = applyMilestonePayouts(updatedTask, updatedSubs);
      updatedTask = { ...updatedTask, subtasks: updatedSubs };

      const next = prev.slice(); next[idx] = stamp(updatedTask); return next;
    });

    if (celebration) {
      playRandomSfx();
      const baseLabel = celebration.milestoneTitle ? `Milestone complete: ${celebration.milestoneTitle}` : "Milestone complete!";
      const weightSuffix = celebration.weight > 0 ? ` (+${celebration.weight}%)` : "";
      enqueueToast(baseLabel + weightSuffix, 1500);
    }
  }

  function awardWithPerks(taskForAward) {
    const prof = loadProfile();
    const owned = prof?.perks?.owned || [];
    const rawAwards = taskForAward?.xpAwards && typeof taskForAward.xpAwards === "object" ? taskForAward.xpAwards : {};
    const effAwards = applyPerkEffects(rawAwards, owned);
    const enriched = { ...taskForAward, xpAwards: effAwards };
    awardXPForTask(enriched, (delta) => setXp(prev => prev + delta));

    const post = loadProfile();
    const newly = evaluateNewPerks(post, owned, { level });
    if (newly.length) {
      post.perks ??= { owned: [] };
      const nextOwned = [...new Set([...(post.perks.owned || []), ...newly.map(p => p.id)])];
      post.perks.owned = nextOwned;
      saveProfile({ ...post, updatedAt: Date.now() });

      const verify = loadProfile();
      const ownedSet = new Set(verify?.perks?.owned || []);
      newly.filter(p => ownedSet.has(p.id)).forEach(p => enqueueToast(`🎉 Perk unlocked: ${p.label}!`, 1800));
      setSymbols(s => [...s.slice(-24), { id: uid(), char: "✨" }]);
    }
    setProfileVersion(v => v + 1);
  }

  function toggleTask(id) {
    const current = tasks.find(x => x.id === id);
    if (!current) return;

    const turningDone = !current.done;
    const timestamp = new Date().toISOString();

    let preparedSubs = null;
    if (turningDone && current?.escrow?.mode === "milestone" && Array.isArray(current.subtasks)) {
      preparedSubs = current.subtasks.map(sub => {
        if (!sub) return sub;
        if (!sub?.isMilestone) return { ...sub };
        return { ...sub, done: true, doneAt: sub?.doneAt || timestamp, paid: !!sub?.paid };
      });
      preparedSubs = applyMilestonePayouts(current, preparedSubs);
    }

    const updatedTask = stamp({
      ...current, done: !current.done,
      ...(turningDone ? { deadline: null, doneAt: timestamp } : {}),
      ...(preparedSubs ? { subtasks: preparedSubs } : {}),
    });

    setTasks(prev => prev.map(t => (t.id === id ? updatedTask : t)));

    if (turningDone) {
      lastActionRef.current = "complete";

      let taskForAward = current;
      if (current?.escrow?.mode === "milestone") {
        const subsForWeight = Array.isArray(preparedSubs) ? preparedSubs : (Array.isArray(current.subtasks) ? current.subtasks : []);
        const paidWeight = subsForWeight.reduce((acc, sub) => (!sub?.isMilestone || !sub.paid) ? acc : acc + Math.max(0, Number(sub?.milestoneWeight) || 0), 0);
        const baseValue = Math.max(0, parseInt(current.baseXp ?? current.xp ?? 0, 10) || 0);
        const remainingPortion = Math.max(0, Math.min(1, (100 - paidWeight) / 100));
        const scaledBase = Math.round(baseValue * remainingPortion);
        const scaledAwards = {};
        if (current.xpAwards && typeof current.xpAwards === "object") {
          Object.entries(current.xpAwards).forEach(([k, v]) => {
            const val = Math.max(0, parseInt(v, 10) || 0); if (val <= 0) return;
            const scaled = Math.round(val * remainingPortion); if (scaled > 0) scaledAwards[k] = scaled;
          });
        }
        taskForAward = { ...current, baseXp: scaledBase, xpBase: scaledBase, xpAwards: scaledAwards, allowZeroBase: true };
      }

      awardWithPerks(taskForAward);
      playRandomSfx();
      enqueueToast(PRAISES[Math.floor(Math.random()*PRAISES.length)], 1500);
      addSymbol(SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)]);

      if (current.recur && current.recur !== "none") {
        const nd = nextDeadline(current);
        setTasks(p => [stamp({
          id: uid(), title: current.title, desc: current.desc, recur: current.recur,
          xp: current.baseXp ?? current.xp ?? 1, baseXp: current.baseXp ?? current.xp ?? 1,
          xpAwards: current.xpAwards || {}, category: current.category,
          questType: normalizeQuestType(current.questType),
          done: false, createdAt: new Date().toISOString(), deadline: nd,
          parentId: null, listId: current.listId || activeListId
        }), ...p]);
      }
    } else {
      lastActionRef.current = null;
    }
  }

  function removeTask(id) {
    lastActionRef.current = "remove";
    const rm = new Set([id]); const stack = [id];
    while (stack.length) {
      const cur = stack.pop();
      tasks.forEach(t => { if (t.parentId === cur) { rm.add(t.id); stack.push(t.id); } });
    }
    const timestamp = new Date().toISOString();
    setTasks(p => p.map(t => rm.has(t.id) ? stamp({ ...t, deleted: true, deletedAt: timestamp }) : t));
  }
  function removeTaskWithConfirm(id) {
    const t = tasks.find(x => x.id === id);
    const title = t?.title ? `"${t.title}"` : "this task";
    if (confirm(`Delete ${title}? All its subtasks will also be removed.`)) removeTask(id);
  }

  function completePick({ kind, tplId }) {
    if (kind === "daily") {
      if (day.completedIds.includes(tplId)) return;
      lastActionRef.current = "daily";
      setDay(st => ({ ...st, completedIds: [...st.completedIds, tplId], updatedAt: Date.now() }));
      setXp(x => x + (dailyTpl.find(t => t.id === tplId)?.xp ?? DEFAULT_DAILY_XP));
      playRandomSfx(); enqueueToast("✅ Daily complete!", 1200); setSymbols(s => [...s, { id: uid(), char: "✨" }]);
    } else if (kind === "weekly") {
      if (week.completedIds.includes(tplId)) return;
      lastActionRef.current = "weekly";
      setWeek(st => ({ ...st, completedIds: [...st.completedIds, tplId], updatedAt: Date.now() }));
      setXp(x => x + (weeklyTpl.find(t => t.id === tplId)?.xp ?? DEFAULT_WEEKLY_XP));
      playRandomSfx(); enqueueToast("🔥 Weekly complete!", 1200); setSymbols(s => [...s, { id: uid(), char: "💥" }]);
    }
  }

  /* =========================
     🔁 Cloud Sync — via hook
     ========================= */
  function packState() {
    const profile = loadProfile() || {};
    const multiXp = (() => { try { return loadMultiXP(); } catch { return null; } })();
    const nowTs = Date.now();
    return {
      v: 1,
      updatedAt: nowTs,
      meta: { updatedAt: nowTs },
      lists, activeListId, tasks, xp,
      dailyTpl, weeklyTpl, day, week, ach, origin, settings, profile,
      ...(multiXp ? { multiXp } : {}),
      calendarEvents,
    };
  }

  // ✅ applyRemote: مرج امن با توجه به updatedAt و نرمال‌سازی لیست‌ها
  const applyRemote = useCallback((remote = {}) => {
    // Detect a cloud reset epoch (set by sync layer) to force hard-apply for tasks
    let epochForcesTasksReset = false;
    try {
      const re = Number(remote?.resetEpoch || 0);
      const uid = (Sync.getUser?.() || {}).uid || "";
      if (uid && re) {
        const le = Number(localStorage.getItem(`qj_reset_epoch:${uid}`) || 0);
        epochForcesTasksReset = re > le;
      }
    } catch {}
    // lists + activeListId
    if (remote.lists) {
      const norm = ensureListsPresent(remote.lists);
      setLists(norm);
      // اگر از ریموت activeListId آمد، ولی وجود نداشت، یک fallback امن بزن
      const nextActive = coerceActiveId(remote.activeListId || activeListId, norm);
      setActiveListId(nextActive);
    } else if (remote.activeListId) {
      // اگر فقط activeListId آمد، مطمئن شو داخل لیست‌های فعلی معتبر است
      setActiveListId(prev => coerceActiveId(remote.activeListId, lists));
    }

    // tasks: مرج per-id با updatedAt
    if (remote.tasks) {
      if (epochForcesTasksReset) {
        setTasks(Array.isArray(remote.tasks) ? remote.tasks : []);
        // Also clear local-only caches that could re-materialize achievements/perks
        try {
          clearLocalStorageByPrefix("qj_stats_today_");
          clearLocalStorageByPrefix("qj_stats_week_");
        } catch {}
        try { localStorage.removeItem("qj_multi_xp_v1"); } catch {}
        try { localStorage.removeItem("qj_multixp_state_v1"); } catch {}
      } else {
        setTasks(prev => mergeTasksByUpdatedAt(prev, remote.tasks));
      }
    }

    // xp و بقیهٔ اسکالرها/آرایه‌ها: به لایهٔ سینک اعتماد می‌کنیم
    if (Number.isFinite(remote.xp)) setXp(remote.xp);
    if (remote.dailyTpl) setDailyTpl(remote.dailyTpl);
    if (remote.weeklyTpl) setWeeklyTpl(remote.weeklyTpl);

    // day/week: فقط اگر ریموت جدیدتر است
    if (remote.day && ts(remote.day.updatedAt) > ts(day?.updatedAt)) setDay(remote.day);
    if (remote.week && ts(remote.week.updatedAt) > ts(week?.updatedAt)) setWeek(remote.week);

    if (remote.ach) setAch(remote.ach);
    if (typeof remote.origin === "string") setOrigin(remote.origin);
    if (remote.settings) setSettings(remote.settings);

    // multi-XP branches/perks/synergies: accept remote snapshot as authoritative
    if (remote.multiXp && typeof remote.multiXp === "object") {
      try { saveMultiXP(remote.multiXp); } catch {}
    }

    // calendar free events: merge by id using updatedAt
    if (remote.calendarEvents && Array.isArray(remote.calendarEvents)) {
      setCalendarEvents(prev => mergeCalendarEventsByUpdatedAt(prev, remote.calendarEvents));
    }

    if (remote.profile) {
      // Merge profile from remote, but don't overwrite a non-empty local name with an empty remote name
      const localProf = (() => { try { return loadProfile() || {}; } catch { return {}; } })();
      const finalProfile = { ...defaultProfile(), ...remote.profile };
      if ((!finalProfile.name || !String(finalProfile.name).trim()) && localProf?.name) {
        finalProfile.name = localProf.name;
      }
      saveProfile(finalProfile); setProfileVersion(v => v + 1);
    }
  }, [activeListId, day?.updatedAt, week?.updatedAt, lists, setLists, setActiveListId, setTasks, setXp, setDailyTpl, setWeeklyTpl, setDay, setWeek, setAch, setOrigin, setSettings, setCalendarEvents]);

  const {
    ready: fbReady,
    user,
    busy: cloudBusy,
    error: cloudError,
    signIn: doSignIn,
    signOut: doSignOut,
    pushLocal,
  } = useCloudSync({ applyRemote });

  // هر تغییر لوکال → اطلاع به هوک برای flush ابری (debounced داخل هوک)
  useEffect(() => {
    pushLocal(packState);
  }, [lists, activeListId, tasks, xp, dailyTpl, weeklyTpl, day, week, ach, origin, settings, profileVersion, calendarEvents, pushLocal]);

  /* ============== UI ============== */
  return (
    <MusicProvider>
      <GlobalPlayer />
      <ThemeStage activeSkin={settings.skin} dark={!!settings.dark} />
      <AchievementAnimationOverlay
        visible={anim.visible} animationUrl={anim.url} message={anim.message}
        durationMs={4000} playSound={false} allowClose={true}
        onClose={() => setAnim({ visible: false, url: "", message: "" })}
      />

      <div className="app-root">
        {settings.skin === "fairy" && <div className="fairy-swarm" aria-hidden="true" />}
        {settings.skin === "witch"  && <div className="witch-runes" aria-hidden="true" />}

        <div className="symbols">{symbols.map(s => <span key={s.id}>{s.char}</span>)}</div>
        {currentToast && <div key={currentToast.id} className="toast">{currentToast.text}</div>}

        <TopTabs tab={tab} setTab={setTab} />

        {tab === "tasks" && (
          <div className="card">
            <div>
              <AppHeader
                xp={xp} level={level} into={into} span={span} nextIn={nextIn}
                progressPct={progressPct} ach={ach} celebrate={celebrate}
                onOpenSettings={()=> setSettingsOpen(true)} origin={origin}
              />

              <TopAchievements ach={ach} />

              {/* Lists */}
              <section style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:16, marginBottom:8, gap:8, flexWrap:"wrap" }}>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {lists.map(l => (
                    <button key={l.id} className={`btn ${l.id===activeListId?"active":""}`} onClick={() => setActiveListId(l.id)}>{l.name}</button>
                  ))}
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button className="btn" onClick={() => {
                    const name = prompt("New list name:"); if (!name) return;
                    const id = uid(); setLists(p => [...p, { id, name }]); setActiveListId(id);
                  }}>+ New list</button>
                  <button className="btn" onClick={() => {
                    const l = lists.find(x => x.id === activeListId); if (!l) return;
                    const name = prompt("Rename list:", l.name);
                    if (name && name !== l.name) setLists(p => p.map(it => it.id===l.id ? { ...it, name } : it));
                  }}>Rename</button>
                  {activeListId !== "inbox" && (
                    <button className="btn" onClick={() => {
                      if (!confirm("Delete this list and all its tasks?")) return;
                      setLists(p => p.filter(l => l.id !== activeListId));
                      setTasks(p => p.filter(t => t.listId !== activeListId));
                      setActiveListId("inbox");
                    }}>Delete</button>
                  )}
                </div>
              </section>

              {/* Add task */}
              <AddTaskBar
                text={text} setText={setText}
                aiText={aiText} setAiText={setAiText}
                xpInput={xpInput} setXpInput={setXpInput}
                deadlineAmt={deadlineAmt} setDeadlineAmt={setDeadlineAmt}
                deadlineUnit={deadlineUnit} setDeadlineUnit={setDeadlineUnit}
                setAbsoluteDue={setAbsoluteDue}
                desc={desc} setDesc={setDesc}
                recur={recur} setRecur={setRecur}
                onAdd={addTask}
                level={level}
              />

              {/* Counters */}
              <section className="metaRow">
                <div>Open: <b className="mono">{rootsOpen.length}</b> • Completed: <span className="mono">{rootsDone.length}</span></div>
                <div className="actions">
                  <button className="btn" onClick={() => setTasks(p => p.filter(t => !(t.done && t.listId === activeListId && !t.parentId)))} disabled={rootsDone.length===0}>
                    Clear completed
                  </button>
                </div>
              </section>

              {/* Open tasks */}
              <section className="list">
                {rootsOpen.length===0 && <div className="empty">No tasks yet — add one to earn XP!</div>}
                {rootsOpen.map(t => (
                  <TaskRow key={t.id} t={t} childrenOf={childrenOf}
                           onToggle={toggleTask} onRemove={removeTaskWithConfirm}
                           onAddSubtask={onAddSubtask} onMilestoneToggle={markMilestoneDone}
                           onRenameTitle={onRenameTitle}
                           timeLeft={(iso)=>timeLeft(iso, now)}/>
                ))}
              </section>

              {/* Completed */}
              <section className="list" style={{ marginTop: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3 style={{ margin: 0, marginBottom: 8 }}>✅ Completed</h3>
                  <button aria-label="toggle completed" onClick={() => setCompletedOpen(v => !v)} className={`tap-ctl chk-ctrl ${completedOpen ? 'on on-green' : ''}`} />
                </div>
                {completedOpen && rootsDone.length === 0 && <div className="empty">Nothing here yet.</div>}
                {completedOpen && rootsDone.map(t => (
                  <TaskRow key={t.id} t={t} childrenOf={childrenOf}
                           onToggle={toggleTask} onRemove={removeTaskWithConfirm}
                           onAddSubtask={onAddSubtask} onMilestoneToggle={markMilestoneDone}
                           onRenameTitle={onRenameTitle}
                           timeLeft={(iso)=>timeLeft(iso, now)}/>
                ))}
              </section>

              {/* Daily & Weekly */}
              <section className="daily-challenges" style={{ marginTop: 24 }}>
                <div style={{ display: "flex", alignItems:"center", gap:8 }}>
                  <h3 style={{ margin: 0, marginBottom: 8 }}>⚒️ Today's Challenges <span className="hint">({dayNameOf(undefined, 'en-US')})</span></h3>
                  <button aria-label="toggle daily" onClick={() => setDay(st => ({ ...st, __open: !st.__open, updatedAt: Date.now() }))} className={`tap-ctl chk-ctrl ${day.__open!==false ? 'on on-blue' : ''}`} />
                </div>
                <div className="list challenge-list">
                  {day.__open!==false && day.picks.length===0 && <div className="empty">No templates — add some in settings.</div>}
                  {day.__open!==false && day.picks.map(pid => {
                    const tpl = dailyTpl.find(t => t.id===pid); if (!tpl) return null;
                    const done = day.completedIds.includes(pid);
                    return (
                      <div key={pid} className={`task ${done ? "done" : ""}`}>
                        <input type="checkbox" checked={done} onChange={() => completePick({ kind: 'daily', tplId: pid })} />
                        <div className="title">{tpl.title}</div>
                        <div className="xp mono">{tpl.xp ?? DEFAULT_DAILY_XP} XP</div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="weekly-challenges" style={{ marginTop: 16 }}>
                <div style={{ display: "flex", alignItems:"center", gap:8 }}>
                  <h3 style={{ margin: 0, marginBottom: 8 }}>🔥 Weekly Challenges <span className="hint">({weekKeyOf()})</span></h3>
                  <button aria-label="toggle weekly" onClick={() => setWeek(st => ({ ...st, __open: !st.__open, updatedAt: Date.now() }))} className={`tap-ctl chk-ctrl ${week.__open!==false ? 'on on-amber' : ''}`} />
                </div>
                <div className="list challenge-list">
                  {week.__open!==false && week.picks.length===0 && <div className="empty">No templates — add some in settings.</div>}
                  {week.__open!==false && week.picks.map(pid => {
                    const tpl = weeklyTpl.find(t => t.id===pid); if (!tpl) return null;
                    const done = week.completedIds.includes(pid);
                    return (
                      <div key={pid} className={`task ${done ? "done" : ""}`}>
                        <input type="checkbox" checked={done} onChange={() => completePick({ kind: 'weekly', tplId: pid })} />
                        <div className="title">{tpl.title}</div>
                        <div className="xp mono">{tpl.xp ?? DEFAULT_WEEKLY_XP} XP</div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        )}

        {tab === "calendar" && (
          <div className="card" style={{ padding: 12 }}>
            <CalendarTab
              tasks={tasks}
              setTasks={setTasks}
              activeListId={activeListId}
              lists={lists}
              calendarEvents={calendarEvents}
              setCalendarEvents={setCalendarEvents}
            />
          </div>
        )}

        {tab === "music" && <MusicTab level={level}/>}
        {tab === "story" && <StoryTab level={level} tasks={tasks} origin={origin} setOrigin={setOrigin} profileVersion={profileVersion} />}
        {tab === "journal" && <JournalTab />}
        {tab === "ach" && <AchievementsHall ach={ach} />}
      </div>

      {/* Tour: render with mask disabled so only popups show */}
      <Tour enabled={!settingsOpen && !profileOpen} activeTab={tab} overlay={false} />

      <SettingsModal
        open={settingsOpen}
        onClose={()=> setSettingsOpen(false)}
        settings={settings} setSettings={setSettings}
        dailyTpl={dailyTpl} setDailyTpl={setDailyTpl}
        weeklyTpl={weeklyTpl} setWeeklyTpl={setWeeklyTpl}
        fbReady={fbReady} user={user}
        cloudBusy={cloudBusy} cloudError={cloudError}
        onSignIn={doSignIn} onSignOut={doSignOut}
        onResetAccount={hardResetAccount}
        onResetCloud={resetCloudAccount}
        profileName={profileName}
        setProfileName={setProfileName}
        onSaveProfileName={saveProfileName}
      />

      {/* Profile (first-run) */}
      {profileOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Welcome, adventurer!</h3>
              <button className="icon-btn" onClick={()=> setProfileOpen(false)} aria-label="Close">✖️</button>
            </div>
            <div className="modal-body">
              <div className="hint">Pick a name. We’ll use it in stories and keep it for your profile.</div>
              <input type="text" placeholder="Your name (e.g., Saeed)" value={profileName} onChange={(e)=> setProfileName(e.target.value)} />
              <div className="row-sb">
                <span className="hint">You can change this later from Settings (profile).</span>
                <button className="btn primary" disabled={!profileName.trim()} onClick={saveProfileName}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MusicProvider>
  );
}
