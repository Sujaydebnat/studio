
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Sparkles, Loader2, ArrowLeft, Save, HelpCircle, Users, ImageIcon, Plus, Trash2 } from 'lucide-react';
import { aiDesignBriefTool, type AIDesignBriefToolOutput } from '@/ai/flows/ai-design-brief-tool-flow';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export default function NewOrderPage() {
  const router = useRouter();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [loadingAI, setLoadingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [designBrief, setDesignBrief] = useState<AIDesignBriefToolOutput | null>(null);
  const [refImageUrl, setRefImageUrl] = useState('');
  
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    workType: '',
    keywords: '',
    priority: 'Normal',
    assignedStaffId: '',
    size: '',
    quantity: '1',
    additionalDetails: '',
    referenceImages: [] as string[]
  });

  const staffQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), where('role', '==', 'staff'));
  }, [db]);

  const { data: staffList } = useCollection(staffQuery);

  const handleAddRefImage = () => {
    if (!refImageUrl.trim()) return;
    setFormData(prev => ({
      ...prev,
      referenceImages: [...prev.referenceImages, refImageUrl]
    }));
    setRefImageUrl('');
  };

  const removeRefImage = (idx: number) => {
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
      toast({
        variant: "destructive",
        title: "AI Generation Failed",
        description: "Could not generate a design brief. Please try again.",
      });
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) {
      toast({ variant: "destructive", title: "Error", description: "Database not initialized." });
      return;
    }
    
    if (!user) {
      toast({ variant: "destructive", title: "Authentication required", description: "You must be logged in to create orders." });
      return;
    };

    if (!formData.customerName || !formData.phone || !formData.workType) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required customer details.",
      });
      return;
    }

    setSaving(true);
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    const orderData = {
      ...formData,
      orderNumber,
      customerPhoneNumber: formData.phone,
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
        toast({
          title: "Order Created",
          description: `Order #${orderNumber} has been added successfully.`,
        });
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

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
        {/* Customer & Core Column */}
        <div className="md:col-span-7 space-y-6">
          <Card className="shadow-sm border-2">
            <CardHeader>
              <CardTitle>Customer & Order Info</CardTitle>
              <CardDescription>Basic requirements and identity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input 
                    id="customerName" 
                    placeholder="Full Name" 
                    required 
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    placeholder="Contact Number" 
                    required 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Work Type</Label>
                  <Select onValueChange={(val) => setFormData({...formData, workType: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Banner">Banner</SelectItem>
                      <SelectItem value="Visiting Card">Visiting Card</SelectItem>
                      <SelectItem value="Poster">Poster</SelectItem>
                      <SelectItem value="Flex Print">Flex Print</SelectItem>
                      <SelectItem value="Logo Design">Logo Design</SelectItem>
                      <SelectItem value="Social Media Graphic">Social Media Graphic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select onValueChange={(val) => setFormData({...formData, priority: val})} defaultValue="Normal">
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
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
                    <SelectTrigger className="border-primary/30">
                      <SelectValue placeholder="Assign To" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList?.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-2">
            <CardHeader>
              <CardTitle>Production Specifics</CardTitle>
              <CardDescription>Size, quantity and specific instructions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Print Size (e.g. 10x12 ft)</Label>
                  <Input 
                    placeholder="Enter Dimensions" 
                    value={formData.size}
                    onChange={(e) => setFormData({...formData, size: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity (Koto Pis)</Label>
                  <Input 
                    type="number"
                    min="1"
                    placeholder="Pieces" 
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Additional Details / Instructions</Label>
                <Textarea 
                  placeholder="Any other specific notes from customer..." 
                  className="min-h-[100px]"
                  value={formData.additionalDetails}
                  onChange={(e) => setFormData({...formData, additionalDetails: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI & Photos Column */}
        <div className="md:col-span-5 space-y-6">
          <Card className="shadow-sm border-2 border-accent/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-accent flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> AI Design Brief
                </CardTitle>
                <CardDescription>Generate a professional brief.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Design Keywords</Label>
                <Textarea 
                  placeholder="Describe style, colors, brand mood..." 
                  className="min-h-[80px]"
                  value={formData.keywords}
                  onChange={(e) => setFormData({...formData, keywords: e.target.value})}
                />
              </div>
              <Button 
                onClick={handleGenerateBrief} 
                type="button"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 gap-2 font-bold"
                disabled={loadingAI}
              >
                {loadingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate AI Brief
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ImageIcon className="w-4 h-4" /> Reference Photos
              </CardTitle>
              <CardDescription>Images provided by customer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Reference Image URL" 
                  value={refImageUrl}
                  onChange={(e) => setRefImageUrl(e.target.value)}
                />
                <Button variant="secondary" size="icon" onClick={handleAddRefImage}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {formData.referenceImages.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded border overflow-hidden group">
                    <Image src={url} alt="Reference" fill className="object-cover" />
                    <button 
                      onClick={() => removeRefImage(i)}
                      className="absolute top-1 right-1 bg-destructive p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {designBrief && (
        <Card className="border-accent/40 bg-accent/5 animate-in fade-in slide-in-from-bottom-4">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span>{designBrief.title}</span>
              <Badge variant="default" className="bg-accent">AI Generated</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            <p><strong>Overview:</strong> {designBrief.overview}</p>
            <p><strong>Visual Style:</strong> {designBrief.visualStyle}</p>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDesignBrief(null)}>Clear</Button>
            <Button size="sm" className="bg-accent text-accent-foreground">Keep Brief</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
