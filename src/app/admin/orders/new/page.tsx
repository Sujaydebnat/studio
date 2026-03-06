
"use client"

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Sparkles, Loader2, ArrowLeft, Save, HelpCircle, Users, ImageIcon, Plus, Trash2, Camera, Upload, FileText } from 'lucide-react';
import { aiDesignBriefTool, type AIDesignBriefToolOutput } from '@/ai/flows/ai-design-brief-tool-flow';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { CameraCapture } from '@/components/CameraCapture';

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
    customerName: '',
    phone: '',
    workType: '',
    keywords: '',
    priority: 'Normal',
    assignedStaffId: '',
    width: '',
    height: '',
    quantity: '1',
    additionalDetails: '',
    referenceImages: [] as string[]
  });

  const staffQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), where('role', '==', 'staff'));
  }, [db]);

  const { data: staffList } = useCollection(staffQuery);

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
    if (!formData.workType || !formData.keywords) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select a work type and enter some keywords first!",
      });
      return;
    }
    
    setLoadingAI(true);
    try {
      const brief = await aiDesignBriefTool({
        projectType: formData.workType,
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

    if (!formData.customerName || !formData.phone || !formData.workType) {
      toast({ variant: "destructive", title: "Missing Details" });
      return;
    }

    setSaving(true);
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    const orderData = {
      ...formData,
      orderNumber,
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
              <CardTitle>Customer & Order Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input value={formData.customerName} onChange={(e) => setFormData({...formData, customerName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Work Type</Label>
                  <Select onValueChange={(val) => setFormData({...formData, workType: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Banner">Banner</SelectItem>
                      <SelectItem value="Visiting Card">Visiting Card</SelectItem>
                      <SelectItem value="Poster">Poster</SelectItem>
                      <SelectItem value="Flex Print">Flex Print</SelectItem>
                      <SelectItem value="Logo Design">Logo Design</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                    <SelectTrigger><SelectValue placeholder="Assign" /></SelectTrigger>
                    <SelectContent>
                      {staffList?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-2">
            <CardHeader><CardTitle>Production Specs</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Print Size (Width x Height)</Label>
                  <div className="flex items-center gap-2">
                    <Input placeholder="W" value={formData.width} onChange={(e) => setFormData({...formData, width: e.target.value})} />
                    <span className="text-muted-foreground font-bold">×</span>
                    <Input placeholder="H" value={formData.height} onChange={(e) => setFormData({...formData, height: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Quantity (Pis)</Label>
                  <Input type="number" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Additional Details</Label>
                <Textarea value={formData.additionalDetails} onChange={(e) => setFormData({...formData, additionalDetails: e.target.value})} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-5 space-y-6">
          <Card className="shadow-sm border-2 border-accent/20">
            <CardHeader><CardTitle className="text-accent flex items-center gap-2"><Sparkles className="w-5 h-5" /> AI Design Brief</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Textarea placeholder="Keywords..." value={formData.keywords} onChange={(e) => setFormData({...formData, keywords: e.target.value})} />
              <Button onClick={handleGenerateBrief} className="w-full bg-accent" disabled={loadingAI}>
                {loadingAI ? <Loader2 className="animate-spin" /> : 'Generate AI Brief'}
              </Button>
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
                    <button onClick={() => removeRefFile(i)} className="absolute top-1 right-1 bg-destructive p-1 rounded-full text-white opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
