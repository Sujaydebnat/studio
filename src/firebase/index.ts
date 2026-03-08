'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, initializeFirestore, CACHE_SIZE_UNLIMITED, getFirestore as getExistingFirestore } from 'firebase/firestore';

/**
 * Global variables to persist instances across Next.js 15 Fast Refresh cycles.
 * This is critical for preventing "INTERNAL ASSERTION FAILED (ID: ca9)" errors.
 */
let firebaseApp: FirebaseApp;
let firestore: Firestore;
let auth: Auth;

/**
 * Initializes Firebase services with strict singleton checks.
 */
export function initializeFirebase() {
  if (typeof window === 'undefined') {
    return { firebaseApp: null as any, firestore: null as any, auth: null as any };
  }

  // 1. Initialize Firebase App
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }

  // 2. Initialize Firebase Auth
  if (!auth) {
    auth = getAuth(firebaseApp);
  }

  // 3. Initialize Firestore with CA9 protection
  if (!firestore) {
    try {
      // Try to get an existing instance first (important for Fast Refresh)
      firestore = getExistingFirestore(firebaseApp);
    } catch (e) {
      // Fallback to initialization only if no instance exists
      firestore = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true,
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      });
    }
  }

  return { firebaseApp, firestore, auth };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
