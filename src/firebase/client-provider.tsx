'use client';

import React, { useMemo, useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * Ensures Firebase is only initialized and rendered on the client side 
 * to prevent Hydration Mismatch errors.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Component has mounted on the client, safe to render client-specific logic
    setIsMounted(true);
  }, []);

  const services = useMemo(() => {
    if (!isMounted) return null;
    return initializeFirebase();
  }, [isMounted]);

  // During SSR and initial hydration, we render a shell that matches the server
  // to avoid DOM mismatch (Hydration Error).
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-background">
        {/* Empty shell to match server */}
      </div>
    );
  }

  // If initialization fails or is in progress, show a consistent loading state
  if (!services || !services.firebaseApp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground animate-pulse font-medium">Initializing PrintFlow Services...</p>
        </div>
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