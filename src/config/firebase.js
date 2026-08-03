import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDqm-mx8w7w4UKtVlC3KzxXlaQWwmWTtR8",
  authDomain: "xyz-school-result-system.firebaseapp.com",
  projectId: "xyz-school-result-system",
  storageBucket: "xyz-school-result-system.firebasestorage.app",
  messagingSenderId: "672166616676",
  appId: "1:672166616676:web:e1fefe92845511adb74971"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;