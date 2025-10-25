// src/services/userData.js
import { auth, db, googleProvider } from "../lib/firebaseClient";
import {
  doc, setDoc, getDoc, onSnapshot, collection, addDoc, serverTimestamp
} from "firebase/firestore";
import { signInWithPopup, signOut } from "firebase/auth";

// ورود با گوگل
export async function loginWithGoogle() {
  const res = await signInWithPopup(auth, googleProvider);
  await ensureUserDocument(); // بعد از لاگین، سند کاربر را بساز/آپدیت کن
  return res.user;
}

export async function logout() {
  await signOut(auth);
}

// ساخت/مرج سند users/{uid} با ownerId
export async function ensureUserDocument() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");

  await setDoc(
    doc(db, "users", uid),
    {
      ownerId: uid,                 // برای پاس‌شدن رول‌ها ضروری است
      displayName: auth.currentUser.displayName ?? "Anon",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// --- نمونه‌های ساده برای زیرکالکشن‌ها (مثلاً quests) ---

export async function addQuest(data) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");
  const col = collection(db, "users", uid, "quests");
  return addDoc(col, {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export function onQuestDoc(questId, cb) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");
  const ref = doc(db, "users", uid, "quests", questId);
  return onSnapshot(ref, (snap) => cb(snap.exists() ? snap.data() : null));
}

export async function getMyProfile() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}
