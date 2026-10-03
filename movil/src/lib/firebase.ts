import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const appExistente = getApps().find((app) => app.name === '[DEFAULT]');
const app = appExistente ?? initializeApp(firebaseConfig);

// Completa el tipo de la función disponible en Android/iOS.
const authNativa = FirebaseAuth as typeof FirebaseAuth & {
    getReactNativePersistence(
        storage: typeof AsyncStorage
    ): FirebaseAuth.Persistence;
};

export const auth = appExistente || Platform.OS === 'web'
    ? FirebaseAuth.getAuth(app)
    : FirebaseAuth.initializeAuth(app, {
        persistence: authNativa.getReactNativePersistence(AsyncStorage),
    });

export const db = getFirestore(app);
export const storage = getStorage(app);