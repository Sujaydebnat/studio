
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
import { collection, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
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
  const { data: userData } = useDoc(userRef);

  const isSuperAdmin = userData?.role === 'super_admin';

  const ordersQuery = useMemoFirebase(() => {
    if (!db || !userData) return null;
    
    // If super admin, fetch all. Otherwise, must filter by shopId to avoid permission error.
    if (isSuperAdmin) {
      return query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    } else if (userData.shopId) {
      return query(
        collection(db, 'orders'), 
        where('shopId', '==', userData.shopId),
        orderBy('createdAt', 'desc')
      );
    }
    return null;
  }, [db, userData, isSuperAdmin]);

  const { data: orders, loading, error } = useCollection(ordersQuery);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(order => {
      const types = order.workTypes ? order.workTypes.join(" ") : (order.workType || "");
      return (
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        types.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [orders, searchTerm]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Designing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Printing': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return '';
    }
  };

  const confirmDelete = (id: string) => {
    setDeleteId(id);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!db || !deleteId) return;
    
    setDeleting(true);
    const orderRef = doc(db, 'orders', deleteId);
    
    try {
      await deleteDoc(orderRef);
      toast({ title: "Order Deleted", description: "The order has been removed from the database." });
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: orderRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold font-headline text-primary">Manage Orders</h2>
          <p className="text-muted-foreground">View, filter, and manage all your print orders.</p>
        </div>
        <div className="flex gap-2">
          {!isSuperAdmin && (
            <Link href="/admin/orders/new">
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 font-bold shadow-sm">
                <PlusCircle className="w-4 h-4" /> New Order
              </Button>
            </Link>
          )}
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-4">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Database Access Restricted</AlertTitle>
          <AlertDescription>
            {isSuperAdmin ? "Super Admin check failed. Please ensure your UID is correct in rules." : "You only have permission to view orders from your own shop."}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by Bill #, Customer, or Type..." 
                className="pl-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" /> Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[120px]">Bill #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Work Types</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-bold text-xs">
                        {order.billNumber ? `#${order.billNumber}` : `#${order.id.slice(0, 5)}`}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{order.customerName}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(order.workTypes || [order.workType]).map((type: string) => (
                            <Badge key={type} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${getStatusColor(order.status)} font-bold`}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.priority === 'High' || order.priority === 'Urgent' ? 'destructive' : 'secondary'}>
                          {order.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {order.deliveryDate ? format(new Date(order.deliveryDate), 'MMM d') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                              <Link href={`/admin/orders/${order.id}`}>
                                <Eye className="w-4 h-4" /> View & Edit
                              </Link>
                            </DropdownMenuItem>
                            {(isSuperAdmin || userData?.shopId === order.shopId) && (
                              <DropdownMenuItem className="gap-2 text-destructive cursor-pointer" onClick={() => confirmDelete(order.id)}>
                                <Trash2 className="w-4 h-4" /> Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      {error ? "Unable to load data. Check permissions." : "No orders found matching your search."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-destructive mb-2">
              <AlertTriangle className="w-6 h-6" />
              <AlertDialogTitle>Delete Order Permanently?</AlertDialogTitle>
            </div>
            <AlertDialogHeader>
              <AlertDialogDescription>
                Are you sure you want to delete order <strong>{deleteId?.slice(0, 8)}</strong>? 
                This action cannot be undone and the data will be removed from your database.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold" disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
