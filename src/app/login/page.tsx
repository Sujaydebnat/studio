
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
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState<'admin' | 'staff' | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRoleRedirect = (role: string) => {
    if (role === 'admin') {
      router.push('/admin/dashboard');
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
      
      let role = selectedPortal || 'staff';

      if (!userDoc.exists()) {
        // Create profile for new user with selected role
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
        title: "Login Failed",
        description: error.message || "Could not complete authentication.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) {
      toast({ variant: "destructive", title: "System Error", description: "Firebase is not properly initialized." });
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (userDoc.exists()) {
        handleRoleRedirect(userDoc.data().role);
      } else {
        // Fallback redirection based on selection if profile missing
        handleRoleRedirect(selectedPortal || 'staff');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid credentials.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-2">
        <Printer className="w-8 h-8 text-primary" />
        <span className="text-3xl font-bold text-primary font-headline">PrintFlow</span>
      </div>

      {!selectedPortal ? (
        <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl animate-in fade-in zoom-in-95 duration-300">
          <Card 
            className="border-2 hover:border-primary cursor-pointer transition-all hover:shadow-lg group"
            onClick={() => setSelectedPortal('admin')}
          >
            <CardHeader className="text-center space-y-4">
              <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-primary group-hover:text-white transition-colors">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
                <CardDescription>Manage staff, orders, and shop settings.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-primary">Login as Admin</Button>
            </CardContent>
          </Card>

          <Card 
            className="border-2 hover:border-accent cursor-pointer transition-all hover:shadow-lg group"
            onClick={() => setSelectedPortal('staff')}
          >
            <CardHeader className="text-center space-y-4">
              <div className="bg-accent/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-accent group-hover:text-white transition-colors">
                <UserCog className="w-8 h-8" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Staff Portal</CardTitle>
                <CardDescription>Update order status and design tasks.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Login as Staff</Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className={cn(
          "w-full max-w-md shadow-xl border-t-4 animate-in slide-in-from-bottom-4 duration-500",
          selectedPortal === 'admin' ? "border-t-primary" : "border-t-accent"
        )}>
          <CardHeader className="relative">
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-4 top-4 text-xs"
              onClick={() => setSelectedPortal(null)}
            >
              Change Role
            </Button>
            <CardTitle className="text-2xl text-center">
              {selectedPortal === 'admin' ? 'Admin Login' : 'Staff Login'}
            </CardTitle>
            <CardDescription className="text-center">
              Access the {selectedPortal} dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full gap-2" 
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
                  placeholder="name@printflow.com" 
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
              <Button 
                type="submit" 
                className={cn("w-full", selectedPortal === 'admin' ? "bg-primary" : "bg-accent text-accent-foreground hover:bg-accent/90")} 
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Sign In to Portal
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      
      <p className="mt-8 text-sm text-muted-foreground text-center max-w-xs">
        System uses role-based access. Admin credentials provide full shop control.
      </p>
    </div>
  );
}
