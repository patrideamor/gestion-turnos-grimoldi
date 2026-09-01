import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Reemplaza con tus llaves reales de Firebase Console
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "sistema-turnos-gabriela.firebaseapp.com",
  projectId: "sistema-turnos-gabriela",
  storageBucket: "sistema-turnos-gabriela.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc, onSnapshot };