
"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MessageSquare, Loader2, FileText, ChevronRight } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import Link from 'next/link';

export default function StaffDashboard() {
  const db = useFirestore();
  const { user } = useUser();

  const ordersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'orders'), where('status', '!=', 'Completed'), orderBy('createdAt', 'desc'));
  }, [db]);

  const { data: activeOrders, loading } = useCollection(ordersQuery as any);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold font-headline text-accent-foreground">Staff Workbench</h2>
          <p className="text-muted-foreground">View and update orders assigned to production.</p>
        </div>
        <div className="bg-accent/10 px-4 py-2 rounded-lg border border-accent/20">
          <p className="text-xs font-bold text-accent-foreground">MY TASKS</p>
          <p className="text-2xl font-bold text-accent-foreground">{activeOrders?.length || 0}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
        </div>
      ) : (
        <div className="grid gap-6">
          {activeOrders?.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No active orders currently. Take a well-deserved break!</p>
            </Card>
          ) : (
            activeOrders?.map((order) => (
              <Card key={order.id} className="hover:border-accent/40 transition-all border-2">
                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/20">
                  <div className="flex items-center gap-3">
                    <Badge variant={order.priority === 'High' ? 'destructive' : 'default'}>{order.priority}</Badge>
                    <span className="text-xs font-mono text-muted-foreground">#{order.id.slice(0, 8)}</span>
                  </div>
                  <Badge variant="outline" className="border-accent text-accent-foreground">{order.status}</Badge>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold">{order.workType}</h3>
                      <p className="text-sm text-muted-foreground">Customer: {order.customerName}</p>
                    </div>
                    <Link href={`/staff/orders/${order.id}`}>
                      <Button variant="secondary" className="gap-2">
                        View Details <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                  <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {order.createdAt?.seconds ? format(new Date(order.createdAt.seconds * 1000), 'PPP') : 'N/A'}
                    </div>
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

function useMemo<T>(factory: () => T, deps: any[]): T {
  return React.useMemo(factory, deps);
}
import React from 'react';
