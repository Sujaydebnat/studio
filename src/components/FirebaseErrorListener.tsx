
'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, ShieldAlert } from 'lucide-react';

/**
 * A listener component that catches globally emitted 'permission-error' events.
 * It provides a user-friendly UI for workstation/session expiration errors.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      setError(error);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  const handleRestart = () => {
    // Standard approach to refresh the session in Cloud Workstations
    window.location.reload();
  };

  if (!error) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="max-w-md w-full">
        <Alert variant="destructive" className="border-2 shadow-2xl bg-background">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold mb-2">Workspace Connection Issue</AlertTitle>
          <AlertDescription className="space-y-4">
            <p className="text-sm opacity-90">
              Your workspace session expired or your account lacks sufficient permissions to access the database.
            </p>
            
            <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/20 font-medium text-destructive">
              Your workspace session expired. Click Restart Workspace to continue.
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button 
                variant="destructive" 
                className="w-full font-bold gap-2" 
                onClick={handleRestart}
              >
                <RefreshCw className="w-4 h-4" />
                Restart Workspace
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-xs opacity-50 hover:opacity-100" 
                onClick={() => setError(null)}
              >
                Dismiss
              </Button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-destructive/10">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Technical Details</p>
              <p className="text-[9px] font-mono break-all opacity-50">
                Path: {error.request.path}<br/>
                Method: {error.request.method}
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
