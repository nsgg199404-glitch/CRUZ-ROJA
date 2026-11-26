import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBwRTp1aiLnPgVKgq4oXzg-lZlbYPwISNw",
    authDomain: "cruz-roja-guazapa.firebaseapp.com",
    projectId: "cruz-roja-guazapa",
    storageBucket: "cruz-roja-guazapa.firebasestorage.app",
    messagingSenderId: "531896448688",
    appId: "1:531896448688:web:f42fa653814d5c71886d75",
    measurementId: "G-009WB5WC6W"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);