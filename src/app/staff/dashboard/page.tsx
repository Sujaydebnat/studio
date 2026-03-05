
"use client"

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  ImageIcon, 
  Upload, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Loader2,
  FileText,
  Search
} from 'lucide-react';
import { orderUpdateMessageDrafting } from '@/ai/flows/order-update-message-drafting-flow';
import { generateOrderSummary } from '@/ai/flows/order-summary-generator-flow';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, doc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function StaffDashboard() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [draftedMessage, setDraftedMessage] = useState<Record<string, string>>({});
  const [summaries, setSummaries] = useState<Record<string, string>>({});

  // Query orders assigned to this user OR all pending orders to pick up
  const ordersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'orders'), where('status', '!=', 'Completed'));
  }, [db]);

  const { data: allOrders, loading } = useCollection(ordersQuery);

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      toast({ title: `Status updated to ${nextStatus}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    }
  };

  const handleDraftUpdate = async (order: any) => {
    setDraftingId(order.id);
    try {
      const res = await orderUpdateMessageDrafting({
        orderId: order.id,
        currentStatus: order.status,
        projectName: order.workType,
        customerName: order.customerName,
      });
      setDraftedMessage(prev => ({ ...prev, [order.id]: res.draftedMessage }));
    } catch (e) {
      console.error(e);
    } finally {
      setDraftingId(null);
    }
  };

  const handleGenerateSummary = async (order: any) => {
    try {
      const res = await generateOrderSummary({
        customerOrderDescription: order.keywords || order.description || "Design project"
      });
      setSummaries(prev => ({ ...prev, [order.id]: res.summary }));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold font-headline">Staff Workbench</h2>
          <p className="text-muted-foreground">Manage active orders and design tasks.</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center px-4 py-2 bg-accent/10 rounded-lg">
            <p className="text-xs uppercase font-bold text-accent">Active Orders</p>
            <p className="text-2xl font-bold">{allOrders?.length || 0}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6">
          {allOrders?.map((order) => (
            <Card key={order.id} className="overflow-hidden border-2 hover:border-accent/40 transition-all">
              <div className="bg-muted/30 p-4 border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Badge className={order.priority === 'High' || order.priority === 'Urgent' ? 'bg-destructive' : 'bg-primary'}>
                    {order.priority}
                  </Badge>
                  <span className="font-bold text-xs text-muted-foreground">ID: {order.id.slice(0, 8)}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleGenerateSummary(order)}>
                    <FileText className="w-4 h-4 mr-2" /> AI Summary
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDraftUpdate(order)} disabled={draftingId === order.id}>
                    {draftingId === order.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Draft Message
                  </Button>
                </div>
              </div>
              
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-2xl font-bold font-headline">{order.workType}</h3>
                      <p className="text-muted-foreground">Customer: {order.customerName} • {order.phone}</p>
                    </div>
                    
                    {summaries[order.id] && (
                      <div className="p-3 bg-primary/5 rounded border border-primary/20 text-sm animate-in slide-in-from-left-2">
                        <p className="font-bold mb-1 text-xs uppercase text-primary">AI Context:</p>
                        <p>{summaries[order.id]}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span className="text-xs text-muted-foreground">
                        Received: {order.createdAt?.seconds ? format(new Date(order.createdAt.seconds * 1000), 'PPP') : 'N/A'}
                      </span>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                        <Upload className="w-4 h-4" /> Upload Proof
                      </Button>
                      <Button variant="outline" className="gap-2">
                        <ImageIcon className="w-4 h-4" /> Previews
                      </Button>
                    </div>
                  </div>

                  <div className="bg-muted/20 rounded-xl p-4 border border-dashed flex flex-col justify-between">
                    {draftedMessage[order.id] ? (
                      <div className="space-y-3">
                        <p className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> AI Drafted Update
                        </p>
                        <p className="text-sm italic text-muted-foreground bg-white p-3 rounded-lg border shadow-sm">
                          "{draftedMessage[order.id]}"
                        </p>
                        <Button variant="link" size="sm" className="px-0 text-accent" onClick={() => {
                          navigator.clipboard.writeText(draftedMessage[order.id]);
                          toast({ title: "Copied to clipboard" });
                        }}>Copy to Clipboard</Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-8">
                        <Sparkles className="w-8 h-8 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">Use AI to craft a professional update for the customer.</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="bg-muted/30 border-t flex justify-between py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Next Step:</span>
                  <div className="flex gap-2">
                    {order.status === 'Pending' && (
                      <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'Designing')}>Start Design</Button>
                    )}
                    {order.status === 'Designing' && (
                      <Button size="sm" variant="secondary" onClick={() => handleUpdateStatus(order.id, 'Printing')}>Move to Print</Button>
                    )}
                    {order.status === 'Printing' && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleUpdateStatus(order.id, 'Completed')}>Finish Order</Button>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="bg-white border-accent text-accent-foreground">{order.status}</Badge>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
