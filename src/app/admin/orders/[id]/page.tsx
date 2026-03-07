
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
import { Loader2, ArrowLeft, Send, MessageSquare, Image as ImageIcon, Users, Plus, Trash2, Camera, Upload, FileText, Download, Ruler, Pencil } from 'lucide-react';
import { useDoc, useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, orderBy, updateDoc, where, arrayUnion, arrayRemove } from 'firebase/firestore';
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
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const [newItem, setNewItem] = useState<OrderItem>({ type: '', subCategory: '', size: '', qty: '1' });
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);

  const orderRef = useMemoFirebase(() => id && db ? doc(db, 'orders', id as string) : null, [db, id]);
  const { data: order, loading: loadingOrder } = useDoc(orderRef);

  const updatesQuery = useMemoFirebase(() => id && db ? query(collection(db, 'orders', id as string, 'updates'), orderBy('timestamp', 'asc')) : null, [db, id]);
  const { data: updates } = useCollection(updatesQuery);

  const staffQuery = useMemoFirebase(() => db ? query(collection(db, 'users'), where('role', '==', 'staff')) : null, [db]);
  const { data: staffList } = useCollection(staffQuery);

  const categoriesQuery = useMemoFirebase(() => db ? query(collection(db, 'categories'), orderBy('name', 'asc')) : null, [db]);
  const { data: categories } = useCollection(categoriesQuery);

  const selectedCategoryId = useMemo(() => categories?.find(c => c.name === newItem.type)?.id, [categories, newItem.type]);
  const subQuery = useMemoFirebase(() => db && selectedCategoryId ? query(collection(db, 'categories', selectedCategoryId, 'subcategories'), orderBy('name', 'asc')) : null, [db, selectedCategoryId]);
  const { data: subCategories, isLoading: loadingSubs } = useCollection(subQuery);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleSendMessage('', reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateField = async (field: string, value: any) => {
    if (!orderRef) return;
    setUpdating(true);
    try { await updateDoc(orderRef, { [field]: value, updatedAt: serverTimestamp() }); toast({ title: "Updated" }); } finally { setUpdating(false); }
  };

  const toggleWorkType = (type: string) => {
    const currentTypes = order?.workTypes || [];
    const newTypes = currentTypes.includes(type) ? currentTypes.filter((t: string) => t !== type) : [...currentTypes, type];
    handleUpdateField('workTypes', newTypes);
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></Button>
        <h2 className="text-3xl font-bold">Bill #{order?.billNumber || order?.id.slice(0, 8)}</h2>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader><CardTitle>Status & Staff</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Select defaultValue={order?.status} onValueChange={(v) => handleUpdateField('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Pending', 'Designing', 'Printing', 'Completed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select defaultValue={order?.assignedStaffId} onValueChange={(v) => handleUpdateField('assignedStaffId', v)}>
                <SelectTrigger><SelectValue placeholder="Assign To" /></SelectTrigger>
                <SelectContent>
                  {staffList?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-primary text-sm uppercase">Manage Items</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/30 p-3 rounded space-y-3 border">
                <Select value={newItem.type} onValueChange={(v) => setNewItem({...newItem, type: v, subCategory: '', size: ''})}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>{(order?.workTypes || []).map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                {subCategories && subCategories.length > 0 ? (
                  <Select value={newItem.subCategory} onValueChange={(v) => setNewItem({...newItem, subCategory: v})}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Subcategory" /></SelectTrigger>
                    <SelectContent>{subCategories.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input placeholder="Subcategory" value={newItem.subCategory} onChange={(e) => setNewItem({...newItem, subCategory: e.target.value})} className="h-8 text-xs" />
                )}
                <Input placeholder="Size" value={newItem.size} onChange={(e) => setNewItem({...newItem, size: e.target.value})} className="h-8 text-xs" />
                <div className="flex gap-2">
                  <Input type="number" value={newItem.qty} onChange={(e) => setNewItem({...newItem, qty: e.target.value})} className="h-8 text-xs" />
                  <Button onClick={addItemToList} size="sm" className="h-8 text-xs">{editingItemIdx !== null ? 'Update' : 'Add'}</Button>
                </div>
              </div>
              {order?.orderItems?.map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-2 bg-muted rounded text-xs">
                  <div><strong>{item.type}</strong> - {item.subCategory} ({item.qty})</div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => {setNewItem({...item}); setEditingItemIdx(i)}} className="h-6 w-6"><Pencil className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => {const items = order.orderItems.filter((_: any, j: number) => i !== j); handleUpdateField('orderItems', items)}} className="h-6 w-6 text-destructive"><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b"><CardTitle className="text-lg flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> Chat</CardTitle></CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {updates?.map(upd => (
                    <div key={upd.id} className={`flex ${upd.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-xl ${upd.senderRole === 'admin' ? 'bg-primary text-white' : 'bg-muted'}`}>
                        <p className="text-[10px] font-bold opacity-70 mb-1">{upd.senderName}</p>
                        <p className="text-sm">{upd.message}</p>
                        {upd.fileUrl && <img src={upd.fileUrl} className="mt-2 rounded max-w-full" alt="Update" />}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="border-t p-4 gap-2">
              <input type="file" ref={chatFileRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
              <Button variant="outline" size="icon" onClick={() => chatFileRef.current?.click()}><Upload className="w-4 h-4" /></Button>
              <Textarea placeholder="Message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="min-h-[60px]" />
              <Button onClick={() => handleSendMessage(newMessage)} disabled={sending || !newMessage.trim()}><Send className="w-4 h-4" /></Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
