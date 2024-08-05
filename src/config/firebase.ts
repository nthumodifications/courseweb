import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyAu3LZ0FZFTDukUmgsJlr6U_0KxBx34uBo",
  authDomain: "nthumods-prod.firebaseapp.com",
  projectId: "nthumods-prod",
  storageBucket: "nthumods-prod.appspot.com",
  messagingSenderId: "977252315806",
  appId: "1:977252315806:web:e7fcf9992f1b916c2c018f",
  measurementId: "G-D06ZGLBZR3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;