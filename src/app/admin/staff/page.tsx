
"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Shield, Loader2, Trash2, Key } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function StaffManagement() {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;

    if (formData.password.length < 6) {
      toast({ variant: "destructive", title: "Weak Password", description: "Password must be at least 6 characters." });
      return;
    }

    setLoading(true);
    try {
      // Use email as ID (sanitized) or a unique string
      const tempId = formData.email.toLowerCase().replace(/[@.]/g, '_');
      const userRef = doc(db, 'users', tempId);
      
      await setDoc(userRef, {
        ...formData,
        id: tempId,
        email: formData.email.toLowerCase(),
        createdAt: serverTimestamp(),
      });

      toast({ 
        title: "Staff Authorized", 
        description: `${formData.name} can now login with the assigned password.` 
      });
      setFormData({ name: '', email: '', password: '', role: 'staff' });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db || !confirm('Delete this user authorization?')) return;
    await deleteDoc(doc(db, 'users', id));
    toast({ title: "User Removed" });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold font-headline text-primary">Staff Management</h2>
        <p className="text-muted-foreground">Admin Portal: Authorize staff accounts and set initial passwords.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 h-fit shadow-lg border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Create Staff ID
            </CardTitle>
            <CardDescription>Assign an email and password for staff login.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateStaff} className="space-y-4">
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
                />
              </div>
              <div className="space-y-2">
                <Label>Staff Password</Label>
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
                <p className="text-[10px] text-muted-foreground italic">Provide this to the staff member for their first login.</p>
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
                Authorize & Save
              </Button>
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
                    <TableRow key={user.id} className="hover:bg-muted/30">
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
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)} className="hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
