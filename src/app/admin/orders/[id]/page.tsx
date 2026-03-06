
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
import { Loader2, ArrowLeft, Send, MessageSquare, Image as ImageIcon, Users, Plus, Trash2, Camera } from 'lucide-react';
import { useDoc, useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, orderBy, updateDoc, arrayUnion, where, arrayRemove } from 'firebase/firestore';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CameraCapture } from '@/components/CameraCapture';

export default function AdminOrderDetail() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
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

  const handleSendMessage = async (message: string, image?: string) => {
    if (!message.trim() && !image) return;
    setSending(true);
    try {
      const updatesRef = collection(db!, 'orders', id as string, 'updates');
      await addDoc(updatesRef, {
        orderId: id,
        senderId: user?.uid,
        senderName: user?.displayName || 'Admin',
        senderRole: 'admin',
        message: message,
        fileUrl: image || null,
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
    if (!orderRef) return;
    setUpdating(true);
    try {
      await updateDoc(orderRef, { [field]: value, updatedAt: serverTimestamp() });
      toast({ title: "Updated" });
    } finally {
      setUpdating(false);
    }
  };

  const handleAddImage = async (field: 'previews' | 'referenceImages', url: string) => {
    if (!url || !orderRef) return;
    setUpdating(true);
    try {
      await updateDoc(orderRef, { [field]: arrayUnion(url), updatedAt: serverTimestamp() });
    } finally {
      setUpdating(false);
    }
  };

  const removeImage = async (field: 'previews' | 'referenceImages', url: string) => {
    if (!orderRef) return;
    await updateDoc(orderRef, { [field]: arrayRemove(url) });
  };

  if (loadingOrder) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!order) return <div className="p-20 text-center">Not found</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></Button>
        <h2 className="text-3xl font-bold">Order #{order.id.slice(0, 8)}</h2>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader><CardTitle>Status & Assignment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Select defaultValue={order.status} onValueChange={(v) => handleUpdateField('status', v)} disabled={updating}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Designing">Designing</SelectItem>
                  <SelectItem value="Printing">Printing</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue={order.assignedStaffId} onValueChange={(v) => handleUpdateField('assignedStaffId', v)} disabled={updating}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {staffList?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                Reference Photos
                <CameraCapture onCapture={(img) => handleAddImage('referenceImages', img)} />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {order.referenceImages?.map((url: string, i: number) => (
                <div key={i} className="relative aspect-square rounded border overflow-hidden group">
                  <img src={url} className="w-full h-full object-cover" />
                  <button onClick={() => removeImage('referenceImages', url)} className="absolute top-1 right-1 bg-destructive p-1 rounded-full text-white opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <Card className="h-[500px] flex flex-col">
            <CardHeader className="border-b bg-muted/5 flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> Staff Chat</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-6">
                <div className="space-y-4">
                  {updates?.map((upd) => (
                    <div key={upd.id} className={`flex ${upd.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-xl ${upd.senderRole === 'admin' ? 'bg-primary text-white' : 'bg-muted'}`}>
                        <p className="text-[10px] font-bold opacity-70">{upd.senderName}</p>
                        {upd.message && <p className="text-sm">{upd.message}</p>}
                        {upd.fileUrl && <img src={upd.fileUrl} className="mt-2 rounded-md max-w-full" alt="Update" />}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="border-t p-4 gap-2">
              <CameraCapture onCapture={(img) => handleSendMessage('', img)} trigger={<Button variant="outline" size="icon"><Camera className="w-4 h-4" /></Button>} />
              <Textarea placeholder="Message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="min-h-[60px]" />
              <Button onClick={() => handleSendMessage(newMessage)} disabled={sending}><Send className="w-4 h-4" /></Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Design Previews
                <CameraCapture onCapture={(img) => handleAddImage('previews', img)} />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-4">
              {order.previews?.map((url: string, i: number) => (
                <div key={i} className="relative aspect-video rounded-lg border overflow-hidden group">
                  <img src={url} className="w-full h-full object-cover" />
                  <button onClick={() => removeImage('previews', url)} className="absolute top-2 right-2 bg-destructive p-1 rounded-full text-white opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
