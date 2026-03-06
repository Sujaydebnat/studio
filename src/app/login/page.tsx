
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Printer, Loader2, LogIn, UserCheck, KeySquare } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
import { doc, collection, query, where, getDocs, setDoc, or } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState(''); // Email, username, or phone
  const [password, setPassword] = useState('');

  const handleRoleRedirect = (role: string) => {
    if (role === 'admin') {
      router.push('/admin/dashboard');
    } else {
      router.push('/staff/dashboard');
    }
  };

  const handleAuthResult = async (user: any, userData: any) => {
    if (!db) return;
    
    // Ensure the UID mapping is stored in Firestore
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      ...userData,
      uid: user.uid,
      lastLogin: new Date().toISOString()
    }, { merge: true });

    handleRoleRedirect(userData.role);
    toast({ title: "Login Successful", description: `Welcome back, ${userData.name}.` });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;
    setLoading(true);
    
    const cleanId = identifier.trim().toLowerCase();

    try {
      // Step 1: Find the user metadata in Firestore using multi-identifier query
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef, 
        or(
          where('email', '==', cleanId),
          where('username', '==', cleanId),
          where('phone', '==', cleanId)
        )
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast({ variant: "destructive", title: "Login Failed", description: "Account not registered. Please contact Admin." });
        setLoading(false);
        return;
      }

      const userData = querySnapshot.docs[0].data();
      
      // Step 2: Validate password (stored in Firestore for pre-authorized users)
      if (userData.password !== password) {
        toast({ variant: "destructive", title: "Login Failed", description: "Incorrect password." });
        setLoading(false);
        return;
      }

      // Step 3: Firebase Auth Sign In or Auto-Activation
      try {
        const authResult = await signInWithEmailAndPassword(auth, userData.email, password);
        await handleAuthResult(authResult.user, userData);
      } catch (authErr: any) {
        // Auto-Activation: If Firebase Auth account doesn't exist yet, create it using Firestore info
        if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/invalid-login-credentials') {
          try {
            const newAuthResult = await createUserWithEmailAndPassword(auth, userData.email, password);
            await handleAuthResult(newAuthResult.user, userData);
          } catch (createErr: any) {
            console.error("Auto-activation failed:", createErr);
            toast({ variant: "destructive", title: "Direct Login Failed", description: "System could not auto-activate your account." });
          }
        } else {
          toast({ variant: "destructive", title: "Auth Error", description: authErr.message });
        }
      }
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "System Error", description: "Check your internet connection." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="bg-primary p-2 rounded-xl shadow-lg">
          <Printer className="w-10 h-10 text-white" />
        </div>
        <span className="text-4xl font-extrabold text-primary font-headline tracking-tight">PrintFlow</span>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-2">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <UserCheck className="w-6 h-6 text-primary" /> Personnel Portal
          </CardTitle>
          <CardDescription>Login with Email, Username, or Mobile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Identifier</Label>
              <div className="relative">
                <Input 
                  id="identifier"
                  required 
                  value={identifier} 
                  onChange={(e) => setIdentifier(e.target.value)} 
                  placeholder="Email / Username / Mobile" 
                  className="h-11 pl-10"
                />
                <KeySquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Security Password</Label>
              <Input 
                id="password"
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-bold shadow-md" disabled={loading}>
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <LogIn className="mr-2 w-5 h-5" />}
              {loading ? 'Authenticating...' : 'Login to Workspace'}
            </Button>
          </form>
          
          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 -top-2.5 -translate-x-1/2 bg-background px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              No Verification Required
            </span>
          </div>
          
          <p className="text-[10px] text-center text-muted-foreground italic">
            Direct access for authorized personnel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
