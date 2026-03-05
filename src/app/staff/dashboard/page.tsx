"use client"

import { useState } from 'react';
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
  FileText
} from 'lucide-react';
import { orderUpdateMessageDrafting, type OrderUpdateMessageDraftingOutput } from '@/ai/flows/order-update-message-drafting-flow';
import { generateOrderSummary } from '@/ai/flows/order-summary-generator-flow';

const assignedOrders = [
  { 
    id: '12345', 
    customer: 'Alex Johnson', 
    project: 'Business Cards Rebrand', 
    type: 'Visiting Card', 
    status: 'Designing', 
    priority: 'High',
    description: 'Minimalist aesthetic with gold foil finish. 500 copies. Standard size.'
  },
  { 
    id: '12349', 
    customer: 'Cafe Delight', 
    project: 'Coffee Menu Board', 
    type: 'Flex Print', 
    status: 'Designing', 
    priority: 'Normal',
    description: 'Chalkboard style background. Large readable fonts for pricing.'
  },
];

export default function StaffDashboard() {
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [draftedMessage, setDraftedMessage] = useState<Record<string, string>>({});
  const [summaries, setSummaries] = useState<Record<string, string>>({});

  const handleDraftUpdate = async (order: typeof assignedOrders[0]) => {
    setDraftingId(order.id);
    try {
      const res = await orderUpdateMessageDrafting({
        orderId: order.id,
        currentStatus: order.status,
        projectName: order.project,
        customerName: order.customer,
      });
      setDraftedMessage(prev => ({ ...prev, [order.id]: res.draftedMessage }));
    } catch (e) {
      console.error(e);
    } finally {
      setDraftingId(null);
    }
  };

  const handleGenerateSummary = async (order: typeof assignedOrders[0]) => {
    try {
      const res = await generateOrderSummary({
        customerOrderDescription: order.description
      });
      setSummaries(prev => ({ ...prev, [order.id]: res.summary }));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold font-headline">My Worklist</h2>
          <p className="text-muted-foreground">You have {assignedOrders.length} active assignments.</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center px-4 py-2 bg-accent/10 rounded-lg">
            <p className="text-xs uppercase font-bold text-accent">Assigned</p>
            <p className="text-2xl font-bold">{assignedOrders.length}</p>
          </div>
          <div className="text-center px-4 py-2 bg-green-500/10 rounded-lg">
            <p className="text-xs uppercase font-bold text-green-600">Done Today</p>
            <p className="text-2xl font-bold">4</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {assignedOrders.map((order) => (
          <Card key={order.id} className="overflow-hidden border-2 hover:border-accent/40 transition-all">
            <div className="bg-muted/30 p-4 border-b flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Badge className={order.priority === 'High' ? 'bg-destructive' : 'bg-primary'}>
                  {order.priority} Priority
                </Badge>
                <span className="font-bold text-sm text-muted-foreground">ID: #{order.id}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleGenerateSummary(order)}>
                  <FileText className="w-4 h-4 mr-2" /> Summary
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDraftUpdate(order)} disabled={draftingId === order.id}>
                  {draftingId === order.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Draft Update
                </Button>
              </div>
            </div>
            
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold font-headline">{order.project}</h3>
                    <p className="text-muted-foreground">Customer: {order.customer} • {order.type}</p>
                  </div>
                  
                  {summaries[order.id] && (
                    <div className="p-3 bg-primary/5 rounded border border-primary/20 text-sm">
                      <p className="font-bold mb-1">AI Summary:</p>
                      <p>{summaries[order.id]}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium">Started 4 hours ago</span>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                      <Upload className="w-4 h-4" /> Upload Proof
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <ImageIcon className="w-4 h-4" /> Gallery
                    </Button>
                  </div>
                </div>

                <div className="bg-muted/20 rounded-xl p-4 border border-dashed flex flex-col justify-between">
                  {draftedMessage[order.id] ? (
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase text-muted-foreground">AI Drafted Update</p>
                      <p className="text-sm italic text-muted-foreground bg-white p-3 rounded-lg border">
                        "{draftedMessage[order.id]}"
                      </p>
                      <Button variant="link" size="sm" className="px-0 text-accent">Copy to Clipboard</Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-8">
                      <Sparkles className="w-8 h-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">Use AI to draft an update message for the customer.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>

            <CardFooter className="bg-muted/30 border-t flex justify-between py-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">Current Status:</span>
                <Badge variant="outline" className="bg-white border-accent text-accent-foreground">{order.status}</Badge>
              </div>
              <Button size="sm" variant="default" className="bg-primary group">
                Mark as Completed <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}