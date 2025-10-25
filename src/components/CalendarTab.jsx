// src/components/CalendarTab.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Calendar.css";
import { useCalendarLayout } from "../hooks/useCalendarLayout.js";
import { uid } from "../utils/constants.js";
import usePointerDrag from "../hooks/usePointerDrag.js";
import { XPWizard } from "./AddTaskBar.jsx";
import XPAllocateModal from "./XPAllocateModal.jsx";

function fmtTime(d) {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d);
  } catch {
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }
}

function dayLabel(d) {
  try {
    const wd = new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d);
    const md = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(d);
    return `${wd} ${md}`;
  } catch {
    return d.toDateString();
  }
}

// Simple color by list id (fallback palette)
const COLORS = ["#6366f1", "#10b981", "#ef4444", "#f59e0b", "#06b6d4", "#8b5cf6", "#14b8a6"]; 
function colorFor(listId, i = 0) {
  if (!listId) return COLORS[i % COLORS.length];
  let h = 0; for (let c of String(listId)) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export default function CalendarTab({ tasks, setTasks, activeListId, lists, calendarEvents = [], setCalendarEvents }) {
  const [view, setView] = useState("week"); // week | day | month
  const [cursor, setCursor] = useState(new Date()); // current anchor date
  const [hideDone, setHideDone] = useState(false);
  const wrapRef = useRef(null);
  const rootRef = useRef(null);
  const [editorAdvanced, setEditorAdvanced] = useState(false);

  const { hourHeight, slotH, yOf, heightOf, startOfDay, addMinutes, clampToSlot } = useCalendarLayout({ hourHeight: 44 });

  const now = new Date();
  const weekStart = useMemo(() => {
    const d = new Date(cursor); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); d.setHours(0,0,0,0); return d;
  }, [cursor]);
  const weekDays = useMemo(() => [...Array(7)].map((_, i) => addMinutes(weekStart, i*24*60)), [weekStart, addMinutes]);

  const dayStart = useMemo(() => { const d = new Date(cursor); d.setHours(0,0,0,0); return d; }, [cursor]);
  // XP conversion flow state
  const [xpStep, setXpStep] = useState(null); // { ev, title, listId, questType, xpBase }
  const [allocStep, setAllocStep] = useState(null); // { ev, title, listId, questType, xpBase }

  // helpers for recurrence
  // weekday helpers
  const WEEKDAY_LABELS = ['S','M','T','W','T','F','S']; // Sunday..Saturday
  function occursWithin(s, e, r0, r1) {
    return (e > r0) && (s < r1);
  }
  function expandOccurrences(ev, r0, r1) {
    try {
      const out = [];
      const baseS = new Date(ev.start || ev.s);
      const baseE = new Date(ev.end || ev.e);
      const repeat = ev.repeat || 'none';
      const ends = ev.repeatEnds || 'never';
      const untilDateStr = ev.repeatUntil || '';
      const countMax = parseInt(ev.repeatCount || 0, 10) || 0;
      const weeklyDays = Array.isArray(ev.repeatWeekdays) ? ev.repeatWeekdays : [];

      function pushOcc(st, en) {
        if (!occursWithin(st, en, r0, r1)) return;
        out.push({ kind: 'event', id: ev.id, title: ev.title || 'Block', listId: ev.listId, done: false, s: new Date(st), e: new Date(en), ref: ev });
      }
      function notBeyondEnds(idx, st) {
        let ok = true;
        if (ends === 'after' && countMax > 0 && idx >= countMax) ok = false;
        if (ends === 'on' && untilDateStr) {
          try {
            const u = new Date(`${untilDateStr}T23:59:59`);
            if (st > u) ok = false;
          } catch {}
        }
        return ok;
      }

      if (repeat === 'none') {
        pushOcc(baseS, baseE);
        return out;
      }

      // iterate by pattern
      let idx = 0;
      let curS = new Date(baseS);
      let curE = new Date(baseE);
      const stepDays = (n) => {
        curS = new Date(curS.getTime() + n*24*60*60000);
        curE = new Date(curE.getTime() + n*24*60*60000);
      };
      const addMonth = () => { const s = new Date(curS); s.setMonth(s.getMonth()+1); const diff = s - curS; curE = new Date(curE.getTime() + diff); curS = s; };

      // fast-forward to range start
      if (repeat === 'daily') {
        while (curE < r0) { stepDays(1); idx++; }
        while (occursWithin(curS, curE, r0, r1) && notBeyondEnds(idx, curS)) { pushOcc(curS, curE); idx++; stepDays(1); }
      } else if (repeat === 'weekly') {
        const dur = baseE.getTime() - baseS.getTime();
        const days = (weeklyDays && weeklyDays.length) ? weeklyDays.slice().sort((a,b)=>a-b) : [baseS.getDay()];
        // Initialize next occurrence per selected weekday (on/after base)
        let cursors = days.map((wd) => {
          const c = new Date(baseS);
          const delta = (wd - c.getDay() + 7) % 7;
          c.setDate(c.getDate() + delta);
          return c;
        });
        idx = 0;
        const maxIter = 10000; let iter = 0;
        while (iter++ < maxIter) {
          // find earliest cursor
          let k = -1, tmin = Infinity;
          for (let i=0;i<cursors.length;i++) { const t = cursors[i].getTime(); if (t < tmin) { tmin = t; k = i; } }
          if (k < 0) break;
          const nextS = new Date(tmin);
          if (ends === 'on' && untilDateStr) { try { const u = new Date(`${untilDateStr}T23:59:59`); if (nextS > u) break; } catch {}
          }
          if (nextS > r1) break;
          idx++;
          if (ends === 'after' && countMax > 0 && idx > countMax) break;
          const nextE = new Date(nextS.getTime() + dur);
          pushOcc(nextS, nextE);
          // advance this weekday cursor by 7 days
          const adv = new Date(cursors[k]); adv.setDate(adv.getDate() + 7);
          cursors[k] = adv;
        }
      } else if (repeat === 'monthly') {
        while (curE < r0) { addMonth(); idx++; }
        while (occursWithin(curS, curE, r0, r1) && notBeyondEnds(idx, curS)) { pushOcc(curS, curE); idx++; addMonth(); }
      } else {
        // fallback
        pushOcc(baseS, baseE);
      }
      return out;
    } catch { return []; }
  }

  // Compute visible range for recurrence expansion
  const range = useMemo(() => {
    if (view === 'day') return { r0: dayStart, r1: addMinutes(dayStart, 24*60) };
    if (view === 'week') return { r0: weekStart, r1: addMinutes(weekStart, 7*24*60) };
    // month: expand generously around current month
    const m0 = new Date(cursor.getFullYear(), cursor.getMonth(), 1); m0.setHours(0,0,0,0);
    const m1 = new Date(cursor.getFullYear(), cursor.getMonth()+1, 1); m1.setHours(0,0,0,0);
    return { r0: m0, r1: m1 };
  }, [view, dayStart, weekStart, cursor, addMinutes]);

  // Filter & map scheduled entries (with recurrence expansion for events)
  const blocks = useMemo(() => {
    const { r0, r1 } = range;
    const taskBlocks = (tasks || [])
      .filter(t => !t?.deleted && (!hideDone || !t?.done) && t?.scheduledStart && t?.scheduledEnd)
      .map((t) => ({
        kind: 'task', id: t.id, title: t.title, listId: t.listId, done: !!t.done,
        s: new Date(t.scheduledStart), e: new Date(t.scheduledEnd), ref: t,
      }));
    const eventBlocks = [];
    for (const e of (calendarEvents || [])) {
      if (!e?.start || !e?.end) continue;
      const occs = expandOccurrences(e, r0, r1);
      for (const occ of occs) eventBlocks.push(occ);
    }
    return [...taskBlocks, ...eventBlocks];
  }, [tasks, calendarEvents, hideDone, range]);

  function stamp(obj) { return { ...obj, updatedAt: new Date().toISOString() }; }

  // Create new block by dragging on empty space
  const drag = usePointerDrag({
    onStart: (st, e) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      st.bounds = rect;
      st.originY = e.clientY;
      st.originX = e.clientX;
    },
    onMove: () => {},
    onEnd: (st, e) => {
      if (editor) { closeEditor(); return; }
      if (!st?.bounds) return;
      const { top, left, width } = st.bounds;
      const moved = Math.abs(st.lastY - st.startY) >= 6;
      const relX = st.originX - left; // use start X for day column
      const relY0 = st.startY - top;
      const relY1 = st.lastY - top;
      if (!moved) return; // only create via actual drag, not single click
      const y0 = Math.min(relY0, relY1);
      const y1 = Math.max(relY0, relY1);
      // Determine target day based on active view
      let baseDay;
      if (view === 'day') {
        baseDay = dayStart;
      } else {
        const colW = (width - 52 - (8*6)) / 7; // rough (52px hour col + gaps)
        const dayIdx = Math.min(6, Math.max(0, Math.floor((relX - 52) / (colW + 8))));
        baseDay = addMinutes(weekStart, dayIdx * 24 * 60);
      }
      const s = clampToSlot(addMinutes(startOfDay(baseDay), Math.max(0, Math.round(y0 / slotH) * 30)));
      const e2 = clampToSlot(addMinutes(startOfDay(baseDay), Math.max(30, Math.round(y1 / slotH) * 30)));
      if (!(e2 > s)) return;
       const newEv = {
         id: uid(),
         title: "New event",
         start: s.toISOString(),
         end: e2.toISOString(),
         allDay: false,
         listId: activeListId || "inbox",
         color: '',
         repeat: 'none', repeatEnds:'never', repeatUntil:'', repeatCount:0, repeatWeekdays:[],
         updatedAt: Date.now(),
       };
      setCalendarEvents(prev => [newEv, ...prev]);
      const pos = clampEditorToViewport(st.lastX, st.lastY);
       setEditor({ id: newEv.id, kind:'event', title: newEv.title, startDate: isoToDate(s), endDate: isoToDate(e2), startTime: isoToTime(s), endTime: isoToTime(e2), allDay:false, listId: newEv.listId, color:'', repeat:'none', repeatEnds:'never', repeatUntil:'', repeatCount:0, repeatWeekdays:[], notes:'', isNew:true, x: pos.x, y: pos.y });
      setEditorAdvanced(false);
    }
  });

  // Move/resize handlers
  function moveEvent(ev, deltaMin) {
    const ns = new Date(ev.s.getTime() + deltaMin * 60000);
    const ne = new Date(ev.e.getTime() + deltaMin * 60000);
    if (ev.kind === 'task') updateTaskSchedule(ev.id, ns, ne);
    else updateEventSchedule(ev.id, ns, ne);
  }
  function resizeEvent(ev, which, deltaMin) {
    let ns = ev.s, ne = ev.e;
    if (which === "start") ns = new Date(ev.s.getTime() + deltaMin * 60000);
    if (which === "end")   ne = new Date(ev.e.getTime() + deltaMin * 60000);
    if (ne <= ns) return;
    if (ev.kind === 'task') updateTaskSchedule(ev.id, ns, ne);
    else updateEventSchedule(ev.id, ns, ne);
  }
  function updateTaskSchedule(id, s, e) {
    const s2 = s.toISOString(), e2 = e.toISOString();
    setTasks(prev => prev.map(t => t.id === id ? stamp({ ...t, scheduledStart: s2, scheduledEnd: e2 }) : t));
  }
  function updateEventSchedule(id, s, e) {
    const s2 = s.toISOString(), e2 = e.toISOString();
    setCalendarEvents(prev => prev.map(ev => ev.id === id ? { ...ev, start: s2, end: e2, updatedAt: Date.now() } : ev));
  }

  // helper: add minutes to end time (relative to start if needed)
  function addMinsToTime(startTime, endTime, mins) {
    try {
      const baseDate = editor?.startDate || isoToDate(new Date());
      const s = combineDateTime(baseDate, startTime || '00:00');
      let e = combineDateTime(baseDate, endTime || startTime || '00:00');
      e = new Date(Math.max(e.getTime(), s.getTime()));
      const out = new Date(e.getTime() + mins * 60000);
      const hh = String(out.getHours()).padStart(2,'0');
      const mm = String(out.getMinutes()).padStart(2,'0');
      return `${hh}:${mm}`;
    } catch { return endTime; }
  }

  // helper: shift a single HH:MM time by minutes
  function shiftTimeStr(timeStr, mins) {
    try {
      const baseDate = editor?.startDate || isoToDate(new Date());
      const t = combineDateTime(baseDate, timeStr || '00:00');
      const out = new Date(t.getTime() + mins * 60000);
      const hh = String(out.getHours()).padStart(2, '0');
      const mm = String(out.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    } catch { return timeStr; }
  }

  // Inline mini-composer state
  const [editor, setEditor] = useState(null); // { id, title, ... }
  function closeEditor() {
    try {
      if (editor && editor.kind === 'event' && editor.isNew) {
        // Discard temporary unsaved event on close
        setCalendarEvents(prev => prev.filter(e => e.id !== editor.id));
      }
    } catch {}
    setEditor(null);
  }
  const editorRef = useRef(null);

  // Only close editor when clicking on the calendar surface itself.
  // Ignore generic outside clicks (e.g., page scrollbars, side panels).
  useEffect(() => {
    function onDoc(e) {
      if (!editorRef.current) return;
      const tgt = e.target;
      const insideEditor = editorRef.current.contains(tgt);
      // Week/Day surfaces use wrapRef; Month uses .calendar-month grid
      const insideWeekDay = !!(wrapRef.current && wrapRef.current.contains(tgt));
      const insideMonth = !!(tgt?.closest && tgt.closest('.calendar-month'));
      if (!insideEditor && (insideWeekDay || insideMonth)) {
        closeEditor();
      }
    }
    if (editor) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [editor]);

  // (removed mini-calendar state)

  function isoToLocal(dt) {
    try {
      const d = typeof dt === 'string' ? new Date(dt) : dt;
      const pad = (n) => String(n).padStart(2, '0');
      const y = d.getFullYear();
      const m = pad(d.getMonth()+1);
      const day = pad(d.getDate());
      const hh = pad(d.getHours());
      const mm = pad(d.getMinutes());
      return `${y}-${m}-${day}T${hh}:${mm}`;
    } catch { return ''; }
  }
  function isoToDate(iso) {
    try { const d = typeof iso === 'string' ? new Date(iso) : iso; const pad=(n)=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; } catch { return ''; }
  }
  function isoToTime(iso) {
    try { const d = typeof iso === 'string' ? new Date(iso) : iso; const pad=(n)=>String(n).padStart(2,'0'); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; } catch { return ''; }
  }
  function localToDate(v) {
    try {
      // input type=datetime-local gives local time string
      return new Date(v);
    } catch { return new Date(); }
  }
  function combineDateTime(dateStr, timeStr) {
    try { return new Date(`${dateStr}T${timeStr}`); } catch { return new Date(); }
  }

  function openEditorFor(ev, clientX, clientY, targetRect = null) {
    const isTask = ev.kind === 'task';
    const title = ev.title || (isTask ? ev.ref?.title : '');
    const s = ev.s; const e = ev.e;
    const listId = ev.listId || activeListId || 'inbox';
    let ax = clientX, ay = clientY;
    try {
      if (targetRect) { ax = targetRect.right + 8; ay = targetRect.top + 8; }
    } catch {}
    const pos = clampEditorToViewport(ax, ay);
    setEditor({
      id: ev.id,
      kind: ev.kind,
      title,
      startDate: isoToDate(s),
      endDate: isoToDate(e),
      startTime: isoToTime(s),
      endTime: isoToTime(e),
      allDay: false,
      listId,
      color: ev.ref?.color || ev.color || '',
      repeat: ev.ref?.repeat || ev.repeat || 'none',
      repeatEnds: ev.ref?.repeatEnds || ev.repeatEnds || 'never',
      repeatUntil: ev.ref?.repeatUntil || ev.repeatUntil || '',
      repeatCount: ev.ref?.repeatCount || ev.repeatCount || 0,
      repeatWeekdays: ev.ref?.repeatWeekdays || ev.repeatWeekdays || [],
      notes: ev.ref?.notes || ev.notes || '',
      x: pos.x,
      y: pos.y,
    });
    setEditorAdvanced(false);
  }

  function saveEditor() {
    if (!editor) return;
    let sDate, eDate;
    const sBase = editor.startDate || isoToDate(new Date());
    const eBase = editor.endDate || sBase;
    sDate = combineDateTime(sBase, editor.startTime || '00:00');
    eDate = combineDateTime(eBase, editor.endTime || '00:30');
    if (eDate <= sDate) { eDate = new Date(eDate.getTime() + 24*60*60*1000); }
    if (!(eDate > sDate)) return closeEditor();
    if (editor.kind === 'event') {
      setCalendarEvents(prev => prev.map(e => e.id === editor.id ? { ...e, title: editor.title || 'Block', start: sDate.toISOString(), end: eDate.toISOString(), allDay: false, listId: e.listId || editor.listId, color: editor.color || e.color, repeat: editor.repeat || 'none', repeatEnds: editor.repeatEnds || 'never', repeatUntil: editor.repeatUntil || '', repeatCount: parseInt(editor.repeatCount||0,10) || 0, repeatWeekdays: Array.isArray(editor.repeatWeekdays)?editor.repeatWeekdays:[], notes: editor.notes || '', updatedAt: Date.now() } : e));
    } else {
      // task
      setTasks(prev => prev.map(t => t.id === editor.id ? { ...t, title: editor.title || t.title, scheduledStart: sDate.toISOString(), scheduledEnd: eDate.toISOString(), updatedAt: new Date().toISOString() } : t));
    }
    // For newly created events, avoid deletion-on-close
    try { setEditor(null); } catch { setEditor(null); }
  }
  function deleteEditor() {
    if (!editor) return;
    if (editor.kind === 'event') {
      setCalendarEvents(prev => prev.filter(e => e.id !== editor.id));
    }
    closeEditor();
  }
  function deleteEventById(id) {
    setCalendarEvents(prev => prev.filter(e => e.id !== id));
    try { if (editor?.id === id) closeEditor(); } catch {}
  }
  function convertToTask() {
    if (!editor) return;
    if (editor.kind !== 'event') return;
    const ev = (calendarEvents || []).find(e => e.id === editor.id);
    if (!ev) return;
    // Open the same XP wizard used by AddTaskBar
    setXpStep({ ev, title: editor.title || ev.title || 'New task', listId: ev.listId || activeListId || 'inbox', questType: 'BASIC' });
    closeEditor();
  }

  // Toggle done for a scheduled task from calendar
  function toggleTaskDone(taskId) {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const done = !t.done;
      return { ...t, done, doneAt: done ? new Date().toISOString() : null, updatedAt: new Date().toISOString() };
    }));
  }

  // Jump to current time (scroll page so now-line is in view)
  function jumpToNow() {
    try {
      const now = new Date();
      setCursor(now);
      setView('day');
      setTimeout(() => {
        const base = wrapRef.current;
        if (!base) return;
        const rect = base.getBoundingClientRect();
        const pageY = window.scrollY + rect.top;
        const y = pageY + yOf(new Date()) - 120;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      }, 50);
    } catch {}
  }

  // Auto-scroll intentionally deferred per request

  // Clamp editor within calendar root; input x,y are client (viewport) coords
  function clampEditorToViewport(x, y) {
    try {
      const pad = 16;
      const root = rootRef.current || document.querySelector('.calendar-root');
      if (!root) return { x, y };
      const rect = root.getBoundingClientRect();
      const relX = x - rect.left;
      const relY = y - rect.top;
      const maxX = Math.max(pad, rect.width - 340);
      const maxY = Math.max(pad, rect.height - 260);
      return { x: Math.min(Math.max(pad, relX), maxX), y: Math.min(Math.max(pad, relY), maxY) };
    } catch { return { x, y }; }
  }

  function renderWeek() {
    const hours = [...Array(24)].map((_, h) => `${h}:00`);
    // Compute events per day
    const byDay = weekDays.map((d, idx) => {
      const dayEnd = addMinutes(startOfDay(d), 24*60);
      const evs = blocks.filter(ev => ev.s >= startOfDay(d) && ev.s < dayEnd);
      // naive overlap packing by sorting start times
      evs.sort((a,b)=> a.s-b.s || a.e-b.e);
      const lanes = [];
      for (const ev of evs) {
        let placed = false;
        for (const lane of lanes) {
          if (lane[lane.length-1].e <= ev.s) { lane.push(ev); placed = true; break; }
        }
        if (!placed) lanes.push([ev]);
      }
      return { date: d, events: evs, lanes };
    });

    return (
      <div>
        {/* Weekday labels */}
        <div className="allday-row" style={{ marginBottom: 6 }}>
          <div></div>
          {weekDays.map((d, i) => (
            <div key={i} style={{ padding: 4, textAlign: 'center', fontWeight: 600 }}>
              {dayLabel(d)}
            </div>
          ))}
        </div>
        <div className="allday-row">
          <div></div>
          {weekDays.map((d, i) => (
            <div className="allday-cell" key={i} title={dayLabel(d)}>
              {/* due-date chips (read-only) */}
              {(tasks||[]).filter(t => !t.deleted && t.deadline && new Date(t.deadline).toDateString() === d.toDateString()).slice(0,3).map(t => (
                <span key={t.id} className="allday-chip">{t.title}</span>
              ))}
              {/* free all-day events (if ever added) */}
              {(calendarEvents||[]).filter(e => e.allDay && new Date(e.start).toDateString() === d.toDateString()).slice(0,3).map(e => (
                <span key={e.id} className="allday-chip" style={{ background: colorFor(e.listId) }}>{e.title || 'Block'}</span>
              ))}
            </div>
          ))}
        </div>

        <div
          className="week-grid"
          ref={wrapRef}
          onPointerDown={drag.onPointerDown}
          onPointerMove={drag.onPointerMove}
          onPointerUp={drag.onPointerUp}
          onPointerCancel={drag.onPointerCancel}
          onLostPointerCapture={drag.onLostPointerCapture}
        >
          <div>
            <div style={{ position:"relative", height: hourHeight*24 }}>
              {hours.map((label, i) => (
                <div key={i} className="hour-col" style={{ position:"absolute", top: i*hourHeight - 6 }}>{label}</div>
              ))}
            </div>
          </div>

          {byDay.map((col, dayIdx) => (
            <div key={dayIdx} className="day-col">
              <div
                className="hours"
                style={{ height: hourHeight*24 }}
                onDoubleClick={(e) => {
                  if (editor) { closeEditor(); return; }
                  // Double-click: create a 30m event at click position
                  const rect = e.currentTarget.getBoundingClientRect();
                  const relY = e.clientY - rect.top;
                  const baseDay = addMinutes(weekStart, dayIdx * 24 * 60);
                  const s = clampToSlot(addMinutes(startOfDay(baseDay), Math.max(0, Math.round(relY / slotH) * 30)));
                  const e2 = clampToSlot(addMinutes(s, 30));
                  const newEv = { id: uid(), title: "New event", start: s.toISOString(), end: e2.toISOString(), allDay:false, listId: activeListId || 'inbox', color:'', repeat:'none', repeatEnds:'never', repeatUntil:'', repeatCount:0, repeatWeekdays:[], updatedAt: Date.now() };
                   setCalendarEvents(prev => [newEv, ...prev]);
                  { const p = clampEditorToViewport(e.clientX, e.clientY); setEditor({ id: newEv.id, kind:'event', title: newEv.title, startDate: isoToDate(s), endDate: isoToDate(e2), startTime: isoToTime(s), endTime: isoToTime(e2), allDay:false, listId: newEv.listId, color:'', repeat:'none', repeatEnds:'never', repeatUntil:'', repeatCount:0, repeatWeekdays:[], isNew:true, x: p.x, y: p.y }); }
                }}
              >
                {[...Array(24)].map((_, h) => (
                  <div key={h} className="hour-line" style={{ top: h*hourHeight }} />
                ))}
                {[...Array(24)].map((_, h) => (
                  <div key={`h_${h}`} className="half-line" style={{ top: h*hourHeight + hourHeight/2, opacity:.2 }} />
                ))}
                {now.toDateString() === col.date.toDateString() && (
                  <div className="now-line" style={{ top: yOf(now) }} />
                )}

                {/* events */}
                {col.events.map((ev, idx) => {
                  const top = yOf(ev.s);
                  const h = Math.max(8, heightOf(ev.s, ev.e));
                  // compute lane width/offset
                  const laneIndex = col.lanes.findIndex(l => l.includes(ev));
                  const laneCount = Math.max(1, col.lanes.length);
                  const leftPct = (laneIndex / laneCount) * 100;
                  const widthPct = (1 / laneCount) * 100;
                  const bg = (ev.ref?.color || ev.color) || colorFor(ev.listId, idx);
                  return (
                    <EventBlock
                      key={`${ev.kind}:${ev.id}:${ev.s.toISOString()}`}
                      ev={ev}
                      style={{ top, height: h, left: `calc(${leftPct}% + 2px)`, width: `calc(${widthPct}% - 4px)`, background:bg }}
                      slotH={slotH}
                      onClick={(e)=>openEditorFor(ev, e.clientX, e.clientY, e.currentTarget.getBoundingClientRect())}
                      onToggleDone={() => ev.kind==='task' ? toggleTaskDone(ev.id) : null}
                      onDelete={() => ev.kind==='event' ? deleteEventById(ev.id) : null}
                      onMove={(deltaMin) => moveEvent(ev, deltaMin)}
                      onResize={(which, deltaMin) => resizeEvent(ev, which, deltaMin)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
      </div>
    );
  }

  function renderDay() {
    const d = dayStart;
    const col = { date: d, events: blocks.filter(ev => ev.s.toDateString() === d.toDateString()), lanes: [] };
    // simple lane packing
    col.events.sort((a,b)=> a.s-b.s || a.e-b.e);
    const lanes = [];
    for (const ev of col.events) {
      let placed = false; for (const lane of lanes) { if (lane[lane.length-1].e <= ev.s) { lane.push(ev); placed = true; break; } }
      if (!placed) lanes.push([ev]);
    }
    col.lanes = lanes;
    const hours = [...Array(24)].map((_, h) => `${h}:00`);
    return (
      <div
        className="week-grid"
        ref={wrapRef}
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onPointerCancel={drag.onPointerCancel}
        onLostPointerCapture={drag.onLostPointerCapture}
      >
        <div>
          <div style={{ position:"relative", height: hourHeight*24 }}>
            {hours.map((label, i) => (
              <div key={i} className="hour-col" style={{ position:"absolute", top: i*hourHeight - 6 }}>{label}</div>
            ))}
          </div>
        </div>
        <div className="day-col" style={{ gridColumn: "span 7" }}>
          <div
            className="hours"
            style={{ height: hourHeight*24 }}
            onDoubleClick={(e) => {
              if (editor) { closeEditor(); return; }
              const rect = e.currentTarget.getBoundingClientRect();
              const relY = e.clientY - rect.top;
              const baseDay = dayStart;
              const s = clampToSlot(addMinutes(startOfDay(baseDay), Math.max(0, Math.round(relY / slotH) * 30)));
              const e2 = clampToSlot(addMinutes(s, 30));
              const newEv = { id: uid(), title: "New event", start: s.toISOString(), end: e2.toISOString(), allDay:false, listId: activeListId || 'inbox', color:'', repeat:'none', repeatEnds:'never', repeatUntil:'', repeatCount:0, repeatWeekdays:[], updatedAt: Date.now() };
              setCalendarEvents(prev => [newEv, ...prev]);
              { const p = clampEditorToViewport(e.clientX, e.clientY); setEditor({ id: newEv.id, kind:'event', title: newEv.title, startDate: isoToDate(s), endDate: isoToDate(e2), startTime: isoToTime(s), endTime: isoToTime(e2), allDay:false, listId: newEv.listId, color:'', repeat:'none', repeatEnds:'never', repeatUntil:'', repeatCount:0, repeatWeekdays:[], isNew:true, x: p.x, y: p.y }); }
            }}
          >
            {[...Array(24)].map((_, h) => (
              <div key={h} className="hour-line" style={{ top: h*hourHeight }} />
            ))}
            {now.toDateString() === d.toDateString() && (
              <div className="now-line" style={{ top: yOf(now) }} />
            )}
            {col.events.map((ev, idx) => {
              const top = yOf(ev.s);
              const h = Math.max(8, heightOf(ev.s, ev.e));
              const laneIndex = col.lanes.findIndex(l => l.includes(ev));
              const laneCount = Math.max(1, col.lanes.length);
              const leftPct = (laneIndex / laneCount) * 100;
              const widthPct = (1 / laneCount) * 100;
              const bg = (ev.ref?.color || ev.color) || colorFor(ev.listId, idx);
              return (
                <EventBlock key={`${ev.kind}:${ev.id}:${ev.s.toISOString()}`} ev={ev} style={{ top, height: h, left: `calc(${leftPct}% + 2px)`, width: `calc(${widthPct}% - 4px)`, background:bg }} slotH={slotH} onClick={(e)=>openEditorFor(ev, e.clientX, e.clientY, e.currentTarget.getBoundingClientRect())} onToggleDone={() => ev.kind==='task' ? toggleTaskDone(ev.id) : null} onDelete={() => ev.kind==='event' ? deleteEventById(ev.id) : null} onMove={(delta)=>moveEvent(ev, delta)} onResize={(w,dmin)=>resizeEvent(ev,w,dmin)} />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderMonth() {
    const start = new Date(cursor); start.setDate(1); start.setHours(0,0,0,0);
    const startIdx = (start.getDay() + 6) % 7; // Monday first
    const first = new Date(start); first.setDate(first.getDate() - startIdx);
    const cells = [...Array(42)].map((_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
    const byDate = new Map();
    (tasks||[]).forEach(t => {
      const s = t.scheduledStart ? new Date(t.scheduledStart) : (t.deadline ? new Date(t.deadline) : null);
      if (!s) return; const key = s.toDateString();
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push(t);
    });
    // include recurring events within visible month grid
    const gridStart = new Date(cells[0]); gridStart.setHours(0,0,0,0);
    const gridEnd = new Date(cells[cells.length-1]); gridEnd.setDate(gridEnd.getDate()+1); gridEnd.setHours(0,0,0,0);
    (calendarEvents||[]).forEach(e => {
      const occs = expandOccurrences(e, gridStart, gridEnd);
      occs.forEach(occ => {
        const key = occ.s.toDateString();
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key).push({ id: `${occ.id}:${isoToDate(occ.s)}`, title: occ.title||'Block', listId: occ.listId });
      });
    });
    return (
      <div className="calendar-month">
        {cells.map((d,i) => (
          <div className="cell" key={i} title={dayLabel(d)}>
            <div className="date">{d.getDate()}</div>
            {(byDate.get(d.toDateString())||[]).slice(0,4).map(t => (
              <div key={t.id} className="allday-chip" style={{ background: colorFor(t.listId) }}>{t.title}</div>
            ))}
            {(byDate.get(d.toDateString())||[]).length > 4 && (
              <div className="calendar-empty">+{(byDate.get(d.toDateString())||[]).length - 4} more</div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="calendar-root" ref={rootRef}>
      <div className="calendar-header">
        <div className="left">
          <button className="btn" onClick={() => setCursor(new Date())}>Today</button>
          <button className="btn" onClick={() => setCursor(d => { const x = new Date(d); if (view==='month') { x.setMonth(x.getMonth()-1); } else { x.setDate(x.getDate() - (view==='day' ? 1 : 7)); } return x; })}>Prev</button>
          <button className="btn" onClick={() => setCursor(d => { const x = new Date(d); if (view==='month') { x.setMonth(x.getMonth()+1); } else { x.setDate(x.getDate() + (view==='day' ? 1 : 7)); } return x; })}>Next</button>
          <span className="hint" style={{ marginLeft: 6 }}>
            {(() => { try { if (view==='week') { const end=new Date(weekStart); end.setDate(end.getDate()+6); const f=new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}); return f.format(weekStart) + ' - ' + f.format(end); } if (view==='day') { const f=new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric'}); return f.format(dayStart) } const f=new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric'}); return f.format(cursor) } catch { return '' } })()}
          </span>
        </div><div className="right" style={{ display:'flex', alignItems:'center', gap:8 }}>
          <label className="hint" style={{ display:'flex', alignItems:'center', gap:6 }}>
            <input type="checkbox" checked={hideDone} onChange={(e)=> setHideDone(e.target.checked)} /> Hide completed
          </label>
          <button className="btn" onClick={jumpToNow}>Jump to now</button>
          <div className="calendar-view-toggle">
            <button className={`btn ${view==='day'?'active':''}`} onClick={() => setView('day')}>Day</button>
            <button className={`btn ${view==='week'?'active':''}`} onClick={() => setView('week')}>Week</button>
            <button className={`btn ${view==='month'?'active':''}`} onClick={() => setView('month')}>Month</button>
          </div>
        </div>
      </div>

      {view === 'week' && renderWeek()}
      {view === 'day' && renderDay()}
      {view === 'month' && renderMonth()}

      {editor && (
        <div ref={editorRef} className="cc-editor" style={{ position:'absolute', left: editor.x, top: editor.y }}>
          <div className="cc-row" style={{ justifyContent:'space-between', marginTop:0 }}>
            <div className="hint">{editor.kind==='event' ? 'Event' : 'Task'}</div>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <button className="icon-btn" title="More options" onClick={()=> setEditorAdvanced(v => !v)}>...</button>
            </div>
          </div>
          <input
            className="cc-title"
            type="text"
            value={editor.title}
            placeholder={editor.kind==='event' ? "New event" : "Task title"}
            onChange={(e)=>setEditor(ed => ({ ...ed, title: e.target.value }))}
            onKeyDown={(e)=>{ if (e.key==='Enter') saveEditor(); if (e.key==='Escape') closeEditor(); }}
          />

          <div className="cc-grid">
            <input type="time" step="900" value={editor.startTime || ''} onChange={(e)=>setEditor(ed => ({ ...ed, startTime: e.target.value }))} />
            <input type="time" step="900" value={editor.endTime || ''} onChange={(e)=>setEditor(ed => ({ ...ed, endTime: e.target.value }))} />
          </div>

          <div className="cc-grid">
            <div>
              <button className="chip" onClick={()=>setEditor(ed => {
                const ns = shiftTimeStr(ed.startTime, -15);
                const sBase = ed.startDate || isoToDate(new Date());
                const eBase = ed.endDate || sBase;
                const nsDate = combineDateTime(sBase, ns);
                const eDate = combineDateTime(eBase, ed.endTime || '00:00');
                let newEnd = ed.endTime;
                if (!(eDate > nsDate)) {
                  newEnd = addMinsToTime(ns, ns, 15);
                }
                return { ...ed, startTime: ns, endTime: newEnd };
              })}>-15m</button>
              <button className="chip" onClick={()=>setEditor(ed => {
                const ns = shiftTimeStr(ed.startTime, 15);
                const sBase = ed.startDate || isoToDate(new Date());
                const eBase = ed.endDate || sBase;
                const nsDate = combineDateTime(sBase, ns);
                const eDate = combineDateTime(eBase, ed.endTime || '00:00');
                let newEnd = ed.endTime;
                if (!(eDate > nsDate)) {
                  newEnd = addMinsToTime(ns, ns, 15);
                }
                return { ...ed, startTime: ns, endTime: newEnd };
              })}>+15m</button>
            </div>
            <div>
              <button className="chip" onClick={()=>setEditor(ed => {
                let ne = shiftTimeStr(ed.endTime, -15);
                const sBase = ed.startDate || isoToDate(new Date());
                const eBase = ed.endDate || sBase;
                const sDate = combineDateTime(sBase, ed.startTime || '00:00');
                let neDate = combineDateTime(eBase, ne);
                if (!(neDate > sDate)) {
                  ne = addMinsToTime(ed.startTime, ed.startTime, 15);
                }
                return { ...ed, endTime: ne };
              })}>-15m</button>
              <button className="chip" onClick={()=>setEditor(ed => ({ ...ed, endTime: shiftTimeStr(ed.endTime, 15) }))}>+15m</button>
            </div>
          </div>

          {editor.kind === 'event' && (
            <div className="cc-row">
              <div className="cc-colors">
                {COLORS.map(c => (
                  <div key={c} className={`cc-color ${editor.color===c?'sel':''}`} style={{ background:c }} onClick={()=>setEditor(ed => ({ ...ed, color:c }))} />
                ))}
              </div>
            </div>
          )}

          {editor.kind === 'event' && editorAdvanced && (
            <div style={{ marginTop:8, display:'grid', gap:8 }}>
              <div className="cc-row" style={{ justifyContent:'space-between', alignItems:'center', gap:8 }}>
                <label className="hint">Repeat</label>
                <select value={editor.repeat || 'none'} onChange={(e)=> setEditor(ed => {
                  const v = e.target.value;
                  if (v === 'weekly') {
                    try {
                      const d = ed.startDate ? new Date(`${ed.startDate}T00:00`) : new Date();
                      const baseDow = d.getDay();
                      const cur = Array.isArray(ed.repeatWeekdays) ? ed.repeatWeekdays : [];
                      return { ...ed, repeat: v, repeatWeekdays: (cur.length ? cur : [baseDow]) };
                    } catch { return { ...ed, repeat: v }; }
                  }
                  return { ...ed, repeat: v };
                })}>
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {(editor.repeat && editor.repeat !== 'none') && (
                <div className="cc-row" style={{ alignItems:'center', gap:8 }}>
                  <label className="hint">Ends</label>
                  <select value={editor.repeatEnds || 'never'} onChange={(e)=> setEditor(ed => ({ ...ed, repeatEnds: e.target.value }))}>
                    <option value="never">Never</option>
                    <option value="on">On date</option>
                    <option value="after">After</option>
                  </select>
                  {editor.repeatEnds === 'on' && (
                    <input type="date" value={editor.repeatUntil || ''} onChange={(e)=> setEditor(ed => ({ ...ed, repeatUntil: e.target.value }))} />
                  )}
                  {editor.repeatEnds === 'after' && (
                    <span>
                      <input type="number" min="1" step="1" style={{ width:80 }} value={editor.repeatCount || 1} onChange={(e)=> setEditor(ed => ({ ...ed, repeatCount: Math.max(1, parseInt(e.target.value||'1',10)) }))} />
                      <span className="hint" style={{ marginLeft:6 }}>occurrences</span>
                    </span>
                  )}
                </div>
              )}

              {editor.repeat === 'weekly' && (
                <div className="cc-row" style={{ alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <div className="hint">Days</div>
                  {WEEKDAY_LABELS.map((lbl, dow) => {
                    const active = Array.isArray(editor.repeatWeekdays) ? editor.repeatWeekdays.includes(dow) : false;
                    return (
                      <button key={dow} className="chip" style={{ padding:'6px 8px', background: active ? 'var(--accent, #6366f1)' : '', color: active ? '#fff' : '' }} onClick={()=> setEditor(ed => {
                        const set = new Set(Array.isArray(ed.repeatWeekdays) ? ed.repeatWeekdays : []);
                        if (set.has(dow)) set.delete(dow); else set.add(dow);
                        const arr = Array.from(set).sort((a,b)=>a-b);
                        return { ...ed, repeatWeekdays: arr };
                      })}>
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              )}

              <div>
                <div className="hint" style={{ marginBottom:4 }}>Description</div>
                <textarea rows="3" style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg, var(--card))' }}
                  value={editor.notes || ''}
                  onChange={(e)=> setEditor(ed => ({ ...ed, notes: e.target.value }))}
                />
              </div>
            </div>
          )}

          <div className="cc-actions">
            {editor.kind === 'event' && <button className="btn" onClick={convertToTask}>Convert to task</button>}
            {editor.kind === 'event' && <button className="btn" onClick={deleteEditor}>Delete</button>}
            <button className="btn primary" onClick={saveEditor}>Save</button>
          </div>
        </div>
      )}

      {xpStep && (
        <div className="modal-backdrop" style={{ alignItems: 'flex-start', paddingTop: 50 }} onClick={() => setXpStep(null)}>
          <div className="modal" style={{ width: 'min(720px,95vw)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3 style={{ margin:0 }}>Choose XP</h3><button className="icon-btn" onClick={() => setXpStep(null)} aria-label="Close">x</button></div>
            <div className="modal-body">
              <XPWizard
                onCancel={() => setXpStep(null)}
                onApply={({ xpBase, questType }) => {
                  setXpStep(null);
                  setAllocStep({ ...xpStep, xpBase, questType });
                }}
              />
            </div>
          </div>
        </div>
      )}

      {allocStep && (
        <XPAllocateModal
          xpBase={allocStep.xpBase}
          initialAlloc={{}}
          onCancel={() => setAllocStep(null)}
          onApply={({ alloc }) => {
            const ev = allocStep.ev;
            const base = Math.max(1, parseInt(allocStep.xpBase || 1, 10));
            const newTask = {
              id: uid(),
              title: allocStep.title || 'New task',
              desc: '',
              baseXp: base,
              xpBase: base,
              xp: base,
              xpAwards: Object.fromEntries(Object.entries(alloc || {}).filter(([k,v]) => (parseInt(v,10)||0) > 0).map(([k,v]) => [k, parseInt(v,10)])),
              questType: allocStep.questType || 'BASIC',
              listId: allocStep.listId,
              createdAt: new Date().toISOString(),
              done: false,
              scheduledStart: ev.start,
              scheduledEnd: ev.end,
              parentId: null,
            };
            setTasks(prev => [stamp(newTask), ...prev]);
            setCalendarEvents(prev => prev.filter(e => e.id !== ev.id));
            setAllocStep(null);
          }}
        />
      )}
    </section>
  );
}

function EventBlock({ ev, style, onMove, onResize, onClick, onToggleDone, onDelete, slotH = 22 }) {
  const [dragging, setDragging] = useState(null); // 'move' | 'start' | 'end' | null
  const startRef = useRef({ x:0, y:0 });
  const lastRef = useRef({ x:0, y:0 });

  function onDown(kind, e) {
    e.stopPropagation();
    setDragging(kind);
    startRef.current = { x: e.clientX, y: e.clientY };
    lastRef.current = { x: e.clientX, y: e.clientY };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  }
  function onMovePtr(e) {
    if (!dragging) return;
    const dx = e.clientX - lastRef.current.x;
    const dy = e.clientY - lastRef.current.y;
    lastRef.current = { x: e.clientX, y: e.clientY };
    const deltaMin = Math.round(dy / Math.max(1, slotH)) * 30; // 30 min per slot
    if (!deltaMin) return;
    if (dragging === 'move') onMove?.(deltaMin);
    else if (dragging === 'start') onResize?.('start', deltaMin);
    else if (dragging === 'end') onResize?.('end', deltaMin);
  }
  function onUpPtr(e) { setDragging(null); try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {} }

  return (
    <div
      className={`event ${ev.done ? 'done' : ''}`}
      style={style}
      role="button"
      tabIndex={0}
      onClick={(e)=>{ e.stopPropagation(); onClick?.(e); }}
      onKeyDown={(e)=>{ if (e.key==='Delete' || e.key==='Backspace') { e.preventDefault(); e.stopPropagation(); onDelete?.(); } }}
      onPointerDown={(e)=>onDown('move', e)}
      onPointerMove={onMovePtr}
      onPointerUp={onUpPtr}
      onPointerCancel={onUpPtr}
    >
      <div className="handle top" onPointerDown={(e)=>onDown('start', e)} />
      <div className="handle bot" onPointerDown={(e)=>onDown('end', e)} />
      <div className="title" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
        <span>{ev.title}</span>
        {ev.kind==='task' && (
          <input title="Mark done" type="checkbox" checked={!!ev.done} onChange={(e)=> { e.stopPropagation(); onToggleDone?.(); }} />
        )}
      </div>

    </div>
  );
}
