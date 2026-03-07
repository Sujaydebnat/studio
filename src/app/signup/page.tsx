
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Printer, Loader2, Rocket, ArrowRight, Store, User, Mail, Phone, Lock } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    shopName: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;

    if (formData.password !== formData.confirmPassword) {
      toast({ variant: "destructive", title: "Passwords mismatch", description: "Please check your passwords." });
      return;
    }

    setLoading(true);
    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Create Shop Document
      const shopId = `shop-${Math.random().toString(36).substr(2, 9)}`;
      await setDoc(doc(db, 'shops', shopId), {
        id: shopId,
        shopName: formData.shopName,
        ownerId: user.uid,
        ownerEmail: formData.email,
        phone: formData.phone,
        createdAt: serverTimestamp()
      });

      // 3. Create User Profile
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        name: formData.ownerName,
        email: formData.email,
        phone: formData.phone,
        role: 'admin',
        shopId: shopId,
        status: 'Active',
        createdAt: serverTimestamp()
      });

      toast({ title: "Shop Created!", description: "Welcome to PrintFlow." });
      router.push('/admin/dashboard');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Signup Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <div className="bg-primary p-2 rounded-xl shadow-lg">
          <Printer className="w-8 h-8 text-white" />
        </div>
        <span className="text-3xl font-extrabold text-primary font-headline tracking-tight">PrintFlow</span>
      </div>

      <Card className="w-full max-w-lg shadow-2xl border-2">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl font-black flex items-center justify-center gap-2">
            <Rocket className="w-6 h-6 text-primary" /> Start Your Print Business
          </CardTitle>
          <CardDescription>Enter your details to create your multi-tenant shop</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Shop Name</Label>
                <div className="relative">
                  <Input required placeholder="Modern Prints" value={formData.shopName} onChange={(e) => setFormData({...formData, shopName: e.target.value})} className="pl-9" />
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Owner Name</Label>
                <div className="relative">
                  <Input required placeholder="John Doe" value={formData.ownerName} onChange={(e) => setFormData({...formData, ownerName: e.target.value})} className="pl-9" />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Business Email</Label>
              <div className="relative">
                <Input required type="email" placeholder="owner@shop.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="pl-9" />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="relative">
                <Input required placeholder="+880..." value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="pl-9" />
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input required type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="pl-9" />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <div className="relative">
                  <Input required type="password" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} className="pl-9" />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full h-12 text-lg font-bold shadow-lg" disabled={loading}>
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Create My Shop"}
              {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have a shop? <Link href="/login" className="text-primary font-bold hover:underline">Log in</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
