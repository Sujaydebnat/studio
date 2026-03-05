
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Printer, Loader2, LogIn, Chrome } from 'lucide-react';
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
    } else if (role === 'staff') {
      router.push('/staff/dashboard');
    } else {
      router.push('/staff/dashboard');
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth || !db) return;
    setLoading(true);
    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      let role = 'staff';

      if (!userDoc.exists()) {
        // Default to admin for the first login during prototyping
        role = 'admin';
        await setDoc(userDocRef, {
          name: user.displayName || 'New User',
          email: user.email,
          role: role,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        role = userDoc.data().role;
      }
      
      handleRoleRedirect(role);
      
      toast({
        title: "Welcome back!",
        description: `Logged in as ${user.displayName || user.email}`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Google Login Failed",
        description: error.message || "Could not complete Google authentication.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) {
      toast({
        variant: "destructive",
        title: "System Error",
        description: "Firebase is not properly initialized.",
      });
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (userDoc.exists()) {
        handleRoleRedirect(userDoc.data().role);
      } else {
        // Fallback for missing profile
        router.push('/admin/dashboard');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please check your email/password.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-2">
        <Printer className="w-8 h-8 text-primary" />
        <span className="text-2xl font-bold text-primary font-headline">PrintFlow</span>
      </div>
      
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Management Portal</CardTitle>
          <CardDescription className="text-center">
            Login as Admin or Staff to manage orders
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full gap-2 border-primary/20 hover:bg-primary/5" 
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Chrome className="w-4 h-4 text-blue-600" />}
            Continue with Google
          </Button>

          <div className="relative flex items-center gap-4 py-2">
            <Separator className="flex-1" />
            <span className="text-[10px] uppercase text-muted-foreground font-bold">Or with Email</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@printflow.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-sm text-muted-foreground text-center max-w-xs">
        System uses role-based access. New Google users will be assigned default roles.
      </p>
    </div>
  );
}
