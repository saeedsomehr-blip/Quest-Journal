// src/components/SettingsModal.jsx
import React, { useState, useEffect } from "react";
import ChallengeManager from "./ChallengeManager.jsx";
import AiConnect from "./AiConnect.jsx";
import { uid } from "../utils/constants.js";

/**
 * SettingsModal
 *
 * نکته‌ها:
 * - بدون تغییر API قبلی کار می‌کند.
 * - اختیاری: onCloudPull / onCloudPush برای "اجبار ایمپورت/اکسپورت ابری" اگر پاس داده شوند، بخش کنترل دستی Sync نمایش داده می‌شود.
 * - پیام خطا/Busy بدون تغییر. اسکرول فقط عمودی تا اوورفلو افقی در موبایل رخ نده.
 */
export default function SettingsModal({
  open,
  onClose,
  settings,
  setSettings,
  dailyTpl,
  setDailyTpl,
  weeklyTpl,
  setWeeklyTpl,
  fbReady,
  user,
  cloudBusy,
  cloudError,
  onSignIn,
  onSignOut,
  profileName,
  setProfileName,
  onSaveProfileName,
  onResetAccount,
  onResetCloud,

  // --- اختیاری (در صورت پاس‌دادن از بیرون، بلوک Sync دستی فعال می‌شود)
  onCloudPull,   // () => void  - Force import from cloud → local
  onCloudPush,   // () => void  - Force export local → cloud
}) {
  // appearance | challenges | account | ai | about
  const [section, setSection] = useState("appearance");

  // ensure hero name is always typeable (local fallback + sync)
  const [localName, setLocalName] = useState(profileName ?? "");
  useEffect(() => { setLocalName(profileName ?? ""); }, [profileName]);

  // accessibility: close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      {/* modal container with responsive sizing and no horizontal overflow */}
      <div
        className="modal settings-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        {/* Header */}
        <div className="modal-header settings-modal__header">
          <h3 id="settings-title">Settings</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Tabs (wrap on small screens) */}
        <div className="modal-tabs settings-modal__tabs" role="tablist" aria-label="Settings sections">
          <button
            role="tab"
            className={`tab ${section === "appearance" ? "active" : ""}`}
            onClick={() => setSection("appearance")}
          >
            Mode
          </button>
          <button
            role="tab"
            className={`tab ${section === "challenges" ? "active" : ""}`}
            onClick={() => setSection("challenges")}
          >
            Manage Challenges
          </button>
          <button
            role="tab"
            className={`tab ${section === "account" ? "active" : ""}`}
            onClick={() => setSection("account")}
          >
            Account
          </button>
          <button
            role="tab"
            className={`tab ${section === "ai" ? "active" : ""}`}
            onClick={() => setSection("ai")}
          >
            AI
          </button>
          <button
            role="tab"
            className={`tab ${section === "about" ? "active" : ""}`}
            onClick={() => setSection("about")}
          >
            About
          </button>
        </div>

        {/* Appearance */}
        {section === "appearance" && (
          <div className="modal-body settings-modal__body">
            <label className="row-sb settings-row">
              <span>Dark mode</span>
              <input
                type="checkbox"
                checked={!!settings.dark}
                onChange={(e) => setSettings((s) => ({ ...s, dark: e.target.checked }))}
              />
            </label>

            <label className="row-sb settings-row">
              <span>Celebration animations</span>
              <input
                type="checkbox"
                checked={!!settings.animations}
                onChange={(e) => setSettings((s) => ({ ...s, animations: e.target.checked }))}
              />
            </label>

            <label className="row-sb settings-row">
              <span>Sounds</span>
              <input
                type="checkbox"
                checked={!!settings.sounds}
                onChange={(e) => setSettings((s) => ({ ...s, sounds: e.target.checked }))}
              />
            </label>

            <hr />

            {/* Themes grouped into two categories */}
            <div>
              <div className="hint" style={{ marginBottom: 8 }}>
                World Skin
              </div>

              <div className="sf-card" style={{ padding: 10, marginBottom: 10 }}>
                <div className="hint" style={{ marginBottom: 8 }}>Nature based</div>
                <div className="settings-chiprow">
                  {["classic", "misty", "desert", "forest"].map((m) => (
                    <button
                      key={m}
                      className={`btn ${settings.skin === m ? "primary" : ""}`}
                      onClick={() => setSettings((s) => ({ ...s, skin: m }))}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sf-card" style={{ padding: 10 }}>
                <div className="hint" style={{ marginBottom: 8 }}>Character based</div>
                <div className="settings-chiprow">
                  {["warrior", "fairy", "witch", "artisan", "scholar"].map((m) => (
                    <button
                      key={m}
                      className={`btn ${settings.skin === m ? "primary" : ""}`}
                      onClick={() => setSettings((s) => ({ ...s, skin: m }))}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Challenges */}
        {section === "challenges" && (
          <div className="modal-body settings-modal__body" style={{ display: "grid", gap: 12 }}>
            <h4>Daily templates</h4>
            <ChallengeManager
              label="Daily"
              templates={dailyTpl}
              defaultXP={250}
              onAdd={(title, xp) => setDailyTpl((p) => [{ id: uid(), title, xp }, ...p])}
              onRemove={(id) => setDailyTpl((p) => p.filter((t) => t.id !== id))}
            />

            <h4 style={{ marginTop: 16 }}>Weekly templates</h4>
            <ChallengeManager
              label="Weekly"
              templates={weeklyTpl}
              defaultXP={500}
              onAdd={(title, xp) => setWeeklyTpl((p) => [{ id: uid(), title, xp }, ...p])}
              onRemove={(id) => setWeeklyTpl((p) => p.filter((t) => t.id !== id))}
            />
          </div>
        )}

        {/* AI */}
        {section === "ai" && (
          <div className="modal-body settings-modal__body">
            <AiConnect />
          </div>
        )}

        {/* Account (restyled + editable Hero name) */}
        {section === "account" && (
          <div className="modal-body settings-modal__body" style={{ display: "grid", gap: 12 }}>
            {!fbReady && (
              <div className="hint">
                Cloud sync is not configured. Add Firebase env vars in .env or .env.local to enable login and sync.
              </div>
            )}

            {fbReady && (
              <>
                <div className="sf-card" style={{ padding: 12 }}>
                  <div className="settings-row">
                    <div className="settings-row__left">
                      {user?.photoURL ? (
                        <img src={user.photoURL} alt="" className="settings-avatar" />
                      ) : (
                        <div className="settings-avatar ph">👤</div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          {user ? (user.displayName || "Signed in") : "Not signed in"}
                        </div>
                        {user && <div className="hint" style={{ fontSize: 12 }}>{user.email}</div>}
                      </div>
                    </div>
                    <div className="settings-row__right">
                      {user ? (
                        <>
                          {cloudBusy && <span className="hint">syncing…</span>}
                          <button className="btn" onClick={onSignOut}>Sign out</button>
                        </>
                      ) : (
                        <button className="btn primary" onClick={onSignIn}>Sign in with Google</button>
                      )}
                    </div>
                  </div>
                  {cloudError && (
                    <div className="hint" style={{ color: "#b91c1c", marginTop: 8 }}>{cloudError}</div>
                  )}
                </div>

                {/* Profile / Hero name */}
                <div className="sf-card" style={{ padding: 12 }}>
                  <div style={{ marginBottom: 8 }}>
                    <b>Profile</b>
                    <div className="hint">Set your Hero name. This will appear across the app.</div>
                  </div>

                  <div className="settings-row wrap">
                    <label htmlFor="heroName" className="hint" style={{ minWidth: 100 }}>Hero name</label>
                    <input
                      id="heroName"
                      type="text"
                      value={localName}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLocalName(v);
                        setProfileName?.(v);
                      }}
                      placeholder="e.g., Aria the Brave"
                      className="settings-text"
                    />
                    <button
                      className="btn"
                      onClick={() => onSaveProfileName?.()}
                      disabled={!localName.trim()}
                      title="Save hero name"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Manual Cloud Sync (optional, only if handlers are provided) */}
                {(typeof onCloudPull === "function" || typeof onCloudPush === "function") && user && (
                  <div className="sf-card" style={{ padding: 12 }}>
                    <b>Cloud sync</b>
                    <div className="hint" style={{ margin: "6px 0" }}>
                      Use these if your data looks out of date on this device.
                    </div>
                    <div className="settings-row wrap">
                      {typeof onCloudPull === "function" && (
                        <button className="btn" onClick={() => onCloudPull?.()} disabled={cloudBusy}>
                          Force import from cloud
                        </button>
                      )}
                      {typeof onCloudPush === "function" && (
                        <button className="btn" onClick={() => onCloudPush?.()} disabled={cloudBusy}>
                          Force export to cloud
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Danger zone */}
                <div className="sf-card" style={{ padding: 12 }}>
                  <b>Danger zone</b>
                  <div className="hint" style={{ margin: "6px 0" }}>
                    Reset local data (lists, tasks, xp, settings). This cannot be undone.
                  </div>
                  <button
                    className="btn"
                    onClick={() => {
                      if (confirm("Reset local account data? This removes all local lists, tasks, and settings.")) {
                        onResetAccount?.();
                        onClose?.();
                      }
                    }}
                  >
                    Reset account
                  </button>
                  {fbReady && user && (
                    <div style={{ marginTop: 8 }}>
                      <div className="hint" style={{ margin: "6px 0" }}>
                        Replace your cloud copy with factory defaults for this account.
                      </div>
                      <button
                        className="btn"
                        disabled={cloudBusy}
                        onClick={() => {
                          if (confirm("Reset cloud data for this account? This replaces the remote copy with defaults.")) {
                            onResetCloud?.();
                          }
                        }}
                      >
                        Reset cloud data
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* About */}
        {section === "about" && (
          <div className="modal-body settings-modal__body">
            <div className="hint">
              Quest Journal — If your life had a progress bar! Built by Saeed Sotoudemehr.
            </div>
          </div>
        )}

        {/* Scoped responsive styles to prevent horizontal scroll on mobile */}
        <style>{`
          .settings-modal {
            width: min(720px, 96vw);
            max-height: min(86vh, 100dvh - 32px);
            overflow: hidden;             /* hide any accidental overflow */
            overflow-y: auto;             /* vertical scroll only */
            box-sizing: border-box;
          }
          .settings-modal__header { gap: 8px; }
          .settings-modal__tabs {
            display: flex;
            flex-wrap: wrap;
            gap: 8px 10px;
          }
          .settings-modal__tabs .tab {
            flex: 1 1 140px;              /* wrap gracefully on small screens */
            text-align: center;
            white-space: nowrap;
          }
          .settings-modal__body {
            overflow-wrap: anywhere;      /* long words/URLs won't force overflow */
          }

          /* generic responsive row used across sections */
          .settings-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            min-width: 0;
            flex-wrap: nowrap;
          }
          .settings-row.wrap { flex-wrap: wrap; }

          .settings-row__left {
            display: flex; align-items: center; gap: 12px; min-width: 0;
          }
          .settings-row__right {
            display: flex; align-items: center; gap: 8px; flex: 0 0 auto;
          }

          .settings-text {
            flex: 1 1 240px;
            min-width: 0;                 /* allow shrink inside flex row */
            width: auto;
          }

          .settings-avatar {
            width: 36px; height: 36px; border-radius: 999px;
            object-fit: cover;
            background: var(--border);
            display: grid; place-items: center; font-size: 14px; opacity: .9;
          }
          .settings-avatar.ph { background: var(--border); }

          .settings-chiprow {
            display: flex; gap: 8px; flex-wrap: wrap;
          }

          /* Mobile hardening */
          @media (max-width: 900px){
            .settings-modal {
              width: calc(100vw - 24px);  /* safe gutters on both sides */
              max-width: 100vw;
              border-radius: 12px;
              margin: 0;
            }
            .settings-modal__tabs .tab {
              flex: 1 1 45%;
            }
            .settings-row {
              flex-wrap: wrap;             /* stack controls when narrow */
            }
            .settings-row__right {
              width: 100%;
              justify-content: flex-end;
            }
          }

          @media (max-width: 480px){
            .settings-modal { width: calc(100vw - 16px); border-radius: 10px; }
            .settings-modal__tabs .tab { flex: 1 1 100%; }
          }
        `}</style>
      </div>
    </div>
  );
}
