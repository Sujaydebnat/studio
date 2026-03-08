'use client';

import React, { useMemo, useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * Ensures Firebase is ONLY initialized and rendered on the client side.
 * This effectively prevents Hydration Mismatch and the "ca9" assertion crash.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Flag that we are now safely running in the browser
    setIsMounted(true);
  }, []);

  // Compute services only once after mounting
  const services = useMemo(() => {
    if (!isMounted) return null;
    return initializeFirebase();
  }, [isMounted]);

  // Render a stable shell during SSR to match the HTML structure exactly
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If initialization is in progress
  if (!services || !services.firebaseApp || !services.firestore || !services.auth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse font-bold tracking-widest uppercase text-xs">
          Booting System Core...
        </p>
      </div>
    );
  }

  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      auth={services.auth}
      firestore={services.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
