
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Sparkles, Loader2, ArrowLeft, Save, HelpCircle, Users } from 'lucide-react';
import { aiDesignBriefTool, type AIDesignBriefToolOutput } from '@/ai/flows/ai-design-brief-tool-flow';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Badge } from '@/components/ui/badge';

export default function NewOrderPage() {
  const router = useRouter();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
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
  });

  // Fetch only Staff members for assignment
  const staffQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), where('role', '==', 'staff'));
  }, [db]);

  const { data: staffList } = useCollection(staffQuery);

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
    <div className="max-w-4xl mx-auto space-y-6">
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

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-sm border-2">
          <CardHeader>
            <CardTitle>Customer & Assignment</CardTitle>
            <CardDescription>Order details and staff responsibility.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Work Type</Label>
                <Select onValueChange={(val) => setFormData({...formData, workType: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
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
            </div>
            <div className="space-y-2 pt-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Assign to Staff
              </Label>
              <Select onValueChange={(val) => setFormData({...formData, assignedStaffId: val})}>
                <SelectTrigger className="border-primary/30">
                  <SelectValue placeholder="Select Staff Member" />
                </SelectTrigger>
                <SelectContent>
                  {staffList?.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                  ))}
                  {(!staffList || staffList.length === 0) && (
                    <SelectItem value="unassigned" disabled>No Staff Authorized Yet</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Assigned staff will see this in their workbench.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-2 border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-accent flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> AI Design Brief
              </CardTitle>
              <CardDescription>Generate a professional brief using AI.</CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs text-center">Enter keywords like "modern", "minimal", "bakery brand" to help the AI craft a better brief.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Design Keywords</Label>
              <Textarea 
                placeholder="Describe style, colors, brand mood..." 
                className="min-h-[100px]"
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
              {loadingAI ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing Project...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate AI Brief
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {designBrief && (
        <Card className="border-accent/40 bg-accent/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{designBrief.title}</span>
              <Badge variant="default" className="bg-accent">AI Generated</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-bold text-sm uppercase text-muted-foreground">Overview</h4>
                <p className="text-sm">{designBrief.overview}</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-sm uppercase text-muted-foreground">Target Audience</h4>
                <p className="text-sm">{designBrief.targetAudience}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-sm uppercase text-muted-foreground">Key Messages</h4>
              <ul className="list-disc pl-5 text-sm grid md:grid-cols-2 gap-x-8">
                {designBrief.keyMessages.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-bold text-sm uppercase text-muted-foreground">Visual Style</h4>
                <p className="text-sm italic">{designBrief.visualStyle}</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-sm uppercase text-muted-foreground">Deliverables</h4>
                <div className="flex flex-wrap gap-2">
                  {designBrief.deliverables.map((d, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{d}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-accent/10 py-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDesignBrief(null)}>Clear Brief</Button>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => toast({ title: "Brief Saved to Order" })}>Keep Brief</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
