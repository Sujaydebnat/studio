
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Printer, Loader2, LogIn, Chrome, ShieldCheck, UserCog } from 'lucide-react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      handleRoleRedirect(userDoc.data().role);
      toast({ title: "Welcome back!", description: `Portal: ${userDoc.data().role.toUpperCase()}` });
    } else {
      // Check if email is pre-authorized by admin (optional prototype logic)
      // For now, if someone logins for the first time, we check if they are authorized
      // In a strict app, we deny access if userDoc doesn't exist.
      toast({ 
        variant: "destructive", 
        title: "Access Denied", 
        description: "Your account is not authorized. Please contact your Admin." 
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
    if (!auth) return;
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await handleAuthResult(result.user);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Failed", description: "Invalid credentials." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-2">
        <Printer className="w-10 h-10 text-primary" />
        <span className="text-4xl font-bold text-primary font-headline tracking-tight">PrintFlow</span>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-2">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Internal Portal</CardTitle>
          <CardDescription>Secure login for Admin and Production Staff</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button variant="outline" className="w-full gap-2 py-6 text-lg" onClick={handleGoogleLogin} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Chrome className="w-5 h-5 text-blue-600" />}
            Continue with Google
          </Button>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 -top-2.5 -translate-x-1/2 bg-background px-2 text-[10px] font-bold text-muted-foreground uppercase">Authorized Access Only</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@printflow.com" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <LogIn className="mr-2" />}
              Enter Portal
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-xs text-muted-foreground text-center max-w-sm">
        Staff accounts must be created by an Administrator. Public registration is disabled to maintain shop security.
      </p>
    </div>
  );
}
