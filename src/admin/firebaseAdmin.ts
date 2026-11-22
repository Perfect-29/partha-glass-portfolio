import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { firebaseApp } from '../lib/firebaseApp';

export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const storage = firebaseApp ? getStorage(firebaseApp) : null;
