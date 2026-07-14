import type { AuthCredentials, AuthRepository, SignUpData } from '@car-spa/application';
import type { AuthSession } from '@car-spa/domain';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { getFirebaseAuth, googleProvider } from '../firebase/client';
import { mapFirebaseUserToSession } from '../firebase/mappers';

export class FirebaseAuthRepository implements AuthRepository {
  async signIn(credentials: AuthCredentials) {
    const auth = getFirebaseAuth();
    const result = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    await result.user.getIdToken(true);
    return mapFirebaseUserToSession(result.user);
  }

  async signUp(data: SignUpData) {
    const auth = getFirebaseAuth();
    const result = await createUserWithEmailAndPassword(auth, data.email, data.password);
    await updateProfile(result.user, { displayName: data.displayName });
    return mapFirebaseUserToSession(result.user);
  }

  async signInWithGoogle() {
    const auth = getFirebaseAuth();
    const result = await signInWithPopup(auth, googleProvider);
    await result.user.getIdToken(true);
    return mapFirebaseUserToSession(result.user);
  }

  async signOut() {
    await signOut(getFirebaseAuth());
  }

  async sendPasswordReset(email: string) {
    await sendPasswordResetEmail(getFirebaseAuth(), email);
  }

  async sendEmailVerification() {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new Error('No authenticated user');
    await sendEmailVerification(user);
  }

  async getCurrentSession() {
    const user = getFirebaseAuth().currentUser;
    if (!user) return null;
    return mapFirebaseUserToSession(user);
  }

  async refreshSession() {
    const user = getFirebaseAuth().currentUser;
    if (!user) return null;
    await user.getIdToken(true);
    return mapFirebaseUserToSession(user);
  }

  subscribe(callback: (session: AuthSession | null) => void): () => void {
    return onAuthStateChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        callback(null);
        return;
      }
      callback(await mapFirebaseUserToSession(user));
    });
  }
}
