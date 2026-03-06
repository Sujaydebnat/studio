
"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Shield, Loader2, Trash2, Key, Pencil, X, Phone, User as UserIcon, Camera } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function StaffManagement() {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
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

  const handleCreateOrUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;

    if (formData.password.length < 6) {
      toast({ 
        variant: "destructive", 
        title: "Weak Password", 
        description: "Password must be at least 6 characters." 
      });
      return;
    }

    setLoading(true);
    try {
      // If editing, keep the same ID. If new, create ID from email.
      const targetId = editMode && editingUserId ? editingUserId : formData.email.toLowerCase().replace(/[@.]/g, '_');
      const userRef = doc(db, 'users', targetId);
      
      const userData = {
        id: targetId,
        name: formData.name,
        username: formData.username.toLowerCase().trim(),
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.trim(),
        photoUrl: formData.photoUrl.trim(),
        password: formData.password,
        role: formData.role,
        updatedAt: serverTimestamp(),
        ...(editMode ? {} : { createdAt: serverTimestamp() })
      };

      await setDoc(userRef, userData, { merge: true });

      toast({ 
        title: editMode ? "Staff Updated" : "Staff Authorized", 
        description: `${formData.name} account is now active.` 
      });
      
      resetForm();
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

  const resetForm = () => {
    setEditMode(false);
    setEditingUserId(null);
    setFormData({ name: '', username: '', email: '', phone: '', photoUrl: '', password: '', role: 'staff' });
  };

  const handleDelete = (id: string, name: string) => {
    if (!db || !confirm(`Remove ${name}'s authorization? They will lose access immediately.`)) return;
    
    const userRef = doc(db, 'users', id);
    deleteDoc(userRef)
      .then(() => {
        toast({ title: "Authorization Removed" });
        if (editingUserId === id) resetForm();
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold font-headline text-primary">Staff Management</h2>
        <p className="text-muted-foreground">Manage internal team IDs, passwords, and access roles.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className={`lg:col-span-1 h-fit shadow-lg border-2 ${editMode ? 'border-primary' : 'border-border'}`}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl flex items-center gap-2">
                {editMode ? <Pencil className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                {editMode ? 'Edit Profile' : 'New Authorization'}
              </CardTitle>
              {editMode && <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>}
            </div>
            <CardDescription>Assign credentials and identity.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrUpdateStaff} className="space-y-4">
              <div className="space-y-1">
                <Label>Full Name</Label>
                <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Rahul Dev" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Username</Label>
                  <div className="relative">
                    <Input required value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="pl-9" placeholder="rahul123" />
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Phone No</Label>
                  <div className="relative">
                    <Input required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="pl-9" placeholder="01XXX..." />
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Work Email</Label>
                <Input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="staff@printflow.com" disabled={editMode} />
              </div>
              <div className="space-y-1">
                <Label>Photo URL (Optional)</Label>
                <div className="relative">
                  <Input value={formData.photoUrl} onChange={(e) => setFormData({...formData, photoUrl: e.target.value})} className="pl-9" placeholder="https://..." />
                  <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Portal Password</Label>
                <div className="relative">
                  <Input required type="text" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="pr-10" />
                  <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Access Role</Label>
                <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin (Full Control)</SelectItem>
                    <SelectItem value="staff">Staff (Production)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full gap-2 font-bold" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {editMode ? 'Update Staff Member' : 'Authorize Staff'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-md">
          <CardHeader><CardTitle>Active Authorization List</CardTitle></CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Profile</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((u) => (
                    <TableRow key={u.id} className={editingUserId === u.id ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={u.photoUrl} alt={u.name} />
                            <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-bold text-sm">{u.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span className="text-muted-foreground">{u.email}</span>
                          <span className="font-medium">{u.phone || 'No Phone'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono">@{u.username}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{u.password}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="text-[10px] uppercase">
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(u)} className="h-8 w-8 hover:text-primary">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id, u.name)} className="h-8 w-8 hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!users || users.length === 0) && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">No staff authorized yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
