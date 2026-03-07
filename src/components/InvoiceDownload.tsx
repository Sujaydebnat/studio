
"use client"

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

interface InvoiceDownloadProps {
  order: any;
  shop: any;
}

export function InvoiceDownload({ order, shop }: InvoiceDownloadProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const downloadPDF = async () => {
    if (!invoiceRef.current) return;
    setIsGenerating(true);

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${order.billNumber || order.id.slice(0, 8)}.pdf`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button onClick={downloadPDF} disabled={isGenerating} className="gap-2 bg-primary font-bold shadow-lg">
        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        Download Invoice
      </Button>

      {/* Hidden Invoice Template for PDF Generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={invoiceRef} className="bg-white p-12 w-[210mm] text-slate-800">
          <div className="flex justify-between items-start border-b-8 border-slate-900 pb-8 mb-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-black uppercase text-slate-900 tracking-tighter">{shop?.shopName || 'PRINT SHOP'}</h1>
              <p className="text-sm font-bold opacity-60">OFFICIAL WORK INVOICE</p>
            </div>
            <div className="text-right space-y-1">
              <p className="font-black text-xl">INV #{order.billNumber || order.id.slice(0, 8)}</p>
              <p className="text-xs font-bold uppercase">{format(new Date(order.createdAt?.seconds * 1000 || Date.now()), 'PPP')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-12">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Billed To</p>
              <p className="text-xl font-black">{order.customerName}</p>
              <p className="text-sm font-bold">{order.phone}</p>
              <p className="text-sm font-bold opacity-70">{order.customerEmail}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Payment Status</p>
              <p className="text-xl font-black text-slate-900 uppercase">{order.status === 'Completed' ? 'PAID' : 'DUE'}</p>
              <p className="text-xs font-bold">Delivery: {order.deliveryDate || 'TBD'}</p>
            </div>
          </div>

          <table className="w-full mb-12">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-widest">
                <th className="p-4 text-left">Description</th>
                <th className="p-4 text-center">Size</th>
                <th className="p-4 text-center">Qty</th>
                <th className="p-4 text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(order.orderItems || []).map((item: any, i: number) => (
                <tr key={i}>
                  <td className="p-4">
                    <p className="font-black">{item.type}</p>
                    <p className="text-xs opacity-60 uppercase">{item.subCategory}</p>
                  </td>
                  <td className="p-4 text-center font-bold text-sm">{item.size}</td>
                  <td className="p-4 text-center font-black">{item.qty}</td>
                  <td className="p-4 text-right font-bold">---</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end pt-8 border-t-2 border-slate-900">
            <div className="w-1/3 space-y-4">
              <div className="flex justify-between text-sm font-bold opacity-60">
                <span>Subtotal</span>
                <span>BDT {order.totalBill || '0'}</span>
              </div>
              <div className="flex justify-between text-2xl font-black text-slate-900 border-t pt-4">
                <span>TOTAL</span>
                <span>BDT {order.totalBill || '0'}</span>
              </div>
            </div>
          </div>

          <div className="mt-32 pt-8 border-t text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest">
            This is a computer generated invoice powered by PrintFlow Manage.
          </div>
        </div>
      </div>
    </>
  );
}
