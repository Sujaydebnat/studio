
"use client"

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ArrowLeft, Send, MessageSquare, Info } from 'lucide-react';
import { useDoc, useCollection, useFirestore, useUser } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

export default function StaffOrderDetail() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const orderRef = useMemo(() => id && db ? doc(db, 'orders', id as string) : null, [db, id]);
  const { data: order, loading: loadingOrder } = useDoc(orderRef as any);

  const updatesRef = useMemo(() => id && db ? collection(db, 'orders', id as string, 'updates') : null, [db, id]);
  const updatesQuery = useMemo(() => updatesRef ? query(updatesRef, orderBy('timestamp', 'asc')) : null, [updatesRef]);
  const { data: updates, loading: loadingUpdates } = useCollection(updatesQuery as any);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !updatesRef || !user) return;
    setSending(true);
    try {
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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-3xl font-bold font-headline text-accent-foreground">Production View</h2>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-accent/20">
            <CardHeader className="bg-accent/5">
              <CardTitle className="flex items-center gap-2"><Info className="w-5 h-5 text-accent" /> Order Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Work Type</Label>
                <p className="font-bold text-lg">{order.workType}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Priority</Label>
                <Badge variant={order.priority === 'High' ? 'destructive' : 'default'} className="block mt-1 w-fit">
                  {order.priority}
                </Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Customer Contact</Label>
                <p className="font-semibold">{order.customerName}</p>
                <p className="text-sm text-muted-foreground">{order.phone}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2 flex flex-col h-[600px] border-accent/20">
          <CardHeader className="border-b bg-accent/5">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-accent" /> Notes & Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full p-6">
              <div className="space-y-6">
                {updates?.map((upd) => (
                  <div key={upd.id} className={`flex flex-col ${upd.senderRole === 'staff' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl ${
                      upd.senderRole === 'staff' ? 'bg-accent text-accent-foreground rounded-tr-none' : 'bg-muted rounded-tl-none'
                    }`}>
                      <p className="text-[10px] font-bold mb-1 uppercase opacity-60">
                        {upd.senderRole === 'staff' ? 'You' : `Admin (${upd.senderName})`}
                      </p>
                      <p className="text-sm">{upd.message}</p>
                      <p className="text-[10px] mt-2 opacity-50">
                        {upd.timestamp?.seconds ? format(new Date(upd.timestamp.seconds * 1000), 'h:mm a') : '...'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="border-t p-4 gap-2 bg-muted/10">
            <Textarea 
              placeholder="Send message to admin..." 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="min-h-[80px] focus-visible:ring-accent"
            />
            <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()} className="h-full bg-accent text-accent-foreground hover:bg-accent/90">
              {sending ? <Loader2 className="animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
