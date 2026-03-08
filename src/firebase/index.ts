
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, initializeFirestore, CACHE_SIZE_UNLIMITED, terminate } from 'firebase/firestore';

let app: FirebaseApp;
let firestore: Firestore;
let auth: Auth;

/**
 * Initializes Firebase services with strict singleton checks to prevent 
 * "INTERNAL ASSERTION FAILED (ID: ca9)" errors in Next.js 15 / Turbopack.
 */
export function initializeFirebase() {
  if (typeof window === 'undefined') {
    return { firebaseApp: null as any, firestore: null as any, auth: null as any };
  }

  // 1. Initialize Firebase App once
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  // 2. Initialize Firebase Auth once
  auth = getAuth(app);

  // 3. Initialize Firestore with CA9 assertion protection
  try {
    // If instance already exists, reuse it. This is critical for Next.js Fast Refresh.
    const existingFirestore = getFirestore(app);
    firestore = existingFirestore;
  } catch (e) {
    // initializeFirestore can ONLY be called once per app instance.
    firestore = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    });
  }

  return { firebaseApp: app, firestore, auth };
}

/**
 * Safely terminates and re-initializes Firebase services.
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
