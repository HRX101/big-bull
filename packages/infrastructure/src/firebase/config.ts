export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export function getFirebaseConfig(): FirebaseConfig {
  const config: FirebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'build-placeholder-api-key',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'big-bull-car-spa.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'big-bull-car-spa',
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'big-bull-car-spa.firebasestorage.app',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '931079920842',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:931079920842:web:build-placeholder',
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  if (
    typeof window !== 'undefined' &&
    process.env.NODE_ENV === 'production' &&
    (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ||
      !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
      !process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim())
  ) {
    throw new Error('Firebase configuration is incomplete. Check NEXT_PUBLIC_FIREBASE_* env vars.');
  }

  return config;
}

export function useEmulators(): boolean {
  return process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
}
