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
    return <div className="min-h-screen bg-background" />;
  }

  // If initialization fails for some reason, we avoid breaking the tree
  if (!services) {
    return <div className="min-h-screen bg-background" />;
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