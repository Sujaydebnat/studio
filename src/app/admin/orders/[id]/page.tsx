
"use client"

import { useState, useRef, useMemo } from 'react';
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

interface OrderItem {
  type: string;
  subCategory: string;
  size: string;
  qty: string;
}

export default function AdminOrderDetail() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const chatFileRef = useRef<HTMLInputElement>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const [newItem, setNewItem] = useState<OrderItem>({ type: '', subCategory: '', size: '', qty: '1' });
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);

  const orderRef = useMemoFirebase(() => id && db ? doc(db, 'orders', id as string) : null, [db, id]);
  const { data: order, loading: loadingOrder } = useDoc(orderRef);

  const userRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [db, user]);
  const { data: userData } = useDoc(userRef);
  const shopRef = useMemoFirebase(() => userData?.shopId ? doc(db, 'shops', userData.shopId) : null, [db, userData?.shopId]);
  const { data: shopData } = useDoc(shopRef);

  const updatesQuery = useMemoFirebase(() => id && db ? query(collection(db, 'orders', id as string, 'updates'), orderBy('timestamp', 'asc')) : null, [db, id]);
  const { data: updates } = useCollection(updatesQuery);

  const staffQuery = useMemoFirebase(() => db && userData?.shopId ? query(collection(db, 'users'), where('shopId', '==', userData.shopId), where('role', '==', 'staff')) : null, [db, userData?.shopId]);
  const { data: staffList } = useCollection(staffQuery);

  const handleSendMessage = async (message: string, fileData?: string) => {
    if (!message.trim() && !fileData) return;
    setSending(true);
    try {
      await addDoc(collection(db!, 'orders', id as string, 'updates'), {
        orderId: id, senderId: user?.uid, senderName: user?.displayName || 'Admin', senderRole: 'admin', message, fileUrl: fileData || null, timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } finally { setSending(false); }
  };

  const handleUpdateField = async (field: string, value: any) => {
    if (!orderRef) return;
    setUpdating(true);
    try { await updateDoc(orderRef, { [field]: value, updatedAt: serverTimestamp() }); toast({ title: "Updated" }); } finally { setUpdating(false); }
  };

  const addItemToList = async () => {
    if (!newItem.type || !orderRef) return;
    setUpdating(true);
    try {
      const items = [...(order?.orderItems || [])];
      if (editingItemIdx !== null) items[editingItemIdx] = newItem;
      else items.push(newItem);
      await updateDoc(orderRef, { orderItems: items, updatedAt: serverTimestamp() });
      setNewItem({ type: '', subCategory: '', size: '', qty: '1' });
      setEditingItemIdx(null);
    } finally { setUpdating(false); }
  };

  if (loadingOrder) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></Button>
          <h2 className="text-3xl font-bold font-headline">Bill #{order?.billNumber || order?.id.slice(0, 8)}</h2>
        </div>
        <InvoiceDownload order={order} shop={shopData} />
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-muted/30 border-b"><CardTitle className="text-sm uppercase tracking-widest font-black">Status & Staff</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase">Current Status</p>
                <Select defaultValue={order?.status} onValueChange={(v) => handleUpdateField('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Pending', 'Designing', 'Printing', 'Completed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase">Assigned Production</p>
                <Select defaultValue={order?.assignedStaffId} onValueChange={(v) => handleUpdateField('assignedStaffId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger>
                  <SelectContent>
                    {staffList?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-muted/30 border-b"><CardTitle className="text-sm uppercase tracking-widest font-black">Line Items</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="bg-primary/5 p-4 rounded-xl border-2 border-dashed border-primary/20 space-y-4">
                <Input placeholder="Work Type" value={newItem.type} onChange={(e) => setNewItem({...newItem, type: e.target.value})} className="h-9 font-bold" />
                <Input placeholder="Subcategory" value={newItem.subCategory} onChange={(e) => setNewItem({...newItem, subCategory: e.target.value})} className="h-9" />
                <div className="flex gap-2">
                   <Input placeholder="Size" value={newItem.size} onChange={(e) => setNewItem({...newItem, size: e.target.value})} className="h-9 flex-1" />
                   <Input type="number" value={newItem.qty} onChange={(e) => setNewItem({...newItem, qty: e.target.value})} className="h-9 w-20" />
                </div>
                <Button onClick={addItemToList} size="sm" className="w-full font-bold h-9">
                  {editingItemIdx !== null ? 'Update Item' : 'Add to List'}
                </Button>
              </div>
              <div className="space-y-2">
                {order?.orderItems?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-card border rounded-xl shadow-sm">
                    <div>
                      <p className="font-black text-sm">{item.type}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.subCategory} ({item.qty} pcs)</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => {setNewItem({...item}); setEditingItemIdx(i)}} className="h-8 w-8 text-primary"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => {const items = order.orderItems.filter((_: any, j: number) => i !== j); handleUpdateField('orderItems', items)}} className="h-8 w-8 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <Card className="h-[700px] flex flex-col border-2 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-primary/5 flex flex-row items-center justify-between">
               <CardTitle className="text-lg flex items-center gap-2 font-black text-primary">
                 <MessageSquare className="w-5 h-5" /> 
                 Production Chat
               </CardTitle>
               <Badge variant="outline" className="font-bold border-primary text-primary">Live Tracking</Badge>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-6">
                <div className="space-y-6">
                  {updates?.map(upd => (
                    <div key={upd.id} className={`flex ${upd.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm border ${upd.senderRole === 'admin' ? 'bg-primary text-white border-primary' : 'bg-muted border-muted-foreground/10'}`}>
                        <div className="flex justify-between items-center mb-1 gap-4">
                          <p className="text-[10px] font-black uppercase opacity-70">{upd.senderName}</p>
                          <p className="text-[9px] font-bold opacity-50">{upd.timestamp?.seconds ? format(new Date(upd.timestamp.seconds * 1000), 'p') : 'Just now'}</p>
                        </div>
                        <p className="text-sm font-medium leading-relaxed">{upd.message}</p>
                        {upd.fileUrl && <img src={upd.fileUrl} className="mt-3 rounded-xl max-w-full border-2 border-white/20" alt="Update" />}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="border-t p-6 gap-3 bg-muted/20">
              <Textarea placeholder="Send production notes..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="min-h-[80px] rounded-xl shadow-inner bg-card font-medium" />
              <Button onClick={() => handleSendMessage(newMessage)} disabled={sending || !newMessage.trim()} className="h-[80px] w-20 flex-shrink-0 flex flex-col gap-1 font-black shadow-lg">
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
