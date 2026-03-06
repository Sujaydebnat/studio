
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
import { Loader2, ArrowLeft, Send, MessageSquare, Image as ImageIcon, Users, Plus, AlertCircle } from 'lucide-react';
import { useDoc, useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, orderBy, updateDoc, arrayUnion, where } from 'firebase/firestore';
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
      toast({ title: "Order Updated", description: `${field.charAt(0).toUpperCase() + field.slice(1)} has been changed.` });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Update Failed", description: "Check your permissions." });
    } finally {
      setUpdating(false);
    }
  };

  const handleAddPreview = async () => {
    if (!newPreviewUrl.trim() || !orderRef) return;
    setUpdating(true);
    try {
      await updateDoc(orderRef, {
        previews: arrayUnion(newPreviewUrl),
        updatedAt: serverTimestamp()
      });
      setNewPreviewUrl('');
      toast({ title: "Preview Added", description: "Customer can now see the new design." });
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  if (loadingOrder) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!order) return <div className="p-20 text-center">Order not found.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
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
        {/* Info & Edit Column */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Core Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase">Order Status</Label>
                <Select 
                  defaultValue={order.status} 
                  onValueChange={(val) => handleUpdateField('status', val)}
                  disabled={updating}
                >
                  <SelectTrigger className="border-primary/30">
                    <SelectValue placeholder="Update Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Designing">Designing</SelectItem>
                    <SelectItem value="Printing">Printing</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase">Priority Level</Label>
                <Select 
                  defaultValue={order.priority || 'Normal'} 
                  onValueChange={(val) => handleUpdateField('priority', val)}
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Update Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground uppercase">Customer</Label>
                <p className="font-bold">{order.customerName}</p>
                <p className="text-sm text-muted-foreground">{order.phone || order.customerPhoneNumber}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Service Type</Label>
                <p className="font-bold">{order.workType}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Assigned Staff Member</Label>
                <Select 
                  defaultValue={order.assignedStaffId} 
                  onValueChange={(val) => handleUpdateField('assignedStaffId', val)}
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList?.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                    ))}
                    {(!staffList || staffList.length === 0) && (
                      <SelectItem value="none" disabled>No Staff Found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-accent" /> Design Previews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Image URL" 
                  value={newPreviewUrl}
                  onChange={(e) => setNewPreviewUrl(e.target.value)}
                />
                <Button size="icon" onClick={handleAddPreview} disabled={updating || !newPreviewUrl.trim()}>
                  {updating ? <Loader2 className="animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {order.previews?.map((url: string, idx: number) => (
                  <div key={idx} className="relative aspect-square rounded-md overflow-hidden border">
                    <Image src={url} alt="Preview" fill className="object-cover" />
                  </div>
                ))}
              </div>
              {(!order.previews || order.previews.length === 0) && (
                <p className="text-xs text-center text-muted-foreground py-4">No previews uploaded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Communication Column */}
        <Card className="lg:col-span-8 flex flex-col h-[700px]">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" /> Staff Communication
              </div>
              {updating && <Badge variant="outline" className="animate-pulse">Updating Order...</Badge>}
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
                {(!updates || updates.length === 0) && (
                  <div className="text-center py-20 text-muted-foreground italic">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p>No messages yet. Send a note to the production staff.</p>
                  </div>
                )}
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
