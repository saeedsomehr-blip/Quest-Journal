// src/hooks/useCalendarLayout.js
import { useMemo } from "react";

const MIN_PER_SLOT = 30; // 30-minute slots
const SLOTS_PER_HOUR = 60 / MIN_PER_SLOT; // 2
const HOURS = 24;

export function useCalendarLayout({ hourHeight = 44 } = {}) {
  const slotH = hourHeight / SLOTS_PER_HOUR; // e.g., 22px

  const helpers = useMemo(() => {
    function startOfDay(d) {
      const x = new Date(d); x.setHours(0,0,0,0); return x;
    }
    function addMinutes(d, n) { const x = new Date(d); x.setMinutes(x.getMinutes() + n); return x; }
    function clampToSlot(dt) {
      const m = dt.getMinutes();
      const snapped = Math.round(m / MIN_PER_SLOT) * MIN_PER_SLOT;
      const out = new Date(dt); out.setMinutes(snapped, 0, 0); return out;
    }
    function minutesBetween(a, b) { return Math.round((b - a) / 60000); }
    function dayIndexOf(date, weekStart) {
      const idx = (date.getDay() + 6) % 7; // Mon=0 ... Sun=6
      return idx;
    }
    function yOf(date) {
      const mins = date.getHours() * 60 + date.getMinutes();
      const slots = mins / MIN_PER_SLOT;
      return slots * slotH;
    }
    function heightOf(start, end) {
      const mins = Math.max(15, minutesBetween(start, end));
      return (mins / MIN_PER_SLOT) * slotH;
    }
    return { startOfDay, addMinutes, clampToSlot, minutesBetween, dayIndexOf, yOf, heightOf, slotH };
  }, [slotH]);

  const constants = useMemo(() => ({ MIN_PER_SLOT, HOURS, SLOTS_PER_HOUR, slotH, hourHeight }), [slotH, hourHeight]);
  return { ...helpers, ...constants };
}

