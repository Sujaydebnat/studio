
"use client"

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Loader2, ChevronRight, User } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import Link from 'next/link';

export default function StaffDashboard() {
  const db = useFirestore();
  const { user } = useUser();

  const ordersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'orders'), 
      where('assignedStaffId', '==', user.uid)
    );
  }, [db, user]);

  const { data: rawOrders, loading } = useCollection(ordersQuery);

  const activeOrders = useMemo(() => {
    if (!rawOrders) return [];
    return [...rawOrders].sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    });
  }, [rawOrders]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold font-headline text-accent-foreground">Staff Workbench</h2>
          <p className="text-muted-foreground">Orders specifically assigned to you for production.</p>
        </div>
        <div className="bg-accent/10 px-4 py-2 rounded-lg border border-accent/20 flex flex-col items-center">
          <p className="text-xs font-bold text-accent-foreground flex items-center gap-1">
            <User className="w-3 h-3" /> MY ASSIGNMENTS
          </p>
          <p className="text-2xl font-bold text-accent-foreground">{activeOrders.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
        </div>
      ) : (
        <div className="grid gap-6">
          {activeOrders.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg">No orders assigned to you yet.</p>
              <p className="text-sm">Admin will notify you when a new task is ready.</p>
            </Card>
          ) : (
            activeOrders.map((order) => (
              <Card key={order.id} className="hover:border-accent/40 transition-all border-2">
                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/20">
                  <div className="flex items-center gap-3">
                    <Badge variant={order.priority === 'High' || order.priority === 'Urgent' ? 'destructive' : 'default'}>
                      {order.priority}
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">
                      {order.billNumber ? `Bill: #${order.billNumber}` : `ID: #${order.id.slice(0, 8)}`}
                    </span>
                  </div>
                  <Badge variant="outline" className="border-accent text-accent-foreground">{order.status}</Badge>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold flex flex-wrap gap-2">
                        {(order.workTypes || [order.workType]).map((t: string) => (
                          <span key={t} className="bg-primary/10 px-2 py-0.5 rounded text-primary text-sm uppercase">
                            {t}
                          </span>
                        ))}
                      </h3>
                      <p className="text-sm text-muted-foreground">Customer: {order.customerName}</p>
                      {order.subWorkType && <Badge variant="outline" className="text-[10px]">{order.subWorkType}</Badge>}
                    </div>
                    <Link href={`/staff/orders/${order.id}`}>
                      <Button variant="secondary" className="gap-2">
                        Open Workbench <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Assigned: {order.createdAt?.seconds ? format(new Date(order.createdAt.seconds * 1000), 'PPP') : 'Recently'}
                    </div>
                    {order.deliveryDate && (
                      <div className="flex items-center gap-1 font-bold text-accent-foreground">
                        <CalendarIcon className="w-3 h-3" />
                        Due: {format(new Date(order.deliveryDate), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
