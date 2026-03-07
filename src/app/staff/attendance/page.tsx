
"use client"

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, orderBy, setDoc, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { Clock, LogIn, LogOut, CheckCircle2, Loader2, Calendar, History, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function StaffAttendance() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const attendanceQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'attendance'),
      where('staffId', '==', user.uid),
      where('date', '==', todayStr),
      limit(1)
    );
  }, [db, user, todayStr]);

  const historyQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'attendance'),
      where('staffId', '==', user.uid),
      orderBy('checkInTime', 'desc'),
      limit(10)
    );
  }, [db, user]);

  const { data: todayRecords, isLoading: loadingToday } = useCollection(attendanceQuery);
  const { data: history, isLoading: loadingHistory } = useCollection(historyQuery);

  const todayRecord = todayRecords?.[0];

  const handleCheckIn = async () => {
    if (!db || !user) return;
    setLoading(true);
    try {
      const userDoc = await (await import('firebase/firestore')).getDoc(doc(db, 'users', user.uid));
      const shopId = userDoc.data()?.shopId;

      await addDoc(collection(db, 'attendance'), {
        staffId: user.uid,
        shopId: shopId,
        date: todayStr,
        checkInTime: serverTimestamp(),
        checkOutTime: null
      });
      toast({ title: "Checked In Successfully", description: `Clocked in at ${format(new Date(), 'p')}` });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!db || !todayRecord) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'attendance', todayRecord.id), {
        checkOutTime: serverTimestamp()
      }, { merge: true });
      toast({ title: "Checked Out Successfully", description: `Clocked out at ${format(new Date(), 'p')}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold font-headline text-accent-foreground flex items-center gap-3">
            <Clock className="w-8 h-8" />
            Attendance Portal
          </h2>
          <p className="text-muted-foreground">Clock in/out to track your daily production hours.</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black font-mono">{format(new Date(), 'p')}</p>
          <p className="text-xs uppercase font-bold text-muted-foreground">{format(new Date(), 'EEEE, MMMM do')}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <Card className="md:col-span-1 shadow-xl border-2 flex flex-col justify-between">
          <CardHeader className="bg-accent/10 border-b">
            <CardTitle className="text-sm uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Today's Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6 flex-1 flex flex-col justify-center">
            {loadingToday ? (
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-accent" />
            ) : todayRecord ? (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase text-green-600 mb-1">Check In Time</p>
                  <p className="text-2xl font-black text-green-700">
                    {todayRecord.checkInTime?.seconds ? format(new Date(todayRecord.checkInTime.seconds * 1000), 'p') : '--:--'}
                  </p>
                </div>
                {todayRecord.checkOutTime ? (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                    <p className="text-[10px] font-bold uppercase text-blue-600 mb-1">Check Out Time</p>
                    <p className="text-2xl font-black text-blue-700">
                      {todayRecord.checkOutTime?.seconds ? format(new Date(todayRecord.checkOutTime.seconds * 1000), 'p') : '--:--'}
                    </p>
                  </div>
                ) : (
                  <Button onClick={handleCheckOut} disabled={loading} className="w-full h-16 rounded-2xl bg-destructive hover:bg-destructive/90 text-lg font-black gap-3 shadow-xl">
                    {loading ? <Loader2 className="animate-spin" /> : <LogOut className="w-6 h-6" />}
                    CLOCK OUT
                  </Button>
                )}
              </div>
            ) : (
              <Button onClick={handleCheckIn} disabled={loading} className="w-full h-32 rounded-3xl bg-accent text-accent-foreground hover:bg-accent/90 text-2xl font-black flex flex-col gap-2 shadow-2xl">
                {loading ? <Loader2 className="animate-spin" /> : <LogIn className="w-10 h-10" />}
                CLOCK IN
              </Button>
            )}
          </CardContent>
          <CardFooter className="bg-muted/30 border-t justify-center py-4">
            <p className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-green-500" /> System Logged
            </p>
          </CardFooter>
        </Card>

        <Card className="md:col-span-2 shadow-xl border-2">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-accent" /> Recent History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingHistory ? (
              <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20" /></div>
            ) : history && history.length > 0 ? (
              <div className="divide-y">
                {history.map((record) => (
                  <div key={record.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{record.date === todayStr ? 'Today' : format(new Date(record.date), 'EEE, MMM do')}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Production Shift</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-black">{record.checkInTime?.seconds ? format(new Date(record.checkInTime.seconds * 1000), 'p') : '--'}</p>
                        <p className="text-[9px] uppercase font-bold text-green-500">In</p>
                      </div>
                      <div className="w-px h-6 bg-muted mx-1" />
                      <div className="text-right">
                        <p className="text-xs font-black">{record.checkOutTime?.seconds ? format(new Date(record.checkOutTime.seconds * 1000), 'p') : '--'}</p>
                        <p className="text-[9px] uppercase font-bold text-destructive">Out</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground italic">No attendance records found.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
