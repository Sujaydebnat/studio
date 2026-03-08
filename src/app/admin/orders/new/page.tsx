
"use client"

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Loader2, ArrowLeft, Save, ImageIcon, Upload, Hash, Ruler } from 'lucide-react';
import { aiDesignBriefTool, type AIDesignBriefToolOutput } from '@/ai/flows/ai-design-brief-tool-flow';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
    customerEmail: '',
    phone: '',
    workTypes: [] as string[],
    keywords: '',
    priority: 'Normal',
    assignedStaffId: '',
    totalBill: '',
    deliveryDate: '',
    additionalDetails: '',
    referenceImages: [] as string[]
  });

  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [currentItem, setCurrentItem] = useState({ type: '', subCategory: '', size: '', qty: '1' });

  // Use nested catalog/categories path
  const categoriesQuery = useMemoFirebase(() => {
    if (!db || !userData?.shopId) return null;
    return query(collection(db, 'shops', userData.shopId, 'categories'), orderBy('name', 'asc'));
  }, [db, userData?.shopId]);

  const { data: categories } = useCollection(categoriesQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !userData?.shopId || orderItems.length === 0) return;

    setSaving(true);
    const orderData = {
      ...formData,
      orderItems,
      shopId: userData.shopId,
      adminId: user.uid,
      status: 'Pending',
      designBrief: designBrief || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Save to shops/{shopId}/orders
    const ordersRef = collection(db, 'shops', userData.shopId, 'orders');
    addDoc(ordersRef, orderData)
      .then(() => {
        toast({ title: "Order Created" });
        router.push('/admin/dashboard');
      })
      .catch(() => {
        setSaving(false);
        toast({ variant: "destructive", title: "Error creating order" });
      });
  };

  const addOrderItem = () => {
    if (!currentItem.type || !currentItem.size) return;
    setOrderItems([...orderItems, currentItem]);
    setCurrentItem({ type: '', subCategory: '', size: '', qty: '1' });
  };

  if (!userData?.shopId) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></Button>
          <h2 className="text-3xl font-bold font-headline">New Order • {userData.shopId.slice(0, 8)}</h2>
        </div>
        <Button onClick={handleSubmit} className="bg-primary gap-2 h-11 px-6 font-bold shadow-md" disabled={saving || orderItems.length === 0}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Finalize Order
        </Button>
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        <div className="md:col-span-7 space-y-6">
          <Card className="border-2 shadow-sm">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Hash className="w-5 h-5 text-primary" /> Basic Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bill Number</Label>
                  <Input value={formData.billNumber} onChange={(e) => setFormData({...formData, billNumber: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input required value={formData.customerName} onChange={(e) => setFormData({...formData, customerName: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Total Bill (BDT)</Label>
                  <Input type="number" value={formData.totalBill} onChange={(e) => setFormData({...formData, totalBill: e.target.value})} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm">
            <CardHeader><CardTitle className="text-lg text-primary flex items-center gap-2"><Ruler className="w-5 h-5" /> Line Items</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2 bg-muted/20 p-4 rounded-lg border-2 border-dashed">
                <Input placeholder="Work Type" value={currentItem.type} onChange={(e) => setCurrentItem({...currentItem, type: e.target.value})} />
                <Input placeholder="Size" value={currentItem.size} onChange={(e) => setCurrentItem({...currentItem, size: e.target.value})} />
                <Button variant="outline" onClick={addOrderItem}>Add Item</Button>
              </div>
              {orderItems.map((item, i) => (
                <div key={i} className="flex justify-between p-2 bg-muted rounded">
                  <span className="font-bold">{item.type}</span>
                  <span className="text-xs">{item.size} ({item.qty})</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-5">
          <Card className="border-accent/20 border-2">
            <CardHeader><CardTitle className="text-accent flex items-center gap-2"><Sparkles className="w-5 h-5" /> AI Brief</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Label>Description / Keywords</Label>
              <Textarea placeholder="Modern logo for a tech shop..." value={formData.keywords} onChange={(e) => setFormData({...formData, keywords: e.target.value})} />
              <Button variant="outline" className="w-full border-accent text-accent" onClick={async () => {
                setLoadingAI(true);
                const brief = await aiDesignBriefTool({ projectType: formData.workTypes.join(", "), keywords: formData.keywords });
                setDesignBrief(brief);
                setLoadingAI(false);
              }} disabled={loadingAI}>
                {loadingAI ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generate Suggestion
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
