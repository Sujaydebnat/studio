
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Loader2, LogIn, Lock, Mail, ArrowLeft, ShieldAlert, Info } from 'lucide-react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function AdminLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;
    
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !password) {
      toast({ variant: "destructive", title: "Required", description: "Please enter both email and password." });
      return;
    }

    setLoading(true);

    const maxRetries = 2;
    let attempt = 0;
    let success = false;

    while (attempt <= maxRetries && !success) {
      try {
        // 1. Authenticate with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const user = userCredential.user;
        success = true;

        // 2. Recognized Super Admin UIDs for auto-provisioning
        const superAdminUIDs = [
          'GBknAJHg5lRKims8hdy6AC6q3qO2', 
          'NWLuwbVTGYcpeeOu2l8zcFLOZSI3',
          'uyNwlQz5VucqI6QXNWn9sIC89k83'
        ];

        // 3. Fetch user profile from Firestore by UID
        const userRef = doc(db, 'users', user.uid);
        let userSnap = await getDoc(userRef);

        // Handle Super Admin Logic & Auto-provisioning
        if (superAdminUIDs.includes(user.uid)) {
          if (!userSnap.exists()) {
            setDoc(userRef, {
              id: user.uid,
              name: 'Super Admin',
              email: user.email || cleanEmail,
              role: 'super_admin',
              status: 'Active',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            }).catch(async () => {
              errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: userRef.path,
                operation: 'create',
                requestResourceData: { role: 'super_admin' }
              }));
            });
          } else if (userSnap.data()?.role !== 'super_admin') {
            setDoc(userRef, { 
              role: 'super_admin', 
              updatedAt: serverTimestamp() 
            }, { merge: true }).catch(async () => {
              errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: { role: 'super_admin' }
              }));
            });
          }

          toast({ title: "System Unlock", description: "Super Admin authorized. Entering global command center." });
          router.push('/admin/dashboard');
          return;
        }

        if (!userSnap.exists()) {
          await signOut(auth);
          toast({ 
            variant: "destructive", 
            title: "Access Denied", 
            description: "No administrative profile found for this account." 
          });
          setLoading(false);
          return;
        }

        const userData = userSnap.data();
        if (userData.role !== 'super_admin') {
          await signOut(auth);
          toast({ 
            variant: "destructive", 
            title: "Forbidden", 
            description: "This portal is reserved for Super Admins only." 
          });
          setLoading(false);
          return;
        }

        toast({ title: "System Unlock", description: "Super Admin verified." });
        router.push('/admin/dashboard');

      } catch (error: any) {
        console.warn(`Login attempt ${attempt + 1} failed:`, error.code);

        if (error.code === 'auth/network-request-failed' && attempt < maxRetries) {
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        let errorTitle = "Authentication Failed";
        let errorMessage = "Invalid admin credentials or network issue.";

        if (error.code === 'auth/network-request-failed') {
          errorTitle = "Network Error";
          errorMessage = "Could not connect to authentication services. Please check your internet connection.";
        } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          errorMessage = "The email or password you entered is incorrect.";
        }

        toast({ variant: "destructive", title: errorTitle, description: errorMessage });
        setLoading(false);
        return;
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <Link href="/login" className="mb-8 inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">
        <ArrowLeft className="w-4 h-4" /> Exit to Public Portal
      </Link>
      
      <div className="mb-8 flex items-center gap-3">
        <div className="bg-primary p-3 rounded-2xl shadow-2xl shadow-primary/20 ring-4 ring-primary/10">
          <ShieldAlert className="w-10 h-10 text-white" />
        </div>
        <span className="text-4xl font-black text-white font-headline tracking-tighter italic">MasterFlow</span>
      </div>

      <Card className="w-full max-md shadow-2xl border-2 bg-slate-900 border-slate-800 text-white">
        <CardHeader className="text-center border-b border-slate-800 pb-6">
          <CardTitle className="text-2xl font-black flex items-center justify-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" /> Root Controller
          </CardTitle>
          <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Global Administration Node</CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-400 text-xs font-bold uppercase">Authorized Email</Label>
              <div className="relative">
                <Input 
                  required 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="admin@system.com" 
                  className="h-12 pl-10 bg-slate-950 border-slate-800 text-white focus-visible:ring-primary" 
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-slate-400 text-xs font-bold uppercase">System Key (Password)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-800 border-slate-700 text-white text-xs">
                      This is the password for your Super Admin account in Firebase Auth.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative">
                <Input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="h-12 pl-10 bg-slate-950 border-slate-800 text-white focus-visible:ring-primary" 
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              </div>
            </div>
            <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <LogIn className="mr-2 w-5 h-5" />}
              {loading ? 'VERIFYING...' : 'UNLOCK SYSTEM'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-[10px] text-slate-600 uppercase tracking-[0.3em] font-black">Encrypted Access Layer • Multi-Tenant Core V1.0</p>
    </div>
  );
}
