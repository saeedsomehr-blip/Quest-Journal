import { db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export async function getProfile(uid) {
  const ref = doc(db, "profiles", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function upsertProfile(uid, data) {
  const ref = doc(db, "profiles", uid);
  await setDoc(ref, { ...data, updatedAt: Date.now() }, { merge: true });
}

export const LS_PROFILE_KEY = "qj_profile_name";
