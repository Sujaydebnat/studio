'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, initializeFirestore, CACHE_SIZE_UNLIMITED, enableIndexedDbPersistence, terminate } from 'firebase/firestore';

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
    
    // Stability for Cloud IDEs: Force Long Polling to bypass potential WebSocket blocks
    // and use unlimited cache for offline resilience.
    firestore = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    });
    
    auth = getAuth(app);
  } else {
    app = getApp();
    auth = getAuth(app);
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

/**
 * Safely terminates and re-initializes Firebase services.
 * Useful for recovering from deep workspace connection failures.
 */
export async function reconnectFirebase() {
  if (firestore) {
    try {
      await terminate(firestore);
    } catch (e) {
      // Ignore termination errors during forced reconnect
    }
  }
  return initializeFirebase();
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
