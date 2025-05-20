// Firebase client configuration
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyApCttAC-f-Gt_w6AmMCC00omm1eaZEAVM",
  authDomain: "greecode-1be16.firebaseapp.com",
  projectId: "greecode-1be16",
  storageBucket: "greecode-1be16.firebasestorage.app",
  messagingSenderId: "724167394935",
  appId: "1:724167394935:web:b544172a8b36b2709c2872",
  measurementId: "G-ZMJ9XWMEEH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);

// Configure Firestore
export const db = getFirestore(app);

// Set Firestore settings to allow reads/writes without authentication
// This is only for development - in production you would use proper security rules
const connectFirestoreEmulator = async () => {
  try {
    // Enable offline persistence - helps with permission issues in some cases
    await enableIndexedDbPersistence(db);
    console.log('Firestore offline persistence enabled');
  } catch (err) {
    console.error('Error enabling offline persistence:', err);
  }
};

// Only run in browser environment
if (typeof window !== 'undefined') {
  connectFirestoreEmulator().catch(console.error);
}

// Initialize Analytics if in browser environment
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
export { analytics };
