'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  initializeFirestore, 
  Firestore, 
  getFirestore, 
  CACHE_SIZE_UNLIMITED 
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';
import { useMemo } from 'react';

// Singletons to persist across re-renders/HMR
let firebaseApp: FirebaseApp;
let firestore: Firestore;
let auth: Auth;

/**
 * Robust initialization of Firebase services.
 * Ensures Firestore uses long-polling to bypass proxy/WebSocket restrictions in cloud IDEs
 * and enables unlimited local caching.
 */
export function initializeFirebase(): {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
} {
  if (getApps().length === 0) {
    firebaseApp = initializeApp(firebaseConfig);
    // Force Long Polling and disable auto-detect to strictly bypass blocked WebSockets
    firestore = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: false,
      localCache: {
        kind: 'persistent',
      }
    });
    auth = getAuth(firebaseApp);
  } else {
    firebaseApp = getApp();
    try {
      firestore = getFirestore(firebaseApp);
    } catch (e) {
      firestore = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: false,
      });
    }
    auth = getAuth(firebaseApp);
  }

  return { firebaseApp, firestore, auth };
}

/**
 * A utility hook to stabilize Firebase references and queries.
 * Prevents infinite re-render loops when creating refs/queries inline.
 */
export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  return useMemo(factory, deps);
}

export * from './provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
