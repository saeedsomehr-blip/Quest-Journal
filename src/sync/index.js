// src/sync/index.js
// قلب سینک: session + bootstrap + onSnapshot + flush با debounce/backoff

import {
  auth,
  db,
  googleProvider,
  firebaseEnabled,
  ensureAuthPersistence,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "../lib/firebase.js";

import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

const stateDocRef = (uid) => doc(db, "users", uid, "app", "state");

// --- وضعیت داخلی
let _user = null;
let _status = { state: firebaseEnabled ? "idle" : "disabled", error: "", lastSyncAt: null };
let _isApplyingRemote = false;
let _unsubscribe = null;
let _flushTimer = null;
let _backoffMs = 0;
let _lastUid = "";
let _bootstrapped = false; // guard initial push until remote is applied
let _pollTimer = null;     // fallback pull interval

const LS_LAST_UID = "qj_last_uid";
const LEGACY_LOCAL_UPDATED = "qj_last_local_updated";
const LS_RESET_EPOCH = "qj_reset_epoch"; // per-user: `${LS_RESET_EPOCH}:<uid>`

// ============ iOS redirect marker (fallback #3) ============
const REDIRECT_MARKER_KEY = "qj_auth_redirect_v1";
function writeRedirectMarker() {
  try {
    const payload = {
      ts: Date.now(),
      path: location.pathname + location.search + location.hash,
      reloaded: false,
    };
    localStorage.setItem(REDIRECT_MARKER_KEY, JSON.stringify(payload));
  } catch {}
}
function readRedirectMarker() {
  try { return JSON.parse(localStorage.getItem(REDIRECT_MARKER_KEY) || "null"); }
  catch { return null; }
}
function clearRedirectMarker() {
  try { localStorage.removeItem(REDIRECT_MARKER_KEY); } catch {}
}
// ==========================================================

const io = {
  packState: () => ({}),
  applyRemoteOrMerge: () => {},
  readLocalUpdated: (uid) => {
    try {
      const perUser = Number(localStorage.getItem(`${LEGACY_LOCAL_UPDATED}:${uid}`));
      if (Number.isFinite(perUser) && perUser > 0) return perUser;
      return Number(localStorage.getItem(LEGACY_LOCAL_UPDATED) || 0);
    } catch { return 0; }
  },
  writeLocalUpdated: (ts, uid) => {
    try {
      localStorage.setItem(`${LEGACY_LOCAL_UPDATED}:${uid}`, String(ts));
      localStorage.setItem(LEGACY_LOCAL_UPDATED, String(ts));
    } catch {}
  },
  resetLocalToDefaults: () => {},
};

export function configureLocalIO(overrides = {}) { Object.assign(io, overrides); }

const statusSubs = new Set();
const userSubs = new Set();
function emitStatus() { statusSubs.forEach((cb) => cb(getStatus())); }
function emitUser() { userSubs.forEach((cb) => cb(getUser())); }
export function onStatus(cb) { statusSubs.add(cb); return () => statusSubs.delete(cb); }
export function onUser(cb) { userSubs.add(cb); return () => userSubs.delete(cb); }
export function getStatus() { return { ..._status }; }
export function getUser() { return _user; }

const now = () => Date.now();
function setStatus(partial) { _status = { ..._status, ...partial }; emitStatus(); }
function clearRealtime() { try { _unsubscribe?.(); } catch {} _unsubscribe = null; }
function clearPolling() { try { clearInterval(_pollTimer); } catch {} _pollTimer = null; }
function setLastUid(uid) { try { localStorage.setItem(LS_LAST_UID, uid); } catch {} _lastUid = uid; }
function getLastUid() { if (_lastUid) return _lastUid; try { return localStorage.getItem(LS_LAST_UID) || ""; } catch { return ""; } }

// --- Local reset-epoch helpers (per-user)
function readLocalResetEpoch(uid) {
  if (!uid) return 0;
  try { return Number(localStorage.getItem(`${LS_RESET_EPOCH}:${uid}`) || 0) || 0; }
  catch { return 0; }
}
function writeLocalResetEpoch(ts, uid) {
  if (!uid) return;
  try { localStorage.setItem(`${LS_RESET_EPOCH}:${uid}`, String(ts || 0)); } catch {}
}

// --- سازگاری با useCloudSync فعلی
const _remoteSubs = new Set();
const _applyRemoteSubs = new Set();
let _localGetter = null;
export function onRemote(cb) { _remoteSubs.add(cb); return () => _remoteSubs.delete(cb); }
export function onApplyRemote(cb) { _applyRemoteSubs.add(cb); return () => _applyRemoteSubs.delete(cb); }
export function setLocalSnapshotGetter(fn) { _localGetter = typeof fn === "function" ? fn : null; }
function notifyRemote(remote, uid, phase) { try { _remoteSubs.forEach((cb) => cb(remote, { uid, phase })); } catch {} }
function notifyApplyRemote(remote, uid, phase) { try { _applyRemoteSubs.forEach((cb) => cb(remote, { uid, phase })); } catch {} }

// --- init
export async function init() {
  if (!firebaseEnabled) { setStatus({ state: "disabled" }); return; }
  await ensureAuthPersistence();

  // iOS: اگر از Redirect برگشته‌ایم، نتیجه را resolve کن
  const marker = readRedirectMarker();
  try { await getRedirectResult(auth); } catch {}

  // iOS/Safari bfcache: اگر با pageshow (persisted) برگشتیم و هنوز user نداریم،
  // یک‌بار reload امن انجام بده تا onAuthStateChanged در context تازه اجرا شود.
  const safetyReload = () => {
    const mk = readRedirectMarker();
    if (!mk) return;
    if (_user) { clearRedirectMarker(); return; } // لاگین شدیم → پاک کن
    if (mk.reloaded) { clearRedirectMarker(); return; } // از لوپ جلوگیری
    try {
      localStorage.setItem(REDIRECT_MARKER_KEY, JSON.stringify({ ...mk, reloaded: true }));
    } catch {}
    location.replace(mk.path || location.pathname);
  };

  if (typeof window !== "undefined") {
    window.addEventListener("pageshow", (e) => {
      if (e.persisted) setTimeout(safetyReload, 50);
    });
    // اگر مارکر داریم ولی pageshow نداد، یک تایمر احتیاطی
    if (marker) setTimeout(safetyReload, 1000);
  }

  onAuthStateChanged(auth, async (u) => {
    _user = u; emitUser(); clearRealtime(); clearPolling(); _bootstrapped = false;

    // ورود موفق → مارکر را پاک کن
    if (u) clearRedirectMarker();

    if (!u) { setStatus({ state: "idle", error: "" }); return; }

    setStatus({ state: "syncing", error: "" });

    const lastUid = getLastUid();
    const localUpdated = Number(io.readLocalUpdated(u.uid) || 0);
    const switched = !!(lastUid && lastUid !== u.uid);
    const mustTakeRemote = switched || !lastUid || localUpdated < 1;

    if (switched) {
      try { io.resetLocalToDefaults?.({ forAccountSwitch: true, uidForSwitch: u.uid }); } catch {}
    }

    try {
      await bootstrap(u.uid, { forceRemote: mustTakeRemote });
      startRealtime(u.uid);
      startPolling(u.uid);
      setLastUid(u.uid);
      _bootstrapped = true;
      setStatus({ state: "idle" });
    } catch (e) {
      setStatus({ state: "error", error: String(e?.message || e) });
    }
  });
}

// --- ورود/خروج
export async function signIn() {
  if (!firebaseEnabled) return;
  setStatus({ error: "" });
  try {
    await signInWithPopup(auth, googleProvider);
    clearRedirectMarker();
  }
  catch (err) {
    const code = String(err?.code || "");
    const shouldFallback =
      code.includes("auth/popup-blocked") ||
      code.includes("auth/popup-closed-by-user") ||
      code.includes("auth/operation-not-supported-in-this-environment") ||
      code.includes("auth/network-request-failed") ||
      code.includes("auth/cancelled-popup-request");
    if (shouldFallback) {
      // ★ فالبک سوم: قبل از Redirect مارکر ثبت کن
      writeRedirectMarker();
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    throw err;
  }
}

export async function signOutNow() {
  if (!firebaseEnabled) return;
  clearRedirectMarker();
  await signOut(auth);
  setStatus({ state: "idle" });
}

// --- Bootstrap: احترام به لوکال اگر جدیدتر و forceRemote=false
export async function bootstrap(uid, { forceRemote = false } = {}) {
  if (!firebaseEnabled) return;
  const ref = stateDocRef(uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const remote = snap.data() || {};
    notifyRemote(remote, uid, "bootstrap");

    // اولویت: clientUpdatedAt (کلاینت) ← سپس updatedAt (سرور)
    const ru = Number(
      remote?.clientUpdatedAt ??
      remote?.meta?.clientUpdatedAt ??
      dateToTs(remote?.updatedAt) ??
      dateToTs(remote?.meta?.updatedAt) ??
      0
    );
    const re = Number(remote?.resetEpoch || 0);
    const lu = Number(io.readLocalUpdated(uid) || 0);
    const le = Number(readLocalResetEpoch(uid) || 0);
    const epochForcesRemote = re && re > le;
    const shouldTakeRemote = forceRemote || epochForcesRemote || !(lu && lu > ru);

    // Merge-first on bootstrap. Even if local appears newer at doc-level,
    // allow the app layer to reconcile per-item timestamps.
    _isApplyingRemote = true;
    try {
      io.applyRemoteOrMerge(remote, { force: !!shouldTakeRemote, uid });
      notifyApplyRemote(remote, uid, "bootstrap");
      io.writeLocalUpdated(ru || now(), uid);
      if (re) writeLocalResetEpoch(re, uid);
    } finally { _isApplyingRemote = false; }
  } else {
    await pushFullState(uid);
  }
}

// --- Realtime با گیت تازه‌بودن (clientUpdatedAt → updatedAt)
export function startRealtime(uid) {
  if (!firebaseEnabled) return () => {};
  const ref = stateDocRef(uid);

  _unsubscribe = onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    if (snap.metadata.hasPendingWrites || _isApplyingRemote) return;

    const remote = snap.data() || {};
    const ru = Number(
      remote?.clientUpdatedAt ??
      remote?.meta?.clientUpdatedAt ??
      dateToTs(remote?.updatedAt) ??
      dateToTs(remote?.meta?.updatedAt) ??
      0
    );
    const re = Number(remote?.resetEpoch || 0);
    const lu = Number(io.readLocalUpdated(uid) || 0);
    const le = Number(readLocalResetEpoch(uid) || 0);
    const epochForcesRemote = re && re > le;

    // Always attempt a conservative merge on realtime updates
    // so item-level changes are not lost when local doc timestamp is newer.
    notifyRemote(remote, uid, "realtime");
    _isApplyingRemote = true;
    try {
      io.applyRemoteOrMerge(remote, { force: false, uid });
      notifyApplyRemote(remote, uid, "realtime");
      io.writeLocalUpdated(ru || now(), uid);
      if (re) writeLocalResetEpoch(re, uid);
      setStatus({ lastSyncAt: Date.now() });
    } finally { _isApplyingRemote = false; }
  });

  return _unsubscribe;
}

// --- Fallback: periodic pull to recover from realtime stalls (network/auth glitches)
function startPolling(uid) {
  if (!firebaseEnabled) return;
  // poll every 8s; lightweight and only applies when remote appears newer
  _pollTimer = setInterval(async () => {
    try { await pullOnce(uid); } catch {}
  }, 8000);
}

async function pullOnce(uid) {
  if (!firebaseEnabled || !uid) return;
  const ref = stateDocRef(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const remote = snap.data() || {};
  const ru = Number(
    remote?.clientUpdatedAt ??
    remote?.meta?.clientUpdatedAt ??
    dateToTs(remote?.updatedAt) ??
    dateToTs(remote?.meta?.updatedAt) ??
    0
  );
  const re = Number(remote?.resetEpoch || 0);
  const lu = Number(io.readLocalUpdated(uid) || 0);
  const le = Number(readLocalResetEpoch(uid) || 0);
  const epochForcesRemote = re && re > le;
  // Only apply if remote appears newer or epoch forces
  if (!(epochForcesRemote || (ru && ru > lu))) return;

  notifyRemote(remote, uid, "poll");
  _isApplyingRemote = true;
  try {
    io.applyRemoteOrMerge(remote, { force: false, uid });
    notifyApplyRemote(remote, uid, "poll");
    io.writeLocalUpdated(ru || now(), uid);
    if (re) writeLocalResetEpoch(re, uid);
    setStatus({ lastSyncAt: Date.now() });
  } finally { _isApplyingRemote = false; }
}

// --- صف فلش
export function notifyLocalChange() {
  if (!firebaseEnabled || !_user) return;
  if (_isApplyingRemote) return;
  // Avoid clobbering cloud on first app mount before we applied remote
  if (!_bootstrapped) return;

  // ثبت فوری تازگی لوکال تا onSnapshot نتواند رول‌بک کند
  try { io.writeLocalUpdated(Date.now(), _user.uid); } catch {}

  // Push quickly to keep devices in near lockstep. Keep a tiny debounce
  // to coalesce micro-bursts from multiple state writes in a tick.
  const BASE_DEBOUNCE_MS = 100; // was 1000ms
  clearTimeout(_flushTimer);
  _flushTimer = setTimeout(() => flushNow(), BASE_DEBOUNCE_MS + _backoffMs);
}

export async function flushNow() {
  if (!firebaseEnabled || !_user) return;
  try {
    setStatus({ state: "syncing" });
    await pushFullState(_user.uid);
    _backoffMs = 0;
    setStatus({ state: "idle", lastSyncAt: Date.now() });
  } catch (e) {
    _backoffMs = Math.min(16000, _backoffMs ? _backoffMs * 2 : 1000);
    setStatus({ state: "error", error: String(e?.message || e) });
  }
}

// --- ارسال state کامل با هر دو زمان: server + client
async function pushFullState(uid) {
  const ref = stateDocRef(uid);

  const body =
    (typeof _localGetter === "function" ? _localGetter() : null) ||
    (io.packState?.() || {});

  const clientTs = Date.now();

  const payload = {
    ...cleanForFirestore(body),
    // سروری برای نظم بین دستگاه‌ها
    updatedAt: serverTimestamp(),
    meta: { ...(body.meta || {}), updatedAt: serverTimestamp() },
    // کلاینتی برای مقایسه با localUpdated و جلوگیری از رول‌بک
    clientUpdatedAt: clientTs,
    metaClient: { ...(body.metaClient || {}), clientUpdatedAt: clientTs },
  };

  await setDoc(ref, payload, { merge: true });
  io.writeLocalUpdated(clientTs, uid);
  setStatus({ lastSyncAt: Date.now() });
}

// --- Reset remote to defaults
export async function resetRemoteToDefaults(payload = {}) {
  if (!firebaseEnabled || !_user) return;
  const uid = _user.uid;
  const ref = stateDocRef(uid);
  try {
    setStatus({ state: "syncing" });
    const cleaned = cleanForFirestore(payload) || {};
    const stamp = serverTimestamp();
    const clientTs = Date.now();
    const epoch = Date.now();
    const body = {
      ...cleaned,
      updatedAt: stamp,
      meta: { ...(cleaned.meta || {}), updatedAt: stamp },
      clientUpdatedAt: clientTs,
      metaClient: { ...(cleaned.metaClient || {}), clientUpdatedAt: clientTs },
      resetEpoch: epoch,
    };
    await setDoc(ref, body, { merge: false });
    io.writeLocalUpdated(clientTs, uid);
    writeLocalResetEpoch(epoch, uid);
    setStatus({ state: "idle", lastSyncAt: Date.now() });
  } catch (e) {
    setStatus({ state: "error", error: String(e?.message || e) });
    throw e;
  }
}

// --- ابزارها
function dateToTs(x) {
  if (!x) return 0;
  if (typeof x === "object" && typeof x.toMillis === "function") {
    try { return x.toMillis(); } catch {}
  }
  if (typeof x === "number") return x;
  if (typeof x === "string") return Date.parse(x) || 0;
  return 0;
}
function cleanForFirestore(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) return value.map((v) => (v === undefined ? null : cleanForFirestore(v)));
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      const cleaned = cleanForFirestore(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }
  if (Number.isNaN(value)) return null;
  return value;
}

// --- فلش روی خروج
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => { try { flushNow(); } catch {} }, { capture: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") { try { flushNow(); } catch {} }
  });
  window.addEventListener("focus", () => { try { flushNow(); } catch {} });
  window.addEventListener("online", () => { try { flushNow(); } catch {} });
}
