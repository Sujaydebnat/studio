
"use client"

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ArrowLeft, Send, MessageSquare, Camera, Sparkles, Ruler, ImageIcon, Upload, Download, FileText, Calendar as CalendarIcon } from 'lucide-react';
import { useDoc, useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CameraCapture } from '@/components/CameraCapture';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function StaffOrderDetail() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
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

  const handleSendMessage = async (message: string, fileData?: string) => {
    if (!message.trim() && !fileData) return;
    setSending(true);
    try {
      const updatesRef = collection(db!, 'orders', id as string, 'updates');
      await addDoc(updatesRef, {
        orderId: id,
        senderId: user?.uid,
        senderName: user?.displayName || 'Staff',
        senderRole: 'staff',
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 700) {
        toast({ variant: "destructive", title: "File too large", description: "Documents must be under 700KB." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        handleSendMessage('', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const isImage = (url: string) => url?.startsWith('data:image/') || url?.match(/\.(jpeg|jpg|gif|png)$/) != null;

  if (loadingOrder) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-accent" /></div>;
  if (!order) return <div className="p-20 text-center">Not found</div>;

  const currentWorkTypes = order.workTypes || [order.workType];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex flex-col">
          <h2 className="text-3xl font-bold text-accent-foreground">Production Workbench</h2>
          <p className="text-xs text-muted-foreground">Bill #{order.billNumber || order.id.slice(0, 8)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-accent/20">
            <CardHeader className="bg-accent/5">
              <CardTitle className="text-sm uppercase flex items-center gap-2">
                <Ruler className="w-4 h-4 text-accent" /> Production Specs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold">Work Types</Label>
                <div className="flex flex-wrap gap-1">
                  {currentWorkTypes.map((t: string) => (
                    <Badge key={t} className="bg-primary text-white text-[10px] uppercase">
                      {t}
                    </Badge>
                  ))}
                </div>
                {order.subWorkType && (
                  <p className="text-xs font-bold text-accent mt-1">Sub-Type: {order.subWorkType}</p>
                )}
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] uppercase font-bold">Size (W × H)</Label>
                  <p className="font-extrabold text-primary">
                    {order.width && order.height 
                      ? `${order.width} × ${order.height} ${order.unit || ''}` 
                      : order.size || 'Custom'}
                  </p>
                </div>
                <div><Label className="text-[10px] uppercase font-bold">Qty (Pis)</Label><p className="font-extrabold text-primary">{order.quantity || '1'}</p></div>
              </div>
              <Separator />
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" /> Delivery Due
                </Label>
                <p className="text-sm font-bold text-destructive">
                  {order.deliveryDate ? format(new Date(order.deliveryDate), 'PPP') : 'TBD'}
                </p>
              </div>
              <Separator />
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold">Instructions</Label>
                <p className="text-xs font-medium bg-muted p-2 rounded">{order.additionalDetails || 'No special instructions.'}</p>
              </div>
            </CardContent>
          </Card>

          {order.referenceImages?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-xs uppercase flex items-center gap-2"><ImageIcon className="w-3 h-3" /> References</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {order.referenceImages.map((url: string, i: number) => (
                  <div key={i} className="relative aspect-square rounded border bg-muted flex flex-col items-center justify-center overflow-hidden group">
                    {isImage(url) ? (
                      <img src={url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <FileText className="w-8 h-8 text-primary" />
                        <span className="text-[10px] text-muted-foreground">File</span>
                      </div>
                    )}
                    <a 
                      href={url} 
                      download={`ref-${i}`} 
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Download className="w-5 h-5 text-white" />
                    </a>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {order.designBrief && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader><CardTitle className="text-xs uppercase flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> AI Brief Summary</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-3">
                <div><Label className="text-[10px] font-bold opacity-70">OVERVIEW</Label><p>{order.designBrief.overview}</p></div>
                <div><Label className="text-[10px] font-bold opacity-70">TARGET AUDIENCE</Label><p>{order.designBrief.targetAudience}</p></div>
                <div><Label className="text-[10px] font-bold opacity-70">VISUAL STYLE</Label><p className="text-primary font-bold">{order.designBrief.visualStyle}</p></div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="lg:col-span-8 flex flex-col h-[700px]">
          <CardHeader className="border-b bg-accent/5">
            <CardTitle className="flex items-center gap-2 text-lg"><MessageSquare className="w-5 h-5 text-accent" /> Production Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full p-6">
              <div className="space-y-4">
                {updates?.map((upd) => (
                  <div key={upd.id} className={`flex flex-col ${upd.senderRole === 'staff' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-xl shadow-sm ${upd.senderRole === 'staff' ? 'bg-accent text-accent-foreground' : 'bg-white border-2'}`}>
                      <p className="text-[10px] font-bold opacity-70 mb-1">{upd.senderName}</p>
                      {upd.message && <p className="text-sm">{upd.message}</p>}
                      {upd.fileUrl && (
                        <div className="mt-2 space-y-2">
                          {isImage(upd.fileUrl) ? (
                            <img src={upd.fileUrl} className="rounded-md max-w-full shadow-sm" alt="Update" />
                          ) : null}
                          <a 
                            href={upd.fileUrl} 
                            download={`staff-file-${upd.id.slice(0,4)}`} 
                            className={`flex items-center gap-2 p-2 rounded text-xs transition-colors ${upd.senderRole === 'staff' ? 'bg-black/10 hover:bg-black/20 text-accent-foreground' : 'bg-accent/10 hover:bg-accent/20 text-accent font-bold'}`}
                          >
                            {isImage(upd.fileUrl) ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                            Download {isImage(upd.fileUrl) ? 'Image (Doc Mode)' : 'Document'}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="border-t p-4 gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleFileChange} />
            <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 text-accent" />
            </Button>
            <CameraCapture onCapture={(img) => handleSendMessage('', img)} trigger={<Button variant="outline" size="icon"><Camera className="w-4 h-4 text-accent" /></Button>} />
            <Textarea placeholder="Progress update..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="min-h-[60px]" />
            <Button onClick={() => handleSendMessage(newMessage)} disabled={sending || (!newMessage.trim() && !sending)} className="bg-accent text-accent-foreground"><Send className="w-4 h-4" /></Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
