import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  getDocs,
  getDoc,
  doc,
  Query,
  QuerySnapshot,
  DocumentReference,
  DocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';

const getEnvVar = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[key];
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

export const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || "AIzaSyCws_hcZlE38-sly6oYCMbvXNAgM4AupkM",
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || "newaro-21104.firebaseapp.com",
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || "newaro-21104",
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || "newaro-21104.firebasestorage.app",
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || "1018269871845",
  appId: getEnvVar('VITE_FIREBASE_APP_ID') || "1:1018269871845:web:9097740dd9e4a7909aae0c",
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID') || "G-BWZ3FELZPM",
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function getDocsWithTimeout<T = DocumentData>(
  q: Query<T>,
  timeoutMs = 7000
): Promise<QuerySnapshot<T>> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Firestore fetch timeout')), timeoutMs);
  });
  return Promise.race([getDocs(q), timeoutPromise]);
}

export async function getDocWithTimeout<T = DocumentData>(
  docRef: DocumentReference<T>,
  timeoutMs = 7000
): Promise<DocumentSnapshot<T>> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Firestore doc fetch timeout')), timeoutMs);
  });
  return Promise.race([getDoc(docRef), timeoutPromise]);
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
};
export type { User };
