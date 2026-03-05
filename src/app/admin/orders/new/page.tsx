"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Sparkles, Loader2, ArrowLeft, Save, HelpCircle } from 'lucide-react';
import { aiDesignBriefTool, type AIDesignBriefToolOutput } from '@/ai/flows/ai-design-brief-tool-flow';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function NewOrderPage() {
  const router = useRouter();
  const [loadingAI, setLoadingAI] = useState(false);
  const [designBrief, setDesignBrief] = useState<AIDesignBriefToolOutput | null>(null);
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    workType: '',
    keywords: '',
  });

  const handleGenerateBrief = async () => {
    if (!formData.workType || !formData.keywords) {
      alert("Please select a work type and enter some keywords first!");
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
    // In a real app, save to Firestore here
    router.push('/admin/orders');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-3xl font-bold font-headline">New Work Order</h2>
        </div>
        <Button onClick={handleSubmit} className="bg-primary gap-2">
          <Save className="w-4 h-4" /> Save Order
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-sm border-2">
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
            <CardDescription>Basic information for order contact and billing.</CardDescription>
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
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">Enter keywords like "modern", "minimal", "bakery brand" to help the AI craft a better brief.</p>
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
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
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
              <Badge className="bg-accent">AI Generated</Badge>
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
            
            {designBrief.notes && (
              <div className="p-4 bg-white/50 rounded-lg border border-accent/10">
                <h4 className="font-bold text-sm uppercase text-muted-foreground mb-1">AI Notes</h4>
                <p className="text-sm text-muted-foreground">{designBrief.notes}</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-accent/10 py-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDesignBrief(null)}>Clear Brief</Button>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">Keep Brief</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

function Badge({ children, variant, className }: any) {
  const styles = {
    default: "bg-primary text-white",
    secondary: "bg-secondary text-secondary-foreground",
    accent: "bg-accent text-accent-foreground",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${className} ${styles[variant as keyof typeof styles] || styles.default}`}>
      {children}
    </span>
  );
}