import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getPerformance, type FirebasePerformance } from 'firebase/performance';
import { getFirebaseConfig, useEmulators } from './config';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let functions: Functions | undefined;
let appCheck: AppCheck | undefined;
let analytics: Analytics | undefined;
let performance: FirebasePerformance | undefined;

let emulatorsConnected = false;

function connectEmulatorsIfNeeded(
  authInstance: Auth,
  dbInstance: Firestore,
  storageInstance: FirebaseStorage,
  functionsInstance: Functions,
) {
  if (emulatorsConnected || !useEmulators()) return;
  emulatorsConnected = true;

  const authHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
  const firestoreHost =
    process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
  const storageHost = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199';
  const functionsHost =
    process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST ?? '127.0.0.1:5001';

  connectAuthEmulator(authInstance, `http://${authHost}`, { disableWarnings: true });
  const [firestoreHostname, firestorePort] = firestoreHost.split(':');
  connectFirestoreEmulator(dbInstance, firestoreHostname!, Number(firestorePort));
  const [storageHostname, storagePort] = storageHost.split(':');
  connectStorageEmulator(storageInstance, storageHostname!, Number(storagePort));
  const [functionsHostname, functionsPort] = functionsHost.split(':');
  connectFunctionsEmulator(functionsInstance, functionsHostname!, Number(functionsPort));
}

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps()[0] ?? initializeApp(getFirebaseConfig());
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    connectEmulatorsIfNeeded(auth, getFirebaseDb(), getFirebaseStorage(), getFirebaseFunctions());
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
    functions = getFunctions(getFirebaseApp());
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

  if (useEmulators()) return undefined;

  appCheck = initializeAppCheck(getFirebaseApp(), {
    provider: new ReCaptchaEnterpriseProvider(
      process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY ?? 'debug',
    ),
    isTokenAutoRefreshEnabled: true,
  });

  return appCheck;
}

export async function initAnalytics(): Promise<Analytics | undefined> {
  if (typeof window === 'undefined' || analytics) return analytics;
  if (useEmulators()) return undefined;
  if (await isSupported()) {
    analytics = getAnalytics(getFirebaseApp());
  }
  return analytics;
}

export function initPerformance(): FirebasePerformance | undefined {
  if (typeof window === 'undefined' || performance) return performance;
  if (useEmulators()) return undefined;
  performance = getPerformance(getFirebaseApp());
  return performance;
}

export const googleProvider = new GoogleAuthProvider();
