'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, initializeFirestore } from 'firebase/firestore';

let app: FirebaseApp;
let firestore: Firestore;
let auth: Auth;

/**
 * Initializes Firebase services with stability optimizations for cloud environments.
 * Uses a singleton pattern to ensure only one instance of SDKs exists.
 */
export function initializeFirebase() {
  if (typeof window === 'undefined') {
    return { firebaseApp: null as any, firestore: null as any, auth: null as any };
  }

  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    // Force Long Polling to bypass potential WebSocket blocks in cloud IDEs/Proxies
    firestore = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
    auth = getAuth(app);
  } else {
    app = getApp();
    firestore = getFirestore(app);
    auth = getAuth(app);
  }

  return { firebaseApp: app, firestore, auth };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
