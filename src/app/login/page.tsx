
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Printer, Loader2, LogIn, Chrome, ShieldAlert, UserCheck } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRoleRedirect = (role: string) => {
    if (role === 'admin') {
      router.push('/admin/dashboard');
    } else {
      router.push('/staff/dashboard');
    }
  };

  const handleAuthResult = async (user: any) => {
    if (!db) return;
    // Check users collection by UID
    const userDocRef = doc(db, 'users', user.uid);
    let userDoc = await getDoc(userDocRef);

    // If not found by UID, check by sanitized email (for pre-authorized staff)
    if (!userDoc.exists()) {
      const emailId = user.email.toLowerCase().replace(/[@.]/g, '_');
      const emailDocRef = doc(db, 'users', emailId);
      userDoc = await getDoc(emailDocRef);
    }

    if (userDoc.exists()) {
      const data = userDoc.data();
      handleRoleRedirect(data.role);
      toast({ title: "Welcome back!", description: `Portal: ${data.role.toUpperCase()}` });
    } else {
      toast({ 
        variant: "destructive", 
        title: "Unauthorized", 
        description: "This account is not authorized. Please contact your Admin." 
      });
      await auth.signOut();
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth || !db) return;
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      await handleAuthResult(result.user);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;
    setLoading(true);
    
    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Try standard login
      const result = await signInWithEmailAndPassword(auth, cleanEmail, password);
      await handleAuthResult(result.user);
    } catch (error: any) {
      // 2. If user not found in Auth, check if they are "Pre-Authorized" in Firestore
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          const q = query(collection(db, 'users'), where('email', '==', cleanEmail), where('password', '==', password));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const authorizedUser = querySnapshot.docs[0].data();
            // User is pre-authorized! Create their Auth account automatically
            const newAuthResult = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            // Link Firestore doc to the new UID for future logins
            const userRef = doc(db, 'users', newAuthResult.user.uid);
            await setDoc(userRef, {
              ...authorizedUser,
              uid: newAuthResult.user.uid,
              lastLogin: new Date().toISOString()
            }, { merge: true });
            
            handleRoleRedirect(authorizedUser.role);
            toast({ title: "Account Activated", description: `Authorized as ${authorizedUser.role.toUpperCase()}` });
          } else {
            toast({ variant: "destructive", title: "Login Failed", description: "Invalid username or password." });
          }
        } catch (dbErr) {
          toast({ variant: "destructive", title: "Verification Error", description: "Could not verify credentials." });
        }
      } else {
        toast({ variant: "destructive", title: "Error", description: error.message });
      }
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
            <UserCheck className="w-6 h-6 text-primary" /> Internal Portal
          </CardTitle>
          <CardDescription>Secure login for Admin and Authorized Staff</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button variant="outline" className="w-full gap-2 py-6 text-lg font-semibold hover:bg-muted" onClick={handleGoogleLogin} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Chrome className="w-5 h-5 text-blue-600" />}
            Continue with Google
          </Button>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 -top-2.5 -translate-x-1/2 bg-background px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Staff Credentials
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email"
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="name@printflow.com" 
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
              </div>
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
              {loading ? 'Verifying...' : 'Enter Portal'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <div className="mt-8 flex items-center gap-2 text-muted-foreground">
        <ShieldAlert className="w-4 h-4" />
        <p className="text-xs font-medium text-center">
          Authorized personnel only. Access is monitored and logged.
        </p>
      </div>
    </div>
  );
}
