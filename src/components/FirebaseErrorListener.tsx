'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // In development, this will help surface Security Rules issues
      console.error('Security Rules Error Context:', error.context);
      
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: `You do not have permission to ${error.context.operation} this data.`,
      });

      // Optionally re-throw or handle more specifically
      if (process.env.NODE_ENV === 'development') {
        // This triggers the Next.js error overlay with context
        throw error;
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
