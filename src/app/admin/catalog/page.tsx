
"use client"

import { useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  PlusCircle, 
  Trash2, 
  Pencil, 
  Package, 
  Image as ImageIcon, 
  Upload, 
  Loader2, 
  Search,
  CheckCircle2,
  X,
  Camera,
  Layers
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, addDoc, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { CameraCapture } from '@/components/CameraCapture';
import Image from 'next/image';

export default function CatalogManager() {
  const db = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    subCategory: '',
    imageUrl: '',
    startingPrice: ''
  });

  const catalogQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'catalog'), orderBy('createdAt', 'desc'));
  }, [db]);

  const categoriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'categories'), orderBy('name', 'asc'));
  }, [db]);

  const { data: items, isLoading: loadingItems } = useCollection(catalogQuery);
  const { data: categories } = useCollection(categoriesQuery);

  const selectedCategoryId = useMemo(() => {
    return categories?.find(c => c.name === formData.category)?.id;
  }, [categories, formData.category]);

  const subQuery = useMemoFirebase(() => {
    if (!db || !selectedCategoryId) return null;
    return query(collection(db, 'categories', selectedCategoryId, 'subcategories'), orderBy('name', 'asc'));
  }, [db, selectedCategoryId]);

  const { data: subCategories, isLoading: loadingSubs } = useCollection(subQuery);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subCategory?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 500) {
        toast({ variant: "destructive", title: "Image too large", description: "Limit is 500KB." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;

    if (!formData.name || !formData.category) {
      toast({ variant: "destructive", title: "Validation Error", description: "Product Name and Category are required." });
      return;
    };

    setLoading(true);
    try {
      const itemData: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || "",
        category: formData.category,
        subCategory: formData.subCategory.trim() || "",
        imageUrl: formData.imageUrl || "",
        startingPrice: formData.startingPrice.trim() || "",
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await setDoc(doc(db, 'catalog', editingId), itemData, { merge: true });
        toast({ title: "Product Updated" });
      } else {
        itemData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'catalog'), itemData);
        toast({ title: "Product Added to Catalog" });
      }

      resetForm();
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error saving product" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      description: item.description || '',
      category: item.category,
      subCategory: item.subCategory || '',
      imageUrl: item.imageUrl || '',
      startingPrice: item.startingPrice || ''
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!db || !confirm("Are you sure?")) return;
    await deleteDoc(doc(db, 'catalog', id));
    toast({ title: "Product Removed" });
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', category: '', subCategory: '', imageUrl: '', startingPrice: '' });
    setEditingId(null);
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold font-headline text-primary">Catalog Manager</h2>
          <p className="text-muted-foreground">Manage products with nested subcategories.</p>
        </div>
        {!isFormOpen && (
          <Button onClick={() => setIsFormOpen(true)} className="gap-2 h-11 px-6 font-bold shadow-md">
            <PlusCircle className="w-5 h-5" /> Add New Product
          </Button>
        )}
      </div>

      {isFormOpen ? (
        <Card className="max-w-4xl mx-auto shadow-xl border-2 animate-in slide-in-from-bottom-4">
          <CardHeader className="border-b bg-muted/5 flex flex-row items-center justify-between">
            <div>
              <CardTitle>{editingId ? 'Edit Product' : 'Add New Catalog Item'}</CardTitle>
              <CardDescription>Select a category to see its sub-category options.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-5 h-5" /></Button>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="pt-6 grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v, subCategory: ''})}>
                      <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                      <SelectContent>
                        {categories?.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sub-category</Label>
                    {subCategories && subCategories.length > 0 ? (
                      <Select value={formData.subCategory} onValueChange={(v) => setFormData({...formData, subCategory: v})}>
                        <SelectTrigger><SelectValue placeholder="Select Sub" /></SelectTrigger>
                        <SelectContent>
                          {subCategories.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input placeholder="e.g. GLOSSY" value={formData.subCategory} onChange={(e) => setFormData({...formData, subCategory: e.target.value})} disabled={loadingSubs} />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Starting Price</Label>
                  <Input value={formData.startingPrice} onChange={(e) => setFormData({...formData, startingPrice: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Short Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="min-h-[120px]" />
                </div>
              </div>
              <div className="space-y-4">
                <Label>Product Showcase Image</Label>
                <div className="aspect-square relative rounded-xl border-4 border-dashed border-primary/20 bg-muted/30 flex flex-col items-center justify-center overflow-hidden group">
                  {formData.imageUrl ? (
                    <>
                      <Image src={formData.imageUrl} alt="Preview" fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button type="button" size="sm" variant="destructive" onClick={() => setFormData({...formData, imageUrl: ''})}>Remove</Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center space-y-4 p-6">
                      <ImageIcon className="w-16 h-16 text-muted-foreground/30 mx-auto" />
                      <div className="flex gap-2 justify-center">
                        <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()} variant="outline"><Upload className="w-4 h-4 mr-1" /> Browse</Button>
                        <CameraCapture onCapture={(img) => setFormData({...formData, imageUrl: img})} />
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/5 flex justify-end gap-3 pt-6">
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              <Button disabled={loading} className="gap-2 px-8 font-bold shadow-lg">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {editingId ? 'Update Item' : 'Publish to Catalog'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      ) : (
        <Card>
          <CardHeader className="border-b bg-muted/5">
            <div className="flex justify-between items-center">
              <CardTitle>Catalog Products</CardTitle>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search catalog..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <Card key={item.id} className="overflow-hidden border-2 hover:border-primary transition-colors">
                  <div className="relative aspect-video bg-muted">
                    {item.imageUrl && <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      <Badge className="text-[10px]">{item.category}</Badge>
                      {item.subCategory && <Badge variant="secondary" className="text-[9px]">{item.subCategory}</Badge>}
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg">{item.name}</h3>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleEdit(item)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
