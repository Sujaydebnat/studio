
"use client"

import { useState } from 'react';
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
  Database
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Category Fields
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [subCategories, setSubCategories] = useState<string[]>([]);
  
  // Subcategory management state
  const [newSubName, setNewSubName] = useState('');
  const [editingSubIdx, setEditingSubIdx] = useState<number | null>(null);

  const categoriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'categories'), orderBy('name', 'asc'));
  }, [db]);

  const { data: categories, isLoading: loadingCats } = useCollection(categoriesQuery);

  const handleAddOrUpdateSub = () => {
    if (!newSubName.trim()) return;
    const formattedSub = newSubName.trim().toUpperCase();
    
    if (editingSubIdx !== null) {
      const updated = [...subCategories];
      updated[editingSubIdx] = formattedSub;
      setSubCategories(updated);
      setEditingSubIdx(null);
    } else {
      if (subCategories.includes(formattedSub)) {
        toast({ variant: "destructive", title: "Sub-category already exists" });
        return;
      }
      setSubCategories([...subCategories, formattedSub]);
    }
    setNewSubName('');
  };

  const startEditSub = (idx: number) => {
    setNewSubName(subCategories[idx]);
    setEditingSubIdx(idx);
  };

  const removeSub = (idx: number) => {
    setSubCategories(subCategories.filter((_, i) => i !== idx));
    if (editingSubIdx === idx) {
      setEditingSubIdx(null);
      setNewSubName('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !categoryName.trim()) return;

    setLoading(true);
    const catData = {
      name: categoryName.trim().toUpperCase(),
      description: categoryDesc.trim(),
      subCategories: subCategories,
      updatedAt: serverTimestamp(),
    };

    const targetId = editingId || doc(collection(db, 'categories')).id;
    const docRef = doc(db, 'categories', targetId);
    const finalData = { ...catData, id: targetId, createdAt: editingId ? undefined : serverTimestamp() };

    setDoc(docRef, finalData, { merge: true })
      .then(() => {
        toast({ title: "Data saved successfully", description: "Your changes are now live in the database." });
        resetForm();
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: editingId ? 'update' : 'create',
          requestResourceData: finalData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setLoading(false));
  };

  const handleEdit = (cat: any) => {
    setEditingId(cat.id);
    setCategoryName(cat.name);
    setCategoryDesc(cat.description || '');
    setSubCategories(cat.subCategories || []);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (!db || !confirm(`Delete "${name}" category? All linked data will be affected.`)) return;
    
    const docRef = doc(db, 'categories', id);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: "Category Deleted", description: "The item was removed from the database." });
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const resetForm = () => {
    setCategoryName('');
    setCategoryDesc('');
    setSubCategories([]);
    setNewSubName('');
    setEditingId(null);
    setEditingSubIdx(null);
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold font-headline text-primary flex items-center gap-2">
            <LayoutGrid className="w-8 h-8" />
            Admin Dashboard
          </h2>
          <p className="text-muted-foreground">Manage work categories and hierarchical sub-categories.</p>
        </div>
        {!isFormOpen && (
          <Button onClick={() => setIsFormOpen(true)} className="gap-2 h-11 px-6 font-bold shadow-lg bg-primary hover:bg-primary/90">
            <Plus className="w-5 h-5" /> Add Category
          </Button>
        )}
      </div>

      {isFormOpen ? (
        <Card className="max-w-2xl mx-auto shadow-2xl border-2 animate-in slide-in-from-bottom-4">
          <CardHeader className="border-b bg-muted/5 flex flex-row items-center justify-between">
            <div>
              <CardTitle>{editingId ? 'Edit Category' : 'Add New Category'}</CardTitle>
              <CardDescription>All fields will be stored permanently in Firestore.</CardDescription>
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
                  placeholder="e.g. DIGITAL PRINT, FLEX" 
                  value={categoryName} 
                  onChange={(e) => setCategoryName(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="catDesc">Description (Optional)</Label>
                <Textarea 
                  id="catDesc"
                  placeholder="Brief purpose of this category..." 
                  value={categoryDesc} 
                  onChange={(e) => setCategoryDesc(e.target.value)} 
                  className="min-h-[80px]"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="flex items-center gap-2 text-primary font-bold">
                  <ListOrdered className="w-4 h-4" /> 
                  Manage Subcategories
                </Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Subcategory Name" 
                    value={newSubName} 
                    onChange={(e) => setNewSubName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOrUpdateSub())}
                  />
                  <Button type="button" variant="outline" className="border-primary text-primary" onClick={handleAddOrUpdateSub}>
                    {editingSubIdx !== null ? 'Update' : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
                
                <div className="grid gap-2 p-4 bg-muted/20 rounded-lg border border-dashed">
                  {subCategories.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-2">No subcategories linked yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {subCategories.map((sub, i) => (
                        <Badge key={i} className="gap-2 pr-1 pl-3 py-1.5 h-fit bg-white text-primary border-primary/20 shadow-sm transition-all hover:border-primary">
                          <span className="font-bold">{sub}</span>
                          <div className="flex gap-0.5">
                            <Button type="button" variant="ghost" size="icon" className="h-5 w-5 hover:bg-primary hover:text-white rounded-full" onClick={() => startEditSub(i)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-5 w-5 hover:bg-destructive hover:text-white rounded-full" onClick={() => removeSub(i)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/5 flex justify-end gap-3 pt-6">
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              <Button disabled={loading || !categoryName.trim()} className="gap-2 px-10 font-bold shadow-xl bg-primary">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
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
              <p className="text-muted-foreground font-medium animate-pulse">Fetching from database...</p>
            </div>
          ) : categories?.length === 0 ? (
            <div className="col-span-full text-center py-24 border-4 border-dashed rounded-3xl space-y-4 bg-muted/10">
              <Settings className="w-16 h-16 mx-auto opacity-20" />
              <h3 className="text-2xl font-bold text-muted-foreground">Empty Dashboard</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">Create your first category to start organizing your work.</p>
              <Button onClick={() => setIsFormOpen(true)} className="mt-4">Add First Category</Button>
            </div>
          ) : (
            categories?.map((cat) => (
              <Card key={cat.id} className="group hover:border-primary/50 transition-all border-2 shadow-sm hover:shadow-md flex flex-col h-full">
                <CardHeader className="pb-3 bg-muted/5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-xl font-black text-primary flex items-center gap-2">
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
                <CardContent className="flex-1 pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-1">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Subcategories</p>
                      <Badge variant="outline" className="text-[9px] h-4">{cat.subCategories?.length || 0}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.subCategories?.length > 0 ? (
                        cat.subCategories.map((s: string, i: number) => (
                          <div key={i} className="flex items-center gap-1.5 text-[10px] font-medium bg-muted px-2 py-1 rounded border">
                            <ArrowRight className="w-2.5 h-2.5 text-primary/50" />
                            {s}
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic px-1">No linked subcategories</span>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t bg-muted/5 mt-auto flex justify-between">
                   <Button variant="ghost" size="sm" className="text-[10px] uppercase font-bold text-primary tracking-tighter" onClick={() => handleEdit(cat)}>
                      Edit Hierarchy
                   </Button>
                   <Button variant="ghost" size="sm" className="text-[10px] uppercase font-bold text-destructive" onClick={() => handleDelete(cat.id, cat.name)}>
                      Delete
                   </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
