
"use client"

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  EyeOff,
  Mail,
  Fingerprint,
  Key
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
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

export default function StaffManagement() {
  const db = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<{id: string, name: string} | null>(null);
  const [showPasswordInProfile, setShowPasswordInProfile] = useState(false);
  
  // UI Modes
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'profile'>('list');
  const [editMode, setEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    photoUrl: '',
    password: '',
    role: 'staff'
  });

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'users');
  }, [db]);

  const { data: users, isLoading: loadingUsers } = useCollection(usersQuery);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateOrUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;

    setLoading(true);
    try {
      const targetId = editMode && editingUserId ? editingUserId : formData.email.toLowerCase().replace(/[@.]/g, '_');
      const userRef = doc(db, 'users', targetId);
      
      const userData = {
        id: targetId,
        name: formData.name,
        username: formData.username.toLowerCase().trim(),
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.trim(),
        photoUrl: formData.photoUrl.trim(),
        password: formData.password || '123456',
        role: formData.role,
        updatedAt: serverTimestamp(),
        ...(editMode ? {} : { createdAt: serverTimestamp() })
      };

      await setDoc(userRef, userData, { merge: true });

      toast({ 
        title: editMode ? "Staff Updated" : "Staff Added", 
        description: `${formData.name} account is now active.` 
      });
      
      resetToListView();
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Operation Failed", description: "Check permissions or network." });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: any) => {
    setEditMode(true);
    setEditingUserId(user.id);
    setViewMode('form');
    setFormData({
      name: user.name,
      username: user.username || '',
      email: user.email,
      phone: user.phone || '',
      photoUrl: user.photoUrl || '',
      password: user.password || '',
      role: user.role || 'staff'
    });
  };

  const handleViewProfile = (user: any) => {
    setSelectedUser(user);
    setShowPasswordInProfile(false);
    setViewMode('profile');
  };

  const resetToListView = () => {
    setEditMode(false);
    setEditingUserId(null);
    setSelectedUser(null);
    setShowPasswordInProfile(false);
    setFormData({ name: '', username: '', email: '', phone: '', photoUrl: '', password: '', role: 'staff' });
    setViewMode('list');
  };

  const confirmDelete = (id: string, name: string) => {
    setStaffToDelete({ id, name });
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!db || !staffToDelete) return;
    
    setDeletingId(staffToDelete.id);
    const userRef = doc(db, 'users', staffToDelete.id);
    
    try {
      await deleteDoc(userRef);
      toast({ title: "Removed", description: `${staffToDelete.name} has been deleted.` });
      if (editingUserId === staffToDelete.id || selectedUser?.id === staffToDelete.id) resetToListView();
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: userRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setDeletingId(null);
      setShowDeleteDialog(false);
      setStaffToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      {viewMode === 'list' && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in duration-500">
          <div>
            <h2 className="text-3xl font-bold font-headline text-primary">Staff Management</h2>
            <p className="text-muted-foreground">Manage internal team access and roles.</p>
          </div>
          <Button onClick={() => setViewMode('form')} className="gap-2 h-11 px-6 font-bold shadow-md">
            <PlusCircle className="w-5 h-5" />
            Add New Staff
          </Button>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* FORM VIEW (ADD/EDIT) */}
        {viewMode === 'form' && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className={cn(
              "shadow-lg border-2",
              editMode ? 'border-primary ring-2 ring-primary/20' : 'border-border'
            )}>
              <CardHeader className="border-b bg-muted/5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={resetToListView} className="h-8 w-8">
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        {editMode ? <Pencil className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                        {editMode ? 'Edit Staff Profile' : 'New Staff Access'}
                      </CardTitle>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-8">
                <form onSubmit={handleCreateOrUpdateStaff} className="space-y-6">
                  <div className="flex justify-center mb-8">
                    <div className="relative">
                      <Avatar className="w-32 h-32 border-4 border-primary/20 shadow-xl">
                        <AvatarImage src={formData.photoUrl} alt="Preview" />
                        <AvatarFallback className="text-4xl font-bold bg-primary/10 text-primary">
                          {formData.name?.charAt(0) || <UserIcon className="w-12 h-12" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2 flex gap-1">
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                        <Button type="button" size="icon" variant="secondary" className="rounded-full shadow-lg h-10 w-10 border border-border" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4" /></Button>
                        <CameraCapture onCapture={(img) => setFormData({...formData, photoUrl: img})} trigger={<Button type="button" size="icon" className="rounded-full shadow-lg h-10 w-10 border border-primary"><Camera className="w-5 h-5" /></Button>} />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Rahul Dev" />
                    </div>
                    <div className="space-y-2">
                      <Label>Username (Login ID)</Label>
                      <div className="relative">
                        <Input required value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="pl-9" placeholder="rahul123" />
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Work Email</Label>
                      <Input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="staff@printflow.com" disabled={editMode} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <div className="relative">
                        <Input required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="pl-9" placeholder="017XXX..." />
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Login Password</Label>
                      <div className="relative">
                        <Input required type="text" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="pl-9" placeholder="••••••••" />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Access Role</Label>
                      <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin (Full Control)</SelectItem>
                          <SelectItem value="staff">Staff (Production Only)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <Button type="button" variant="outline" className="flex-1 h-12" onClick={resetToListView}>Cancel</Button>
                    <Button className="flex-[2] gap-2 font-bold h-12 shadow-md" disabled={loading}>
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                      {editMode ? 'Save Profile' : 'Authorize Staff'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* PROFILE VIEW MODE */}
        {viewMode === 'profile' && selectedUser && (
          <div className="max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <Card className="shadow-xl border-2 overflow-hidden">
              <div className="h-32 bg-primary/10 relative">
                <Button variant="ghost" size="icon" onClick={resetToListView} className="absolute top-4 left-4 bg-white/80 hover:bg-white">
                  <ArrowLeft className="w-5 h-5 text-primary" />
                </Button>
                <div className="absolute top-4 right-4 flex gap-2">
                   <Button variant="outline" size="sm" onClick={() => handleEdit(selectedUser)} className="bg-white/80">
                     <Pencil className="w-4 h-4 mr-2" /> Edit
                   </Button>
                </div>
              </div>
              <CardContent className="relative pt-0 px-8 pb-10">
                <div className="flex flex-col items-center -translate-y-16">
                  <Avatar className="w-32 h-32 border-4 border-white shadow-2xl">
                    <AvatarImage src={selectedUser.photoUrl} alt={selectedUser.name} />
                    <AvatarFallback className="text-4xl font-bold bg-primary text-primary-foreground">{selectedUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="text-center mt-4">
                    <h3 className="text-2xl font-bold text-foreground">{selectedUser.name}</h3>
                    <Badge variant={selectedUser.role === 'admin' ? 'default' : 'secondary'} className="mt-2 uppercase tracking-widest text-[10px] font-bold">
                      {selectedUser.role} Level
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-6 -mt-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-tighter">System Access</h4>
                    <div className="grid gap-4">
                       <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 rounded-xl bg-muted/50 border flex items-center gap-3">
                           <Fingerprint className="w-5 h-5 text-primary" />
                           <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground">Username</p>
                              <p className="font-mono text-sm">@{selectedUser.username}</p>
                           </div>
                         </div>
                         <div className="p-4 rounded-xl bg-muted/50 border flex items-center gap-3">
                           <Shield className="w-5 h-5 text-primary" />
                           <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground">Account Status</p>
                              <p className="text-sm font-bold text-green-600">Active</p>
                           </div>
                         </div>
                       </div>
                       
                       <div className="p-4 rounded-xl bg-muted/50 border flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <Key className="w-5 h-5 text-primary" />
                           <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground">Access Password</p>
                              <p className="font-mono text-sm">
                                {showPasswordInProfile ? selectedUser.password : '••••••••'}
                              </p>
                           </div>
                         </div>
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => setShowPasswordInProfile(!showPasswordInProfile)}
                         >
                            {showPasswordInProfile ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                         </Button>
                       </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-tighter">Contact Information</h4>
                    <div className="space-y-3">
                       <div className="flex items-center gap-3 p-1">
                         <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Mail className="w-4 h-4" /></div>
                         <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Email Address</p>
                            <p className="text-sm font-medium">{selectedUser.email}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-3 p-1">
                         <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Phone className="w-4 h-4" /></div>
                         <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Phone Number</p>
                            <p className="text-sm font-medium">{selectedUser.phone || 'N/A'}</p>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* LIST VIEW MODE */}
        {viewMode === 'list' && (
          <Card className="shadow-md animate-in fade-in duration-300">
            <CardHeader className="border-b bg-muted/5">
              <CardTitle className="text-xl">Authorized Staff Members</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingUsers ? (
                <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="pl-6">Profile</TableHead>
                      <TableHead>System ID</TableHead>
                      <TableHead>Access Level</TableHead>
                      <TableHead className="text-right pr-6">Management</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">
                          No staff found. Click "Add New Staff" to begin.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users?.map((u) => (
                        <TableRow key={u.id} className="hover:bg-primary/5 transition-colors">
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10 border shadow-sm">
                                <AvatarImage src={u.photoUrl} alt={u.name} />
                                <AvatarFallback className="font-bold">{u.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-sm">{u.name}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            <Badge variant="outline" className="font-mono bg-white">@{u.username}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="text-[10px] uppercase font-bold tracking-wider">
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleViewProfile(u)} className="h-8 gap-1 hover:border-accent hover:text-accent">
                                <Eye className="w-3 h-3" /> View
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleEdit(u)} className="h-8 gap-1 hover:border-primary hover:text-primary" disabled={deletingId === u.id}>
                                <Pencil className="w-3 h-3" /> Edit
                              </Button>
                              <Button variant="destructive" size="icon" onClick={() => confirmDelete(u.id, u.name)} className="h-8 w-8 shadow-sm" disabled={deletingId === u.id}>
                                {deletingId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-destructive mb-2">
              <AlertTriangle className="w-6 h-6" />
              <AlertDialogTitle>Confirm Removal</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{staffToDelete?.name}</strong>? 
              This will revoke tader access to the portal permanent bhabe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold" disabled={!!deletingId}>
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
