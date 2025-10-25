// ذخیره‌سازی جورنال: متن/متادیتا در localStorage، تصویر در IndexedDB
const LSK = "qj_journal_entries_v1";
const DB_NAME = "qj_journal_db";
const STORE = "images";

// ---------- LocalStorage: entries ----------
export function loadEntry(id) {
  try {
    const map = JSON.parse(localStorage.getItem(LSK) || "{}");
    return map[id] || null;
  } catch { return null; }
}
export function saveEntry(entry) {
  const { id } = entry || {};
  if (!id) return;
  const map = JSON.parse(localStorage.getItem(LSK) || "{}");
  map[id] = entry;
  localStorage.setItem(LSK, JSON.stringify(map));
}
export function listRecent(n = 10) {
  try {
    const map = JSON.parse(localStorage.getItem(LSK) || "{}");
    const arr = Object.values(map).sort((a,b)=> (b.dateISO||"").localeCompare(a.dateISO||""));
    return arr.slice(0, n).map(e => ({ id: e.id, dateISO: e.dateISO, thumb: e.thumb || null }));
  } catch { return []; }
}

// ---------- IndexedDB: small wrapper ----------
function withStore(mode, fn) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      fn(store, tx);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  });
}
function idbGet(key) {
  return new Promise((resolve, reject) => {
    withStore("readonly", (store) => {
      const r = store.get(key);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => reject(r.error);
    }).catch(reject);
  });
}
function idbPut(key, val) {
  return new Promise((resolve, reject) => {
    withStore("readwrite", (store) => {
      const r = store.put(val, key);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    }).catch(reject);
  });
}

// ---------- Image helpers ----------
export async function saveImageDataURL(id, dataURL) {
  if (!id || !dataURL) return;
  // ذخیره‌ی thumbnail کوچک داخل entry برای لیست
  const thumb = await makeThumb(dataURL, 120);
  const entry = loadEntry(id) || { id, dateISO: new Date().toISOString() };
  entry.thumb = thumb;
  saveEntry(entry);

  // ذخیره‌ی Blob در IDB
  const blob = await (await fetch(dataURL)).blob();
  await idbPut(id, blob);
}
export async function getImageURL(id) {
  const blob = await idbGet(id);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

// کوچک‌کننده‌ی DataURL برای thumbnail
async function makeThumb(dataURL, size=120) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      const s = Math.min(size, size);
      const ratio = Math.min(s/img.width, s/img.height);
      c.width = Math.round(img.width*ratio);
      c.height = Math.round(img.height*ratio);
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => resolve(null);
    img.src = dataURL;
  });
}
