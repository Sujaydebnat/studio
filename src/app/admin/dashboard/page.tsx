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
import { format } from 'date-fns';

export default function AdminDashboard() {
  const db = useFirestore();
  const { user } = useUser();

  const userRef = useMemoFirebase(() => 
    (user && db) ? doc(db, 'users', user.uid) : null
  , [db, user?.uid]);

  const { data: userData, isLoading: isUserLoading } = useDoc(userRef);

  const isSuperAdmin = userData?.role === 'super_admin';

  // Memoize queries to prevent infinite loops and CA9 crashes
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
    if (!userData) return [];
    
    if (isSuperAdmin) {
      return [
        { name: 'Global Shops', value: shops?.length.toString() || '0', icon: Store, color: 'text-primary' },
        { name: 'Total Transactions', value: orders?.length.toString() || '0', icon: ClipboardList, color: 'text-accent' },
        { name: 'System Status', value: 'Live', icon: TrendingUp, color: 'text-green-500' },
        { name: 'Security', value: 'Hardened', icon: ShieldCheck, color: 'text-blue-500' },
      ];
    }

    const total = orders?.length || 0;
    const pending = orders?.filter(o => o.status === 'Pending' || o.status === 'Designing').length || 0;
    const completed = orders?.filter(o => o.status === 'Completed').length || 0;

    return [
      { name: 'Shop Orders', value: total.toString(), icon: ClipboardList, color: 'text-primary' },
      { name: 'In Production', value: pending.toString(), icon: Clock, color: 'text-orange-500' },
      { name: 'Completed', value: completed.toString(), icon: CheckCircle2, color: 'text-green-500' },
      { name: 'Vault State', value: 'Isolated', icon: ShieldCheck, color: 'text-accent' },
    ];
  }, [orders, shops, isSuperAdmin, userData]);

  if (isUserLoading) return (
    <div className="flex flex-col items-center justify-center p-32 gap-4">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Authenticating Node...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black font-headline text-primary uppercase tracking-tighter italic">
            {isSuperAdmin ? 'Master Command' : 'Shop Workbench'}
          </h2>
          <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest">
            {isSuperAdmin ? 'Real-time global oversight system.' : `Secure Tenant ID: ${userData?.shopId?.slice(0, 12)}`}
          </p>
        </div>
        {!isSuperAdmin && (
          <Link href="/admin/orders/new">
            <Button className="bg-primary text-white hover:bg-primary/90 gap-2 font-black shadow-xl h-14 px-8 rounded-2xl transform hover:scale-105 transition-transform">
              <PlusCircle className="w-6 h-6" /> START NEW ORDER
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-2 shadow-sm overflow-hidden hover:border-primary transition-all bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/10">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{stat.name}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent className="pt-4 pb-6">
              <div className="text-4xl font-black tracking-tighter text-primary">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-2 shadow-2xl overflow-hidden rounded-3xl">
        <CardHeader className="border-b bg-muted/5 py-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
              <Printer className="w-6 h-6 text-primary" /> 
              Recent Operation Stream
            </CardTitle>
            <Badge variant="outline" className="border-primary text-primary font-black uppercase tracking-tighter">Live Database Sync</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingOrders ? (
            <div className="p-32 text-center flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-xs font-black uppercase text-muted-foreground animate-pulse">Decrypting Records...</p>
            </div>
          ) : (
            <div className="divide-y border-t">
              {orders?.slice(0, 8).map((order) => (
                <div key={order.id} className="p-5 flex items-center justify-between hover:bg-primary/5 transition-colors group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                      <Printer className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-base group-hover:text-primary transition-colors">
                        {order.customerName} 
                        <span className="text-muted-foreground font-bold ml-2 opacity-50">#{order.billNumber || order.id.slice(0, 5)}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">
                        Timestamp: {order.createdAt?.seconds ? format(new Date(order.createdAt.seconds * 1000), 'p, MMM d') : 'Pending Sync'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="font-black border-2 py-1 px-4 rounded-full border-primary/20 text-primary">
                      {order.status}
                    </Badge>
                    <Link href={`/admin/orders/${order.id}`}>
                      <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary hover:text-white transition-all">
                        <TrendingUp className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
              {(!orders || orders.length === 0) && (
                <div className="p-32 text-center">
                  <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground opacity-10 mb-4" />
                  <p className="text-muted-foreground font-bold italic">No active operations found in the current tenant.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
