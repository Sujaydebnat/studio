
"use client"

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, 
  Clock, 
  Printer, 
  CheckCircle2, 
  TrendingUp,
  Loader2,
  PlusCircle,
  ShieldCheck,
  Store,
  Users
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, where, doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboard() {
  const db = useFirestore();
  const { user } = useUser();

  const userRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [db, user]);
  const { data: userData } = useDoc(userRef);

  const isSuperAdmin = userData?.role === 'super_admin';

  // Super Admin sees all orders, regular Admin sees shop-specific
  const ordersQuery = useMemoFirebase(() => {
    if (!db) return null;
    if (isSuperAdmin) return query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    if (!userData?.shopId) return null;
    return query(
      collection(db, 'orders'), 
      where('shopId', '==', userData.shopId),
      orderBy('createdAt', 'desc')
    );
  }, [db, userData?.shopId, isSuperAdmin]);

  const shopsQuery = useMemoFirebase(() => {
    if (!db || !isSuperAdmin) return null;
    return query(collection(db, 'shops'), orderBy('createdAt', 'desc'));
  }, [db, isSuperAdmin]);

  const { data: orders, isLoading: loadingOrders } = useCollection(ordersQuery);
  const { data: shops, isLoading: loadingShops } = useCollection(shopsQuery);

  const stats = useMemo(() => {
    if (isSuperAdmin) {
      return [
        { name: 'Active Shops', value: shops?.length.toString() || '0', icon: Store, color: 'text-primary' },
        { name: 'Total Orders', value: orders?.length.toString() || '0', icon: ClipboardList, color: 'text-accent' },
        { name: 'Total Revenue', value: 'Live', icon: TrendingUp, color: 'text-green-500' },
        { name: 'System Status', value: 'Stable', icon: ShieldCheck, color: 'text-blue-500' },
      ];
    }

    const total = orders?.length || 0;
    const designing = orders?.filter(o => o.status === 'Designing').length || 0;
    const printing = orders?.filter(o => o.status === 'Printing').length || 0;
    const completed = orders?.filter(o => o.status === 'Completed').length || 0;

    return [
      { name: 'Shop Orders', value: total.toString(), icon: ClipboardList, color: 'text-primary' },
      { name: 'In Design', value: designing.toString(), icon: Clock, color: 'text-orange-500' },
      { name: 'Printing', value: printing.toString(), icon: Printer, color: 'text-accent' },
      { name: 'Completed', value: completed.toString(), icon: CheckCircle2, color: 'text-green-500' },
    ];
  }, [orders, shops, isSuperAdmin]);

  const recentOrders = useMemo(() => {
    return orders?.slice(0, 5) || [];
  }, [orders]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold font-headline text-primary">
            {isSuperAdmin ? 'Master Overview' : 'Shop Overview'}
          </h2>
          <p className="text-muted-foreground">
            {isSuperAdmin 
              ? 'Monitoring global network performance and tenant activity.' 
              : 'Manage your shop\'s operations and team in one place.'}
          </p>
        </div>
        {!isSuperAdmin && (
          <Link href="/admin/orders/new" className="block">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 font-bold shadow-lg h-12 px-6">
              <PlusCircle className="w-5 h-5" />
              Create New Order
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {loadingOrders ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    Live from database
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{isSuperAdmin ? 'Global Recent Orders' : 'Recent Activity'}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : recentOrders.length > 0 ? (
              <div className="space-y-6">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {order.billNumber ? `Bill #${order.billNumber}` : `Order #${order.id.slice(0, 5)}`} 
                          <span className="text-muted-foreground ml-2">for {order.customerName}</span>
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {isSuperAdmin && (
                            <Badge variant="secondary" className="text-[8px] bg-primary/10">Shop: {order.shopId?.slice(0, 8)}</Badge>
                          )}
                          {(order.workTypes || []).map((t: string) => (
                            <Badge key={t} variant="outline" className="text-[9px] h-4">{t}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{order.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 space-y-4">
                <p className="text-muted-foreground">No orders yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 rounded-lg border ${isSuperAdmin ? 'bg-accent/5 border-accent/20' : 'bg-primary/5 border-primary/20'}`}>
              <h4 className="font-bold text-sm text-primary mb-1">
                {isSuperAdmin ? 'Global Command' : 'Multi-Tenant Enabled'}
              </h4>
              <p className="text-xs text-muted-foreground">
                {isSuperAdmin 
                  ? 'You are accessing the system-level analytics layer.' 
                  : 'Your data is securely isolated to your shop.'}
              </p>
            </div>
            {!isSuperAdmin ? (
              <>
                <Link href="/admin/orders/new" className="block w-full">
                  <Button className="w-full bg-primary gap-2 shadow-sm font-bold">
                    <PlusCircle className="w-4 h-4" /> Add New Order
                  </Button>
                </Link>
                <Link href="/admin/staff" className="block w-full">
                  <Button variant="outline" className="w-full gap-2 font-bold">
                    <Users className="w-4 h-4" /> Manage Staff
                  </Button>
                </Link>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Global Stats</p>
                <div className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                  <span>Total Shops</span>
                  <span className="font-bold">{shops?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                  <span>Total Transactions</span>
                  <span className="font-bold">{orders?.length || 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
