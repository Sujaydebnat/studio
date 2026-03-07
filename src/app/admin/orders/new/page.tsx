
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
import { Sparkles, Loader2, ArrowLeft, Save, ImageIcon, Upload, FileText, Ruler, Calendar as CalendarIcon, Hash, Banknote, Mail, Plus, Trash2, Layers, Pencil } from 'lucide-react';
import { aiDesignBriefTool, type AIDesignBriefToolOutput } from '@/ai/flows/ai-design-brief-tool-flow';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { CameraCapture } from '@/components/CameraCapture';

interface OrderItem {
  type: string;
  subCategory: string;
  size: string;
  qty: string;
}

export default function NewOrderPage() {
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [designBrief, setDesignBrief] = useState<AIDesignBriefToolOutput | null>(null);
  
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

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [currentItem, setCurrentItem] = useState<OrderItem>({ type: '', subCategory: '', size: '', qty: '1' });
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);

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

  const selectedCategoryId = useMemo(() => {
    return categories?.find(c => c.name === currentItem.type)?.id;
  }, [categories, currentItem.type]);

  const subQuery = useMemoFirebase(() => {
    if (!db || !selectedCategoryId) return null;
    return query(collection(db, 'categories', selectedCategoryId, 'subcategories'), orderBy('name', 'asc'));
  }, [db, selectedCategoryId]);

  const { data: currentSubCategories, isLoading: loadingSubs } = useCollection(subQuery);

  const toggleWorkType = (type: string) => {
    setFormData(prev => {
      const isSelected = prev.workTypes.includes(type);
      const newWorkTypes = isSelected 
        ? prev.workTypes.filter(t => t !== type)
        : [...prev.workTypes, type];
      return { ...prev, workTypes: newWorkTypes };
    });
    if (currentItem.type === '') setCurrentItem({ ...currentItem, type, subCategory: '' });
  };

  const addOrderItem = () => {
    if (!currentItem.type || !currentItem.size || !currentItem.qty) {
      toast({ variant: "destructive", title: "Missing Info" });
      return;
    }
    
    if (editingItemIdx !== null) {
      const updated = [...orderItems];
      updated[editingItemIdx] = currentItem;
      setOrderItems(updated);
      setEditingItemIdx(null);
    } else {
      setOrderItems([...orderItems, currentItem]);
    }
    
    setCurrentItem({ type: '', subCategory: '', size: '', qty: '1' });
  };

  const removeOrderItem = (idx: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== idx));
  };

  const startEditItem = (idx: number) => {
    setCurrentItem({ ...orderItems[idx] });
    setEditingItemIdx(idx);
  };

  const handleAddRefFile = (url: string) => {
    setFormData(prev => ({ ...prev, referenceImages: [...prev.referenceImages, url] }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleAddRefFile(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateBrief = async () => {
    if (formData.workTypes.length === 0 || !formData.keywords) return;
    setLoadingAI(true);
    try {
      const brief = await aiDesignBriefTool({
        projectType: formData.workTypes.join(", "),
        keywords: formData.keywords,
      });
      setDesignBrief(brief);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || orderItems.length === 0) return;

    setSaving(true);
    const orderData = {
      ...formData,
      orderItems,
      adminId: user.uid,
      status: 'Pending',
      designBrief: designBrief || null,
      previews: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const ordersRef = collection(db, 'orders');
    addDoc(ordersRef, orderData)
      .then(() => {
        toast({ title: "Order Created" });
        router.push('/admin/dashboard');
      })
      .catch(async () => {
        setSaving(false);
      });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></Button>
          <h2 className="text-3xl font-bold font-headline">New Work Order</h2>
        </div>
        <Button onClick={handleSubmit} className="bg-primary gap-2 h-11 px-6 font-bold shadow-md" disabled={saving || orderItems.length === 0}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Order
        </Button>
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        <div className="md:col-span-7 space-y-6">
          <Card className="shadow-sm border-2">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Hash className="w-5 h-5 text-primary" /> Order Info</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bill Number</Label>
                  <Input value={formData.billNumber} onChange={(e) => setFormData({...formData, billNumber: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Total Bill</Label>
                  <Input type="number" value={formData.totalBill} onChange={(e) => setFormData({...formData, totalBill: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input value={formData.customerName} onChange={(e) => setFormData({...formData, customerName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={formData.customerEmail} onChange={(e) => setFormData({...formData, customerEmail: e.target.value})} />
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-primary font-bold">Categories</Label>
                <div className="grid grid-cols-2 gap-2 bg-muted/30 p-4 rounded-lg border">
                  {categories?.map((c) => (
                    <div key={c.id} className="flex items-center space-x-2">
                      <Checkbox id={`type-${c.id}`} checked={formData.workTypes.includes(c.name)} onCheckedChange={() => toggleWorkType(c.name)} />
                      <label htmlFor={`type-${c.id}`} className="text-xs font-medium cursor-pointer">{c.name}</label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-2">
            <CardHeader><CardTitle className="text-lg text-primary flex items-center gap-2"><Ruler className="w-5 h-5" /> Detailed Items</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/20 p-4 rounded-lg border-2 border-dashed space-y-4">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4 space-y-1">
                    <Label className="text-[10px] font-bold">Type</Label>
                    <Select value={currentItem.type} onValueChange={(v) => setCurrentItem({...currentItem, type: v, subCategory: '', size: ''})}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        {formData.workTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4 space-y-1">
                    <Label className="text-[10px] font-bold">Sub-cat</Label>
                    {currentSubCategories && currentSubCategories.length > 0 ? (
                      <Select value={currentItem.subCategory} onValueChange={(v) => setCurrentItem({...currentItem, subCategory: v})}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {currentSubCategories.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input placeholder="Manual" value={currentItem.subCategory} onChange={(e) => setCurrentItem({...currentItem, subCategory: e.target.value})} className="h-9" disabled={loadingSubs} />
                    )}
                  </div>
                  <div className="col-span-4 space-y-1">
                    <Label className="text-[10px] font-bold">Size</Label>
                    <Input placeholder="Size" value={currentItem.size} onChange={(e) => setCurrentItem({...currentItem, size: e.target.value})} className="h-9" />
                  </div>
                </div>
                <div className="flex gap-2 items-end">
                   <div className="flex-1 space-y-1">
                      <Label className="text-[10px] font-bold">Qty</Label>
                      <Input type="number" value={currentItem.qty} onChange={(e) => setCurrentItem({...currentItem, qty: e.target.value})} className="h-9" />
                   </div>
                   <Button type="button" onClick={addOrderItem} className="h-9 bg-accent">
                        {editingItemIdx !== null ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        {editingItemIdx !== null ? 'Update' : 'Add'}
                    </Button>
                </div>
              </div>

              {orderItems.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                   <table className="w-full text-sm">
                     <thead className="bg-muted">
                       <tr><th className="p-2 text-left">Category</th><th className="p-2 text-left">Sub</th><th className="p-2 text-center">Qty</th><th className="p-2 text-right">Action</th></tr>
                     </thead>
                     <tbody>
                       {orderItems.map((item, i) => (
                         <tr key={i} className="border-t">
                           <td className="p-2 font-bold">{item.type}</td>
                           <td className="p-2 text-xs">{item.subCategory}</td>
                           <td className="p-2 text-center">{item.qty}</td>
                           <td className="p-2 text-right">
                             <div className="flex justify-end gap-1">
                               <Button variant="ghost" size="icon" onClick={() => startEditItem(i)} className="h-7 w-7"><Pencil className="w-3 h-3" /></Button>
                               <Button variant="ghost" size="icon" onClick={() => removeOrderItem(i)} className="h-7 w-7 text-destructive"><Trash2 className="w-3 h-3" /></Button>
                             </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-5 space-y-6">
          <Card className="shadow-sm border-2 border-accent/20">
            <CardHeader><CardTitle className="text-accent flex items-center gap-2"><Sparkles className="w-5 h-5" /> AI Design Brief</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Label>Design Keywords</Label>
              <Textarea value={formData.keywords} onChange={(e) => setFormData({...formData, keywords: e.target.value})} />
              <Button onClick={handleGenerateBrief} className="w-full bg-accent" disabled={loadingAI}>
                {loadingAI ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Get AI Suggestions
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
