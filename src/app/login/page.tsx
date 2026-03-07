
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Printer, Loader2, LogIn, UserCheck, User as UserIcon, Lock, ShieldCheck, Store, UserPlus, ShieldAlert } from 'lucide-react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, or, doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'hub' | 'admin' | 'owner' | 'staff'>('hub');
  
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;
    setLoading(true);
    
    const cleanId = identifier.trim().toLowerCase();

    try {
      // 1. Resolve identifier to an email if username/phone was used
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef, 
        or(
          where('email', '==', cleanId),
          where('username', '==', cleanId),
          where('phone', '==', cleanId)
        )
      );
      
      const querySnap = await getDocs(q);
      
      let targetEmail = cleanId;
      if (!querySnap.empty) {
        targetEmail = querySnap.docs[0].data().email;
      } else if (!cleanId.includes('@')) {
        // If not an email and not found in DB
        toast({ variant: "destructive", title: "Account Not Found", description: "We couldn't find a profile with that ID." });
        setLoading(false);
        return;
      }

      // 2. Authenticate with Firebase Auth
      const authResult = await signInWithEmailAndPassword(auth, targetEmail, password);
      const user = authResult.user;

      // 3. Fetch User Document by UID
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        toast({ variant: "destructive", title: "Profile Error", description: "Authenticated successfully but no Firestore profile found." });
        await signOut(auth);
        setLoading(false);
        return;
      }

      const userData = userSnap.data();
      const role = userData.role;

      // 4. Redirect based on role
      if (role === 'super_admin') {
        toast({ title: "Welcome, Super Admin", description: `Authorized access granted.` });
        router.push('/admin/dashboard');
      } else if (role === 'shop_owner') {
        toast({ title: "Shop Dashboard", description: `Welcome back, ${userData.name}.` });
        router.push('/admin/dashboard'); // Both owners and admins use this layout
      } else if (role === 'staff') {
        toast({ title: "Staff Workbench", description: `Welcome back, ${userData.name}.` });
        router.push('/staff/dashboard');
      } else {
        toast({ variant: "destructive", title: "Invalid Role", description: "Your account does not have a valid role assigned. Contact support." });
        await signOut(auth);
      }

    } catch (error: any) {
      console.error("Login Error:", error);
      toast({ variant: "destructive", title: "Login Failed", description: "Please check your credentials and try again." });
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'hub') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="mb-8 flex items-center gap-3">
          <div className="bg-primary p-3 rounded-2xl shadow-xl">
            <Printer className="w-12 h-12 text-white" />
          </div>
          <span className="text-4xl font-black text-primary font-headline tracking-tighter">PrintFlow</span>
        </div>

        <Card className="w-full max-w-md shadow-2xl border-2">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-2xl font-black">Portal Access</CardTitle>
            <CardDescription>Select your portal to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => setMode('admin')} variant="outline" className="w-full h-16 text-lg font-bold gap-3 border-2 hover:border-primary transition-all bg-slate-900 text-white hover:bg-slate-800">
              <ShieldAlert className="w-6 h-6 text-primary" /> Admin Login
            </Button>
            <Button onClick={() => setMode('owner')} variant="outline" className="w-full h-16 text-lg font-bold gap-3 border-2 hover:border-primary transition-all">
              <Store className="w-6 h-6 text-primary" /> Shop Owner Login
            </Button>
            <Button onClick={() => setMode('staff')} variant="outline" className="w-full h-16 text-lg font-bold gap-3 border-2 hover:border-accent transition-all">
              <UserCheck className="w-6 h-6 text-accent" /> Staff Login
            </Button>
            
            <Separator className="my-6" />
            
            <Link href="/signup-shop" className="block">
              <Button variant="link" className="w-full font-bold gap-2 text-primary">
                <UserPlus className="w-4 h-4" /> Create Your Shop
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-2">
        <CardHeader className="text-center relative">
          <Button variant="ghost" className="absolute left-4 top-4" onClick={() => setMode('hub')}>Back</Button>
          <CardTitle className="text-2xl font-black flex items-center justify-center gap-2 mt-4">
            {mode === 'admin' ? <ShieldCheck className="w-6 h-6 text-primary" /> : mode === 'owner' ? <Store className="w-6 h-6 text-primary" /> : <UserCheck className="w-6 h-6 text-accent" />}
            {mode === 'admin' ? "System Admin" : mode === 'owner' ? "Shop Owner" : "Personnel"} Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label>{mode === 'staff' ? "ID / Phone / Email" : "Email Address"}</Label>
              <div className="relative">
                <Input required value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder={mode === 'staff' ? "EMP-101" : "admin@system.com"} className="h-12 pl-10" />
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-12 pl-10" />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-bold shadow-lg" disabled={loading}>
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <LogIn className="mr-2 w-5 h-5" />}
              {loading ? 'Authenticating...' : 'Enter Workspace'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
