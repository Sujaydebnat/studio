
"use client"

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Trash2, 
  Settings, 
  Layers, 
  Loader2, 
  CheckCircle2, 
  X, 
  ListOrdered,
  Pencil,
  ArrowRight,
  LayoutGrid,
  Database,
  Save,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy, addDoc, updateDoc, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

/**
 * Component to manage subcategories for a specific category
 */
function SubcategoryManager({ categoryId }: { categoryId: string }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const subQuery = useMemoFirebase(() => {
    if (!db || !categoryId) return null;
    return query(collection(db, 'categories', categoryId, 'subcategories'), orderBy('name', 'asc'));
  }, [db, categoryId]);

  const { data: subs, isLoading } = useCollection(subQuery);

  const handleAddOrUpdate = async () => {
    if (!db || !newName.trim()) return;
    setLoading(true);
    const subName = newName.trim().toUpperCase();
    const subColRef = collection(db, 'categories', categoryId, 'subcategories');

    try {
      if (editingId) {
        await updateDoc(doc(db, 'categories', categoryId, 'subcategories', editingId), {
          name: subName,
          updatedAt: serverTimestamp()
        });
        toast({ title: "Subcategory Updated" });
      } else {
        await addDoc(subColRef, {
          name: subName,
          createdAt: serverTimestamp()
        });
        toast({ title: "Subcategory Added" });
      }
      setNewName('');
      setEditingId(null);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error saving subcategory" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (subId: string) => {
    if (!db || !confirm("Delete this subcategory?")) return;
    await deleteDoc(doc(db, 'categories', categoryId, 'subcategories', subId));
    toast({ title: "Subcategory Removed" });
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      <Label className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
        <ListOrdered className="w-3.5 h-3.5" /> 
        Subcategories List
      </Label>
      
      <div className="flex gap-2">
        <Input 
          placeholder="New Subcategory (e.g. VISITING CARD)" 
          value={newName} 
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOrUpdate())}
          className="h-9 text-xs"
        />
        <Button size="sm" onClick={handleAddOrUpdate} disabled={loading} variant="outline" className="border-primary text-primary h-9">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : editingId ? 'Update' : <Plus className="w-4 h-4" />}
        </Button>
      </div>

      <div className="grid gap-2 min-h-[50px]">
        {isLoading ? (
          <div className="flex justify-center p-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : subs?.length === 0 ? (
          <p className="text-[10px] text-muted-foreground italic text-center py-2">No subcategories yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subs?.map((sub) => (
              <Badge key={sub.id} className="gap-2 pr-1 pl-3 py-1 h-fit bg-secondary text-secondary-foreground border shadow-sm group">
                <span className="font-bold text-[10px]">{sub.name}</span>
                <div className="flex gap-0.5">
                  <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-primary hover:text-white" onClick={() => {setNewName(sub.name); setEditingId(sub.id)}}>
                    <Pencil className="w-2.5 h-2.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-destructive hover:text-white" onClick={() => handleDelete(sub.id)}>
                    <Trash2 className="w-2.5 h-2.5" />
                  </Button>
                </div>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const userRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [db, user]);
  const { data: userData } = useDoc(userRef);

  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');

  const categoriesQuery = useMemoFirebase(() => {
    if (!db || !userData?.shopId) return null;
    return query(
      collection(db, 'categories'), 
      where('shopId', '==', userData.shopId),
      orderBy('name', 'asc')
    );
  }, [db, userData?.shopId]);

  const { data: categories, isLoading: loadingCats } = useCollection(categoriesQuery);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !userData?.shopId) return;
    
    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      toast({ variant: "destructive", title: "Validation Error", description: "Category Name is required." });
      return;
    }

    setLoading(true);
    const targetId = editingId || doc(collection(db, 'categories')).id;
    const catData: any = {
      id: targetId,
      shopId: userData.shopId,
      name: trimmedName.toUpperCase(),
      description: categoryDesc.trim() || "",
      updatedAt: serverTimestamp()
    };

    if (!editingId) catData.createdAt = serverTimestamp();

    const docRef = doc(db, 'categories', targetId);

    try {
      await setDoc(docRef, catData, { merge: true });
      toast({ title: "Data saved successfully", description: "Category information has been updated." });
      resetForm();
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Error saving category" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cat: any) => {
    setEditingId(cat.id);
    setCategoryName(cat.name);
    setCategoryDesc(cat.description || '');
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!db || !confirm(`Delete "${name}" category? Subcategories will also be inaccessible.`)) return;
    await deleteDoc(doc(db, 'categories', id));
    toast({ title: "Category Removed" });
  };

  const resetForm = () => {
    setCategoryName('');
    setCategoryDesc('');
    setEditingId(null);
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold font-headline text-primary flex items-center gap-2">
            <LayoutGrid className="w-8 h-8" />
            Shop Configuration
          </h2>
          <p className="text-muted-foreground text-sm">Manage your shop's dynamic work categories and options.</p>
        </div>
        {!isFormOpen && (
          <Button onClick={() => setIsFormOpen(true)} className="gap-2 h-11 px-6 font-bold shadow-lg">
            <Plus className="w-5 h-5" /> Add New Category
          </Button>
        )}
      </div>

      {isFormOpen ? (
        <Card className="max-w-2xl mx-auto shadow-2xl border-2 animate-in slide-in-from-bottom-4">
          <CardHeader className="border-b bg-muted/5 flex flex-row items-center justify-between">
            <div>
              <CardTitle>{editingId ? 'Edit Category' : 'Create New Category'}</CardTitle>
              <CardDescription>Configure basic category details for your shop.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-5 h-5" /></Button>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="catName">Category Name</Label>
                <Input 
                  id="catName"
                  required 
                  placeholder="e.g. DIGITAL PAPER, FLEX, UV" 
                  value={categoryName} 
                  onChange={(e) => setCategoryName(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="catDesc">Description (Optional)</Label>
                <Textarea 
                  id="catDesc"
                  placeholder="Workflow notes..." 
                  value={categoryDesc} 
                  onChange={(e) => setCategoryDesc(e.target.value)} 
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/5 flex justify-end gap-3 pt-6">
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              <Button disabled={loading || !categoryName.trim()} className="gap-2 px-10 font-bold shadow-xl bg-primary">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save to Database
              </Button>
            </CardFooter>
          </form>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingCats ? (
            <div className="col-span-full flex flex-col items-center justify-center p-20 gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground font-medium animate-pulse">Loading shop data...</p>
            </div>
          ) : categories?.length === 0 ? (
            <div className="col-span-full text-center py-24 border-4 border-dashed rounded-3xl space-y-4 bg-muted/10">
              <Settings className="w-16 h-16 mx-auto opacity-20" />
              <h3 className="text-2xl font-bold text-muted-foreground">No Categories Found</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">Start by adding your first business category.</p>
              <Button onClick={() => setIsFormOpen(true)} className="mt-4">Add Category Now</Button>
            </div>
          ) : (
            categories?.map((cat) => (
              <Card key={cat.id} className="group hover:border-primary/50 transition-all border-2 shadow-sm flex flex-col h-full">
                <CardHeader className="pb-3 bg-muted/5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-black text-primary flex items-center gap-2">
                        <Layers className="w-5 h-5" />
                        {cat.name}
                      </CardTitle>
                      {cat.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{cat.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => handleEdit(cat)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(cat.id, cat.name)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pt-4 space-y-4">
                  <Collapsible 
                    open={expandedId === cat.id} 
                    onOpenChange={(isOpen) => setExpandedId(isOpen ? cat.id : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between h-8 text-[10px] font-bold uppercase tracking-widest hover:bg-primary/5">
                        Manage Subcategories
                        {expandedId === cat.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="animate-in slide-in-from-top-2">
                      <SubcategoryManager categoryId={cat.id} />
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
