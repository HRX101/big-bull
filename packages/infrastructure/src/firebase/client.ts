import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getPerformance, type FirebasePerformance } from 'firebase/performance';
import { getFirebaseConfig } from './config';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let functions: Functions | undefined;
let appCheck: AppCheck | undefined;
let analytics: Analytics | undefined;
let performance: FirebasePerformance | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps()[0] ?? initializeApp(getFirebaseConfig());
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp());
  }
  return storage;
}

export function getFirebaseFunctions(): Functions {
  if (!functions) {
    functions = getFunctions(getFirebaseApp(), 'asia-south1');
  }
  return functions;
}

export function initAppCheck(): AppCheck | undefined {
  if (typeof window === 'undefined' || appCheck) return appCheck;

  const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
  if (debugToken) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  }

  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
  if (!siteKey) return undefined;

  appCheck = initializeAppCheck(getFirebaseApp(), {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });

  return appCheck;
}

export async function initAnalytics(): Promise<Analytics | undefined> {
  if (typeof window === 'undefined' || analytics) return analytics;
  if (await isSupported()) {
    analytics = getAnalytics(getFirebaseApp());
  }
  return analytics;
}

export function initPerformance(): FirebasePerformance | undefined {
  if (typeof window === 'undefined' || performance) return performance;
  performance = getPerformance(getFirebaseApp());
  return performance;
}

export const googleProvider = new GoogleAuthProvider();
