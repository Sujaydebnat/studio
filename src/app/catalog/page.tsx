
"use client"

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Search, Printer, Package, Info, ArrowLeft, Layers, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import Image from 'next/image';

export default function PublicCatalog() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const catalogQuery = useMemoFirebase(() => db ? query(collection(db, 'catalog'), orderBy('createdAt', 'desc')) : null, [db]);
  const categoriesQuery = useMemoFirebase(() => db ? query(collection(db, 'categories'), orderBy('name', 'asc')) : null, [db]);

  const { data: items, isLoading: loading } = useCollection(catalogQuery);
  const { data: categoriesData } = useCollection(categoriesQuery);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, selectedCategory]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-white py-12 px-4 shadow-lg">
        <div className="max-w-6xl mx-auto space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4"><ArrowLeft className="w-4 h-4" /> Back to Home</Link>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md"><Printer className="w-10 h-10 text-white" /></div>
            <div><h1 className="text-4xl font-extrabold font-headline">Product Catalog</h1><p className="text-white/80">Premium Printing Solutions</p></div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 -mt-8">
        <Card className="shadow-xl border-2">
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search products..." className="pl-10 h-12" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant={selectedCategory === 'ALL' ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory('ALL')}>ALL</Button>
                {categoriesData?.map(c => (
                  <Button key={c.id} variant={selectedCategory === c.name ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(c.name)}>{c.name}</Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {filteredItems.map(item => (
              <Card key={item.id} className="overflow-hidden group hover:shadow-2xl transition-all border-2">
                <div className="relative aspect-square bg-muted">
                  {item.imageUrl && <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <Badge className="bg-primary">{item.category}</Badge>
                    {item.subCategory && <Badge variant="secondary" className="bg-white/90 text-primary">{item.subCategory}</Badge>}
                  </div>
                </div>
                <CardHeader><CardTitle>{item.name}</CardTitle></CardHeader>
                <CardFooter className="border-t bg-muted/5 flex justify-between items-center p-4">
                  <div className="font-extrabold">{item.startingPrice ? `Starts BDT ${item.startingPrice}` : "Contact Us"}</div>
                  <Link href="/track"><Button size="sm" variant="ghost">Details</Button></Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
