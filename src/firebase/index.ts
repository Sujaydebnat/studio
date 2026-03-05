'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeFirestore, Firestore, getFirestore, terminate } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';
import { useMemo } from 'react';

let firebaseApp: FirebaseApp;
let firestore: Firestore;
let auth: Auth;

/**
 * Robust initialization of Firebase services.
 * Ensures Firestore uses long-polling to bypass proxy/WebSocket restrictions in cloud IDEs.
 */
export function initializeFirebase(): {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
} {
  if (getApps().length === 0) {
    firebaseApp = initializeApp(firebaseConfig);
    // Initialize Firestore with forceful long polling immediately after app init
    firestore = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: false,
    });
    auth = getAuth(firebaseApp);
  } else {
    firebaseApp = getApp();
    firestore = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
  }

  return { firebaseApp, firestore, auth };
}

/**
 * A utility hook to stabilize Firebase references and queries.
 */
export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  return useMemo(factory, deps);
}

export * from './provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
