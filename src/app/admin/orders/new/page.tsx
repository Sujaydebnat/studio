
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

  const selectedCategoryData = useMemo(() => {
    return categories?.find(c => c.name === currentItem.type);
  }, [categories, currentItem.type]);

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
      toast({ variant: "destructive", title: "Missing Info", description: "Select category, enter size and quantity." });
      return;
    }
    
    if (editingItemIdx !== null) {
      const updated = [...orderItems];
      updated[editingItemIdx] = currentItem;
      setOrderItems(updated);
      setEditingItemIdx(null);
      toast({ title: "Item Updated" });
    } else {
      setOrderItems([...orderItems, currentItem]);
      toast({ title: "Item Added" });
    }
    
    setCurrentItem({ type: '', subCategory: '', size: '', qty: '1' });
  };

  const removeOrderItem = (idx: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== idx));
    if (editingItemIdx === idx) {
      setEditingItemIdx(null);
      setCurrentItem({ type: '', subCategory: '', size: '', qty: '1' });
    }
  };

  const startEditItem = (idx: number) => {
    setCurrentItem({ ...orderItems[idx] });
    setEditingItemIdx(idx);
  };

  const handleAddRefFile = (url: string) => {
    if (!url.trim()) return;
    setFormData(prev => ({
      ...prev,
      referenceImages: [...prev.referenceImages, url]
    }));
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
        handleAddRefFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeRefFile = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      referenceImages: prev.referenceImages.filter((_, i) => i !== idx)
    }));
  };

  const handleGenerateBrief = async () => {
    if (formData.workTypes.length === 0 || !formData.keywords) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select at least one work type and enter some keywords first!",
      });
      return;
    }
    
    setLoadingAI(true);
    try {
      const brief = await aiDesignBriefTool({
        projectType: formData.workTypes.join(", "),
        keywords: formData.keywords,
      });
      setDesignBrief(brief);
    } catch (error) {
      console.error("AI Brief Error:", error);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;

    if (!formData.customerName || !formData.phone || formData.workTypes.length === 0 || !formData.billNumber) {
      toast({ variant: "destructive", title: "Missing Details", description: "Bill Number, Customer name, phone, and at least one category are required." });
      return;
    }

    if (orderItems.length === 0) {
      toast({ variant: "destructive", title: "No Items", description: "Please add at least one item detail." });
      return;
    }

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
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: ordersRef.path,
          operation: 'create',
          requestResourceData: orderData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        setSaving(false);
      });
  };

  const isImage = (url: string) => url.startsWith('data:image/') || url.match(/\.(jpeg|jpg|gif|png)$/) != null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-3xl font-bold font-headline">New Work Order</h2>
        </div>
        <Button onClick={handleSubmit} className="bg-primary gap-2 h-11 px-6 font-bold shadow-md" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Order
        </Button>
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        <div className="md:col-span-7 space-y-6">
          <Card className="shadow-sm border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Hash className="w-5 h-5 text-primary" /> Bill & Customer Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bill Number (Manual)</Label>
                  <Input 
                    required 
                    placeholder="e.g. 2024-001" 
                    value={formData.billNumber} 
                    onChange={(e) => setFormData({...formData, billNumber: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Bill (Amount)</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      className="pl-8"
                      value={formData.totalBill} 
                      onChange={(e) => setFormData({...formData, totalBill: e.target.value})} 
                    />
                    <Banknote className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input required value={formData.customerName} onChange={(e) => setFormData({...formData, customerName: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Email (Optional)</Label>
                  <div className="relative">
                    <Input 
                      type="email" 
                      placeholder="customer@example.com" 
                      className="pl-8"
                      value={formData.customerEmail} 
                      onChange={(e) => setFormData({...formData, customerEmail: e.target.value})} 
                    />
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-primary font-bold">Select Work Categories</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/30 p-4 rounded-lg border">
                  {categories?.map((c) => (
                    <div key={c.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`type-${c.id}`} 
                        checked={formData.workTypes.includes(c.name)}
                        onCheckedChange={() => toggleWorkType(c.name)}
                      />
                      <label htmlFor={`type-${c.id}`} className="text-xs font-medium leading-none cursor-pointer">{c.name}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select onValueChange={(val) => setFormData({...formData, priority: val})} defaultValue="Normal">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assignment</Label>
                  <Select onValueChange={(val) => setFormData({...formData, assignedStaffId: val})}>
                    <SelectTrigger><SelectValue placeholder="Assign To Staff" /></SelectTrigger>
                    <SelectContent>
                      {staffList?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`shadow-sm border-2 ${editingItemIdx !== null ? 'border-primary ring-2 ring-primary/10' : ''}`}>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg text-primary"><Ruler className="w-5 h-5" /> Detailed Order Items</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/20 p-4 rounded-lg border-2 border-dashed space-y-4">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4 space-y-1">
                    <Label className="text-[10px] font-bold">Category</Label>
                    <Select value={currentItem.type} onValueChange={(v) => setCurrentItem({...currentItem, type: v, size: '', subCategory: ''})}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        {formData.workTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4 space-y-1">
                    <Label className="text-[10px] font-bold">Sub-category</Label>
                    {selectedCategoryData?.subCategories?.length > 0 ? (
                      <Select value={currentItem.subCategory} onValueChange={(v) => setCurrentItem({...currentItem, subCategory: v})}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select Type" /></SelectTrigger>
                        <SelectContent>
                          {selectedCategoryData.subCategories.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input placeholder="e.g. Glossy" value={currentItem.subCategory} onChange={(e) => setCurrentItem({...currentItem, subCategory: e.target.value})} className="h-9" />
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
                   <div className="flex gap-2">
                    <Button type="button" onClick={addOrderItem} className="h-9 bg-accent hover:bg-accent/90 px-8 font-bold">
                        {editingItemIdx !== null ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        {editingItemIdx !== null ? 'Update Item' : 'Add Item'}
                    </Button>
                    {editingItemIdx !== null && (
                      <Button variant="ghost" className="h-9 text-xs" onClick={() => {setEditingItemIdx(null); setCurrentItem({type:'',subCategory:'',size:'',qty:'1'})}}>Cancel</Button>
                    )}
                   </div>
                </div>
              </div>

              {orderItems.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                   <table className="w-full text-sm">
                     <thead className="bg-muted">
                       <tr>
                         <th className="p-2 text-left">Category</th>
                         <th className="p-2 text-left">Sub-Cat</th>
                         <th className="p-2 text-left">Size</th>
                         <th className="p-2 text-center">Qty</th>
                         <th className="p-2 text-right">Action</th>
                       </tr>
                     </thead>
                     <tbody>
                       {orderItems.map((item, i) => (
                         <tr key={i} className={`border-t hover:bg-muted/50 transition-colors ${editingItemIdx === i ? 'bg-primary/5' : ''}`}>
                           <td className="p-2 font-bold text-primary">{item.type}</td>
                           <td className="p-2 text-xs italic">{item.subCategory || 'N/A'}</td>
                           <td className="p-2 font-mono text-xs">{item.size}</td>
                           <td className="p-2 text-center font-bold">{item.qty}</td>
                           <td className="p-2 text-right">
                             <div className="flex justify-end gap-1">
                               <Button variant="ghost" size="icon" onClick={() => startEditItem(i)} className="text-primary h-7 w-7">
                                 <Pencil className="w-4 h-4" />
                               </Button>
                               <Button variant="ghost" size="icon" onClick={() => removeOrderItem(i)} className="text-destructive h-7 w-7">
                                 <Trash2 className="w-4 h-4" />
                               </Button>
                             </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
              )}

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-primary" /> Delivery Date</Label>
                <Input 
                  type="date" 
                  value={formData.deliveryDate} 
                  onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})} 
                />
              </div>
              
              <div className="space-y-2">
                <Label>Special Instructions</Label>
                <Textarea value={formData.additionalDetails} onChange={(e) => setFormData({...formData, additionalDetails: e.target.value})} placeholder="Notes for production..." />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-5 space-y-6">
          <Card className="shadow-sm border-2 border-accent/20">
            <CardHeader><CardTitle className="text-accent flex items-center gap-2 text-lg"><Sparkles className="w-5 h-5" /> AI Design Brief</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Label>Design Keywords</Label>
              <Textarea placeholder="e.g. Modern, Minimalist, Corporate Blue" value={formData.keywords} onChange={(e) => setFormData({...formData, keywords: e.target.value})} />
              <Button onClick={handleGenerateBrief} className="w-full bg-accent" disabled={loadingAI}>
                {loadingAI ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <Sparkles className="mr-2 w-4 h-4" />}
                {loadingAI ? 'Generating...' : 'Get AI Recommendations'}
              </Button>
              {designBrief && (
                <div className="mt-4 p-4 bg-accent/5 rounded-lg text-xs space-y-2 border border-accent/20 animate-in zoom-in-95">
                  <p className="font-bold text-accent uppercase tracking-wider">AI SUGGESTION READY</p>
                  <p><strong>Overview:</strong> {designBrief.overview}</p>
                  <p><strong>Style:</strong> {designBrief.visualStyle}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-primary" /> Reference Files</div>
                <div className="flex gap-1">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={handleFileChange} />
                  <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4" />
                  </Button>
                  <CameraCapture onCapture={handleAddRefFile} />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.referenceImages.length === 0 ? (
                <div className="text-center py-10 bg-muted/20 rounded border-2 border-dashed">
                  <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-20" />
                  <p className="text-xs text-muted-foreground">Attach references or design instructions.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {formData.referenceImages.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded border overflow-hidden group bg-muted flex items-center justify-center">
                      {isImage(url) ? (
                        <img src={url} alt="Ref" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <FileText className="w-6 h-6 text-primary" />
                          <span className="text-[8px] text-center">Document</span>
                        </div>
                      )}
                      <button onClick={() => removeRefFile(i)} className="absolute top-1 right-1 bg-destructive p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
