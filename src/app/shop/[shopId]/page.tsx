
"use client"

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Printer, Package, Info, ArrowLeft, Layers, Loader2, Store } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, where, doc } from 'firebase/firestore';
import Image from 'next/image';

export default function ShopPublicCatalog() {
  const { shopId } = useParams();
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const shopRef = useMemoFirebase(() => shopId && db ? doc(db, 'shops', shopId as string) : null, [db, shopId]);
  const { data: shopData, isLoading: loadingShop } = useDoc(shopRef);

  const catalogQuery = useMemoFirebase(() => {
    if (!db || !shopId) return null;
    return query(
      collection(db, 'catalog'), 
      where('shopId', '==', shopId),
      orderBy('createdAt', 'desc')
    );
  }, [db, shopId]);

  const categoriesQuery = useMemoFirebase(() => {
    if (!db || !shopId) return null;
    return query(
      collection(db, 'categories'), 
      where('shopId', '==', shopId),
      orderBy('name', 'asc')
    );
  }, [db, shopId]);

  const { data: items, isLoading: loadingCatalog } = useCollection(catalogQuery);
  const { data: categoriesData } = useCollection(categoriesQuery);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, selectedCategory]);

  if (loadingShop) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-white py-16 px-4 shadow-xl">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8">
          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-lg border border-white/20">
            {shopData?.logo ? (
              <Image src={shopData.logo} alt={shopData.shopName} width={120} height={120} className="rounded-xl" />
            ) : (
              <Store className="w-20 h-20 text-white" />
            )}
          </div>
          <div className="text-center md:text-left space-y-2">
            <h1 className="text-5xl font-extrabold font-headline">{shopData?.shopName || 'Shop Catalog'}</h1>
            <p className="text-white/80 max-w-xl">{shopData?.description || 'Browse our premium printing and design services.'}</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 -mt-10">
        <Card className="shadow-2xl border-2 overflow-hidden">
          <CardContent className="p-6 space-y-6 bg-card/50 backdrop-blur-md">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  placeholder="Search products..." 
                  className="pl-12 h-14 text-lg rounded-xl shadow-inner border-2 focus-visible:ring-primary" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button 
                  variant={selectedCategory === 'ALL' ? "default" : "outline"} 
                  className="rounded-full px-6"
                  onClick={() => setSelectedCategory('ALL')}
                >
                  ALL
                </Button>
                {categoriesData?.map(c => (
                  <Button 
                    key={c.id} 
                    variant={selectedCategory === c.name ? "default" : "outline"} 
                    className="rounded-full px-6"
                    onClick={() => setSelectedCategory(c.name)}
                  >
                    {c.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {loadingCatalog ? (
          <div className="flex justify-center py-24"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {filteredItems.map(item => (
              <Card key={item.id} className="overflow-hidden group hover:shadow-2xl transition-all border-2 flex flex-col h-full">
                <div className="relative aspect-square bg-muted">
                  {item.imageUrl && <Image src={item.imageUrl} alt={item.name} fill className="object-cover transition-transform group-hover:scale-105" />}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <Badge className="bg-primary/90 backdrop-blur-sm shadow-lg">{item.category}</Badge>
                    {item.subCategory && <Badge variant="secondary" className="bg-white/90 text-primary shadow-sm font-bold">{item.subCategory}</Badge>}
                  </div>
                </div>
                <CardHeader className="flex-1">
                  <CardTitle className="text-xl font-black">{item.name}</CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{item.description}</p>
                </CardHeader>
                <CardFooter className="border-t bg-muted/5 flex justify-between items-center p-6">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Price starts at</p>
                    <div className="text-2xl font-black text-primary">{item.startingPrice ? `BDT ${item.startingPrice}` : "Quote Only"}</div>
                  </div>
                  <Link href={`/track?shopId=${shopId}`}>
                    <Button variant="outline" className="rounded-full font-bold">Track Order</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 space-y-4">
            <Package className="w-20 h-20 text-muted-foreground/20 mx-auto" />
            <h3 className="text-2xl font-bold text-muted-foreground">No matching products found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>

      <footer className="mt-20 border-t py-12 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-primary font-bold">
            <Store className="w-5 h-5" />
            <span>{shopData?.shopName}</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} PrintFlow Multi-Tenant System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
