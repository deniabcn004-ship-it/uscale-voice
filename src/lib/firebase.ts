import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  where 
} from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

// Firebase Config loaded from the auto-provisioned credentials
const firebaseConfig = {
  apiKey: "AIzaSyAL1MYBf_biqfscbmbJCDcQemAs7wUpghg",
  authDomain: "gen-lang-client-0753108654.firebaseapp.com",
  projectId: "gen-lang-client-0753108654",
  storageBucket: "gen-lang-client-0753108654.firebasestorage.app",
  messagingSenderId: "346863683299",
  appId: "1:346863683299:web:2ea4eb09d359335fff67d6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (utilizing the specific database ID if configured)
const db = getFirestore(app, "ai-studio-algeriandialectv-13bfad6e-0043-4bd9-9f54-6738c87c1b6a");

// Initialize Auth
const auth = getAuth(app);

export {
  app,
  db,
  auth,
  signInAnonymously,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  where,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User
};
