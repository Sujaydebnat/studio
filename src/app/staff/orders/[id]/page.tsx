
"use client"

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ArrowLeft, Send, MessageSquare, Camera, Sparkles, Ruler, ImageIcon, Upload } from 'lucide-react';
import { useDoc, useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CameraCapture } from '@/components/CameraCapture';

export default function StaffOrderDetail() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const { data: updates } = useCollection(updatesQuery);

  const handleSendMessage = async (message: string, image?: string) => {
    if (!message.trim() && !image) return;
    setSending(true);
    try {
      const updatesRef = collection(db!, 'orders', id as string, 'updates');
      await addDoc(updatesRef, {
        orderId: id,
        senderId: user?.uid,
        senderName: user?.displayName || 'Staff',
        senderRole: 'staff',
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleSendMessage('', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loadingOrder) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-accent" /></div>;
  if (!order) return <div className="p-20 text-center">Not found</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></Button>
        <h2 className="text-3xl font-bold text-accent-foreground">Production Workbench</h2>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-accent/20">
            <CardHeader className="bg-accent/5"><CardTitle className="text-sm uppercase flex items-center gap-2"><Ruler className="w-4 h-4 text-accent" /> Specs</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-[10px] uppercase font-bold">Size</Label><p className="font-extrabold text-primary">{order.size || 'N/A'}</p></div>
                <div><Label className="text-[10px] uppercase font-bold">Qty</Label><p className="font-extrabold text-primary">{order.quantity || '1'}</p></div>
              </div>
              <Separator />
              <p className="text-xs">{order.additionalDetails}</p>
            </CardContent>
          </Card>

          {order.referenceImages?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-xs uppercase flex items-center gap-2"><ImageIcon className="w-3 h-3" /> References</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {order.referenceImages.map((url: string, i: number) => (
                  <img key={i} src={url} className="aspect-square object-cover rounded border" />
                ))}
              </CardContent>
            </Card>
          )}

          {order.designBrief && (
            <Card className="bg-primary/5">
              <CardHeader><CardTitle className="text-xs uppercase flex items-center gap-2"><Sparkles className="w-4 h-4" /> AI Brief</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-2">
                <p><strong>Overview:</strong> {order.designBrief.overview}</p>
                <p><strong>Style:</strong> {order.designBrief.visualStyle}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="lg:col-span-8 flex flex-col h-[700px]">
          <CardHeader className="border-b bg-accent/5">
            <CardTitle className="flex items-center gap-2 text-lg"><MessageSquare className="w-5 h-5 text-accent" /> Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full p-6">
              <div className="space-y-4">
                {updates?.map((upd) => (
                  <div key={upd.id} className={`flex flex-col ${upd.senderRole === 'staff' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-xl ${upd.senderRole === 'staff' ? 'bg-accent text-accent-foreground' : 'bg-white border'}`}>
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
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 text-accent" />
            </Button>
            <CameraCapture onCapture={(img) => handleSendMessage('', img)} trigger={<Button variant="outline" size="icon"><Camera className="w-4 h-4 text-accent" /></Button>} />
            <Textarea placeholder="Progress update..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
            <Button onClick={() => handleSendMessage(newMessage)} className="bg-accent text-accent-foreground"><Send className="w-4 h-4" /></Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
