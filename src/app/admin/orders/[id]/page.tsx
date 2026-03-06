
"use client"

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Send, MessageSquare, Image as ImageIcon, Users, Plus, Trash2, Info } from 'lucide-react';
import { useDoc, useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, orderBy, updateDoc, arrayUnion, where, arrayRemove } from 'firebase/firestore';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function AdminOrderDetail() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [newPreviewUrl, setNewPreviewUrl] = useState('');
  const [newRefUrl, setNewRefUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);

  const orderRef = useMemoFirebase(() => 
    id && db ? doc(db, 'orders', id as string) : null
  , [db, id]);
  
  const { data: order, loading: loadingOrder } = useDoc(orderRef);

  const updatesQuery = useMemoFirebase(() => {
    if (!id || !db) return null;
    return query(collection(db, 'orders', id as string, 'updates'), orderBy('timestamp', 'asc'));
  }, [db, id]);

  const { data: updates } = useCollection(updatesQuery);

  const staffQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), where('role', '==', 'staff'));
  }, [db]);

  const { data: staffList } = useCollection(staffQuery);

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

  const handleUpdateField = async (field: string, value: string) => {
    if (!orderRef || !db) return;
    setUpdating(true);
    try {
      await updateDoc(orderRef, {
        [field]: value,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Order Updated", description: `${field} has been changed.` });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Update Failed", description: "Check permissions." });
    } finally {
      setUpdating(false);
    }
  };

  const handleAddImage = async (field: 'previews' | 'referenceImages', url: string) => {
    if (!url.trim() || !orderRef) return;
    setUpdating(true);
    try {
      await updateDoc(orderRef, {
        [field]: arrayUnion(url),
        updatedAt: serverTimestamp()
      });
      if (field === 'previews') setNewPreviewUrl('');
      else setNewRefUrl('');
      toast({ title: "Image Added" });
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  const removeImage = async (field: 'previews' | 'referenceImages', url: string) => {
    if (!orderRef) return;
    setUpdating(true);
    try {
      await updateDoc(orderRef, {
        [field]: arrayRemove(url),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  if (loadingOrder) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!order) return <div className="p-20 text-center">Order not found.</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex flex-col">
          <h2 className="text-3xl font-bold font-headline">Order #{order.id.slice(0, 8)}</h2>
          <p className="text-sm text-muted-foreground">{order.workType} for {order.customerName}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Production & Details Column */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader><CardTitle>Status & Assignment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Order Status</Label>
                <Select defaultValue={order.status} onValueChange={(v) => handleUpdateField('status', v)} disabled={updating}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Designing">Designing</SelectItem>
                    <SelectItem value="Printing">Printing</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Assigned Staff</Label>
                <Select defaultValue={order.assignedStaffId} onValueChange={(v) => handleUpdateField('assignedStaffId', v)} disabled={updating}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {staffList?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Production Specs</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold">Size</Label>
                  <p className="font-bold border p-2 rounded bg-muted/20">{order.size || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold">Quantity</Label>
                  <p className="font-bold border p-2 rounded bg-muted/20">{order.quantity || '1'}</p>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold">Additional Details</Label>
                <p className="text-sm p-3 bg-muted/10 border rounded whitespace-pre-wrap">{order.additionalDetails || 'No instructions provided.'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Reference Photos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Photo URL" value={newRefUrl} onChange={(e) => setNewRefUrl(e.target.value)} />
                <Button size="icon" onClick={() => handleAddImage('referenceImages', newRefUrl)} disabled={updating}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {order.referenceImages?.map((url: string, i: number) => (
                  <div key={i} className="relative aspect-square rounded border overflow-hidden group">
                    <Image src={url} alt="Ref" fill className="object-cover" />
                    <button onClick={() => removeImage('referenceImages', url)} className="absolute top-1 right-1 bg-destructive p-1 rounded-full text-white opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Communication & Previews Column */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="h-[500px] flex flex-col">
            <CardHeader className="border-b bg-muted/5 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> Staff Chat</CardTitle>
              {updating && <Badge variant="outline" className="animate-pulse">Saving...</Badge>}
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-6">
                <div className="space-y-4">
                  {updates?.map((upd) => (
                    <div key={upd.id} className={`flex ${upd.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-xl ${upd.senderRole === 'admin' ? 'bg-primary text-white rounded-tr-none' : 'bg-muted rounded-tl-none'}`}>
                        <p className="text-[10px] font-bold opacity-70 mb-1">{upd.senderName}</p>
                        <p className="text-sm">{upd.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="border-t p-4 gap-2">
              <Textarea placeholder="Send message to staff..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="min-h-[60px]" />
              <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}><Send className="w-4 h-4" /></Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="w-5 h-5 text-accent" /> Design Previews (Visible to Customer)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Preview Image URL" value={newPreviewUrl} onChange={(e) => setNewPreviewUrl(e.target.value)} />
                <Button onClick={() => handleAddImage('previews', newPreviewUrl)} disabled={updating}>Add Preview</Button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {order.previews?.map((url: string, i: number) => (
                  <div key={i} className="relative aspect-video rounded-lg border overflow-hidden group shadow-sm">
                    <Image src={url} alt="Preview" fill className="object-cover" />
                    <button onClick={() => removeImage('previews', url)} className="absolute top-2 right-2 bg-destructive p-1 rounded-full text-white opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
