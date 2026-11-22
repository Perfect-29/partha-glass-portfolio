import { getFirestore } from 'firebase/firestore';
import { firebaseApp, firebaseConfigured } from './firebaseApp';

export { firebaseConfigured };
export const db = firebaseApp ? getFirestore(firebaseApp) : null;
