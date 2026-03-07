'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, LogIn, Database } from 'lucide-react';

/**
 * A listener component that catches globally emitted 'permission-error' events.
 * It provides a user-friendly UI for workstation/session expiration errors.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Logic to determine if this is a system-level workspace error 
      // or a specific app permission error (like trying to edit another shop)
      setError(error);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  const handleRestart = () => {
    // Hard refresh is the safest way to re-establish the Cloud Workstation tunnel
    window.location.reload();
  };

  if (!error) return null;

  // Detect if the error is likely a workspace tunnel issue
  const isWorkspaceIssue = 
    error.request.path.includes('auth/session') || 
    error.request.path.includes('auth/token-refresh') ||
    error.message.includes('network-request-failed');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="max-w-md w-full">
        <Alert variant="destructive" className="border-2 shadow-2xl bg-background overflow-hidden p-0">
          <div className="bg-destructive text-destructive-foreground p-4 flex items-center gap-3">
            <AlertCircle className="h-6 w-6" />
            <AlertTitle className="text-lg font-black uppercase tracking-tighter mb-0">
              {isWorkspaceIssue ? 'Workspace Session Expired' : 'Database Access Denied'}
            </AlertTitle>
          </div>
          
          <div className="p-6 space-y-4">
            <AlertDescription className="text-sm font-medium leading-relaxed opacity-90">
              {isWorkspaceIssue 
                ? "Your secure tunnel to the Firebase workspace has timed out. This is a normal security measure for cloud environments."
                : "You don't have the required permissions to perform this action. This might happen if your session expired or if you're trying to access data from another shop."}
            </AlertDescription>
            
            <div className="p-3 bg-muted rounded-lg border-2 border-dashed font-mono text-[10px] break-all opacity-70">
              <div className="flex items-center gap-2 mb-1 font-bold text-primary">
                <Database className="w-3 h-3" /> REQUEST_CONTEXT
              </div>
              Path: {error.request.path}<br/>
              Op: {error.request.method}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button 
                variant="destructive" 
                className="w-full font-black h-12 gap-2 shadow-lg" 
                onClick={handleRestart}
              >
                <RefreshCw className="w-4 h-4" />
                RESTART WORKSPACE
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-xs font-bold text-muted-foreground hover:text-foreground" 
                onClick={() => setError(null)}
              >
                DISMISS
              </Button>
            </div>
          </div>
          
          <div className="bg-muted/50 p-3 border-t text-center">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
              PrintFlow Security Layer • Active
            </p>
          </div>
        </Alert>
      </div>
    </div>
  );
}
