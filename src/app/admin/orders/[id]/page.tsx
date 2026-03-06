
"use client"

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ArrowLeft, Send, MessageSquare } from 'lucide-react';
import { useDoc, useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

export default function AdminOrderDetail() {
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
        senderName: user.displayName || 'Admin',
        senderRole: 'admin',
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

  if (loadingOrder) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!order) return <div className="p-20 text-center">Order not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-3xl font-bold font-headline">Order Details</h2>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Customer</Label>
                <p className="font-bold">{order.customerName}</p>
                <p className="text-sm text-muted-foreground">{order.phone}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Service</Label>
                <p className="font-bold">{order.workType}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Status</Label>
                <Badge className="block mt-1 w-fit">{order.status}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2 flex flex-col h-[600px]">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Staff Communication
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full p-6">
              <div className="space-y-6">
                {updates?.map((upd) => (
                  <div key={upd.id} className={`flex flex-col ${upd.senderRole === 'admin' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl ${
                      upd.senderRole === 'admin' ? 'bg-primary text-white rounded-tr-none' : 'bg-muted rounded-tl-none'
                    }`}>
                      <p className="text-xs font-bold mb-1 opacity-70">{upd.senderName} ({upd.senderRole})</p>
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
          <CardFooter className="border-t p-4 gap-2">
            <Textarea 
              placeholder="Reply to staff..." 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="min-h-[80px]"
            />
            <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()} className="h-full">
              {sending ? <Loader2 className="animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
