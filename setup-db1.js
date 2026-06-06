import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import dotenv from "dotenv";

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_APIKEY,
  authDomain: process.env.VITE_AUTHDOMAIN,
  projectId: process.env.VITE_PROJECTID,
  storageBucket: process.env.VITE_STORAGEBUCKET,
  messagingSenderId: process.env.VITE_MESSAGINGSENDERID,
  appId: process.env.VITE_APPID,
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

async function setup() {
  try {
    console.log("Setting up allowed users...");
    await setDoc(doc(firestore, "allowed_users", "gv-secret-3"), {
      gender: "male",
      name: "GV"
    });
    console.log("Created user 1: gv-secret-1");

    await setDoc(doc(firestore, "allowed_users", "partner-secret-2"), {
      gender: "female",
      name: "Partner"
    });
    console.log("Created user 2: partner-secret-2");

    console.log("Done!");
    process.exit(0);
  } catch (error) {
    console.error("Error setting up DB:", error);
    process.exit(1);
  }
}

setup();
