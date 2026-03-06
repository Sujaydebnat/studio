
"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Shield, Loader2, Trash2, Key, AlertCircle, Pencil, X } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function StaffManagement() {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff'
  });

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'users');
  }, [db]);

  const { data: users, loading: loadingUsers } = useCollection(usersQuery);

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
      // If editing, use existing ID, else create from email
      const targetId = editMode && editingUserId ? editingUserId : formData.email.toLowerCase().replace(/[@.]/g, '_');
      const userRef = doc(db, 'users', targetId);
      
      const userData = {
        id: targetId,
        name: formData.name,
        email: formData.email.toLowerCase(),
        password: formData.password,
        role: formData.role,
        updatedAt: serverTimestamp(),
        ...(editMode ? {} : { createdAt: serverTimestamp() })
      };

      await setDoc(userRef, userData, { merge: true });

      toast({ 
        title: editMode ? "Staff Updated" : "Staff Authorized", 
        description: `${formData.name} account has been ${editMode ? 'updated' : 'created'} successfully.` 
      });
      
      resetForm();
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Operation Failed", description: "Could not save staff data. Check permissions." });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: any) => {
    setEditMode(true);
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      password: user.password || '',
      role: user.role || 'staff'
    });
  };

  const resetForm = () => {
    setEditMode(false);
    setEditingUserId(null);
    setFormData({ name: '', email: '', password: '', role: 'staff' });
  };

  const handleDelete = (id: string, name: string) => {
    if (!db) return;
    if (!confirm(`Are you sure you want to remove ${name}'s authorization? They will no longer be able to login.`)) return;
    
    const userRef = doc(db, 'users', id);
    
    deleteDoc(userRef)
      .then(() => {
        toast({ 
          title: "Authorization Removed", 
          description: `${name} has been deleted from the access list.` 
        });
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
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold font-headline text-primary">Staff Management</h2>
          <p className="text-muted-foreground">Admin Portal: Manage team access and permissions.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className={`lg:col-span-1 h-fit shadow-lg border-2 ${editMode ? 'border-primary' : ''}`}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                {editMode ? <Pencil className="w-5 h-5 text-primary" /> : <UserPlus className="w-5 h-5 text-primary" />}
                {editMode ? 'Edit Staff ID' : 'Create Staff ID'}
              </CardTitle>
              {editMode && (
                <Button variant="ghost" size="icon" onClick={resetForm}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <CardDescription>
              {editMode ? `Updating access for ${formData.name}` : 'Assign an email and password for internal login.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrUpdateStaff} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Email Address (Username)</Label>
                <Input 
                  required 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="staff@printflow.com"
                  disabled={editMode} // Email usually acts as key, disable editing for consistency
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input 
                    required 
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Set login password"
                    className="pr-10"
                  />
                  <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-[10px] text-muted-foreground italic">Update password for staff entry.</p>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin (Full Control)</SelectItem>
                    <SelectItem value="staff">Staff (Production Only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full gap-2 h-11 font-bold" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {editMode ? 'Update Account' : 'Authorize & Save'}
              </Button>
              {editMode && (
                <Button type="button" variant="outline" className="w-full" onClick={resetForm}>
                  Cancel Editing
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle>Authorized Access List</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Name</TableHead>
                    <TableHead>Email / Login</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id} className={`hover:bg-muted/30 ${editingUserId === user.id ? 'bg-primary/5' : ''}`}>
                      <TableCell className="font-bold">{user.name}</TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{user.password}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-foreground'
                        }`}>
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEdit(user)}
                            className="hover:bg-primary/10 group"
                          >
                            <Pencil className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(user.id, user.name)} 
                            className="hover:bg-destructive/10 group"
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground group-hover:text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!users || users.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                        No authorized staff found. Add one on the left.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
            <div className="mt-4 p-4 bg-muted/30 rounded-lg flex items-start gap-3 border">
              <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Admins can update credentials instantly. Staff will use the updated password on their next login session.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
