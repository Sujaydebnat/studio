
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
  Store
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, where, doc, collectionGroup } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboard() {
  const db = useFirestore();
  const { user } = useUser();

  const userRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [db, user]);
  const { data: userData, isLoading: isUserLoading } = useDoc(userRef);

  const isSuperAdmin = userData?.role === 'super_admin';

  // Super Admin uses collectionGroup to browse orders across all shops
  // Owners query their nested subcollection: shops/{shopId}/orders
  const ordersQuery = useMemoFirebase(() => {
    if (!db || !userData) return null;
    
    if (isSuperAdmin) {
      return query(collectionGroup(db, 'orders'), orderBy('createdAt', 'desc'));
    }
    
    if (!userData.shopId) return null;
    return query(
      collection(db, 'shops', userData.shopId, 'orders'), 
      orderBy('createdAt', 'desc')
    );
  }, [db, userData?.shopId, isSuperAdmin]);

  const shopsQuery = useMemoFirebase(() => {
    if (!db || !isSuperAdmin) return null;
    return query(collection(db, 'shops'), orderBy('createdAt', 'desc'));
  }, [db, isSuperAdmin]);

  const { data: orders, isLoading: loadingOrders } = useCollection(ordersQuery);
  const { data: shops } = useCollection(shopsQuery);

  const stats = useMemo(() => {
    if (isSuperAdmin) {
      return [
        { name: 'Active Shops', value: shops?.length.toString() || '0', icon: Store, color: 'text-primary' },
        { name: 'Total Orders', value: orders?.length.toString() || '0', icon: ClipboardList, color: 'text-accent' },
        { name: 'System Revenue', value: 'Live', icon: TrendingUp, color: 'text-green-500' },
        { name: 'Stability', value: 'Stable', icon: ShieldCheck, color: 'text-blue-500' },
      ];
    }

    const total = orders?.length || 0;
    const pending = orders?.filter(o => o.status === 'Pending' || o.status === 'Designing').length || 0;
    const completed = orders?.filter(o => o.status === 'Completed').length || 0;

    return [
      { name: 'Shop Orders', value: total.toString(), icon: ClipboardList, color: 'text-primary' },
      { name: 'In Production', value: pending.toString(), icon: Clock, color: 'text-orange-500' },
      { name: 'Completed', value: completed.toString(), icon: CheckCircle2, color: 'text-green-500' },
      { name: 'Active Stream', value: 'Online', icon: TrendingUp, color: 'text-accent' },
    ];
  }, [orders, shops, isSuperAdmin]);

  if (isUserLoading) return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black font-headline text-primary uppercase tracking-tighter">
            {isSuperAdmin ? 'Global Control' : 'Shop Management'}
          </h2>
          <p className="text-muted-foreground">
            {isSuperAdmin ? 'Real-time monitoring across all instances.' : `Managing operations for shop ${userData?.shopId?.slice(0, 8)}`}
          </p>
        </div>
        {!isSuperAdmin && (
          <Link href="/admin/orders/new">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 font-black shadow-lg h-12 px-6">
              <PlusCircle className="w-5 h-5" /> CREATE NEW ORDER
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-2 shadow-sm overflow-hidden hover:border-primary transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/10">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.name}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-black tracking-tighter">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-2 shadow-xl">
        <CardHeader className="border-b bg-muted/5">
          <CardTitle className="text-lg font-black uppercase tracking-wider">Recent Activity Stream</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingOrders ? (
            <div className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" /></div>
          ) : (
            <div className="divide-y">
              {orders?.slice(0, 10).map((order) => (
                <div key={order.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Printer className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">
                        {order.customerName} <span className="text-muted-foreground font-medium ml-2">({order.billNumber || 'No Bill #'})</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">
                        Created {order.createdAt?.seconds ? format(new Date(order.createdAt.seconds * 1000), 'p, MMM d') : 'Just now'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-black border-primary text-primary">{order.status}</Badge>
                </div>
              ))}
              {(!orders || orders.length === 0) && (
                <div className="p-20 text-center text-muted-foreground italic">No transactions found.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
