
"use client"

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ArrowLeft, Send, MessageSquare, Info, Sparkles, Target, Palette, ListChecks } from 'lucide-react';
import { useDoc, useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function StaffOrderDetail() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const orderRef = useMemoFirebase(() => 
    id && db ? doc(db, 'orders', id as string) : null
  , [db, id]);

  const { data: order, loading: loadingOrder } = useDoc(orderRef);

  const updatesQuery = useMemoFirebase(() => {
    if (!id || !db) return null;
    return query(collection(db, 'orders', id as string, 'updates'), orderBy('timestamp', 'asc'));
  }, [db, id]);

  const { data: updates, loading: loadingUpdates } = useCollection(updatesQuery);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !id || !db || !user) return;
    setSending(true);
    try {
      const updatesRef = collection(db, 'orders', id as string, 'updates');
      await addDoc(updatesRef, {
        orderId: id,
        senderId: user.uid,
        senderName: user.displayName || 'Staff',
        senderRole: 'staff',
        message: newMessage,
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  if (loadingOrder) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-accent" /></div>;
  if (!order) return <div className="p-20 text-center">Order not found.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex flex-col">
          <h2 className="text-3xl font-bold font-headline text-accent-foreground">Production Workbench</h2>
          <p className="text-sm text-muted-foreground">Managing Order #{order.id.slice(0, 8)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Info & Brief Column */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-accent/20">
            <CardHeader className="bg-accent/5">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest"><Info className="w-4 h-4 text-accent" /> Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase font-bold">Work Type</Label>
                <p className="font-extrabold text-xl text-primary">{order.workType}</p>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Priority</Label>
                  <Badge variant={order.priority === 'High' || order.priority === 'Urgent' ? 'destructive' : 'default'} className="block mt-1">
                    {order.priority}
                  </Badge>
                </div>
                <div className="text-right">
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Status</Label>
                  <p className="text-sm font-bold text-accent-foreground">{order.status}</p>
                </div>
              </div>
              <Separator />
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase font-bold">Customer</Label>
                <p className="font-bold">{order.customerName}</p>
                <p className="text-xs text-muted-foreground">{order.phone || order.customerPhoneNumber}</p>
              </div>
            </CardContent>
          </Card>

          {/* AI Design Brief for Staff */}
          {order.designBrief ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-primary uppercase tracking-widest">
                  <Sparkles className="w-4 h-4" /> AI Design Brief
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold flex items-center gap-1.5"><Info className="w-3 h-3" /> Overview</h4>
                  <p className="text-xs leading-relaxed text-muted-foreground">{order.designBrief.overview}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold flex items-center gap-1.5"><Target className="w-3 h-3" /> Target Audience</h4>
                  <p className="text-xs leading-relaxed text-muted-foreground">{order.designBrief.targetAudience}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold flex items-center gap-1.5"><Palette className="w-3 h-3" /> Visual Style</h4>
                  <p className="text-xs leading-relaxed italic text-primary/80">{order.designBrief.visualStyle}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold flex items-center gap-1.5"><ListChecks className="w-3 h-3" /> Key Messages</h4>
                  <ul className="list-disc pl-4 text-[11px] text-muted-foreground space-y-0.5">
                    {order.designBrief.keyMessages?.map((msg: string, i: number) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="py-8 text-center">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-20" />
                <p className="text-xs text-muted-foreground italic">No AI Brief generated for this order.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Communication Column */}
        <Card className="lg:col-span-8 flex flex-col h-[750px] border-accent/20">
          <CardHeader className="border-b bg-accent/5">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-accent" /> Staff-Admin Communication
              </div>
              <Badge variant="outline" className="text-[10px] animate-pulse">Live Feed</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full p-6 bg-muted/5">
              <div className="space-y-6">
                {updates?.map((upd) => (
                  <div key={upd.id} className={`flex flex-col ${upd.senderRole === 'staff' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                      upd.senderRole === 'staff' 
                        ? 'bg-accent text-accent-foreground rounded-tr-none' 
                        : 'bg-white border rounded-tl-none'
                    }`}>
                      <p className={`text-[10px] font-extrabold mb-1 uppercase opacity-70 ${upd.senderRole === 'staff' ? 'text-right' : 'text-left'}`}>
                        {upd.senderRole === 'staff' ? 'You (Production)' : `Admin (${upd.senderName})`}
                      </p>
                      <p className="text-sm leading-relaxed">{upd.message}</p>
                      <p className={`text-[9px] mt-2 opacity-50 font-mono ${upd.senderRole === 'staff' ? 'text-right' : 'text-left'}`}>
                        {upd.timestamp?.seconds ? format(new Date(upd.timestamp.seconds * 1000), 'MMM d, h:mm a') : 'Sending...'}
                      </p>
                    </div>
                  </div>
                ))}
                {(!updates || updates.length === 0) && (
                  <div className="text-center py-24 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-10" />
                    <p className="font-medium">No production notes yet.</p>
                    <p className="text-xs">Send a message to update the Admin on your progress.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="border-t p-4 gap-3 bg-white">
            <Textarea 
              placeholder="Type your production update here..." 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="min-h-[90px] focus-visible:ring-accent resize-none border-accent/20"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={sending || !newMessage.trim()} 
              className="h-full px-6 bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg transition-all active:scale-95"
            >
              {sending ? <Loader2 className="animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
