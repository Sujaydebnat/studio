
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, initializeFirestore, CACHE_SIZE_UNLIMITED, terminate } from 'firebase/firestore';

let app: FirebaseApp;
let firestore: Firestore;
let auth: Auth;

/**
 * Initializes Firebase services with stability optimizations for cloud environments.
 * Uses a singleton pattern to ensure only one instance of SDKs exists and prevents 
 * "INTERNAL ASSERTION FAILED (ID: ca9)" by ensuring settings are applied only once.
 */
export function initializeFirebase() {
  if (typeof window === 'undefined') {
    return { firebaseApp: null as any, firestore: null as any, auth: null as any };
  }

  // 1. Initialize Firebase App
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  // 2. Initialize Firebase Auth
  auth = getAuth(app);

  // 3. Initialize Firestore with CA9 assertion protection
  try {
    // Attempt to get existing instance first. This is crucial for Next.js HMR.
    firestore = getFirestore(app);
  } catch (e) {
    // If getFirestore fails, it means it hasn't been initialized yet.
    // We initialize it here with specific settings for cloud IDE stability.
    firestore = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    });
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
