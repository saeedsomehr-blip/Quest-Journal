// src/lib/firebase.js
// یک مبدأ واحدِ تمیز برای Firebase (با Vite)
// - config از import.meta.env می‌آید
// - فقط init و export primitiveها؛ هیچ منطق بیزنسی اینجا نیست

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
} from "firebase/auth";
import {
  getFirestore,
  enableIndexedDbPersistence,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

const cfg = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID, // باید web باشد
};

export const firebaseEnabled = Boolean(
  cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId
);

// --- App/Auth/DB
export const app = firebaseEnabled ? (getApps()[0] || initializeApp(cfg)) : null;
export const auth = firebaseEnabled ? getAuth(app) : null;
export const db = firebaseEnabled ? getFirestore(app) : null;

// --- Provider گوگل (با select_account برای سوییچ راحت اکانت)
export const googleProvider = firebaseEnabled ? new GoogleAuthProvider() : null;
if (googleProvider) {
  try { googleProvider.setCustomParameters({ prompt: "select_account" }); } catch {}
}

// --- کش آفلاین (در وب؛ اگر چندتب باز باشد ممکن است fail شود، اهمیتی ندارد)
if (db) {
  enableIndexedDbPersistence(db).catch(() => {});
}

// --- زنجیره‌ی persistenceِ مقاوم (iOS/Safari Private ok)
export async function ensureAuthPersistence() {
  if (!auth) return;
  try { await setPersistence(auth, indexedDBLocalPersistence); return; } catch {}
  try { await setPersistence(auth, browserLocalPersistence); return; } catch {}
  try { await setPersistence(auth, browserSessionPersistence); return; } catch {}
  try { await setPersistence(auth, inMemoryPersistence); return; } catch {}
  // آخرین تلاش هم شکست خورد؛ مشکلی نیست، Auth در حافظه‌ی موقتی ادامه می‌دهد.
}

// --- Re-exports موردنیاز موتور سینک
export {
  doc, getDoc, setDoc, onSnapshot, serverTimestamp,
};
