import type { FirebaseError } from 'firebase/app';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/configuration-not-found':
    'Email/password sign-in is not enabled for this Firebase project. Enable it in Firebase Console → Authentication → Sign-in method.',
  'auth/operation-not-allowed':
    'This sign-in method is not enabled. Enable Email/Password in Firebase Console → Authentication → Sign-in method.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/weak-password': 'Password is too weak. Use at least 8 characters.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes before trying again.',
  'auth/invalid-continue-uri':
    'Email link domain is not authorized. Add your domain in Firebase Console → Authentication → Settings → Authorized domains.',
  'auth/missing-continue-uri': 'Email action URL is misconfigured. Contact support.',
  'auth/unauthorized-continue-uri':
    'Email link domain is not authorized. Add your domain in Firebase Console → Authentication → Settings → Authorized domains.',
  'auth/invalid-action-code': 'This link is invalid or has expired. Request a new verification email.',
  'auth/expired-action-code': 'This link has expired. Request a new verification email.',
  'auth/internal': 'A server error occurred. Ensure Cloud Functions are deployed and try again.',
  'functions/not-found': 'Cloud Function not found. Deploy functions with: firebase deploy --only functions',
  'functions/internal': 'Cloud Function error. Deploy functions and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
};

export function mapFirebaseAuthError(error: unknown): Error {
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as FirebaseError;
    const message = AUTH_ERROR_MESSAGES[firebaseError.code];
    if (message) return new Error(message);
    if (firebaseError.message) return new Error(firebaseError.message);
  }

  if (error instanceof Error) return error;
  return new Error('Authentication failed. Please try again.');
}
