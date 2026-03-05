"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Clock, CheckCircle2, FileText, Image as ImageIcon, Printer, AlertCircle } from 'lucide-react';
import Image from 'next/image';

type OrderStatus = 'Pending' | 'Designing' | 'Printing' | 'Completed';

interface MockOrder {
  id: string;
  customerName: string;
  projectName: string;
  status: OrderStatus;
  workType: string;
  updatedAt: string;
  previews: string[];
}

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<MockOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    setOrder(null);

    // Simulation
    setTimeout(() => {
      if (orderId === '12345') {
        setOrder({
          id: '12345',
          customerName: 'Alex Johnson',
          projectName: 'Business Cards Rebrand',
          status: 'Designing',
          workType: 'Visiting Card',
          updatedAt: '2 hours ago',
          previews: ['https://picsum.photos/seed/design1/600/400']
        });
      } else {
        setError(true);
      }
      setLoading(false);
    }, 1200);
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'Pending': return <Clock className="w-5 h-5" />;
      case 'Designing': return <ImageIcon className="w-5 h-5" />;
      case 'Printing': return <Printer className="w-5 h-5" />;
      case 'Completed': return <CheckCircle2 className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary font-headline">Track Your Order</h1>
          <p className="text-muted-foreground">Enter your Order ID and phone number to see real-time updates.</p>
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
                  placeholder="e.g. 12345" 
                  required 
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  placeholder="Your registered phone" 
                  required 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full bg-primary" disabled={loading}>
                {loading ? 'Searching...' : 'Check Status'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-3 border border-destructive/20 animate-in fade-in slide-in-from-top-4">
            <AlertCircle className="w-5 h-5" />
            <p>Order not found. Please verify your Order ID and phone number.</p>
          </div>
        )}

        {order && (
          <Card className="animate-in fade-in zoom-in-95 duration-500 overflow-hidden border-2 border-accent/20">
            <div className="bg-accent/10 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-sm font-semibold text-accent uppercase tracking-wider">Order #{order.id}</p>
                <h2 className="text-2xl font-bold font-headline">{order.projectName}</h2>
              </div>
              <Badge className="text-lg px-4 py-1 bg-primary flex items-center gap-2">
                {getStatusIcon(order.status)}
                {order.status}
              </Badge>
            </div>
            
            <CardContent className="p-6 space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Work Type</p>
                  <p className="font-semibold">{order.workType}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Customer</p>
                  <p className="font-semibold">{order.customerName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Last Update</p>
                  <p className="font-semibold">{order.updatedAt}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase">Estimated End</p>
                  <p className="font-semibold">Tomorrow</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-accent" /> Design Previews
                </h3>
                <div className="grid gap-4">
                  {order.previews.map((url, idx) => (
                    <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border-4 border-white shadow-md">
                      <Image 
                        src={url} 
                        alt="Design Preview" 
                        fill 
                        className="object-cover" 
                        data-ai-hint="graphic design"
                      />
                    </div>
                  ))}
                  {order.status === 'Designing' && (
                    <div className="bg-muted p-8 rounded-xl flex flex-col items-center justify-center text-center space-y-2 border-2 border-dashed">
                      <Clock className="w-10 h-10 text-muted-foreground animate-pulse" />
                      <p className="text-muted-foreground font-medium">More previews are being uploaded by our designers...</p>
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