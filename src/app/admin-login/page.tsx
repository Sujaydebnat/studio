
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Loader2, LogIn, Lock, Mail, ArrowLeft } from 'lucide-react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

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
    setLoading(true);

    try {
      // 1. Authenticate first (Security rules usually block pre-auth queries)
      const userCredential = await signInWithEmailAndPassword(auth, email.toLowerCase().trim(), password);
      const user = userCredential.user;

      // 2. Fetch user profile from Firestore to verify role
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists() || userSnap.data()?.role !== 'super_admin') {
        // 3. If not super_admin, sign them out immediately
        await signOut(auth);
        toast({ 
          variant: "destructive", 
          title: "Access Denied", 
          description: "This account does not have Super Admin privileges." 
        });
        setLoading(false);
        return;
      }

      // 4. Authorized
      toast({ title: "Admin Authorized", description: "Accessing global control center." });
      router.push('/admin/dashboard');
    } catch (error: any) {
      console.error("Login error:", error);
      toast({ 
        variant: "destructive", 
        title: "Authentication Failed", 
        description: "Check your email or password." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <Link href="/login" className="mb-8 inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Portal
      </Link>
      
      <div className="mb-8 flex items-center gap-3">
        <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20">
          <ShieldAlert className="w-10 h-10 text-white" />
        </div>
        <span className="text-4xl font-black text-white font-headline tracking-tighter italic">MasterFlow</span>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-2 bg-slate-800 border-slate-700 text-white">
        <CardHeader className="text-center border-b border-slate-700">
          <CardTitle className="text-2xl font-black flex items-center justify-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" /> System Controller
          </CardTitle>
          <CardDescription className="text-slate-400">Global Administration Login</CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-300">Admin Email</Label>
              <div className="relative">
                <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@system.com" className="h-12 pl-10 bg-slate-900 border-slate-700 text-white" />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Secret Key</Label>
              <div className="relative">
                <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-12 pl-10 bg-slate-900 border-slate-700 text-white" />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-bold shadow-lg" disabled={loading}>
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <LogIn className="mr-2 w-5 h-5" />}
              {loading ? 'Authenticating...' : 'Unlock System'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-xs text-slate-500 uppercase tracking-widest font-bold">Encrypted Control Layer • Tenant Separation Active</p>
    </div>
  );
}

function ShieldAlert({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}
