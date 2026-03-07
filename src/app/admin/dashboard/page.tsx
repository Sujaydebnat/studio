
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
  PlusCircle
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, where, doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboard() {
  const db = useFirestore();
  const { user } = useUser();

  const userRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [db, user]);
  const { data: userData } = useDoc(userRef);

  const ordersQuery = useMemoFirebase(() => {
    if (!db || !userData?.shopId) return null;
    return query(
      collection(db, 'orders'), 
      where('shopId', '==', userData.shopId),
      orderBy('createdAt', 'desc')
    );
  }, [db, userData?.shopId]);

  const { data: orders, isLoading: loading } = useCollection(ordersQuery);

  const stats = useMemo(() => {
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
  }, [orders]);

  const recentOrders = useMemo(() => {
    return orders?.slice(0, 5) || [];
  }, [orders]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold font-headline text-primary">Shop Overview</h2>
          <p className="text-muted-foreground">Manage your shop's operations and team in one place.</p>
        </div>
        <Link href="/admin/orders/new" className="block">
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 font-bold shadow-lg h-12 px-6">
            <PlusCircle className="w-5 h-5" />
            Create New Order
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? (
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
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
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
                <p className="text-muted-foreground">No orders yet for this shop.</p>
                <Link href="/admin/orders/new">
                  <Button variant="outline" size="sm" className="gap-2">
                    <PlusCircle className="w-4 h-4" /> Create First Order
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-bold text-sm text-primary mb-1">Multi-Tenant Enabled</h4>
              <p className="text-xs text-muted-foreground">Your data is securely isolated to your shop.</p>
            </div>
            <Link href="/admin/orders/new" className="block w-full">
              <Button className="w-full bg-primary gap-2 shadow-sm font-bold">
                <PlusCircle className="w-4 h-4" /> Add New Order
              </Button>
            </Link>
            <Link href="/admin/staff" className="block w-full">
              <Button variant="outline" className="w-full gap-2 font-bold">
                <ClipboardList className="w-4 h-4" /> Manage Staff
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
