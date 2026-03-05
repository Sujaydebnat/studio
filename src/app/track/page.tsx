"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Clock, CheckCircle2, FileText, Image as ImageIcon, Printer, AlertCircle, Loader2, WifiOff } from 'lucide-react';
import Image from 'next/image';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';

export default function TrackOrderPage() {
  const db = useFirestore();
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !orderId) return;

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const docRef = doc(db, 'orders', orderId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        // Simple verification: last 4 digits of phone
        if (data.phone && data.phone.endsWith(phone.slice(-4))) {
          setOrder({ id: docSnap.id, ...data });
        } else {
          setError("Order found, but phone number verification failed.");
        }
      } else {
        setError("Order ID not found. Please double-check your ID.");
      }
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes('offline')) {
        setError("Connection issue: Could not reach the database. Please check your internet.");
      } else {
        setError("An error occurred while tracking your order. Please try again.");
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
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary font-headline">Track Your Order</h1>
          <p className="text-muted-foreground">Enter your Order ID and last 4 digits of phone number.</p>
        </div>

        <Card className="shadow-lg border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-accent" /> Order Verification
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleTrack}>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderId">Order ID</Label>
                <Input 
                  id="orderId" 
                  placeholder="Paste ID here" 
                  required 
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
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
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {loading ? 'Searching...' : 'Check Status'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-3 border border-destructive/20 animate-in fade-in slide-in-from-top-4">
            {error.includes('Connection') ? <WifiOff className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p>{error}</p>
          </div>
        )}

        {order && (
          <Card className="animate-in fade-in zoom-in-95 duration-500 overflow-hidden border-2 border-accent/20">
            <div className="bg-accent/10 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-sm font-semibold text-accent uppercase tracking-wider">Order #{order.id.slice(0, 8)}</p>
                <h2 className="text-2xl font-bold font-headline">{order.workType}</h2>
              </div>
              <Badge className="text-lg px-4 py-1 bg-primary flex items-center gap-2">
                {getStatusIcon(order.status)}
                {order.status}
              </Badge>
            </div>
            
            <CardContent className="p-6 space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Customer</p>
                  <p className="font-semibold">{order.customerName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Last Update</p>
                  <p className="font-semibold">
                    {order.updatedAt?.seconds ? format(new Date(order.updatedAt.seconds * 1000), 'MMM d, h:mm a') : 'Recently'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Priority</p>
                  <p className="font-semibold">{order.priority}</p>
                </div>
              </div>

              {order.designBrief && (
                <div className="bg-muted/30 p-4 rounded-lg border">
                  <h3 className="font-bold text-sm mb-2 uppercase text-muted-foreground">AI Generated Brief Summary</h3>
                  <p className="text-sm">{order.designBrief.overview}</p>
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
                    <div className="bg-muted p-8 rounded-xl flex flex-col items-center justify-center text-center space-y-2 border-2 border-dashed">
                      <Clock className="w-10 h-10 text-muted-foreground animate-pulse" />
                      <p className="text-muted-foreground font-medium">Designers are working on your previews. Check back soon!</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
