
"use client"

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Search, Printer, Package, Info, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import Image from 'next/image';

const CATEGORIES = ["ALL", "GIFT", "FLEX", "DIGITAL PAPER", "PHOTOPAPER", "LOGO", "VISITING CARD", "UV"];

export default function PublicCatalog() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const catalogQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'catalog'), orderBy('createdAt', 'desc'));
  }, [db]);

  const { data: items, isLoading: loading } = useCollection(catalogQuery);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, selectedCategory]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-white py-12 px-4 shadow-lg">
        <div className="max-w-6xl mx-auto space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md">
              <Printer className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold font-headline">Product Catalog</h1>
              <p className="text-white/80">Explore our high-quality printing and gift solutions.</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 -mt-8">
        <Card className="shadow-xl border-2">
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search products..." 
                  className="pl-10 h-12"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <Button 
                    key={cat} 
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className="h-10 text-xs font-bold"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground animate-pulse">Loading amazing products...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <Card key={item.id} className="overflow-hidden group hover:shadow-2xl transition-all border-2">
                  <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {item.imageUrl ? (
                      <Image 
                        src={item.imageUrl} 
                        alt={item.name} 
                        fill 
                        className="object-cover group-hover:scale-110 transition-transform duration-500" 
                      />
                    ) : (
                      <Package className="w-20 h-20 text-muted-foreground/20" />
                    )}
                    <Badge className="absolute top-4 left-4 bg-primary/90 backdrop-blur-sm text-[10px] font-bold">
                      {item.category}
                    </Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">{item.name}</CardTitle>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description || "High-quality custom printing solution for your needs."}
                    </p>
                  </CardHeader>
                  <CardFooter className="border-t bg-muted/5 p-4 flex justify-between items-center">
                    <div className="text-primary font-extrabold">
                      {item.startingPrice ? `Starts at BDT ${item.startingPrice}` : "Contact for Price"}
                    </div>
                    <Link href="/track">
                      <Button size="sm" variant="ghost" className="gap-2 text-xs font-bold">
                        <Info className="w-4 h-4" /> Details
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-20 space-y-4">
                <Package className="w-16 h-16 text-muted-foreground/20 mx-auto" />
                <h3 className="text-2xl font-bold text-muted-foreground">No products found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
                <Button variant="outline" onClick={() => { setSearchTerm(''); setSelectedCategory('ALL'); }}>
                  Reset Filters
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="max-w-6xl mx-auto px-4 mt-20 text-center text-muted-foreground">
        <Separator className="mb-8" />
        <p className="text-sm">© 2024 PrintFlow Manage System. All rights reserved.</p>
        <p className="text-xs mt-2">Professional Grade Printing & Design Solutions</p>
      </footer>
    </div>
  );
}
