"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Printer, Loader2, LogIn, UserCheck, User as UserIcon, Lock, ShieldCheck, Store, UserPlus, ShieldAlert, ArrowLeft } from 'lucide-react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, or, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'hub' | 'owner' | 'staff'>('hub');
  
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;
    setLoading(true);
    
    const cleanId = identifier.trim().toLowerCase();

    try {
      let targetEmail = cleanId;
      if (!cleanId.includes('@')) {
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef, 
          or(
            where('username', '==', cleanId),
            where('phone', '==', cleanId)
          )
        );
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          targetEmail = querySnap.docs[0].data().email;
        } else {
          toast({ variant: "destructive", title: "Account Not Found", description: "No profile matches this ID or Phone." });
          setLoading(false);
          return;
        }
      }

      const authResult = await signInWithEmailAndPassword(auth, targetEmail, password);
      const user = authResult.user;

      const superAdminUIDs = [
        'GBknAJHg5lRKims8hdy6AC6q3qO2', 
        'NWLuwbVTGYcpeeOu2l8zcFLOZSI3',
        'uyNwlQz5VucqI6QXNWn9sIC89k83',
        'cRm3xfHwoJWpH2iL6RejsJTlREH3'
      ];

      const userRef = doc(db, 'users', user.uid);
      let userSnap = await getDoc(userRef);

      if (superAdminUIDs.includes(user.uid)) {
        await setDoc(userRef, {
          id: user.uid,
          name: user.displayName || 'Super Admin',
          email: user.email || targetEmail,
          role: 'super_admin',
          status: 'Active',
          updatedAt: serverTimestamp(),
          ...(userSnap.exists() ? {} : { createdAt: serverTimestamp() })
        }, { merge: true });
        
        // Sync role collection for Strategy A compliance
        await setDoc(doc(db, 'roles_admin', user.uid), { active: true }, { merge: true });
        
        toast({ title: "Master Access", description: "Global Controller Identity Verified." });
        router.push('/admin/dashboard');
        return;
      }

      if (!userSnap.exists()) {
        toast({ variant: "destructive", title: "Profile Missing", description: "Please contact your shop owner." });
        await signOut(auth);
        setLoading(false);
        return;
      }

      const userData = userSnap.data();
      const role = userData.role;

      if (role === 'super_admin' || role === 'shop_owner' || role === 'admin') {
        router.push('/admin/dashboard');
      } else if (role === 'staff') {
        router.push('/staff/dashboard');
      } else {
        toast({ variant: "destructive", title: "Access Denied", description: "Your account has no valid role." });
        await signOut(auth);
      }

    } catch (error: any) {
      console.warn("Login Error:", error.code);
      let errorMessage = "Invalid credentials or network issue.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        errorMessage = "Email অথবা Password সঠিক নয়।";
      }
      toast({ variant: "destructive", title: "Login Failed", description: errorMessage });
      setLoading(false);
    }
  };

  if (mode === 'hub') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="mb-8 flex items-center gap-3 animate-in fade-in duration-500">
          <div className="bg-primary p-3 rounded-2xl shadow-xl ring-4 ring-primary/10">
            <Printer className="w-12 h-12 text-white" />
          </div>
          <span className="text-4xl font-black text-primary font-headline tracking-tighter italic">PrintFlow</span>
        </div>

        <Card className="w-full max-w-md shadow-2xl border-2">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-2xl font-black">Portal Access</CardTitle>
            <CardDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Select your entrance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => router.push('/admin-login')} variant="outline" className="w-full h-16 text-lg font-bold gap-3 border-2 hover:border-primary transition-all bg-slate-900 text-white hover:bg-slate-800 group">
              <ShieldAlert className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" /> Master Controller
            </Button>
            <Button onClick={() => setMode('owner')} variant="outline" className="w-full h-16 text-lg font-bold gap-3 border-2 hover:border-primary transition-all group">
              <Store className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" /> Shop Owner Login
            </Button>
            <Button onClick={() => setMode('staff')} variant="outline" className="w-full h-16 text-lg font-bold gap-3 border-2 hover:border-accent transition-all group">
              <UserCheck className="w-6 h-6 text-accent group-hover:scale-110 transition-transform" /> Personnel Login
            </Button>
            
            <Separator className="my-6" />
            
            <Link href="/signup-shop" className="block text-center">
              <Button variant="link" className="font-bold gap-2 text-primary">
                <UserPlus className="w-4 h-4" /> Start Your Business Now
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-2 animate-in slide-in-from-bottom-4">
        <CardHeader className="text-center relative">
          <Button variant="ghost" size="sm" className="absolute left-4 top-4 font-bold text-xs" onClick={() => setMode('hub')}>
            <ArrowLeft className="w-3 h-3 mr-1" /> BACK
          </Button>
          <CardTitle className="text-2xl font-black flex items-center justify-center gap-2 mt-6">
            {mode === 'owner' ? <Store className="w-6 h-6 text-primary" /> : <UserCheck className="w-6 h-6 text-accent" />}
            {mode === 'owner' ? "Owner Portal" : "Team Entry"}
          </CardTitle>
          <CardDescription className="font-bold uppercase text-[9px] tracking-widest text-muted-foreground">Secure Multi-Tenant Gateway</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">{mode === 'staff' ? "ID / Phone / Email" : "Email Address"}</Label>
              <div className="relative">
                <Input 
                  required 
                  value={identifier} 
                  onChange={(e) => setIdentifier(e.target.value)} 
                  placeholder={mode === 'staff' ? "EMP-101" : "owner@shop.com"} 
                  className="h-12 pl-10 font-medium" 
                />
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Password</Label>
              <div className="relative">
                <Input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="h-12 pl-10" 
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-black shadow-lg" disabled={loading}>
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <LogIn className="mr-2 w-5 h-5" />}
              {loading ? 'VERIFYING...' : 'ENTER'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="bg-muted/30 border-t flex justify-center py-4">
           <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest italic">Encrypted isolation layer active</p>
        </CardFooter>
      </Card>
    </div>
  );
}