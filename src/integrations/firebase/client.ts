import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_APIKEY,
  authDomain: import.meta.env.VITE_AUTHDOMAIN,
  projectId: import.meta.env.VITE_PROJECTID,
  storageBucket: import.meta.env.VITE_STORAGEBUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGINGSENDERID,
  appId: import.meta.env.VITE_APPID,
  // NOTE: You must enable Realtime Database in Firebase Console:
  // Firebase Console → Build → Realtime Database → Create Database → Start in Test Mode
  // If your RTDB is NOT in us-central1, update this URL to match your region.
  databaseURL: `https://${import.meta.env.VITE_PROJECTID}-default-rtdb.firebaseio.com`,
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);
export const firestore = getFirestore(app);
export const auth = getAuth(app);
