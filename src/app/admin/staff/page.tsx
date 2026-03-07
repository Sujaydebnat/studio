
"use client"

import { useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  UserPlus, 
  Shield, 
  Loader2, 
  Trash2, 
  Pencil, 
  Phone, 
  User as UserIcon, 
  Camera, 
  AlertTriangle, 
  Upload, 
  PlusCircle, 
  ArrowLeft, 
  Lock,
  Eye,
  Mail,
  Fingerprint,
  Settings,
  X,
  Plus,
  LayoutGrid,
  CheckCircle2
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp, deleteDoc, addDoc, query, orderBy, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CameraCapture } from '@/components/CameraCapture';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';

export default function StaffManagement() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editMode, setEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<{id: string, name: string} | null>(null);
  const [isFieldManagerOpen, setIsFieldManagerOpen] = useState(false);

  const userRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [db, user]);
  const { data: userData } = useDoc(userRef);
  
  // Custom Field Management
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState(''); // Comma separated
  const [fieldLoading, setFieldLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    username: '', 
    email: '',
    phone: '',
    photoUrl: '',
    password: '',
    role: 'staff',
    department: '',
    address: '',
    joiningDate: '',
    salary: '',
    status: 'Active',
    customFields: {} as Record<string, any>
  });

  const usersQuery = useMemoFirebase(() => {
    if (!db || !userData?.shopId) return null;
    return query(collection(db, 'users'), where('shopId', '==', userData.shopId));
  }, [db, userData?.shopId]);

  const fieldsQuery = useMemoFirebase(() => {
    if (!db || !userData?.shopId) return null;
    return query(
      collection(db, 'staff_fields'), 
      where('shopId', '==', userData.shopId),
      orderBy('createdAt', 'asc')
    );
  }, [db, userData?.shopId]);

  const { data: users, isLoading: loadingUsers } = useCollection(usersQuery);
  const { data: customFields, isLoading: loadingFields } = useCollection(fieldsQuery);

  const generateEmployeeId = () => `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleAddField = () => {
    if (!db || !newFieldName.trim()) {
      toast({ variant: "destructive", title: "Field name required" });
      return;
    }
    if (!userData?.shopId) return;

    setFieldLoading(true);
    const fieldData = {
      shopId: userData.shopId,
      fieldName: newFieldName.trim(),
      fieldType: newFieldType,
      required: newFieldRequired,
      options: newFieldType === 'dropdown' ? newFieldOptions.split(',').map(o => o.trim()).filter(Boolean) : [],
      createdAt: serverTimestamp()
    };

    addDoc(collection(db, 'staff_fields'), fieldData)
      .then(() => {
        setNewFieldName('');
        setNewFieldOptions('');
        setNewFieldRequired(false);
        toast({ title: "Custom field added successfully" });
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'staff_fields',
          operation: 'create',
          requestResourceData: fieldData
        } satisfies SecurityRuleContext));
      })
      .finally(() => {
        setFieldLoading(false);
      });
  };

  const handleDeleteField = (id: string) => {
    if (!db) return;
    const fieldRef = doc(db, 'staff_fields', id);
    deleteDoc(fieldRef)
      .then(() => {
        toast({ title: "Custom field removed" });
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: fieldRef.path,
          operation: 'delete'
        } satisfies SecurityRuleContext));
      });
  };

  const handleCreateOrUpdateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !userData?.shopId) return;

    setLoading(true);
    const targetId = editMode && editingUserId ? editingUserId : formData.username.toLowerCase().trim();
    const staffRef = doc(db, 'users', targetId);
    
    const updatedStaffData = {
      ...formData,
      id: targetId,
      shopId: userData.shopId,
      username: formData.username.toLowerCase().trim(),
      email: formData.email.toLowerCase().trim(),
      updatedAt: serverTimestamp(),
      ...(editMode ? {} : { createdAt: serverTimestamp() })
    };

    setDoc(staffRef, updatedStaffData, { merge: true })
      .then(() => {
        toast({ title: editMode ? "Staff member profile updated" : "Staff member registered successfully" });
        resetToListView();
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: staffRef.path,
          operation: 'write',
          requestResourceData: updatedStaffData
        } satisfies SecurityRuleContext));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleEdit = (user: any) => {
    setEditMode(true);
    setEditingUserId(user.id);
    setViewMode('form');
    setFormData({
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      photoUrl: user.photoUrl || '',
      password: user.password || '',
      role: user.role || 'staff',
      department: user.department || '',
      address: user.address || '',
      joiningDate: user.joiningDate || '',
      salary: user.salary || '',
      status: user.status || 'Active',
      customFields: user.customFields || {}
    });
  };

  const openAddForm = () => {
    setEditMode(false);
    setEditingUserId(null);
    setFormData({ 
      name: '', 
      username: generateEmployeeId(), 
      email: '', 
      phone: '', 
      photoUrl: '', 
      password: '', 
      role: 'staff',
      department: '',
      address: '',
      joiningDate: '',
      salary: '',
      status: 'Active',
      customFields: {}
    });
    setViewMode('form');
  };

  const resetToListView = () => {
    setViewMode('list');
    setEditMode(false);
    setEditingUserId(null);
  };

  const handleDeleteStaff = () => {
    if (!db || !staffToDelete) return;
    const staffRef = doc(db, 'users', staffToDelete.id);
    deleteDoc(staffRef)
      .then(() => {
        toast({ title: "Removed staff member permanently" });
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ 
          path: staffRef.path, 
          operation: 'delete' 
        } satisfies SecurityRuleContext));
      })
      .finally(() => {
        setShowDeleteDialog(false);
        setStaffToDelete(null);
      });
  };

  return (
    <div className="space-y-8">
      {viewMode === 'list' ? (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in duration-500">
          <div>
            <h2 className="text-3xl font-bold font-headline text-primary">Shop Personnel</h2>
            <p className="text-muted-foreground">Manage your shop's team and custom data columns.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsFieldManagerOpen(true)} className="gap-2 h-11 border-2">
              <Settings className="w-5 h-5" /> Define Columns
            </Button>
            <Button onClick={openAddForm} className="gap-2 h-11 px-6 font-bold shadow-md">
              <PlusCircle className="w-5 h-5" /> Add New Staff
            </Button>
          </div>
        </div>
      ) : null}

      {viewMode === 'form' ? (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
          <Card className="shadow-lg border-2">
            <CardHeader className="border-b bg-muted/5">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={resetToListView}><ArrowLeft className="w-5 h-5" /></Button>
                <CardTitle>{editMode ? 'Edit Staff Profile' : 'New Staff Registration'}</CardTitle>
              </div>
            </CardHeader>
            <form onSubmit={handleCreateOrUpdateStaff}>
              <CardContent className="pt-8 space-y-8">
                <div className="flex justify-center">
                  <div className="relative">
                    <Avatar className="w-32 h-32 border-4 border-primary/20">
                      <AvatarImage src={formData.photoUrl} />
                      <AvatarFallback className="text-4xl font-bold bg-primary/10 text-primary">{formData.name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2 flex gap-1">
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                      <Button type="button" size="icon" variant="secondary" className="rounded-full shadow h-10 w-10" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4" /></Button>
                      <CameraCapture onCapture={(img) => setFormData({...formData, photoUrl: img})} trigger={<Button type="button" size="icon" className="rounded-full shadow h-10 w-10 border border-primary"><Camera className="w-4 h-4" /></Button>} />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Employee ID</Label>
                    <Input readOnly value={formData.username} className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin / Owner</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="Designer">Designer</SelectItem>
                        <SelectItem value="Manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Joining Date</Label>
                    <Input type="date" value={formData.joiningDate} onChange={(e) => setFormData({...formData, joiningDate: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Salary</Label>
                    <Input value={formData.salary} onChange={(e) => setFormData({...formData, salary: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Portal Password</Label>
                    <Input required type="text" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Current Address</Label>
                  <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                </div>

                {customFields && customFields.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-6">
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5 text-primary" />
                        <h4 className="font-black text-sm uppercase tracking-widest text-primary">Shop Specific Fields</h4>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        {customFields.map((field) => (
                          <div key={field.id} className="space-y-2">
                            <Label className="flex items-center gap-1">
                              {field.fieldName}
                              {field.required && <span className="text-destructive">*</span>}
                            </Label>
                            
                            {field.fieldType === 'text' && (
                              <Input 
                                required={field.required}
                                value={formData.customFields[field.fieldName] || ''} 
                                onChange={(e) => setFormData({
                                  ...formData, 
                                  customFields: {...formData.customFields, [field.fieldName]: e.target.value}
                                })} 
                              />
                            )}

                            {field.fieldType === 'number' && (
                              <Input 
                                type="number"
                                required={field.required}
                                value={formData.customFields[field.fieldName] || ''} 
                                onChange={(e) => setFormData({
                                  ...formData, 
                                  customFields: {...formData.customFields, [field.fieldName]: e.target.value}
                                })} 
                              />
                            )}

                            {field.fieldType === 'date' && (
                              <Input 
                                type="date"
                                required={field.required}
                                value={formData.customFields[field.fieldName] || ''} 
                                onChange={(e) => setFormData({
                                  ...formData, 
                                  customFields: {...formData.customFields, [field.fieldName]: e.target.value}
                                })} 
                              />
                            )}

                            {field.fieldType === 'dropdown' && (
                              <Select 
                                value={formData.customFields[field.fieldName] || ''} 
                                onValueChange={(v) => setFormData({
                                  ...formData, 
                                  customFields: {...formData.customFields, [field.fieldName]: v}
                                })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={`Select ${field.fieldName}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {(field.options || []).map((opt: string) => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="border-t bg-muted/5 flex justify-end gap-3 pt-6">
                <Button type="button" variant="outline" onClick={resetToListView}>Cancel</Button>
                <Button disabled={loading} className="px-10 font-bold shadow-lg" type="submit">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                  {editMode ? 'Update Staff Member' : 'Register Staff Member'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      ) : (
        <Card className="shadow-md animate-in fade-in">
          <CardHeader className="border-b bg-muted/5 flex flex-row items-center justify-between">
            <CardTitle>Staff Directory</CardTitle>
            <Badge variant="outline" className="font-bold border-primary text-primary">{users?.length || 0} Members</Badge>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden">
            {loadingUsers ? (
              <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((u) => (
                    <TableRow key={u.id} className="hover:bg-primary/5 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border shadow-sm">
                            <AvatarImage src={u.photoUrl} />
                            <AvatarFallback className="font-bold bg-primary/10 text-primary">{u.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{u.name}</span>
                            <span className="text-[10px] text-muted-foreground">{u.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{u.username}</TableCell>
                      <TableCell className="text-sm font-medium">{u.department || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase">{u.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={u.status === 'Active' ? 'bg-green-500' : 'bg-destructive'}>{u.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6 space-x-1">
                        <Link href={`/admin/staff/${u.id}`}><Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10"><Eye className="w-4 h-4" /></Button></Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => handleEdit(u)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => {setStaffToDelete({id: u.id, name: u.name}); setShowDeleteDialog(true)}}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter className="border-t bg-muted/5 flex justify-center py-4">
             <p className="text-[10px] text-muted-foreground italic uppercase tracking-tighter">Multi-Tenant Isolation Enabled: Shop #{userData?.shopId?.slice(0, 8)}</p>
          </CardFooter>
        </Card>
      )}

      {/* Field Manager Dialog */}
      <Dialog open={isFieldManagerOpen} onOpenChange={setIsFieldManagerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Define Shop Data Columns</DialogTitle>
            <DialogDescription>Create custom fields that are unique to your shop's staff directory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="grid gap-4 bg-muted/30 p-4 rounded-xl border-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Column Name</Label>
                  <Input placeholder="e.g. Expertise" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data Type</Label>
                  <Select value={newFieldType} onValueChange={setNewFieldType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="dropdown">Dropdown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newFieldType === 'dropdown' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Dropdown Options (Comma separated)</Label>
                  <Input 
                    placeholder="Junior, Senior, Lead" 
                    value={newFieldOptions} 
                    onChange={(e) => setNewFieldOptions(e.target.value)} 
                  />
                </div>
              )}

              <div className="flex items-center space-x-2 bg-card p-2 rounded-lg border">
                <Checkbox 
                  id="required" 
                  checked={newFieldRequired} 
                  onCheckedChange={(checked) => setNewFieldRequired(!!checked)} 
                />
                <label htmlFor="required" className="text-xs font-bold cursor-pointer">Mark as Mandatory Field</label>
              </div>

              <Button onClick={handleAddField} disabled={fieldLoading} className="w-full gap-2 font-bold shadow-sm">
                {fieldLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Column to Shop
              </Button>
            </div>

            <Separator />
            
            <div className="space-y-2">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Custom Columns</h5>
              <div className="max-h-[250px] overflow-auto pr-2 space-y-2">
                {loadingFields ? <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : 
                  customFields?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground italic text-xs">No custom columns defined.</div>
                  ) : (
                    customFields?.map(field => (
                      <div key={field.id} className="flex justify-between items-center p-3 rounded-xl bg-card border-2 shadow-sm group">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-primary">{field.fieldName}</span>
                            {field.required && <Badge variant="destructive" className="text-[8px] h-3 px-1">REQ</Badge>}
                          </div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">{field.fieldType} {field.fieldType === 'dropdown' && `(${field.options?.length} opts)`}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteField(field.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    ))
                  )
                }
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsFieldManagerOpen(false)} className="w-full">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-destructive mb-2">
              <AlertTriangle className="w-6 h-6" />
              <AlertDialogTitle>Remove Personnel?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              This will permanently remove <b>{staffToDelete?.name}</b> from your shop's database. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStaff} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold">
              Confirm Removal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
