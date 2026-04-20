// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyAywpUdJuEiDc5_70ZbhJnSahFdz4twPcI",
  authDomain: "credify184563.firebaseapp.com",
  projectId: "credify184563",
  storageBucket: "credify184563.firebasestorage.app",
  messagingSenderId: "909025462075",
  appId: "1:909025462075:web:e968c0cc80403da894d91e"
};
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();