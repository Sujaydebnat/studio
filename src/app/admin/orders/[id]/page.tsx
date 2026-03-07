
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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ArrowLeft, Send, MessageSquare, Image as ImageIcon, Users, Plus, Trash2, Camera, Upload, FileText, Download, Ruler, Calendar as CalendarIcon, Hash, Banknote, Mail, Layers, Pencil } from 'lucide-react';
import { useDoc, useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, orderBy, updateDoc, arrayUnion, where, arrayRemove } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { CameraCapture } from '@/components/CameraCapture';
import { Label } from '@/components/ui/label';

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
  const previewFileRef = useRef<HTMLInputElement>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const [newItem, setNewItem] = useState<OrderItem>({ type: '', subCategory: '', size: '', qty: '1' });
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);

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

  const categoriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'categories'), orderBy('name', 'asc'));
  }, [db]);

  const { data: staffList } = useCollection(staffQuery);
  const { data: categories } = useCollection(categoriesQuery);

  const currentCategoryData = useMemo(() => {
    return categories?.find(c => c.name === newItem.type);
  }, [categories, newItem.type]);

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
    } catch (e) { console.error(e); } finally { setSending(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'chat' | 'preview') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 700) {
        toast({ variant: "destructive", title: "File too large", description: "Limit is 700KB." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (target === 'chat') handleSendMessage('', base64);
        else handleAddImage('previews', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateField = async (field: string, value: any) => {
    if (!orderRef) return;
    setUpdating(true);
    try {
      await updateDoc(orderRef, { [field]: value, updatedAt: serverTimestamp() });
      toast({ title: "Updated" });
    } finally { setUpdating(false); }
  };

  const toggleWorkType = (type: string) => {
    if (!order) return;
    const currentTypes = order.workTypes || [];
    const isSelected = currentTypes.includes(type);
    const newWorkTypes = isSelected 
      ? currentTypes.filter((t: string) => t !== type)
      : [...currentTypes, type];
    handleUpdateField('workTypes', newWorkTypes);
  };

  const addItemToList = async () => {
    if (!newItem.type || !newItem.size || !newItem.qty || !orderRef) return;
    setUpdating(true);
    try {
      const currentItems = [...(order?.orderItems || [])];
      if (editingItemIdx !== null) currentItems[editingItemIdx] = newItem;
      else currentItems.push(newItem);
      await updateDoc(orderRef, { orderItems: currentItems, updatedAt: serverTimestamp() });
      setNewItem({ type: '', subCategory: '', size: '', qty: '1' });
      setEditingItemIdx(null);
      toast({ title: editingItemIdx !== null ? "Item Updated" : "Item Added" });
    } finally { setUpdating(false); }
  };

  const removeItemFromList = async (idx: number) => {
    if (!orderRef || !order?.orderItems) return;
    setUpdating(true);
    try {
      const newItems = order.orderItems.filter((_: any, i: number) => i !== idx);
      await updateDoc(orderRef, { orderItems: newItems, updatedAt: serverTimestamp() });
      if (editingItemIdx === idx) {
        setEditingItemIdx(null);
        setNewItem({ type: '', subCategory: '', size: '', qty: '1' });
      }
    } finally { setUpdating(false); }
  };

  const handleStartEditItem = (idx: number) => {
    const item = order.orderItems[idx];
    setNewItem({ ...item });
    setEditingItemIdx(idx);
  };

  const handleAddImage = async (field: 'previews', url: string) => {
    if (!url || !orderRef) return;
    setUpdating(true);
    try { await updateDoc(orderRef, { [field]: arrayUnion(url), updatedAt: serverTimestamp() }); } 
    finally { setUpdating(false); }
  };

  const removeImage = async (field: 'previews', url: string) => {
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
        <div>
          <h2 className="text-3xl font-bold">Bill #{order.billNumber || order.id.slice(0, 8)}</h2>
          <p className="text-xs text-muted-foreground">Admin Order View</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader><CardTitle>Assignment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select defaultValue={order.status} onValueChange={(v) => handleUpdateField('status', v)} disabled={updating}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Pending', 'Designing', 'Printing', 'Completed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
            <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="w-5 h-5 text-primary" /> Work Types</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 bg-muted/20 p-3 rounded-lg border">
                {categories?.map((c) => (
                  <div key={c.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`edit-type-${c.id}`} 
                      checked={(order.workTypes || []).includes(c.name)}
                      onCheckedChange={() => toggleWorkType(c.name)}
                      disabled={updating}
                    />
                    <label htmlFor={`edit-type-${c.id}`} className="text-[10px] font-bold cursor-pointer">{c.name}</label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className={editingItemIdx !== null ? "border-primary ring-2 ring-primary/20" : ""}>
            <CardHeader><CardTitle className="flex items-center gap-2 text-primary"><Ruler className="w-5 h-5" /> Detailed Items</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/30 p-3 rounded-lg border-2 border-dashed space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  <Select value={newItem.type} onValueChange={(v) => setNewItem({...newItem, type: v, subCategory: '', size: ''})}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      {(order.workTypes || []).map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  
                  {currentCategoryData?.subCategories?.length > 0 ? (
                    <Select value={newItem.subCategory} onValueChange={(v) => setNewItem({...newItem, subCategory: v})}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Sub" /></SelectTrigger>
                      <SelectContent>
                        {currentCategoryData.subCategories.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input placeholder="Sub-category" value={newItem.subCategory} onChange={(e) => setNewItem({...newItem, subCategory: e.target.value})} className="h-8 text-xs" />
                  )}
                  
                  <Input placeholder="Size" value={newItem.size} onChange={(e) => setNewItem({...newItem, size: e.target.value})} className="h-8 text-xs" />
                  
                  <div className="flex gap-2">
                    <Input type="number" value={newItem.qty} onChange={(e) => setNewItem({...newItem, qty: e.target.value})} className="h-8 text-xs flex-1" />
                    <Button onClick={addItemToList} size="sm" className="h-8 bg-accent" disabled={updating}>
                      {editingItemIdx !== null ? <Pencil className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                      {editingItemIdx !== null ? 'Update' : 'Add'}
                    </Button>
                    {editingItemIdx !== null && (
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => {setEditingItemIdx(null); setNewItem({type:'',subCategory:'',size:'',qty:'1'})}}>Cancel</Button>
                    )}
                  </div>
                </div>
              </div>

              {order.orderItems?.length > 0 && (
                <div className="space-y-2">
                  {order.orderItems.map((item: any, i: number) => (
                    <div key={i} className={`flex flex-col p-2 rounded bg-muted/50 border text-xs gap-1 transition-colors ${editingItemIdx === i ? 'border-primary bg-primary/5' : ''}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-primary">{item.type}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleStartEditItem(i)} className="h-6 w-6 text-primary"><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => removeItemFromList(i)} className="h-6 w-6 text-destructive"><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{item.subCategory || 'Manual'}</span>
                        <span>{item.size} — <strong>{item.qty} pcs</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b bg-muted/5"><CardTitle className="text-lg flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> Chat</CardTitle></CardHeader>
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
                            {isImage(upd.fileUrl) && <img src={upd.fileUrl} className="rounded-md max-w-full" alt="Update" />}
                            <a href={upd.fileUrl} download className={`flex items-center gap-2 p-2 rounded text-xs ${upd.senderRole === 'admin' ? 'bg-black/20' : 'bg-primary/10 text-primary'}`}>
                              <Download className="w-4 h-4" /> Download
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
              <input type="file" ref={chatFileRef} className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'chat')} />
              <Button variant="outline" size="icon" onClick={() => chatFileRef.current?.click()}><Upload className="w-4 h-4" /></Button>
              <CameraCapture onCapture={(img) => handleSendMessage('', img)} trigger={<Button variant="outline" size="icon"><Camera className="w-4 h-4" /></Button>} />
              <Textarea placeholder="Message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="min-h-[60px]" />
              <Button onClick={() => handleSendMessage(newMessage)} disabled={sending || !newMessage.trim()}><Send className="w-4 h-4" /></Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
