
"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Clock, CheckCircle2, FileText, Image as ImageIcon, Printer, AlertCircle, Loader2, WifiOff, Calendar as CalendarIcon, Banknote, Hash } from 'lucide-react';
import Image from 'next/image';
import { useFirestore } from '@/firebase';
import { doc, getDoc, query, collection, where, getDocs, or } from 'firebase/firestore';
import { format } from 'date-fns';

export default function TrackOrderPage() {
  const db = useFirestore();
  const [trackIdentifier, setTrackIdentifier] = useState(''); // Can be Order ID or Bill Number
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !trackIdentifier) return;

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const cleanedIdentifier = trackIdentifier.trim();
      let foundOrder: any = null;

      // 1. Try fetching by Document ID (System Order ID)
      try {
        const docRef = doc(db, 'orders', cleanedIdentifier);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          foundOrder = { id: docSnap.id, ...docSnap.data() };
        }
      } catch (err) {
        // Silently fail if not a valid Firestore ID format or not found
      }

      // 2. If not found, try searching by Bill Number field
      if (!foundOrder) {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('billNumber', '==', cleanedIdentifier));
        const querySnap = await getDocs(q);
        
        if (!querySnap.empty) {
          const docData = querySnap.docs[0];
          foundOrder = { id: docData.id, ...docData.data() };
        }
      }

      if (foundOrder) {
        // Verification logic: match last 4 digits of phone
        const storedPhone = foundOrder.phone?.replace(/\D/g, '') || '';
        const inputPhone = phone.replace(/\D/g, '');
        
        if (storedPhone.endsWith(inputPhone)) {
          setOrder(foundOrder);
        } else {
          setError("Verification failed. Please ensure the last 4 digits of the phone number are correct.");
        }
      } else {
        setError("Order not found. Please double-check the Bill Number or Order ID provided to you.");
      }
    } catch (e: any) {
      console.error("Tracking Error:", e);
      if (e.code === 'unavailable' || e.message?.includes('offline')) {
        setError("PrintFlow system is currently offline. Please check your internet.");
      } else {
        setError("An unexpected error occurred. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Clock className="w-5 h-5" />;
      case 'Designing': return <ImageIcon className="w-5 h-5" />;
      case 'Printing': return <Printer className="w-5 h-5" />;
      case 'Completed': return <CheckCircle2 className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2 pt-10">
          <h1 className="text-3xl font-bold text-primary font-headline">Track Your Order</h1>
          <p className="text-muted-foreground">Stay updated on your design and printing progress.</p>
        </div>

        <Card className="shadow-lg border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-accent" /> Order Verification
            </CardTitle>
            <CardDescription>Enter your Bill Number or Order ID to see live status.</CardDescription>
          </CardHeader>
          <form onSubmit={handleTrack}>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trackId">Bill No. or Order ID</Label>
                <Input 
                  id="trackId" 
                  placeholder="e.g. 2024-001" 
                  required 
                  value={trackIdentifier}
                  onChange={(e) => setTrackIdentifier(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Last 4 digits)</Label>
                <Input 
                  id="phone" 
                  placeholder="e.g. 5678" 
                  required 
                  maxLength={4}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full bg-primary" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                {loading ? 'Verifying...' : 'Check Status'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-3 border border-destructive/20 animate-in fade-in slide-in-from-top-4">
            {error.includes('offline') ? <WifiOff className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {order && (
          <Card className="animate-in fade-in zoom-in-95 duration-500 overflow-hidden border-2 border-accent/20">
            <div className="bg-accent/10 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-xs font-semibold text-accent uppercase tracking-wider flex items-center gap-2">
                  <Hash className="w-3 h-3" /> Bill No: {order.billNumber || 'N/A'}
                </p>
                <h2 className="text-2xl font-bold font-headline">{order.workType}</h2>
              </div>
              <Badge className="text-lg px-4 py-1 bg-primary flex items-center gap-2">
                {getStatusIcon(order.status)}
                {order.status}
              </Badge>
            </div>
            
            <CardContent className="p-6 space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Customer</p>
                  <p className="font-semibold text-sm">{order.customerName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Delivery Date</p>
                  <p className="font-semibold text-sm flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3 text-primary" />
                    {order.deliveryDate ? format(new Date(order.deliveryDate), 'MMM d, yyyy') : 'TBD'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Bill Amount</p>
                  <p className="font-bold text-sm text-primary flex items-center gap-1">
                    <Banknote className="w-3 h-3" />
                    {order.totalBill ? `BDT ${order.totalBill}` : '0.00'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Priority</p>
                  <Badge variant={order.priority === 'High' || order.priority === 'Urgent' ? 'destructive' : 'secondary'} className="text-[10px] px-2 py-0">
                    {order.priority}
                  </Badge>
                </div>
              </div>

              {order.designBrief && (
                <div className="bg-muted/30 p-4 rounded-lg border">
                  <h3 className="font-bold text-sm mb-2 uppercase text-muted-foreground flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Design Brief Summary
                  </h3>
                  <p className="text-sm leading-relaxed">{order.designBrief.overview}</p>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-accent" /> Design Previews
                </h3>
                <div className="grid gap-4">
                  {order.previews && order.previews.length > 0 ? (
                    order.previews.map((url: string, idx: number) => (
                      <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border-4 border-white shadow-md">
                        <Image 
                          src={url} 
                          alt="Design Preview" 
                          fill 
                          className="object-cover" 
                        />
                      </div>
                    ))
                  ) : (
                    <div className="bg-muted p-12 rounded-xl flex flex-col items-center justify-center text-center space-y-3 border-2 border-dashed">
                      <div className="bg-white p-4 rounded-full shadow-sm">
                        <Clock className="w-8 h-8 text-primary animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-foreground font-bold">Design in Progress</p>
                        <p className="text-muted-foreground text-sm max-w-xs mx-auto">Our designers are currently crafting your work. Check back soon for previews!</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t py-4 justify-center">
              <p className="text-xs text-muted-foreground italic">Powered by PrintFlow Manage AI System</p>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
