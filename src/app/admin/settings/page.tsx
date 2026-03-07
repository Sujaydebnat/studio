
"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Trash2, 
  Settings, 
  Layers, 
  Loader2, 
  CheckCircle2, 
  X, 
  ListOrdered,
  Pencil
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function SettingsPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [categoryName, setCategoryName] = useState('');
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [newSubName, setNewSubName] = useState('');

  const categoriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'categories'), orderBy('name', 'asc'));
  }, [db]);

  const { data: categories, isLoading: loadingCats } = useCollection(categoriesQuery);

  const handleAddSub = () => {
    if (!newSubName.trim()) return;
    const formattedSub = newSubName.trim().toUpperCase();
    if (subCategories.includes(formattedSub)) {
      toast({ variant: "destructive", title: "Already exists" });
      return;
    }
    setSubCategories([...subCategories, formattedSub]);
    setNewSubName('');
  };

  const removeSub = (idx: number) => {
    setSubCategories(subCategories.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !categoryName.trim()) return;

    setLoading(true);
    const catData = {
      name: categoryName.trim().toUpperCase(),
      subCategories: subCategories,
      updatedAt: serverTimestamp(),
    };

    if (editingId) {
      const docRef = doc(db, 'categories', editingId);
      setDoc(docRef, catData, { merge: true })
        .then(() => {
          toast({ title: "Category Updated" });
          resetForm();
        })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: catData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => setLoading(false));
    } else {
      const colRef = collection(db, 'categories');
      const newDocRef = doc(colRef);
      const finalData = { 
        ...catData, 
        id: newDocRef.id,
        createdAt: serverTimestamp() 
      };
      
      setDoc(newDocRef, finalData)
        .then(() => {
          toast({ title: "Category Added" });
          resetForm();
        })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: newDocRef.path,
            operation: 'create',
            requestResourceData: finalData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => setLoading(false));
    }
  };

  const handleEdit = (cat: any) => {
    setEditingId(cat.id);
    setCategoryName(cat.name);
    setSubCategories(cat.subCategories || []);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!db || !confirm("Are you sure? This will affect how orders and catalog items are categorized.")) return;
    
    const docRef = doc(db, 'categories', id);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: "Category Deleted" });
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
    setSubCategories([]);
    setNewSubName('');
    setEditingId(null);
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold font-headline text-primary">System Settings</h2>
          <p className="text-muted-foreground">Manage work categories and business preferences.</p>
        </div>
        {!isFormOpen && (
          <Button onClick={() => setIsFormOpen(true)} className="gap-2 h-11 px-6 font-bold shadow-md">
            <Plus className="w-5 h-5" /> Add New Work Type
          </Button>
        )}
      </div>

      {isFormOpen ? (
        <Card className="max-w-2xl mx-auto shadow-xl border-2 animate-in slide-in-from-bottom-4">
          <CardHeader className="border-b bg-muted/5 flex flex-row items-center justify-between">
            <div>
              <CardTitle>{editingId ? 'Edit Category' : 'Create New Category'}</CardTitle>
              <CardDescription>Define the work type and optional preset sub-categories.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-5 h-5" /></Button>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label>Category Name (e.g. FLEX, GIFT)</Label>
                <Input 
                  required 
                  placeholder="Enter Work Type Name" 
                  value={categoryName} 
                  onChange={(e) => setCategoryName(e.target.value)} 
                />
              </div>

              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-primary" /> 
                  Preset Sub-categories (Optional)
                </Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="e.g. VISITING CARD" 
                    value={newSubName} 
                    onChange={(e) => setNewSubName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSub())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddSub}><Plus className="w-4 h-4" /></Button>
                </div>
                
                <div className="flex flex-wrap gap-2 pt-2">
                  {subCategories.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No presets. Users will type sub-categories manually.</p>
                  ) : (
                    subCategories.map((sub, i) => (
                      <Badge key={i} className="gap-1 pr-1 pl-3 h-8 bg-primary/10 text-primary border-primary/20">
                        {sub}
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 hover:bg-destructive hover:text-white rounded-full"
                          onClick={() => removeSub(i)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/5 flex justify-end gap-3 pt-6">
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              <Button disabled={loading || !categoryName.trim()} className="gap-2 px-8 font-bold shadow-lg">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {editingId ? 'Update Category' : 'Save Category'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingCats ? (
            <div className="col-span-full flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
          ) : categories?.length === 0 ? (
            <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl space-y-4">
              <Settings className="w-12 h-12 mx-auto opacity-20" />
              <p className="text-muted-foreground">No custom categories defined. Add your first one to get started!</p>
              <Button onClick={() => setIsFormOpen(true)}>Initialize Categories</Button>
            </div>
          ) : (
            categories?.map((cat) => (
              <Card key={cat.id} className="group hover:border-primary transition-all border-2">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      {cat.name}
                    </CardTitle>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleEdit(cat)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(cat.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Sub-Categories</p>
                    <div className="flex flex-wrap gap-1">
                      {cat.subCategories?.length > 0 ? (
                        cat.subCategories.map((s: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[9px] px-1.5">{s}</Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Manual Entry</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
