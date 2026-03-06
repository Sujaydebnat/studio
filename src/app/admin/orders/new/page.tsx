
"use client"

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Loader2, ArrowLeft, Save, ImageIcon, Upload, FileText, Ruler, Calendar as CalendarIcon, Hash, Banknote, Mail } from 'lucide-react';
import { aiDesignBriefTool, type AIDesignBriefToolOutput } from '@/ai/flows/ai-design-brief-tool-flow';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { CameraCapture } from '@/components/CameraCapture';

const WORK_TYPES = [
  "GIFT", "FLEX", "DIGITAL PAPER", "PHOTOPAPER", "GUM PAPER", 
  "LOGO", "PLATE", "REDIEM", "VINAIL", "DTF", "UV"
];

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
    subWorkType: '',
    keywords: '',
    priority: 'Normal',
    assignedStaffId: '',
    width: '',
    height: '',
    unit: 'Inches',
    quantity: '1',
    totalBill: '',
    deliveryDate: '',
    additionalDetails: '',
    referenceImages: [] as string[]
  });

  const staffQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), where('role', '==', 'staff'));
  }, [db]);

  const { data: staffList } = useCollection(staffQuery);

  const toggleWorkType = (type: string) => {
    setFormData(prev => {
      const isSelected = prev.workTypes.includes(type);
      const newWorkTypes = isSelected 
        ? prev.workTypes.filter(t => t !== type)
        : [...prev.workTypes, type];
      
      return { ...prev, workTypes: newWorkTypes };
    });
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
        projectType: formData.workTypes.join(", ") + (formData.subWorkType ? ` (${formData.subWorkType})` : ''),
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
      toast({ variant: "destructive", title: "Missing Details", description: "Bill Number, Customer name, phone, and at least one work type are required." });
      return;
    }

    setSaving(true);
    const orderData = {
      ...formData,
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

  const handlePhotoPaperSizeSelect = (val: string) => {
    if (val === '12x18') {
      setFormData({ ...formData, width: '12', height: '18', unit: 'Inches' });
    } else if (val === '12x8') {
      setFormData({ ...formData, width: '12', height: '8', unit: 'Inches' });
    }
  };

  const isImage = (url: string) => url.startsWith('data:image/') || url.match(/\.(jpeg|jpg|gif|png)$/) != null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
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
              <CardTitle className="flex items-center gap-2"><Hash className="w-5 h-5 text-primary" /> Bill & Customer Info</CardTitle>
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
                <Label className="text-primary font-bold">Select Work Types (Can select multiple)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/30 p-4 rounded-lg border">
                  {WORK_TYPES.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`type-${type}`} 
                        checked={formData.workTypes.includes(type)}
                        onCheckedChange={() => toggleWorkType(type)}
                      />
                      <label 
                        htmlFor={`type-${type}`}
                        className="text-xs font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {formData.workTypes.includes('DIGITAL PAPER') && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label>Digital Paper Sub-Type</Label>
                    <Select onValueChange={(val) => setFormData({...formData, subWorkType: val})}>
                      <SelectTrigger><SelectValue placeholder="Select Sub Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VISITING CARD">VISITING CARD</SelectItem>
                        <SelectItem value="TABLE MENU CARD">TABLE MENU CARD</SelectItem>
                        <SelectItem value="HAND MENU CARD">HAND MENU CARD</SelectItem>
                        <SelectItem value="PVC CARD">PVC CARD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.workTypes.includes('PHOTOPAPER') && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label>Photopaper Size</Label>
                    <Select onValueChange={handlePhotoPaperSizeSelect}>
                      <SelectTrigger><SelectValue placeholder="Select Photo Size" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12x18">12 × 18 Inches</SelectItem>
                        <SelectItem value="12x8">12 × 8 Inches</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
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

          <Card className="shadow-sm border-2">
            <CardHeader><CardTitle className="flex items-center gap-2"><Ruler className="w-5 h-5 text-primary" /> Production Specs</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Print Size (W × H)</Label>
                  <div className="flex items-center gap-2">
                    <Input placeholder="W" value={formData.width} onChange={(e) => setFormData({...formData, width: e.target.value})} />
                    <span className="text-muted-foreground font-bold">×</span>
                    <Input placeholder="H" value={formData.height} onChange={(e) => setFormData({...formData, height: e.target.value})} />
                    <Select value={formData.unit} onValueChange={(val) => setFormData({...formData, unit: val})}>
                      <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inches">Inches</SelectItem>
                        <SelectItem value="mm">mm</SelectItem>
                        <SelectItem value="cm">cm</SelectItem>
                        <SelectItem value="ft">ft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Quantity (Pis)</Label>
                  <Input type="number" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-primary" /> Delivery Date</Label>
                  <Input 
                    type="date" 
                    value={formData.deliveryDate} 
                    onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Additional Details / Instructions</Label>
                <Textarea value={formData.additionalDetails} onChange={(e) => setFormData({...formData, additionalDetails: e.target.value})} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-5 space-y-6">
          <Card className="shadow-sm border-2 border-accent/20">
            <CardHeader><CardTitle className="text-accent flex items-center gap-2"><Sparkles className="w-5 h-5" /> AI Design Brief</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Label>Design Keywords</Label>
              <Textarea placeholder="Modern, colorful, clean, etc." value={formData.keywords} onChange={(e) => setFormData({...formData, keywords: e.target.value})} />
              <Button onClick={handleGenerateBrief} className="w-full bg-accent" disabled={loadingAI}>
                {loadingAI ? <Loader2 className="animate-spin" /> : 'Generate AI Brief'}
              </Button>
              {designBrief && (
                <div className="mt-4 p-4 bg-accent/5 rounded-lg text-xs space-y-2 border border-accent/20 animate-in zoom-in-95">
                  <p className="font-bold text-accent">AI SUGGESTION READY</p>
                  <p><strong>Style:</strong> {designBrief.visualStyle}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Files & Photos</div>
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
                <div className="text-center py-8 bg-muted/20 rounded border-2 border-dashed">
                  <p className="text-xs text-muted-foreground">No reference files added.</p>
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
                      <button 
                        onClick={() => removeRefFile(i)} 
                        className="absolute top-1 right-1 bg-destructive p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FileText className="w-3 h-3" />
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
