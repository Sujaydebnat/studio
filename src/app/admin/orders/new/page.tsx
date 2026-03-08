
"use client"

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, ArrowLeft, Save, Hash, Ruler, Plus, Trash2 } from 'lucide-react';
import { aiDesignBriefTool, type AIDesignBriefToolOutput } from '@/ai/flows/ai-design-brief-tool-flow';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function NewOrderPage() {
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [loadingAI, setLoadingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [designBrief, setDesignBrief] = useState<AIDesignBriefToolOutput | null>(null);
  
  const userRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [db, user]);
  const { data: userData } = useDoc(userRef);

  const [formData, setFormData] = useState({
    billNumber: '',
    customerName: '',
    phone: '',
    customerEmail: '',
    deliveryDate: '',
    totalBill: '',
    keywords: '',
    additionalDetails: ''
  });

  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [currentItem, setCurrentItem] = useState({ type: '', size: '', qty: '1' });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !userData?.shopId || orderItems.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "At least one item is required." });
      return;
    }

    setSaving(true);
    const orderData = {
      ...formData,
      orderItems,
      shopId: userData.shopId,
      createdBy: user?.uid,
      status: 'Pending',
      designBrief: designBrief || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      // Correct nested path for multi-tenant isolation
      const ordersRef = collection(db, 'shops', userData.shopId, 'orders');
      await addDoc(ordersRef, orderData);
      toast({ title: "Order Finalized", description: `Bill #${formData.billNumber || 'New'} saved successfully.` });
      router.push('/admin/dashboard');
    } catch (err) {
      toast({ variant: "destructive", title: "Save Error", description: "Could not write to database." });
      setSaving(false);
    }
  };

  const addItem = () => {
    if (!currentItem.type || !currentItem.size) return;
    setOrderItems([...orderItems, currentItem]);
    setCurrentItem({ type: '', size: '', qty: '1' });
  };

  const removeItem = (idx: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== idx));
  };

  if (!userData) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h2 className="text-3xl font-black font-headline text-primary tracking-tighter">New Production Ticket</h2>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Shop Node: {userData.shopId.slice(0, 12)}</p>
          </div>
        </div>
        <Button onClick={handleSave} className="bg-primary gap-2 h-12 px-8 font-black shadow-xl rounded-2xl" disabled={saving || orderItems.length === 0}>
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          FINALIZE & SAVE
        </Button>
      </div>

      <div className="grid md:grid-cols-12 gap-8">
        <div className="md:col-span-7 space-y-8">
          <Card className="border-2 shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted/5 border-b"><CardTitle className="text-sm font-black uppercase flex items-center gap-2"><Hash className="w-4 h-4 text-primary" /> Customer Logistics</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Bill Reference #</Label>
                  <Input value={formData.billNumber} onChange={(e) => setFormData({...formData, billNumber: e.target.value})} placeholder="e.g. 2024-001" className="h-11 border-2" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Customer Identity</Label>
                  <Input required value={formData.customerName} onChange={(e) => setFormData({...formData, customerName: e.target.value})} placeholder="John Doe" className="h-11 border-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Mobile Connectivity</Label>
                  <Input required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+880..." className="h-11 border-2" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Email Node</Label>
                  <Input value={formData.customerEmail} onChange={(e) => setFormData({...formData, customerEmail: e.target.value})} placeholder="client@host.com" className="h-11 border-2" />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Delivery Deadline</Label>
                  <Input type="date" value={formData.deliveryDate} onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})} className="h-11 border-2" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Total Bill (BDT)</Label>
                  <Input type="number" value={formData.totalBill} onChange={(e) => setFormData({...formData, totalBill: e.target.value})} className="h-11 border-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="bg-primary/5 border-b"><CardTitle className="text-sm font-black uppercase text-primary flex items-center gap-2"><Ruler className="w-4 h-4" /> Production Line Items</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-3 gap-3 bg-muted/20 p-4 rounded-xl border-2 border-dashed">
                <Input placeholder="Work (e.g. Flex)" value={currentItem.type} onChange={(e) => setCurrentItem({...currentItem, type: e.target.value})} className="bg-white border-2" />
                <Input placeholder="Size (e.g. 10x12)" value={currentItem.size} onChange={(e) => setCurrentItem({...currentItem, size: e.target.value})} className="bg-white border-2" />
                <Button variant="outline" onClick={addItem} className="h-10 border-primary text-primary font-black hover:bg-primary hover:text-white transition-all"><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-3">
                {orderItems.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-muted/30 rounded-xl border-2 hover:border-primary/30 transition-colors group">
                    <div>
                      <span className="font-black text-primary">{item.type}</span>
                      <span className="text-xs font-bold ml-3 text-muted-foreground">Dimensions: {item.size} ({item.qty} Pcs)</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(i)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-5 space-y-8">
          <Card className="border-accent/20 border-2 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-accent/5 border-b"><CardTitle className="text-accent flex items-center gap-2 text-sm font-black uppercase"><Sparkles className="w-5 h-5" /> AI Creative Brief</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-accent-foreground">Visual Intent / Keywords</Label>
                <Textarea 
                  placeholder="e.g. Modern minimalist logo for a tech startup, vibrant blue colors, professional feel..." 
                  value={formData.keywords} 
                  onChange={(e) => setFormData({...formData, keywords: e.target.value})} 
                  className="min-h-[120px] border-2 focus-visible:ring-accent"
                />
              </div>
              <Button 
                variant="outline" 
                className="w-full h-14 border-accent text-accent font-black hover:bg-accent hover:text-accent-foreground shadow-lg rounded-xl transition-all" 
                onClick={async () => {
                  if (!formData.keywords) return;
                  setLoadingAI(true);
                  try {
                    const brief = await aiDesignBriefTool({ projectType: orderItems[0]?.type || "General", keywords: formData.keywords });
                    setDesignBrief(brief);
                    toast({ title: "AI Strategy Ready", description: "Design brief has been optimized." });
                  } finally { setLoadingAI(false); }
                }} 
                disabled={loadingAI || !formData.keywords}
              >
                {loadingAI ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5 mr-2" />}
                {designBrief ? 'REFINE SUGGESTION' : 'GENERATE AI BRIEF'}
              </Button>

              {designBrief && (
                <div className="p-5 bg-accent/5 rounded-2xl border-2 border-accent/10 space-y-4 animate-in slide-in-from-top-4">
                  <div><p className="text-[10px] font-black uppercase text-accent">Strategic Overview</p><p className="text-sm font-medium leading-relaxed">{designBrief.overview}</p></div>
                  <div><p className="text-[10px] font-black uppercase text-accent">Visual Aesthetic</p><p className="text-sm font-bold text-accent-foreground">{designBrief.visualStyle}</p></div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted/5 border-b"><CardTitle className="text-[10px] font-black uppercase">Production Notes</CardTitle></CardHeader>
            <CardContent className="pt-6">
              <Textarea 
                placeholder="Internal instructions for the design team..." 
                value={formData.additionalDetails} 
                onChange={(e) => setFormData({...formData, additionalDetails: e.target.value})} 
                className="min-h-[100px] border-2"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
