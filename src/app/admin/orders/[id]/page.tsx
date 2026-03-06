
"use client"

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Send, MessageSquare, Image as ImageIcon, Users, Plus, Trash2, Camera, Upload, FileText, Download } from 'lucide-react';
import { useDoc, useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, orderBy, updateDoc, arrayUnion, where, arrayRemove } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { CameraCapture } from '@/components/CameraCapture';

export default function AdminOrderDetail() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const chatFileRef = useRef<HTMLInputElement>(null);
  const previewFileRef = useRef<HTMLInputElement>(null);
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

  const handleSendMessage = async (message: string, fileData?: string) => {
    if (!message.trim() && !fileData) return;
    setSending(true);
    try {
      const updatesRef = collection(db!, 'orders', id as string, 'updates');
      await addDoc(updatesRef, {
        orderId: id,
        senderId: user?.uid,
        senderName: user?.displayName || 'Admin',
        senderRole: 'admin',
        message: message,
        fileUrl: fileData || null,
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'chat' | 'preview' | 'reference') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 700) {
        toast({ variant: "destructive", title: "File too large", description: "Please upload documents under 700KB." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (target === 'chat') {
          handleSendMessage('', base64);
        } else if (target === 'preview') {
          handleAddImage('previews', base64);
        } else if (target === 'reference') {
          handleAddImage('referenceImages', base64);
        }
      };
      reader.readAsDataURL(file);
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

  const isImage = (url: string) => url.startsWith('data:image/') || url.match(/\.(jpeg|jpg|gif|png)$/) != null;

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
                Files & References
                <div className="flex gap-1">
                  <input type="file" className="hidden" id="ref-file" onChange={(e) => handleFileUpload(e, 'reference')} />
                  <Button variant="outline" size="icon" onClick={() => document.getElementById('ref-file')?.click()}>
                    <Upload className="w-4 h-4" />
                  </Button>
                  <CameraCapture onCapture={(img) => handleAddImage('referenceImages', img)} />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {order.referenceImages?.map((url: string, i: number) => (
                <div key={i} className="relative aspect-square rounded border overflow-hidden group bg-muted flex items-center justify-center">
                  {isImage(url) ? (
                    <img src={url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 p-2">
                      <FileText className="w-8 h-8 text-primary" />
                      <a href={url} download={`file-${i}`} className="text-[10px] text-primary underline truncate max-w-full">Download</a>
                    </div>
                  )}
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
                        {upd.fileUrl && (
                          <div className="mt-2">
                            {isImage(upd.fileUrl) ? (
                              <img src={upd.fileUrl} className="rounded-md max-w-full shadow-sm" alt="Update" />
                            ) : (
                              <a href={upd.fileUrl} download="attachment" className="flex items-center gap-2 bg-black/10 p-2 rounded text-xs hover:bg-black/20 transition-colors">
                                <Download className="w-4 h-4" /> Download Document
                              </a>
                            )}
                          </div>
                        )}
                        <p className="text-[8px] mt-1 text-right opacity-50">
                          {upd.timestamp?.seconds ? new Date(upd.timestamp.seconds * 1000).toLocaleTimeString() : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="border-t p-4 gap-2">
              <input type="file" ref={chatFileRef} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" onChange={(e) => handleFileUpload(e, 'chat')} />
              <Button variant="outline" size="icon" onClick={() => chatFileRef.current?.click()}>
                <Upload className="w-4 h-4" />
              </Button>
              <CameraCapture onCapture={(img) => handleSendMessage('', img)} trigger={<Button variant="outline" size="icon"><Camera className="w-4 h-4" /></Button>} />
              <Textarea placeholder="Message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="min-h-[60px]" />
              <Button onClick={() => handleSendMessage(newMessage)} disabled={sending || !newMessage.trim()}><Send className="w-4 h-4" /></Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Design Previews
                <div className="flex gap-1">
                  <input type="file" ref={previewFileRef} className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'preview')} />
                  <Button variant="outline" size="icon" onClick={() => previewFileRef.current?.click()}>
                    <Upload className="w-4 h-4" />
                  </Button>
                  <CameraCapture onCapture={(img) => handleAddImage('previews', img)} />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-4">
              {order.previews?.map((url: string, i: number) => (
                <div key={i} className="relative aspect-video rounded-lg border overflow-hidden group bg-muted flex items-center justify-center">
                  {isImage(url) ? (
                    <img src={url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <FileText className="w-10 h-10 text-primary" />
                      <a href={url} download={`preview-${i}`} className="text-xs text-primary underline">Download</a>
                    </div>
                  )}
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
