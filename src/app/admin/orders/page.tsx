
"use client"

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Search, Filter, MoreVertical, Eye, Trash2, Download, Loader2, PlusCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, deleteDoc, doc, query, orderBy, where, collectionGroup } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function OrdersPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const userRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [db, user]);
  const { data: userData, isLoading: isUserLoading } = useDoc(userRef);

  const isSuperAdmin = userData?.role === 'super_admin';

  // Use NESTED collection path: shops/{shopId}/orders
  const ordersQuery = useMemoFirebase(() => {
    if (!db || !userData) return null;
    
    if (isSuperAdmin) {
      // Super Admin uses collectionGroup to see ALL nested orders
      return query(collectionGroup(db, 'orders'), orderBy('createdAt', 'desc'));
    } else if (userData.shopId) {
      // Shop Owners fetch from their specific subcollection
      return query(
        collection(db, 'shops', userData.shopId, 'orders'), 
        orderBy('createdAt', 'desc')
      );
    }
    return null;
  }, [db, userData, isSuperAdmin]);

  const { data: orders, isLoading: loading, error } = useCollection(ordersQuery);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(order => {
      const customer = order.customerName?.toLowerCase() || "";
      const bill = order.billNumber?.toLowerCase() || "";
      const s = searchTerm.toLowerCase();
      return customer.includes(s) || bill.includes(s);
    });
  }, [orders, searchTerm]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Designing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Printing': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleDelete = async () => {
    if (!db || !deleteId || !userData?.shopId) return;
    
    setDeleting(true);
    const orderRef = doc(db, 'shops', userData.shopId, 'orders', deleteId);
    
    try {
      await deleteDoc(orderRef);
      toast({ title: "Order Deleted", description: "Record has been removed from shop database." });
    } catch (error: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: orderRef.path,
        operation: 'delete',
      }));
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
      setDeleteId(null);
    }
  };

  if (isUserLoading) return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold font-headline text-primary">Manage Orders</h2>
          <p className="text-muted-foreground">
            {isSuperAdmin ? 'Global Network View' : `Shop: ${userData?.shopId?.slice(0, 8)}`}
          </p>
        </div>
        <div className="flex gap-2">
          {!isSuperAdmin && (
            <Link href="/admin/orders/new">
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 font-black shadow-lg h-11 px-6">
                <PlusCircle className="w-5 h-5" /> CREATE ORDER
              </Button>
            </Link>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Sync Issue Detected</AlertTitle>
          <AlertDescription>Security rules may be blocking access. Ensure you are authorized for this shop.</AlertDescription>
        </Alert>
      )}

      <Card className="border-2 shadow-xl overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/5">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by customer or bill #..." 
                className="pl-10 h-11 border-none bg-transparent shadow-none focus-visible:ring-0" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-24 flex-col gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-xs font-black uppercase text-muted-foreground animate-pulse tracking-widest">Querying Vault...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="pl-6 uppercase text-[10px] font-black">Bill Reference</TableHead>
                  <TableHead className="uppercase text-[10px] font-black">Customer Entity</TableHead>
                  <TableHead className="uppercase text-[10px] font-black">Workflow Status</TableHead>
                  <TableHead className="uppercase text-[10px] font-black">Timeline</TableHead>
                  <TableHead className="text-right pr-6 uppercase text-[10px] font-black">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-primary/5 transition-colors border-b">
                      <TableCell className="pl-6 font-bold text-primary">
                        {order.billNumber || `#${order.id.slice(0, 5)}`}
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-sm">{order.customerName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{order.phone}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-medium">
                        {order.deliveryDate ? format(new Date(order.deliveryDate), 'MMM d, yyyy') : 'NO DEADLINE'}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-primary/10 text-primary"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 font-bold border-2">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/orders/${order.id}`} className="flex items-center gap-2">
                                <Eye className="w-4 h-4" /> Open Workbench
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive flex items-center gap-2" onClick={() => {setDeleteId(order.id); setShowDeleteDialog(true)}}>
                              <Trash2 className="w-4 h-4" /> Purge Record
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-32 text-muted-foreground italic">
                      No matching records found in this shop's database.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="border-2 border-destructive/20 shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-destructive mb-2">
              <AlertTriangle className="w-8 h-8" />
              <AlertDialogTitle className="text-2xl font-black">Confirm Purge?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="font-medium text-slate-600">
              You are about to permanently delete this order and all its communication logs. This action cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel disabled={deleting} className="font-bold">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 font-black px-8" disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} CONFIRM DELETE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
