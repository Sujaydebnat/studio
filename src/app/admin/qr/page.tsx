
"use client"

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Download, Printer, QrCode, Share2, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function QrCatalogPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const userRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [db, user]);
  const { data: userData } = useDoc(userRef);

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/shop/${userData?.shopId}` : '';

  const downloadQr = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 100;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        ctx.fillStyle = 'black';
        ctx.font = 'bold 20px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(userData?.shopName || 'Shop Catalog', canvas.width / 2, canvas.height - 40);
        ctx.font = '14px Inter';
        ctx.fillText('Scan to view catalog', canvas.width / 2, canvas.height - 15);
        
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${userData?.shopName || 'shop'}-qr-catalog.png`;
        link.href = url;
        link.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast({ title: "Link Copied!", description: "Public catalog URL is now on your clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold font-headline text-primary flex items-center gap-3">
            <QrCode className="w-8 h-8" />
            QR Catalog Manager
          </h2>
          <p className="text-muted-foreground">Generate and share your digital shop catalog QR code.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <Card className="shadow-xl border-2 overflow-hidden">
          <CardHeader className="bg-primary text-white">
            <CardTitle>Catalog QR Code</CardTitle>
            <CardDescription className="text-white/70">Print this and display it at your shop counter.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-12 space-y-8">
            <div ref={qrRef} className="p-6 bg-white rounded-3xl shadow-2xl border-8 border-muted">
              <QRCodeSVG 
                value={publicUrl} 
                size={250} 
                level="H" 
                includeMargin={true}
              />
            </div>
            <div className="w-full space-y-4">
              <Button onClick={downloadQr} className="w-full h-12 gap-2 font-bold shadow-lg">
                <Download className="w-5 h-5" /> Download QR Image
              </Button>
              <Button variant="outline" className="w-full h-12 gap-2 font-bold" onClick={() => window.print()}>
                <Printer className="w-5 h-5" /> Print Catalog Stand
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl border-2">
          <CardHeader>
            <CardTitle>Sharing Options</CardTitle>
            <CardDescription>Direct links and social sharing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Share2 className="w-4 h-4" /> Public URL
              </p>
              <div className="flex gap-2 p-2 bg-muted rounded-xl border-2">
                <code className="flex-1 p-2 text-xs break-all overflow-hidden">{publicUrl}</code>
                <Button size="icon" variant="ghost" onClick={copyLink}>
                  {copied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-4">
              <h4 className="font-bold text-primary">Why use QR Catalog?</h4>
              <ul className="text-sm space-y-2 text-muted-foreground list-disc pl-4">
                <li>Contactless browsing for walk-in customers.</li>
                <li>Reduces printing costs for physical brochures.</li>
                <li>Always up-to-date with your latest products.</li>
                <li>Track customer interest directly from orders.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
