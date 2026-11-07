import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBwRTp1aiLnPqVKgq4oXzg-1ZlbYPwISNw",
    authDomain: "cruz-roja-guazapa.firebaseapp.com",
    projectId: "cruz-roja-guazapa",
    storageBucket: "cruz-roja-guazapa.firebasestorage.app",
    messagingSenderId: "531896448688",
    appId: "1:531896448688:web:27158f3b0faaf220886d75",
    measurementId: "G-ZD9SKMJKMB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);