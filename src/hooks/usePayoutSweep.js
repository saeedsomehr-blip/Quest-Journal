// src/hooks/usePayoutSweep.js
import { useEffect } from "react";
import { releaseMilestonePayouts } from "../core/award.js";

/**
 * usePayoutSweep
 * - هر بار که tasks تغییر کند، پرداخت‌های due هر تسک را آزاد می‌کند.
 * - شما باید onMarkPaid را پیاده‌سازی کنید تا payoutKeyها را در استور علامت بزنید.
 *
 * @param {Array} tasks
 * @param {Object} opts
 *   - incGlobalXP: fn(delta) → برای sync فوری نمایش XP کل
 *   - onMarkPaid: fn(payoutKey) → علامت‌گذاری در استور شما (مثلاً task.escrow.paid یا s.paid)
 *   - onBoostInfo: fn({ taskId, boost }) → برای Toast/UI اختیاری
 */
export default function usePayoutSweep(tasks, { incGlobalXP, onMarkPaid, onBoostInfo } = {}) {
  useEffect(() => {
    if (!Array.isArray(tasks) || tasks.length === 0) return;
    for (const t of tasks) {
      try {
        const { applied, boostAdded, payouts } = releaseMilestonePayouts(t, { incGlobalXP, onBoostInfo });
        if (Array.isArray(applied) && applied.length > 0 && typeof onMarkPaid === "function") {
          for (const key of applied) onMarkPaid(key, t);
        }
      } catch (e) {
        // جلوگیری از شکستن رندر
        // console.warn("sweep payout failed for", t?.id, e);
      }
    }
  }, [JSON.stringify(tasks)]); // shallow تغییرات را پوشش بده
}
