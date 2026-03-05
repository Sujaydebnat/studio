'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';

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

  // Ensure we only initialize once
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    // Force Long Polling to bypass potential WebSocket blocks in cloud IDEs/Proxies
    // and use unlimited cache for offline resilience.
    firestore = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    });
    auth = getAuth(app);
  } else {
    app = getApp();
    auth = getAuth(app);
    // Safety check to get or initialize firestore instance
    try {
      firestore = getFirestore(app);
    } catch (e) {
      firestore = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      });
    }
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