"use client"

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ClipboardList, 
  Clock, 
  Printer, 
  CheckCircle2, 
  TrendingUp,
  Loader2
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboard() {
  const db = useFirestore();

  const ordersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  }, [db]);

  const { data: orders, loading } = useCollection(ordersQuery);

  const stats = useMemo(() => {
    const total = orders?.length || 0;
    const designing = orders?.filter(o => o.status === 'Designing').length || 0;
    const printing = orders?.filter(o => o.status === 'Printing').length || 0;
    const completed = orders?.filter(o => o.status === 'Completed').length || 0;

    return [
      { name: 'Total Orders', value: total.toString(), icon: ClipboardList, color: 'text-primary' },
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
      <div>
        <h2 className="text-3xl font-bold font-headline text-primary">Dashboard Overview</h2>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today in your shop.</p>
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
                        <p className="font-semibold text-sm">{order.workType} for {order.customerName}</p>
                        <p className="text-xs text-muted-foreground">ID: {order.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{order.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No orders yet. Create one to get started!</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-bold text-sm text-primary mb-1">New Feature: AI Briefs</h4>
              <p className="text-xs text-muted-foreground">Generate professional design briefs instantly when creating orders.</p>
            </div>
            <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
              <h4 className="font-bold text-sm text-accent mb-1">Live Tracking</h4>
              <p className="text-xs text-muted-foreground">Share the Order ID with customers so they can track progress online.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
