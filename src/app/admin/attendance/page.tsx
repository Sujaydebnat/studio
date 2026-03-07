
"use client"

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Clock, Loader2, Calendar, Search, Users, Download, Filter } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export default function AdminAttendanceLog() {
  const db = useFirestore();
  const { user } = useUser();
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [staffSearch, setStaffSearch] = useState('');

  const userRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [db, user]);
  const { data: userData } = useDoc(userRef);

  const attendanceQuery = useMemoFirebase(() => {
    if (!db || !userData?.shopId) return null;
    return query(
      collection(db, 'attendance'),
      where('shopId', '==', userData.shopId),
      where('date', '==', dateFilter),
      orderBy('checkInTime', 'desc')
    );
  }, [db, userData?.shopId, dateFilter]);

  const staffQuery = useMemoFirebase(() => {
    if (!db || !userData?.shopId) return null;
    return query(collection(db, 'users'), where('shopId', '==', userData.shopId));
  }, [db, userData?.shopId]);

  const { data: attendance, isLoading: loadingAttendance } = useCollection(attendanceQuery);
  const { data: staffList } = useCollection(staffQuery);

  const filteredLogs = useMemo(() => {
    if (!attendance || !staffList) return [];
    return attendance.map(log => {
      const staff = staffList.find(s => s.id === log.staffId);
      return { ...log, staffName: staff?.name || 'Unknown Staff' };
    }).filter(log => log.staffName.toLowerCase().includes(staffSearch.toLowerCase()));
  }, [attendance, staffList, staffSearch]);

  const calculateHours = (inTime: any, outTime: any) => {
    if (!inTime || !outTime) return '0h';
    const mins = differenceInMinutes(new Date(outTime.seconds * 1000), new Date(inTime.seconds * 1000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold font-headline text-primary flex items-center gap-3">
            <Users className="w-8 h-8" />
            Staff Attendance Log
          </h2>
          <p className="text-muted-foreground">Monitor daily production shifts and staff hours.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Input 
            type="date" 
            className="w-full md:w-48 border-2 font-bold" 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)} 
          />
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      <Card className="shadow-xl border-2 overflow-hidden">
        <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Filter by staff name..." 
              className="pl-9 h-10 border-none shadow-none focus-visible:ring-0 bg-transparent" 
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
            />
          </div>
          <Badge variant="outline" className="border-primary text-primary font-black uppercase">
            {filteredLogs.length} Records for {format(new Date(dateFilter), 'MMM do')}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loadingAttendance ? (
            <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 font-black">
                  <TableHead className="pl-6 uppercase text-[10px]">Staff Member</TableHead>
                  <TableHead className="uppercase text-[10px]">Clock In</TableHead>
                  <TableHead className="uppercase text-[10px]">Clock Out</TableHead>
                  <TableHead className="uppercase text-[10px]">Work Duration</TableHead>
                  <TableHead className="text-right pr-6 uppercase text-[10px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-primary/5 transition-colors border-b">
                      <TableCell className="pl-6 py-4">
                        <span className="font-bold text-primary">{log.staffName}</span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.checkInTime?.seconds ? format(new Date(log.checkInTime.seconds * 1000), 'p') : '--'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.checkOutTime?.seconds ? format(new Date(log.checkOutTime.seconds * 1000), 'p') : '--'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-bold text-xs px-3">
                          {calculateHours(log.checkInTime, log.checkOutTime)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Badge className={log.checkOutTime ? 'bg-muted text-muted-foreground' : 'bg-green-500 animate-pulse'}>
                          {log.checkOutTime ? 'Completed' : 'On-Shift'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-24 text-muted-foreground italic">
                      No attendance records found for this date.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
