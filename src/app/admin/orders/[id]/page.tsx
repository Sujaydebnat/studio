
"use client"

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Send, MessageSquare, Plus, Trash2, Pencil } from 'lucide-react';
import { useDoc, useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, orderBy, updateDoc, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { InvoiceDownload } from '@/components/InvoiceDownload';
import { format } from 'date-fns';

export default function AdminOrderDetail() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);

  const userRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [db, user]);
  const { data: userData } = useDoc(userRef);

  // We need nested path: shops/{shopId}/orders/{id}
  const orderRef = useMemoFirebase(() => 
    id && db && userData?.shopId ? doc(db, 'shops', userData.shopId, 'orders', id as string) : null
  , [db, userData?.shopId, id]);

  const { data: order, loading: loadingOrder } = useDoc(orderRef);

  const updatesQuery = useMemoFirebase(() => 
    orderRef ? query(collection(orderRef, 'updates'), orderBy('timestamp', 'asc')) : null
  , [orderRef]);

  const { data: updates } = useCollection(updatesQuery);

  const staffQuery = useMemoFirebase(() => 
    db && userData?.shopId ? query(collection(db, 'users'), where('shopId', '==', userData.shopId), where('role', '==', 'staff')) : null
  , [db, userData?.shopId]);

  const { data: staffList } = useCollection(staffQuery);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !orderRef) return;
    setSending(true);
    try {
      await addDoc(collection(orderRef, 'updates'), {
        orderId: id, senderId: user?.uid, senderName: userData?.name || 'Admin', senderRole: 'admin', message: newMessage, timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } finally { setSending(false); }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!orderRef) return;
    setUpdating(true);
    try { await updateDoc(orderRef, { status, updatedAt: serverTimestamp() }); toast({ title: "Status Updated" }); } finally { setUpdating(false); }
  };

  const handleAssignStaff = async (staffId: string) => {
    if (!orderRef) return;
    setUpdating(true);
    try { await updateDoc(orderRef, { assignedStaffId: staffId, updatedAt: serverTimestamp() }); toast({ title: "Staff Assigned" }); } finally { setUpdating(false); }
  };

  if (!userData?.shopId || loadingOrder) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!order) return <div className="p-20 text-center">Order not found in this shop.</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></Button>
          <h2 className="text-3xl font-black font-headline">Bill #{order.billNumber || order.id.slice(0, 8)}</h2>
        </div>
        <InvoiceDownload order={order} shop={null} />
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-muted/30 border-b"><CardTitle className="text-sm uppercase tracking-widest font-black">Workflow Control</CardTitle></CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase">Production Status</p>
                <Select value={order.status} onValueChange={handleUpdateStatus}>
                  <SelectTrigger className="h-11 border-2 font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Pending', 'Designing', 'Printing', 'Completed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase">Assigned Staff</p>
                <Select value={order.assignedStaffId} onValueChange={handleAssignStaff}>
                  <SelectTrigger className="h-11 border-2 font-bold"><SelectValue placeholder="No Assignment" /></SelectTrigger>
                  <SelectContent>
                    {staffList?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-muted/30 border-b"><CardTitle className="text-sm uppercase tracking-widest font-black">Details</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-xs font-bold text-primary uppercase">Customer</p>
                <p className="text-lg font-black">{order.customerName}</p>
                <p className="text-xs text-muted-foreground">{order.phone}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase">Items</p>
                {order.orderItems?.map((item: any, i: number) => (
                  <div key={i} className="text-sm border-b pb-2 flex justify-between">
                    <span className="font-bold">{item.type}</span>
                    <span className="text-xs opacity-70">{item.size}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <Card className="h-[700px] flex flex-col border-2 shadow-2xl overflow-hidden rounded-2xl">
            <CardHeader className="border-b bg-primary/5 flex flex-row items-center justify-between">
               <CardTitle className="text-lg flex items-center gap-2 font-black text-primary">
                 <MessageSquare className="w-5 h-5" /> 
                 Production Communication
               </CardTitle>
               <Badge variant="outline" className="font-black border-primary text-primary">SECURE CHANNEL</Badge>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 bg-muted/10">
              <ScrollArea className="h-full p-6">
                <div className="space-y-6">
                  {updates?.map(upd => (
                    <div key={upd.id} className={`flex ${upd.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm border ${upd.senderRole === 'admin' ? 'bg-primary text-white border-primary' : 'bg-white border-muted-foreground/10'}`}>
                        <div className="flex justify-between items-center mb-1 gap-4">
                          <p className="text-[9px] font-black uppercase opacity-70">{upd.senderName}</p>
                          <p className="text-[8px] font-bold opacity-50">{upd.timestamp?.seconds ? format(new Date(upd.timestamp.seconds * 1000), 'p') : '...'}</p>
                        </div>
                        <p className="text-sm font-medium leading-relaxed">{upd.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="border-t p-6 gap-3 bg-card">
              <Textarea placeholder="Type production notes..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="min-h-[80px] rounded-xl border-2 focus-visible:ring-primary shadow-inner font-medium" />
              <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()} className="h-[80px] w-20 flex-shrink-0 flex flex-col gap-1 font-black shadow-lg">
                {sending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                SEND
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
