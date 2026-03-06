
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
import { Loader2, ArrowLeft, Send, MessageSquare, Image as ImageIcon, Users, Plus, Trash2, Camera, Upload, FileText, Download, Ruler, Calendar as CalendarIcon, Hash, Banknote, Mail } from 'lucide-react';
import { useDoc, useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, orderBy, updateDoc, arrayUnion, where, arrayRemove } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { CameraCapture } from '@/components/CameraCapture';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

export default function AdminOrderDetail() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const chatFileRef = useRef<HTMLInputElement>(null);
  const previewFileRef = useRef<HTMLInputElement>(null);
  const refFileRef = useRef<HTMLInputElement>(null);
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

  const isImage = (url: string) => url?.startsWith('data:image/') || url?.match(/\.(jpeg|jpg|gif|png)$/) != null;

  if (loadingOrder) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!order) return <div className="p-20 text-center">Not found</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex flex-col">
          <h2 className="text-3xl font-bold">Bill #{order.billNumber || order.id.slice(0, 8)}</h2>
          <p className="text-xs text-muted-foreground font-mono">System ID: {order.id}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader><CardTitle>Status & Assignment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
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
              <div className="space-y-2">
                <Label>Assigned Staff</Label>
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
            <CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="w-5 h-5 text-primary" /> Financials & Delivery</CardTitle></CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Bill Number</Label>
                    <Input 
                      defaultValue={order.billNumber} 
                      onBlur={(e) => handleUpdateField('billNumber', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase opacity-60">Total Bill (BDT)</Label>
                    <Input 
                      type="number"
                      defaultValue={order.totalBill} 
                      onBlur={(e) => handleUpdateField('totalBill', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
               </div>
               <div className="space-y-1">
                 <Label className="text-[10px] font-bold uppercase opacity-60">Delivery Date</Label>
                 <Input 
                    type="date"
                    defaultValue={order.deliveryDate} 
                    onChange={(e) => handleUpdateField('deliveryDate', e.target.value)}
                    className="h-8 text-sm"
                 />
               </div>
               <div className="space-y-1">
                 <Label className="text-[10px] font-bold uppercase opacity-60">Customer Email</Label>
                 <Input 
                    type="email"
                    defaultValue={order.customerEmail} 
                    onBlur={(e) => handleUpdateField('customerEmail', e.target.value)}
                    className="h-8 text-sm"
                 />
               </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                Files & References
                <div className="flex gap-1">
                  <input type="file" ref={refFileRef} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" onChange={(e) => handleFileUpload(e, 'reference')} />
                  <Button variant="outline" size="icon" onClick={() => refFileRef.current?.click()}>
                    <Upload className="w-4 h-4" />
                  </Button>
                  <CameraCapture onCapture={(img) => handleAddImage('referenceImages', img)} />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {order.referenceImages?.map((url: string, i: number) => (
                <div key={i} className="relative aspect-square rounded border overflow-hidden group bg-muted flex flex-col items-center justify-center">
                  {isImage(url) ? (
                    <img src={url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 p-2">
                      <FileText className="w-8 h-8 text-primary" />
                      <span className="text-[10px] text-muted-foreground truncate w-full text-center">Document</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a href={url} download={`ref-${i}`} className="bg-white p-1.5 rounded-full text-primary hover:bg-primary hover:text-white transition-colors">
                      <Download className="w-4 h-4" />
                    </a>
                    <button onClick={() => removeImage('referenceImages', url)} className="bg-destructive p-1.5 rounded-full text-white">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b bg-muted/5 flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> Production Chat</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-6">
                <div className="space-y-4">
                  {updates?.map((upd) => (
                    <div key={upd.id} className={`flex ${upd.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-xl ${upd.senderRole === 'admin' ? 'bg-primary text-white' : 'bg-muted'}`}>
                        <p className="text-[10px] font-bold opacity-70 mb-1">{upd.senderName}</p>
                        {upd.message && <p className="text-sm">{upd.message}</p>}
                        {upd.fileUrl && (
                          <div className="mt-2 space-y-2">
                            {isImage(upd.fileUrl) ? (
                              <img src={upd.fileUrl} className="rounded-md max-w-full shadow-sm" alt="Update" />
                            ) : null}
                            <a 
                              href={upd.fileUrl} 
                              download={`attachment-${upd.id.slice(0,4)}`} 
                              className={`flex items-center gap-2 p-2 rounded text-xs transition-colors ${upd.senderRole === 'admin' ? 'bg-black/20 hover:bg-black/30' : 'bg-primary/10 hover:bg-primary/20 text-primary font-bold'}`}
                            >
                              {isImage(upd.fileUrl) ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                              Download {isImage(upd.fileUrl) ? 'Image (Doc Mode)' : 'Document'}
                            </a>
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
              <Button onClick={() => handleSendMessage(newMessage)} disabled={sending || (!newMessage.trim() && !sending)}><Send className="w-4 h-4" /></Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Design Previews (Customer View)
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
                      <span className="text-xs font-bold">PDF Design</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a href={url} download={`preview-${i}`} className="bg-white p-1.5 rounded-full text-primary hover:bg-primary hover:text-white transition-colors">
                      <Download className="w-4 h-4" />
                    </a>
                    <button onClick={() => removeImage('previews', url)} className="bg-destructive p-1.5 rounded-full text-white">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
